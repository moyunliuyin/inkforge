import type { DB } from "../db";
import type { SyncMode, TavernCardRecord } from "@inkforge/shared";

type TavernCardRow = {
  id: string;
  name: string;
  persona: string;
  first_mes: string;
  scenario: string;
  mes_example: string;
  avatar_path: string | null;
  provider_id: string;
  model: string;
  temperature: number;
  max_tokens: number | null;
  linked_novel_character_id: string | null;
  sync_mode: string;
  created_at: string;
  updated_at: string;
};

function normalizeSyncMode(value: string): SyncMode {
  if (value === "two-way" || value === "snapshot" || value === "detached") return value;
  return "two-way";
}

function normalizeMaxTokens(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Math.floor(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCardText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function rowToRecord(row: TavernCardRow): TavernCardRecord {
  return {
    id: row.id,
    name: row.name,
    persona: row.persona,
    firstMes: row.first_mes,
    scenario: row.scenario,
    mesExample: row.mes_example,
    avatarPath: row.avatar_path,
    providerId: row.provider_id,
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    linkedNovelCharacterId: row.linked_novel_character_id,
    syncMode: normalizeSyncMode(row.sync_mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateTavernCardRow {
  id: string;
  name: string;
  persona: string;
  firstMes?: string;
  scenario?: string;
  mesExample?: string;
  avatarPath?: string | null;
  providerId: string;
  model: string;
  temperature?: number;
  maxTokens?: number | null;
  linkedNovelCharacterId?: string | null;
  syncMode?: SyncMode;
}

export function insertTavernCard(db: DB, input: CreateTavernCardRow): TavernCardRecord {
  const now = new Date().toISOString();
  const row: TavernCardRow = {
    id: input.id,
    name: input.name,
    persona: input.persona,
    first_mes: normalizeCardText(input.firstMes),
    scenario: normalizeCardText(input.scenario),
    mes_example: normalizeCardText(input.mesExample),
    avatar_path: input.avatarPath ?? null,
    provider_id: input.providerId,
    model: input.model,
    temperature: input.temperature ?? 0.7,
    max_tokens: normalizeMaxTokens(input.maxTokens),
    linked_novel_character_id: input.linkedNovelCharacterId ?? null,
    sync_mode: input.syncMode ?? "two-way",
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO tavern_cards
       (id, name, persona, first_mes, scenario, mes_example, avatar_path, provider_id, model,
        temperature, max_tokens, linked_novel_character_id, sync_mode, created_at, updated_at)
     VALUES (@id, @name, @persona, @first_mes, @scenario, @mes_example, @avatar_path, @provider_id, @model,
             @temperature, @max_tokens, @linked_novel_character_id, @sync_mode, @created_at, @updated_at)`,
  ).run(row);
  return rowToRecord(row);
}

export interface UpdateTavernCardRow {
  id: string;
  name?: string;
  persona?: string;
  firstMes?: string;
  scenario?: string;
  mesExample?: string;
  avatarPath?: string | null;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number | null;
  linkedNovelCharacterId?: string | null;
  syncMode?: SyncMode;
}

export function updateTavernCard(db: DB, input: UpdateTavernCardRow): TavernCardRecord {
  const existing = db
    .prepare(`SELECT * FROM tavern_cards WHERE id = ?`)
    .get(input.id) as TavernCardRow | undefined;
  if (!existing) throw new Error(`TavernCard not found: ${input.id}`);
  const next: TavernCardRow = {
    ...existing,
    name: input.name ?? existing.name,
    persona: input.persona ?? existing.persona,
    first_mes: input.firstMes === undefined ? existing.first_mes : normalizeCardText(input.firstMes),
    scenario: input.scenario === undefined ? existing.scenario : normalizeCardText(input.scenario),
    mes_example:
      input.mesExample === undefined ? existing.mes_example : normalizeCardText(input.mesExample),
    avatar_path: input.avatarPath === undefined ? existing.avatar_path : input.avatarPath,
    provider_id: input.providerId ?? existing.provider_id,
    model: input.model ?? existing.model,
    temperature: input.temperature ?? existing.temperature,
    max_tokens: input.maxTokens === undefined ? existing.max_tokens : normalizeMaxTokens(input.maxTokens),
    linked_novel_character_id:
      input.linkedNovelCharacterId === undefined
        ? existing.linked_novel_character_id
        : input.linkedNovelCharacterId,
    sync_mode: input.syncMode ?? existing.sync_mode,
    updated_at: new Date().toISOString(),
  };
  db.prepare(
    `UPDATE tavern_cards SET
       name = @name, persona = @persona, first_mes = @first_mes, scenario = @scenario,
       mes_example = @mes_example, avatar_path = @avatar_path,
       provider_id = @provider_id, model = @model, temperature = @temperature,
       max_tokens = @max_tokens,
       linked_novel_character_id = @linked_novel_character_id,
       sync_mode = @sync_mode, updated_at = @updated_at
     WHERE id = @id`,
  ).run(next);
  return rowToRecord(next);
}

export function getTavernCardById(db: DB, id: string): TavernCardRecord | null {
  const row = db
    .prepare(`SELECT * FROM tavern_cards WHERE id = ?`)
    .get(id) as TavernCardRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function getTavernCardByLinkedNovelCharacter(
  db: DB,
  novelCharacterId: string,
): TavernCardRecord | null {
  const row = db
    .prepare(`SELECT * FROM tavern_cards WHERE linked_novel_character_id = ?`)
    .get(novelCharacterId) as TavernCardRow | undefined;
  return row ? rowToRecord(row) : null;
}

export interface ListTavernCardsOptions {
  projectId?: string;
}

export function listTavernCards(db: DB, options: ListTavernCardsOptions = {}): TavernCardRecord[] {
  // Cards without a project binding are global; cards linked to a character inherit that character's project.
  // When projectId is given, return: cards linked to a novel-character in that project PLUS unbound cards.
  if (options.projectId) {
    const rows = db
      .prepare(
        `SELECT tc.* FROM tavern_cards tc
         LEFT JOIN characters c ON c.id = tc.linked_novel_character_id
         WHERE tc.linked_novel_character_id IS NULL OR c.project_id = ?
         ORDER BY tc.updated_at DESC`,
      )
      .all(options.projectId) as TavernCardRow[];
    return rows.map(rowToRecord);
  }
  const rows = db
    .prepare(`SELECT * FROM tavern_cards ORDER BY updated_at DESC`)
    .all() as TavernCardRow[];
  return rows.map(rowToRecord);
}

export function deleteTavernCard(db: DB, id: string): void {
  const tx = db.transaction((cardId: string) => {
    db.prepare(`UPDATE characters SET linked_tavern_card_id = NULL WHERE linked_tavern_card_id = ?`)
      .run(cardId);
    db.prepare(`DELETE FROM tavern_cards WHERE id = ?`).run(cardId);
  });
  tx(id);
}

export function clearTavernCardLink(db: DB, cardId: string): void {
  db.prepare(
    `UPDATE tavern_cards SET linked_novel_character_id = NULL, updated_at = ? WHERE id = ?`,
  ).run(new Date().toISOString(), cardId);
}
