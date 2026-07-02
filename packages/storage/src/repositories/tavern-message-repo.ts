import type { DB } from "../db";
import type { TavernMessageRecord, TavernRole } from "@inkforge/shared";

type TavernMessageRow = {
  id: string;
  session_id: string;
  character_id: string | null;
  role: string;
  content: string;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
};

function normalizeRole(value: string): TavernRole {
  if (value === "director" || value === "character" || value === "summary" || value === "user") {
    return value;
  }
  return "character";
}

function rowToRecord(row: TavernMessageRow): TavernMessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    characterId: row.character_id,
    role: normalizeRole(row.role),
    content: row.content,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    createdAt: row.created_at,
  };
}

export interface InsertTavernMessageInput {
  id: string;
  sessionId: string;
  characterId: string | null;
  role: TavernRole;
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  createdAt?: string;
}

export function insertTavernMessage(
  db: DB,
  input: InsertTavernMessageInput,
): TavernMessageRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const row: TavernMessageRow = {
    id: input.id,
    session_id: input.sessionId,
    character_id: input.characterId,
    role: input.role,
    content: input.content,
    tokens_in: input.tokensIn ?? 0,
    tokens_out: input.tokensOut ?? 0,
    created_at: createdAt,
  };
  db.prepare(
    `INSERT INTO tavern_messages
       (id, session_id, character_id, role, content, tokens_in, tokens_out, created_at)
     VALUES (@id, @session_id, @character_id, @role, @content, @tokens_in, @tokens_out, @created_at)`,
  ).run(row);
  return rowToRecord(row);
}

export interface ListTavernMessagesOptions {
  sessionId: string;
  limit?: number;
  beforeCreatedAt?: string;
  order?: "asc" | "desc";
}

export function listTavernMessages(
  db: DB,
  options: ListTavernMessagesOptions,
): TavernMessageRecord[] {
  const order = options.order ?? "asc";
  const limit = options.limit ?? 500;
  const clauses: string[] = [`session_id = ?`];
  const params: Array<string | number> = [options.sessionId];
  if (options.beforeCreatedAt) {
    clauses.push(`created_at < ?`);
    params.push(options.beforeCreatedAt);
  }
  const sql = `SELECT * FROM tavern_messages
               WHERE ${clauses.join(" AND ")}
               ORDER BY created_at ${order === "desc" ? "DESC, rowid DESC" : "ASC, rowid ASC"}
               LIMIT ?`;
  const rows = db.prepare(sql).all(...params, limit) as TavernMessageRow[];
  return rows.map(rowToRecord);
}

export function sumTavernMessageTokens(
  db: DB,
  sessionId: string,
): { tokensIn: number; tokensOut: number } {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(tokens_in), 0)  AS tokens_in,
         COALESCE(SUM(tokens_out), 0) AS tokens_out
       FROM tavern_messages
       WHERE session_id = ?`,
    )
    .get(sessionId) as { tokens_in: number; tokens_out: number } | undefined;
  return {
    tokensIn: row?.tokens_in ?? 0,
    tokensOut: row?.tokens_out ?? 0,
  };
}

export function deleteTavernMessages(db: DB, ids: string[]): number {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(", ");
  const stmt = db.prepare(
    `DELETE FROM tavern_messages WHERE id IN (${placeholders})`,
  );
  const info = stmt.run(...ids);
  return Number(info.changes ?? 0);
}
