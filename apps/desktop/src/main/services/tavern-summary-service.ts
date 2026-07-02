import {
  SummaryCompactor,
  type CompactorStreamInput,
} from "@inkforge/tavern-engine";
import {
  deleteTavernMessages,
  getTavernCardById,
  getTavernSessionById,
  insertTavernMessage,
  listTavernMessages,
} from "@inkforge/storage";
import type {
  CompactResult,
  TavernMessageRecord,
  TavernSummaryCompactInput,
} from "@inkforge/shared";
import type { LLMMessage as LLMCoreMessage } from "@inkforge/llm-core";
import { getAppContext } from "./app-state";
import {
  resolveApiKey,
  resolveProviderRecord,
  streamText,
} from "./llm-runtime";

function toLLMCoreMessages(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): LLMCoreMessage[] {
  return messages.map((msg) => {
    if (msg.role === "assistant") {
      return { role: "assistant", content: msg.content };
    }
    return { role: "user", content: msg.content };
  });
}

export async function compactTavernHistory(
  input: TavernSummaryCompactInput,
): Promise<CompactResult> {
  const ctx = getAppContext();
  const session = getTavernSessionById(ctx.db, input.sessionId);
  if (!session) throw new Error(`Tavern session not found: ${input.sessionId}`);
  if (!session.summaryProviderId) {
    throw new Error(
      "summary_provider_not_configured: create the session with a summary provider before compacting.",
    );
  }

  const compactor = new SummaryCompactor({
    resolveSummaryProvider: async () => ({
      providerId: session.summaryProviderId ?? "",
      model: session.summaryModel ?? "",
    }),
    streamCompletion: (streamInput: CompactorStreamInput) =>
      streamSummaryCompletion(streamInput),
    replaceMessages: async (replaceInput) => {
      const inserted = ctx.db.transaction(() => {
        deleteTavernMessages(ctx.db, replaceInput.deleteMessageIds);
        return insertTavernMessage(ctx.db, {
          id: replaceInput.insertSummary.id,
          sessionId: replaceInput.sessionId,
          characterId: null,
          role: "summary",
          content: replaceInput.insertSummary.content,
          tokensIn: replaceInput.insertSummary.tokensIn,
          tokensOut: replaceInput.insertSummary.tokensOut,
          createdAt: replaceInput.insertSummary.createdAt,
        });
      })();
      return inserted;
    },
    formatSpeakerName: (message) => {
      if (message.role === "director") return "导演";
      if (message.role === "summary") return "历史摘要";
      if (message.role === "user") return session.userName?.trim() || "User";
      if (message.characterId) {
        const card = getTavernCardById(ctx.db, message.characterId);
        if (card) return card.name;
      }
      return "未知角色";
    },
  });

  const history: TavernMessageRecord[] = listTavernMessages(ctx.db, {
    sessionId: session.id,
    order: "asc",
  });

  return compactor.compact({
    sessionId: session.id,
    topic: session.topic,
    history,
    keepLastK: Math.max(0, Math.round(input.keepLastK)),
  });
}

async function* streamSummaryCompletion(
  input: CompactorStreamInput,
): AsyncIterable<{
  type: "delta" | "done" | "error";
  textDelta?: string;
  error?: string;
  usage?: CompactResult["usage"];
}> {
  const providerRecord = resolveProviderRecord(input.providerId);
  if (!providerRecord) {
    yield { type: "error", error: "summary_provider_not_configured" };
    return;
  }
  const apiKey = await resolveApiKey(providerRecord);
  if (!apiKey) {
    yield { type: "error", error: "summary_api_key_missing" };
    return;
  }
  const messages = toLLMCoreMessages(input.messages);
  const stream = streamText({
    providerRecord,
    apiKey,
    model: input.model || providerRecord.defaultModel,
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
