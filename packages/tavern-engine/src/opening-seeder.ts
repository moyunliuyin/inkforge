import type { TavernCardRecord, TavernMessageRecord } from "@inkforge/shared";
import { renderCardText } from "./context-builder";

export interface OpeningSeed {
  characterId: string;
  content: string;
  createdAt: string;
}

/**
 * First advance on an empty transcript seeds each participant's firstMes as
 * that character's opening message. Non-empty history → no seeds (prevents
 * double-posting on later rounds). createdAt increments by participant order
 * so the display order is stable.
 */
export function buildOpeningSeedMessages(input: {
  participants: TavernCardRecord[];
  history: TavernMessageRecord[];
  userName?: string | null;
  baseTimeMs?: number;
}): OpeningSeed[] {
  if (input.history.length > 0) return [];
  const base = input.baseTimeMs ?? Date.now();
  const seeds: OpeningSeed[] = [];
  for (const card of input.participants) {
    const text = (card.firstMes ?? "").trim();
    if (!text) continue;
    seeds.push({
      characterId: card.id,
      content: renderCardText(text, card.name, input.userName),
      createdAt: new Date(base + seeds.length).toISOString(),
    });
  }
  return seeds;
}
