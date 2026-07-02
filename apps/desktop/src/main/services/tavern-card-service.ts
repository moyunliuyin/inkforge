import { randomUUID } from "crypto";
import {
  deleteTavernCard,
  getTavernCardById,
  insertTavernCard,
  listTavernCards,
  updateTavernCard,
} from "@inkforge/storage";
import type {
  TavernCardCreateInput,
  TavernCardDeleteInput,
  TavernCardGetInput,
  TavernCardListInput,
  TavernCardRecord,
  TavernCardUpdateInput,
} from "@inkforge/shared";
import { getAppContext } from "./app-state";

export function createTavernCard(input: TavernCardCreateInput): TavernCardRecord {
  const ctx = getAppContext();
  return insertTavernCard(ctx.db, {
    id: randomUUID(),
    name: input.name,
    persona: input.persona,
    firstMes: input.firstMes ?? "",
    scenario: input.scenario ?? "",
    mesExample: input.mesExample ?? "",
    avatarPath: input.avatarPath ?? null,
    providerId: input.providerId,
    model: input.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens ?? null,
    linkedNovelCharacterId: input.linkedNovelCharacterId ?? null,
    syncMode: input.syncMode ?? "two-way",
  });
}

export function updateTavernCardRecord(input: TavernCardUpdateInput): TavernCardRecord {
  const ctx = getAppContext();
  const { id, ...patch } = input;
  return updateTavernCard(ctx.db, { id, ...patch });
}

export function getTavernCardRecord(input: TavernCardGetInput): TavernCardRecord | null {
  const ctx = getAppContext();
  return getTavernCardById(ctx.db, input.id);
}

export function listTavernCardRecords(input: TavernCardListInput = {}): TavernCardRecord[] {
  const ctx = getAppContext();
  return listTavernCards(ctx.db, { projectId: input.projectId });
}

export function deleteTavernCardRecord(input: TavernCardDeleteInput): { id: string } {
  const ctx = getAppContext();
  deleteTavernCard(ctx.db, input.id);
  return { id: input.id };
}
