import { randomUUID } from "crypto";
import {
  deleteTavernSession,
  getTavernSessionById,
  insertTavernMessage,
  insertTavernSession,
  listTavernMessages,
  listTavernSessions,
} from "@inkforge/storage";
import type {
  TavernDirectorPostInput,
  TavernDirectorPostResponse,
  TavernMessageListInput,
  TavernMessageRecord,
  TavernSessionCreateInput,
  TavernSessionDeleteInput,
  TavernSessionGetInput,
  TavernSessionListInput,
  TavernSessionRecord,
  TavernUserPostInput,
  TavernUserPostResponse,
} from "@inkforge/shared";
import { getAppContext } from "./app-state";
import { isTavernSessionRunning } from "./tavern-round-service";

export function createTavernSession(
  input: TavernSessionCreateInput,
): TavernSessionRecord {
  const ctx = getAppContext();
  if (!input.topic || input.topic.trim().length === 0) {
    throw new Error("session topic is required");
  }
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("session title is required");
  }
  if (!Number.isFinite(input.budgetTokens) || input.budgetTokens <= 0) {
    throw new Error("budgetTokens must be positive");
  }
  return insertTavernSession(ctx.db, {
    id: randomUUID(),
    projectId: input.projectId,
    title: input.title.trim(),
    topic: input.topic.trim(),
    mode: input.mode,
    budgetTokens: Math.round(input.budgetTokens),
    summaryProviderId: input.summaryProviderId ?? null,
    summaryModel: input.summaryModel ?? null,
    lastK: input.lastK ?? 6,
    userName: input.userName?.trim() || null,
    userPersona: input.userName?.trim() ? input.userPersona?.trim() || null : null,
  });
}

export function getTavernSession(
  input: TavernSessionGetInput,
): TavernSessionRecord | null {
  const ctx = getAppContext();
  return getTavernSessionById(ctx.db, input.sessionId);
}

export function listTavernSessionsByProject(
  input: TavernSessionListInput,
): TavernSessionRecord[] {
  const ctx = getAppContext();
  return listTavernSessions(ctx.db, {
    projectId: input.projectId,
    limit: input.limit,
  });
}

export function deleteTavernSessionRecord(
  input: TavernSessionDeleteInput,
): { sessionId: string } {
  const ctx = getAppContext();
  deleteTavernSession(ctx.db, input.sessionId);
  return { sessionId: input.sessionId };
}

export function listTavernMessagesForSession(
  input: TavernMessageListInput,
): TavernMessageRecord[] {
  const ctx = getAppContext();
  return listTavernMessages(ctx.db, {
    sessionId: input.sessionId,
    limit: input.limit,
    beforeCreatedAt: input.beforeCreatedAt,
    order: input.order,
  });
}

export function postDirectorMessage(
  input: TavernDirectorPostInput,
): TavernDirectorPostResponse {
  const ctx = getAppContext();
  const session = getTavernSessionById(ctx.db, input.sessionId);
  if (!session) throw new Error(`Tavern session not found: ${input.sessionId}`);
  const text = input.content?.trim() ?? "";
  if (text.length === 0) throw new Error("director content cannot be empty");
  const message = insertTavernMessage(ctx.db, {
    id: randomUUID(),
    sessionId: input.sessionId,
    characterId: null,
    role: "director",
    content: text,
    tokensIn: 0,
    tokensOut: 0,
  });
  return { messageId: message.id };
}

export function postUserMessage(
  input: TavernUserPostInput,
): TavernUserPostResponse {
  const ctx = getAppContext();
  const session = getTavernSessionById(ctx.db, input.sessionId);
  if (!session) throw new Error(`Tavern session not found: ${input.sessionId}`);
  if (!session.userName || session.userName.trim().length === 0) {
    throw new Error("session has no user persona; enable it when creating the session");
  }
  const text = input.content?.trim() ?? "";
  if (text.length === 0) throw new Error("user message cannot be empty");
  if (isTavernSessionRunning(input.sessionId)) {
    throw new Error("tavern_round_already_running: wait for the current round to settle");
  }
  const message = insertTavernMessage(ctx.db, {
    id: randomUUID(),
    sessionId: input.sessionId,
    characterId: null,
    role: "user",
    content: text,
    tokensIn: 0,
    tokensOut: 0,
  });
  return { messageId: message.id };
}
