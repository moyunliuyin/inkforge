import type { DB } from "../db";
import type { TavernMode, TavernSessionRecord } from "@inkforge/shared";

type TavernSessionRow = {
  id: string;
  project_id: string;
  title: string;
  topic: string;
  mode: string;
  budget_tokens: number;
  summary_provider_id: string | null;
  summary_model: string | null;
  last_k: number;
  user_name: string | null;
  user_persona: string | null;
  created_at: string;
};

function normalizeMode(value: string): TavernMode {
  if (value === "director" || value === "auto") return value;
  return "auto";
}

function rowToRecord(row: TavernSessionRow): TavernSessionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    topic: row.topic,
    mode: normalizeMode(row.mode),
    budgetTokens: row.budget_tokens,
    summaryProviderId: row.summary_provider_id,
    summaryModel: row.summary_model,
    lastK: row.last_k,
    userName: row.user_name,
    userPersona: row.user_persona,
    createdAt: row.created_at,
  };
}

export interface CreateTavernSessionInput {
  id: string;
  projectId: string;
  title: string;
  topic: string;
  mode: TavernMode;
  budgetTokens: number;
  summaryProviderId?: string | null;
  summaryModel?: string | null;
  lastK?: number;
  userName?: string | null;
  userPersona?: string | null;
  createdAt?: string;
}

export function insertTavernSession(
  db: DB,
  input: CreateTavernSessionInput,
): TavernSessionRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const lastK = input.lastK ?? 6;
  const row: TavernSessionRow = {
    id: input.id,
    project_id: input.projectId,
    title: input.title,
    topic: input.topic,
    mode: input.mode,
    budget_tokens: input.budgetTokens,
    summary_provider_id: input.summaryProviderId ?? null,
    summary_model: input.summaryModel ?? null,
    last_k: lastK,
    user_name: input.userName ?? null,
    user_persona: input.userPersona ?? null,
    created_at: createdAt,
  };
  db.prepare(
    `INSERT INTO tavern_sessions
       (id, project_id, title, topic, mode, budget_tokens,
        summary_provider_id, summary_model, last_k, user_name, user_persona, created_at)
     VALUES (@id, @project_id, @title, @topic, @mode, @budget_tokens,
             @summary_provider_id, @summary_model, @last_k, @user_name, @user_persona, @created_at)`,
  ).run(row);
  return rowToRecord(row);
}

export function getTavernSessionById(
  db: DB,
  id: string,
): TavernSessionRecord | null {
  const row = db
    .prepare(`SELECT * FROM tavern_sessions WHERE id = ?`)
    .get(id) as TavernSessionRow | undefined;
  return row ? rowToRecord(row) : null;
}

export interface ListTavernSessionsOptions {
  projectId: string;
  limit?: number;
}

export function listTavernSessions(
  db: DB,
  options: ListTavernSessionsOptions,
): TavernSessionRecord[] {
  const limit = options.limit ?? 200;
  const rows = db
    .prepare(
      `SELECT * FROM tavern_sessions
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(options.projectId, limit) as TavernSessionRow[];
  return rows.map(rowToRecord);
}

export function deleteTavernSession(db: DB, id: string): void {
  db.prepare(`DELETE FROM tavern_sessions WHERE id = ?`).run(id);
}
