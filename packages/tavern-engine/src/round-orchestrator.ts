import type {
  SkillRunUsage,
  TavernCardRecord,
  TavernMessageRecord,
  TavernMode,
  TokenBudgetState,
} from "@inkforge/shared";
import { TavernRuntimeError } from "./errors";
import type { LLMMessage } from "./context-builder";

export interface OrchestratorStreamInput {
  providerId: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt: string;
  messages: LLMMessage[];
}

export interface OrchestratorStreamChunk {
  type: "delta" | "done" | "error";
  textDelta?: string;
  error?: string;
  usage?: SkillRunUsage;
}

export interface OrchestratorStartContext {
  roundId: string;
  sessionId: string;
  mode: TavernMode;
  participants: TavernCardRecord[];
  totalRounds: number;
  topic: string;
}

export interface OrchestratorSpeakerContext {
  roundId: string;
  sessionId: string;
  roundIndex: number;
  totalRounds: number;
  turnIndex: number;
  speaker: TavernCardRecord;
  systemPrompt: string;
  messages: LLMMessage[];
  estimatedInputTokens: number;
}

export interface OrchestratorChunkEvent {
  roundId: string;
  sessionId: string;
  roundIndex: number;
  turnIndex: number;
  speaker: TavernCardRecord;
  delta: string;
  accumulatedText: string;
}

export interface OrchestratorTurnDoneEvent {
  roundId: string;
  sessionId: string;
  roundIndex: number;
  turnIndex: number;
  speaker: TavernCardRecord;
  status: "completed" | "failed" | "stopped";
  message: TavernMessageRecord | null;
  usage?: SkillRunUsage;
  error?: string;
  budgetState: TokenBudgetState;
}

export interface OrchestratorRoundDoneEvent {
  roundId: string;
  sessionId: string;
  status: "completed" | "failed" | "stopped";
  error?: string;
}

export interface OrchestratorBudgetWarning {
  roundId: string;
  sessionId: string;
  budgetState: TokenBudgetState;
  estimatedNextRoundTokens: number;
  threshold: number;
}

export interface RoundOrchestratorDeps {
  loadHistory: (sessionId: string) => Promise<TavernMessageRecord[]>;
  appendMessage: (input: {
    sessionId: string;
    characterId: string;
    role: "character";
    content: string;
    tokensIn: number;
    tokensOut: number;
    createdAt: string;
  }) => Promise<TavernMessageRecord>;
  buildContext: (input: {
    speakerCard: TavernCardRecord;
    allCards: TavernCardRecord[];
    topic: string;
    mode: TavernMode;
    history: TavernMessageRecord[];
    lastK: number;
    directorMessage?: string;
  }) => { systemPrompt: string; messages: LLMMessage[] };
  resolveSpeakerRuntime: (card: TavernCardRecord) => Promise<{
    providerId: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  }>;
  streamCompletion: (input: OrchestratorStreamInput) => AsyncIterable<OrchestratorStreamChunk>;
  estimateTokens: (input: { systemPrompt: string; messages: LLMMessage[] }) => number;
  recordUsage: (
    usage: SkillRunUsage | undefined,
    estimatedInputTokens: number,
  ) => TokenBudgetState;
  shouldCompactBeforeNextRound: (estimatedNextInputTokens: number) => boolean;
  /** Stream watchdog knobs (defaults 1s poll / 45s idle) — overridable for tests. */
  streamPollMs?: number;
  streamIdleTimeoutMs?: number;
  getBudgetState?: () => TokenBudgetState;
  compactBeforeNextRound?: (input: {
    roundId: string;
    sessionId: string;
    completedRoundIndex: number;
    nextRoundIndex: number;
    estimatedNextRoundTokens: number;
  }) => Promise<{
    status: "compacted" | "skipped" | "failed";
    budgetState: TokenBudgetState;
    error?: string;
  }>;
  onStart?: (event: OrchestratorStartContext) => void;
  onChunk: (event: OrchestratorChunkEvent) => void;
  onTurnDone: (event: OrchestratorTurnDoneEvent) => void;
  onRoundDone: (event: OrchestratorRoundDoneEvent) => void;
  onBudgetWarning?: (event: OrchestratorBudgetWarning) => void;
}

export interface RoundOrchestratorInput {
  roundId: string;
  sessionId: string;
  mode: TavernMode;
  participants: TavernCardRecord[];
  lastK: number;
  topic: string;
  autoRounds?: number;
  directorMessage?: string;
}

export class RoundOrchestrator {
  private readonly deps: RoundOrchestratorDeps;
  private readonly cancelled = new Set<string>();
  private autoCompactions = 0;
  private readonly maxAutoCompactionsPerRun = 1;

  constructor(deps: RoundOrchestratorDeps) {
    this.deps = deps;
  }

  stop(roundId: string): void {
    this.cancelled.add(roundId);
  }

  async run(input: RoundOrchestratorInput): Promise<void> {
    const { roundId, sessionId, mode, participants, lastK, topic } = input;
    if (participants.length === 0) {
      throw new TavernRuntimeError("no_participants", "participants is empty");
    }
    this.autoCompactions = 0;
    const totalRounds = Math.max(1, input.autoRounds ?? 1);
    this.deps.onStart?.({
      roundId,
      sessionId,
      mode,
      participants,
      totalRounds,
      topic,
    });

    try {
      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
        if (this.cancelled.has(roundId)) break;
        for (let turnIndex = 0; turnIndex < participants.length; turnIndex += 1) {
          if (this.cancelled.has(roundId)) break;
          const speaker = participants[turnIndex];
          const history = await this.deps.loadHistory(sessionId);
          const { systemPrompt, messages } = this.deps.buildContext({
            speakerCard: speaker,
            allCards: participants,
            topic,
            mode,
            history,
            lastK,
            directorMessage: input.directorMessage,
          });
          const estimatedInput = this.deps.estimateTokens({ systemPrompt, messages });
          const runtime = await this.deps.resolveSpeakerRuntime(speaker);

          const turnContext: OrchestratorSpeakerContext = {
            roundId,
            sessionId,
            roundIndex,
            turnIndex,
            totalRounds,
            speaker,
            systemPrompt,
            messages,
            estimatedInputTokens: estimatedInput,
          };

          const turnResult = await this.runTurn(turnContext, runtime);
          if (turnResult.status === "stopped") break;
          if (turnResult.status === "failed") {
            this.deps.onRoundDone({
              roundId,
              sessionId,
              status: "failed",
              error: turnResult.error,
            });
            return;
          }
        }
        if (this.cancelled.has(roundId)) break;
        if (roundIndex < totalRounds - 1) {
          await this.maybeCompactBeforeNextRound(input, roundIndex);
        }
      }
      this.deps.onRoundDone({
        roundId,
        sessionId,
        status: this.cancelled.has(roundId) ? "stopped" : "completed",
      });
    } finally {
      this.cancelled.delete(roundId);
    }
  }

  private async runTurn(
    ctx: OrchestratorSpeakerContext,
    runtime: {
      providerId: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<OrchestratorTurnDoneEvent> {
    const { roundId, sessionId, roundIndex, turnIndex, speaker, systemPrompt, messages } = ctx;
    let accumulated = "";
    let usage: SkillRunUsage | undefined;

    try {
      const stream = this.deps.streamCompletion({
        providerId: runtime.providerId,
        model: runtime.model,
        temperature: runtime.temperature,
        maxTokens: runtime.maxTokens,
        systemPrompt,
        messages,
      });
      const iterator = stream[Symbol.asyncIterator]();
      const TICK = Symbol("tick");
      const TICK_MS = this.deps.streamPollMs ?? 1_000;
      const STREAM_IDLE_LIMIT_MS = this.deps.streamIdleTimeoutMs ?? 45_000;
      let idleElapsed = 0;
      while (true) {
        if (this.cancelled.has(roundId)) {
          void iterator.return?.();
          const stoppedBudget = this.deps.recordUsage(usage, ctx.estimatedInputTokens);
          const event: OrchestratorTurnDoneEvent = {
            roundId,
            sessionId,
            roundIndex,
            turnIndex,
            speaker,
            status: "stopped",
            message: null,
            usage,
            budgetState: stoppedBudget,
          };
          this.deps.onTurnDone(event);
          return event;
        }
        // Race each pull against a poll tick: a hung stream can never block the
        // round forever, and stop() stays responsive. Idle budget resets on data.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const tick = new Promise<typeof TICK>((resolve) => {
          timer = setTimeout(() => resolve(TICK), TICK_MS);
        });
        let step: IteratorResult<OrchestratorStreamChunk> | typeof TICK;
        try {
          step = await Promise.race([iterator.next(), tick]);
        } finally {
          clearTimeout(timer);
        }
        if (step === TICK) {
          idleElapsed += TICK_MS;
          if (idleElapsed >= STREAM_IDLE_LIMIT_MS) {
            void iterator.return?.();
            throw new TavernRuntimeError(
              "tavern_stream_idle_timeout",
              "stream produced no data before idle timeout",
            );
          }
          continue;
        }
        idleElapsed = 0;
        if (step.done) break;
        const chunk = step.value;
        if (chunk.type === "delta" && chunk.textDelta) {
          accumulated += chunk.textDelta;
          this.deps.onChunk({
            roundId,
            sessionId,
            roundIndex,
            turnIndex,
            speaker,
            delta: chunk.textDelta,
            accumulatedText: accumulated,
          });
          continue;
        }
        if (chunk.type === "done") {
          usage = chunk.usage;
          continue;
        }
        if (chunk.type === "error") {
          throw new TavernRuntimeError(
            "tavern_stream_error",
            chunk.error ?? "unknown_stream_error",
          );
        }
      }

      const trimmed = accumulated.trim();
      const tokensIn = usage?.inputTokens ?? ctx.estimatedInputTokens;
      const tokensOut = usage?.outputTokens ?? 0;
      let message: TavernMessageRecord | null = null;
      if (trimmed.length > 0) {
        message = await this.deps.appendMessage({
          sessionId,
          characterId: speaker.id,
          role: "character",
          content: trimmed,
          tokensIn,
          tokensOut,
          createdAt: new Date().toISOString(),
        });
      }
      const budgetState = this.deps.recordUsage(usage, ctx.estimatedInputTokens);
      const event: OrchestratorTurnDoneEvent = {
        roundId,
        sessionId,
        roundIndex,
        turnIndex,
        speaker,
        status: "completed",
        message,
        usage,
        budgetState,
      };
      this.deps.onTurnDone(event);
      return event;
    } catch (error) {
      const budgetState = this.deps.recordUsage(usage, ctx.estimatedInputTokens);
      const event: OrchestratorTurnDoneEvent = {
        roundId,
        sessionId,
        roundIndex,
        turnIndex,
        speaker,
        status: "failed",
        message: null,
        usage,
        error: error instanceof Error ? error.message : String(error),
        budgetState,
      };
      this.deps.onTurnDone(event);
      return event;
    }
  }

  private currentBudgetState(): TokenBudgetState {
    return this.deps.getBudgetState
      ? this.deps.getBudgetState()
      : this.deps.recordUsage(undefined, 0);
  }

  private async estimateNextRoundInputTokens(input: RoundOrchestratorInput): Promise<number> {
    const history = await this.deps.loadHistory(input.sessionId);
    let total = 0;
    for (const speaker of input.participants) {
      const { systemPrompt, messages } = this.deps.buildContext({
        speakerCard: speaker,
        allCards: input.participants,
        topic: input.topic,
        mode: input.mode,
        history,
        lastK: input.lastK,
        directorMessage: input.directorMessage,
      });
      total += this.deps.estimateTokens({ systemPrompt, messages });
    }
    return total;
  }

  /**
   * Between rounds: if the projected next-round input would blow the budget,
   * trigger one compaction (capped) via the injected hook, then warn only if
   * still tight. Never loops — the cap guarantees forward progress.
   */
  private async maybeCompactBeforeNextRound(
    input: RoundOrchestratorInput,
    completedRoundIndex: number,
  ): Promise<void> {
    const { roundId, sessionId } = input;
    const estimatedNext = await this.estimateNextRoundInputTokens(input);
    if (!this.deps.shouldCompactBeforeNextRound(estimatedNext)) return;

    if (this.deps.compactBeforeNextRound && this.autoCompactions < this.maxAutoCompactionsPerRun) {
      this.autoCompactions += 1;
      // Hard timeout: a hung summary stream must never block the round loop
      // (which would also wedge stop() since cancellation is checked between rounds).
      const COMPACT_TIMEOUT_MS = 60_000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const result = await Promise.race([
        this.deps.compactBeforeNextRound({
          roundId,
          sessionId,
          completedRoundIndex,
          nextRoundIndex: completedRoundIndex + 1,
          estimatedNextRoundTokens: estimatedNext,
        }),
        new Promise<{ status: "skipped"; budgetState: TokenBudgetState }>((resolve) => {
          timer = setTimeout(
            () => resolve({ status: "skipped", budgetState: this.currentBudgetState() }),
            COMPACT_TIMEOUT_MS,
          );
        }),
      ]).finally(() => clearTimeout(timer));
      const afterEstimate =
        result.status === "compacted"
          ? await this.estimateNextRoundInputTokens(input)
          : estimatedNext;
      if (result.status !== "compacted" || this.deps.shouldCompactBeforeNextRound(afterEstimate)) {
        this.deps.onBudgetWarning?.({
          roundId,
          sessionId,
          budgetState: result.budgetState,
          estimatedNextRoundTokens: afterEstimate,
          threshold: 0,
        });
      }
      return;
    }

    this.deps.onBudgetWarning?.({
      roundId,
      sessionId,
      budgetState: this.currentBudgetState(),
      estimatedNextRoundTokens: estimatedNext,
      threshold: 0,
    });
  }
}
