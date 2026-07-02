import { randomUUID } from "crypto";
import type { BrowserWindow } from "electron";
import {
  ContextBuilder,
  BudgetTracker,
  RoundOrchestrator,
  buildOpeningSeedMessages,
  type LLMMessage,
  type OrchestratorStreamChunk,
  type OrchestratorStreamInput,
} from "@inkforge/tavern-engine";
import {
  getTavernCardById,
  getTavernSessionById,
  insertTavernMessage,
  listTavernMessages,
  sumTavernMessageTokens,
} from "@inkforge/storage";
import type {
  TavernBudgetWarningEvent,
  TavernCardRecord,
  TavernChunkEvent,
  TavernDoneEvent,
  TavernMessageRecord,
  TavernRoundRunInput,
  TavernRoundRunResponse,
  TavernRoundStopInput,
  TavernRoundStopResponse,
  TokenBudgetState,
  ipcEventChannels,
} from "@inkforge/shared";
import type { LLMMessage as LLMCoreMessage } from "@inkforge/llm-core";
import { getAppContext } from "./app-state";
import { logger } from "./logger";
import {
  resolveApiKey,
  resolveProviderRecord,
  streamText,
} from "./llm-runtime";
import { resolveSceneBinding } from "./scene-binding-service";
import { compactTavernHistory } from "./tavern-summary-service";

const CHUNK_CHANNEL: typeof ipcEventChannels.tavernChunk = "tavern:chunk";
const DONE_CHANNEL: typeof ipcEventChannels.tavernDone = "tavern:done";
const BUDGET_WARN_CHANNEL: typeof ipcEventChannels.tavernBudgetWarning = "tavern:budget-warning";

interface RoundRuntimeState {
  roundId: string;
  sessionId: string;
  orchestrator: RoundOrchestrator;
  budgetTracker: BudgetTracker;
  warnEmitted: boolean;
}

const activeRounds = new Map<string, RoundRuntimeState>();

/** Whether a round is currently executing for the session (used to gate user posts). */
export function isTavernSessionRunning(sessionId: string): boolean {
  for (const state of activeRounds.values()) {
    if (state.sessionId === sessionId) return true;
  }
  return false;
}

function emit<T>(
  window: BrowserWindow | null,
  channel: string,
  payload: T,
): void {
  if (!window || window.isDestroyed()) return;
  try {
    window.webContents.send(channel, payload);
  } catch {
    // Never let a dead/destroyed webContents bubble up — callers rely on
    // post-emit cleanup (activeRounds.delete) running unconditionally.
  }
}

function toLLMCoreMessages(messages: LLMMessage[]): LLMCoreMessage[] {
  return messages.map((msg) => {
    if (msg.role === "assistant") {
      return { role: "assistant", content: msg.content };
    }
    return { role: "user", content: msg.content };
  });
}

function resolveParticipantCards(ids: string[]): TavernCardRecord[] {
  const ctx = getAppContext();
  const cards: TavernCardRecord[] = [];
  for (const id of ids) {
    const card = getTavernCardById(ctx.db, id);
    if (!card) throw new Error(`Tavern card not found: ${id}`);
    cards.push(card);
  }
  return cards;
}

export async function startTavernRound(
  input: TavernRoundRunInput,
  window: BrowserWindow | null,
): Promise<TavernRoundRunResponse> {
  const ctx = getAppContext();
  const session = getTavernSessionById(ctx.db, input.sessionId);
  if (!session) throw new Error(`Tavern session not found: ${input.sessionId}`);
  if (!input.participants || input.participants.length === 0) {
    throw new Error("participants must be non-empty");
  }
  for (const active of activeRounds.values()) {
    if (active.sessionId === input.sessionId) {
      throw new Error(`tavern_round_already_running:${active.roundId}`);
    }
  }
  const participants = resolveParticipantCards(input.participants);
  const mode = input.mode ?? session.mode;
  const lastK = input.lastK ?? session.lastK;
  const autoRounds = mode === "auto" ? Math.max(1, input.autoRounds ?? 1) : 1;

  // First advance on an empty transcript: post each participant's opening
  // greeting as a persisted character message before any LLM turn runs.
  const openingSeeds = buildOpeningSeedMessages({
    participants,
    history: listTavernMessages(ctx.db, { sessionId: session.id, order: "asc" }) as TavernMessageRecord[],
    userName: session.userName,
  });
  if (openingSeeds.length > 0) {
    ctx.db.transaction(() => {
      for (const seed of openingSeeds) {
        insertTavernMessage(ctx.db, {
          id: randomUUID(),
          sessionId: session.id,
          characterId: seed.characterId,
          role: "character",
          content: seed.content,
          tokensIn: 0,
          tokensOut: 0,
          createdAt: seed.createdAt,
        });
      }
    })();
  }

  const roundId = randomUUID();
  const builder = new ContextBuilder();
  const budgetTracker = new BudgetTracker({
    sessionId: session.id,
    budgetTokens: session.budgetTokens,
  });
  const usedSum = sumTavernMessageTokens(ctx.db, session.id);
  budgetTracker.seed(usedSum.tokensIn + usedSum.tokensOut);

  const state: RoundRuntimeState = {
    roundId,
    sessionId: session.id,
    orchestrator: null as unknown as RoundOrchestrator,
    budgetTracker,
    warnEmitted: false,
  };

  const orchestrator = new RoundOrchestrator({
    loadHistory: async (sessionId) =>
      listTavernMessages(ctx.db, { sessionId, order: "asc" }) as TavernMessageRecord[],
    appendMessage: async (appendInput) =>
      insertTavernMessage(ctx.db, {
        id: randomUUID(),
        sessionId: appendInput.sessionId,
        characterId: appendInput.characterId,
        role: appendInput.role,
        content: appendInput.content,
        tokensIn: appendInput.tokensIn,
        tokensOut: appendInput.tokensOut,
        createdAt: appendInput.createdAt,
      }),
    buildContext: (buildInput) =>
      builder.build({
        speakerCard: buildInput.speakerCard,
        allCards: buildInput.allCards,
        topic: buildInput.topic,
        mode: buildInput.mode,
        history: buildInput.history,
        lastK: buildInput.lastK,
        directorMessage: buildInput.directorMessage,
        userName: buildInput.userName,
        userPersona: buildInput.userPersona,
      }),
    resolveSpeakerRuntime: async (card) => ({
      providerId: card.providerId,
      model: card.model,
      temperature: card.temperature,
      maxTokens: card.maxTokens ?? undefined,
    }),
    streamCompletion: (runInput) =>
      streamCharacterCompletion(runInput),
    estimateTokens: (estimateInput) =>
      budgetTracker.estimateTokens({
        systemPrompt: estimateInput.systemPrompt,
        messages: estimateInput.messages,
      }),
    recordUsage: (usage, estimatedInputTokens) =>
      budgetTracker.recordUsage(usage, estimatedInputTokens),
    shouldCompactBeforeNextRound: (estimatedNextInput) =>
      budgetTracker.shouldCompactBeforeNextRound(estimatedNextInput),
    getBudgetState: () => budgetTracker.getState(),
    compactBeforeNextRound: async () => {
      try {
        await compactTavernHistory({ sessionId: session.id, keepLastK: session.lastK });
        const used = sumTavernMessageTokens(ctx.db, session.id);
        budgetTracker.seed(used.tokensIn + used.tokensOut);
        state.warnEmitted = false;
        // History changed mid-run → nudge the renderer to refresh the transcript
        // and budget readout (carries post-compaction state).
        const compactedState = budgetTracker.getState();
        emit(window, BUDGET_WARN_CHANNEL, {
          sessionId: session.id,
          remainingTokens: compactedState.remainingTokens,
          estimatedNextRoundTokens: 0,
          threshold: budgetTracker.warnThreshold,
          emittedAt: new Date().toISOString(),
          state: compactedState,
        });
        return { status: "compacted", budgetState: compactedState };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const skipped = message.includes("summary_provider_not_configured");
        logger.warn("tavern auto-compaction skipped/failed", error);
        return {
          status: skipped ? "skipped" : "failed",
          budgetState: budgetTracker.getState(),
          error: message,
        };
      }
    },
    onChunk: (event) => {
      const chunkEvent: TavernChunkEvent = {
        roundId: event.roundId,
        sessionId: event.sessionId,
        roundIndex: event.roundIndex,
        turnIndex: event.turnIndex,
        speakerCardId: event.speaker.id,
        speakerName: event.speaker.name,
        delta: event.delta,
        accumulatedText: event.accumulatedText,
        providerId: event.speaker.providerId,
        model: event.speaker.model,
        emittedAt: new Date().toISOString(),
      };
      emit(window, CHUNK_CHANNEL, chunkEvent);
    },
    onTurnDone: (event) => {
      const doneEvent: TavernDoneEvent = {
        kind: "turn",
        roundId: event.roundId,
        sessionId: event.sessionId,
        roundIndex: event.roundIndex,
        turnIndex: event.turnIndex,
        speakerCardId: event.speaker.id,
        messageId: event.message?.id,
        status: event.status,
        usage: event.usage,
        error: event.error,
        finishedAt: new Date().toISOString(),
      };
      emit(window, DONE_CHANNEL, doneEvent);
      maybeEmitBudgetWarning(window, state, event.budgetState);
    },
    onRoundDone: (event) => {
      const roundDone: TavernDoneEvent = {
        kind: "round",
        roundId: event.roundId,
        sessionId: event.sessionId,
        speakerCardId: "",
        status: event.status,
        error: event.error,
        finishedAt: new Date().toISOString(),
      };
      emit(window, DONE_CHANNEL, roundDone);
      activeRounds.delete(event.roundId);
    },
    onBudgetWarning: (event) => {
      maybeEmitBudgetWarning(window, state, event.budgetState, {
        estimatedNextRoundTokens: event.estimatedNextRoundTokens,
      });
    },
  });
  state.orchestrator = orchestrator;
  activeRounds.set(roundId, state);

  void orchestrator
    .run({
      roundId,
      sessionId: session.id,
      mode,
      participants,
      lastK,
      topic: session.topic,
      autoRounds,
      directorMessage: input.directorMessage,
      userName: session.userName,
      userPersona: session.userPersona,
    })
    .catch((error) => {
      logger.warn("tavern round failed unexpectedly", error);
      const doneEvent: TavernDoneEvent = {
        kind: "round",
        roundId,
        sessionId: session.id,
        speakerCardId: "",
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date().toISOString(),
      };
      emit(window, DONE_CHANNEL, doneEvent);
      activeRounds.delete(roundId);
    });

  return { roundId, status: "started" };
}

export function stopTavernRound(
  input: TavernRoundStopInput,
): TavernRoundStopResponse {
  const state = activeRounds.get(input.roundId);
  if (state) {
    state.orchestrator.stop(input.roundId);
  }
  return { roundId: input.roundId, stopped: true };
}

async function* streamCharacterCompletion(
  input: OrchestratorStreamInput,
): AsyncIterable<OrchestratorStreamChunk> {
  const resolvedScene = resolveSceneBinding("tavern", {
    explicitProviderId: input.providerId,
  });
  const providerRecord = resolveProviderRecord(
    resolvedScene.providerId ?? input.providerId,
  );
  if (!providerRecord) {
    yield { type: "error", error: "provider_not_configured" };
    return;
  }
  const apiKey = await resolveApiKey(providerRecord);
  if (!apiKey) {
    yield { type: "error", error: "api_key_missing" };
    return;
  }
  const messages = toLLMCoreMessages(input.messages);
  const stream = streamText({
    providerRecord,
    apiKey,
    model: input.model ?? providerRecord.defaultModel,
    systemPrompt: input.systemPrompt,
    messages,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });
  for await (const chunk of stream) {
    if (chunk.type === "delta" && chunk.textDelta) {
      yield { type: "delta", textDelta: chunk.textDelta };
      continue;
    }
    if (chunk.type === "done") {
      yield { type: "done", usage: chunk.usage };
      continue;
    }
    if (chunk.type === "error") {
      yield { type: "error", error: chunk.error ?? "unknown_error" };
    }
  }
}

function maybeEmitBudgetWarning(
  window: BrowserWindow | null,
  state: RoundRuntimeState,
  budgetState: TokenBudgetState,
  overrides?: { estimatedNextRoundTokens?: number },
): void {
  if (!budgetState.shouldWarn) return;
  if (state.warnEmitted) return;
  state.warnEmitted = true;
  const estimatedNext = overrides?.estimatedNextRoundTokens ?? 0;
  const event: TavernBudgetWarningEvent = {
    sessionId: state.sessionId,
    remainingTokens: budgetState.remainingTokens,
    estimatedNextRoundTokens: estimatedNext,
    threshold: state.budgetTracker.warnThreshold,
    emittedAt: new Date().toISOString(),
    state: budgetState,
  };
  emit(window, BUDGET_WARN_CHANNEL, event);
}
