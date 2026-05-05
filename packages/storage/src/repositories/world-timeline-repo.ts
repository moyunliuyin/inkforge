import { randomUUID } from "node:crypto";
import type { DB } from "../db";
import type {
  WorldGraphEndpointKind,
  WorldTimelineAction,
  WorldTimelineEventRecord,
  WorldTimelineSaveInput,
} from "@inkforge/shared";

interface Row {
  id: string;
  project_id: string;
  entry_kind: string;
  entry_id: string;
  chapter_id: string | null;
  chapter_order: number;
  inner_order: number;
  action: string;
  owner_kind: string | null;
  owner_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

function toRecord(row: Row): WorldTimelineEventRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    entryKind: row.entry_kind as WorldGraphEndpointKind,
    entryId: row.entry_id,
    chapterId: row.chapter_id,
    chapterOrder: row.chapter_order,
    innerOrder: row.inner_order,
    action: row.action as WorldTimelineAction,
    ownerKind: row.owner_kind as WorldGraphEndpointKind | null,
    ownerId: row.owner_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTimelineEvents(
  db: DB,
  params: {
    projectId: string;
    entryKind?: WorldGraphEndpointKind;
    entryId?: string;
    upToChapterOrder?: number;
  },
): WorldTimelineEventRecord[] {
  const where: string[] = ["project_id = @projectId"];
  if (params.entryKind && params.entryId) {
    where.push("entry_kind = @entryKind AND entry_id = @entryId");
  }
  if (typeof params.upToChapterOrder === "number") {
    where.push("chapter_order <= @upToChapterOrder");
  }
  const sql = `
    SELECT * FROM world_timeline_events
    WHERE ${where.join(" AND ")}
    ORDER BY chapter_order ASC, inner_order ASC, created_at ASC
  `;
  const rows = db.prepare(sql).all(params) as Row[];
  return rows.map(toRecord);
}

export function saveTimelineEvent(
  db: DB,
  input: WorldTimelineSaveInput,
): WorldTimelineEventRecord {
  const now = new Date().toISOString();
  if (input.id) {
    const existing = db
      .prepare(`SELECT created_at FROM world_timeline_events WHERE id = ?`)
      .get(input.id) as { created_at: string } | undefined;
    if (!existing) throw new Error(`Timeline event not found: ${input.id}`);
    db.prepare(`
      UPDATE world_timeline_events SET
        chapter_id = @chapterId,
        chapter_order = @chapterOrder,
        inner_order = @innerOrder,
        action = @action,
        owner_kind = @ownerKind,
        owner_id = @ownerId,
        note = @note,
        updated_at = @now
      WHERE id = @id
    `).run({ ...input, now });
    const row = db
      .prepare(`SELECT * FROM world_timeline_events WHERE id = ?`)
      .get(input.id) as Row;
    return toRecord(row);
  }
  const id = randomUUID();
  db.prepare(`
    INSERT INTO world_timeline_events
      (id, project_id, entry_kind, entry_id, chapter_id, chapter_order,
       inner_order, action, owner_kind, owner_id, note, created_at, updated_at)
    VALUES
      (@id, @projectId, @entryKind, @entryId, @chapterId, @chapterOrder,
       @innerOrder, @action, @ownerKind, @ownerId, @note, @now, @now)
  `).run({ ...input, id, now });
  const row = db
    .prepare(`SELECT * FROM world_timeline_events WHERE id = ?`)
    .get(id) as Row;
  return toRecord(row);
}

export function deleteTimelineEvent(db: DB, id: string): void {
  db.prepare(`DELETE FROM world_timeline_events WHERE id = ?`).run(id);
}
