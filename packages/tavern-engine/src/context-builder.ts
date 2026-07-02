import type {
  TavernCardRecord,
  TavernMessageRecord,
  TavernMode,
} from "@inkforge/shared";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface BuildContextInput {
  speakerCard: TavernCardRecord;
  allCards: TavernCardRecord[];
  topic: string;
  mode: TavernMode;
  history: TavernMessageRecord[];
  lastK: number;
  directorMessage?: string;
  extraSystem?: string;
}

export interface BuiltContext {
  systemPrompt: string;
  messages: LLMMessage[];
  visibleMessageIds: string[];
}

function summarizeMessages(history: TavernMessageRecord[]): TavernMessageRecord[] {
  return history.filter((msg) => msg.role === "summary");
}

function nonSummaryMessages(history: TavernMessageRecord[]): TavernMessageRecord[] {
  return history.filter((msg) => msg.role !== "summary");
}

function cardsByIdMap(cards: TavernCardRecord[]): Map<string, TavernCardRecord> {
  const map = new Map<string, TavernCardRecord>();
  for (const card of cards) map.set(card.id, card);
  return map;
}

function speakerLabel(
  message: TavernMessageRecord,
  cards: Map<string, TavernCardRecord>,
): string {
  if (message.role === "director") return "导演";
  if (message.role === "summary") return "历史摘要";
  if (message.characterId && cards.has(message.characterId)) {
    const card = cards.get(message.characterId);
    if (card) return card.name;
  }
  return "未知角色";
}

/** Replace the {{char}} macro with the card's name. {{user}} is deferred to user-persona work. */
export function renderCardText(text: string, charName: string): string {
  return text.replaceAll("{{char}}", charName);
}

export class ContextBuilder {
  build(input: BuildContextInput): BuiltContext {
    const {
      speakerCard,
      allCards,
      topic,
      mode,
      history,
      lastK,
      directorMessage,
      extraSystem,
    } = input;
    const cardMap = cardsByIdMap(allCards);
    const personaLines: string[] = [];
    personaLines.push(`你扮演的角色：${speakerCard.name}`);
    if (speakerCard.persona && speakerCard.persona.trim().length > 0) {
      personaLines.push(`角色设定：${renderCardText(speakerCard.persona.trim(), speakerCard.name)}`);
    }
    if (speakerCard.scenario && speakerCard.scenario.trim().length > 0) {
      personaLines.push(`场景设定：${renderCardText(speakerCard.scenario.trim(), speakerCard.name)}`);
    }
    if (speakerCard.mesExample && speakerCard.mesExample.trim().length > 0) {
      personaLines.push(
        `示例对白（仅作为语气、关系和节奏的参考，不要复述示例原句）：\n${renderCardText(
          speakerCard.mesExample.trim(),
          speakerCard.name,
        )}`,
      );
    }
    personaLines.push(`会话议题：${topic}`);
    personaLines.push(
      mode === "auto"
        ? "当前为自动模式，请以第一人称与其他角色自然对话，保持人物一致。"
        : "当前为导演模式，请根据导演指令回应，保持人物一致。",
    );
    const otherNames = allCards.filter((c) => c.id !== speakerCard.id).map((c) => c.name);
    if (otherNames.length > 0) {
      personaLines.push(`同场角色：${otherNames.join("、")}。`);
    }
    personaLines.push("输出仅包含该角色的本轮发言文本，不要添加旁白、动作标记或 Markdown。");
    if (extraSystem) personaLines.push(extraSystem);

    const systemPrompt = personaLines.join("\n");

    const messages: LLMMessage[] = [];
    const visible: string[] = [];
    const summaries = summarizeMessages(history);
    if (summaries.length > 0) {
      const combined = summaries
        .map((msg) => msg.content)
        .join("\n\n")
        .trim();
      if (combined.length > 0) {
        messages.push({
          role: "user",
          content: `以下是此前对话的摘要，供你了解背景：\n${combined}`,
        });
      }
      for (const msg of summaries) visible.push(msg.id);
    }

    const tail = nonSummaryMessages(history).slice(-Math.max(1, lastK));
    for (const msg of tail) {
      visible.push(msg.id);
      const isSelf =
        msg.role === "character" && msg.characterId === speakerCard.id;
      const label = speakerLabel(msg, cardMap);
      if (isSelf) {
        messages.push({ role: "assistant", content: msg.content });
      } else {
        messages.push({
          role: "user",
          content: `[${label}]：${msg.content}`,
        });
      }
    }

    if (directorMessage && directorMessage.trim().length > 0) {
      messages.push({
        role: "user",
        content: `[导演]：${directorMessage.trim()}`,
      });
    }

    if (messages.length === 0) {
      messages.push({
        role: "user",
        content: `请围绕议题「${topic}」开始你的发言。`,
      });
    }

    return {
      systemPrompt,
      messages,
      visibleMessageIds: visible,
    };
  }
}
