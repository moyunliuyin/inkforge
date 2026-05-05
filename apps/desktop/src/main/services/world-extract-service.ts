import { randomUUID } from "node:crypto";
import {
  getProject,
  insertNovelCharacter,
  insertWorldEntry,
  listChapters,
  listNovelCharacters,
  listWorldEntries,
  readChapterFile,
  saveWorldRelationship,
  listWorldRelationships,
} from "@inkforge/storage";
import type {
  WorldGraphEndpointKind,
} from "@inkforge/shared";
import { getAppContext } from "./app-state";
import {
  resolveApiKey,
  resolveProviderRecord,
  streamText,
} from "./llm-runtime";

interface ExtractedCharacter {
  name: string;
  persona: string;
  backstory: string;
}

interface ExtractedEntry {
  category: "place" | "item" | "faction" | "event" | "concept" | "organization";
  title: string;
  content: string;
}

interface ExtractedRelationship {
  src: { kind: "character" | "world_entry"; name: string };
  dst: { kind: "character" | "world_entry"; name: string };
  label: string;
  weight: number;
}

interface ExtractedJson {
  characters: ExtractedCharacter[];
  entries: ExtractedEntry[];
  relationships: ExtractedRelationship[];
}

export interface WorldExtractStats {
  charactersTotal: number;
  charactersInserted: number;
  entriesTotal: number;
  entriesInserted: number;
  relationshipsTotal: number;
  relationshipsInserted: number;
  bookCharsUsed: number;
  bookCharsTotal: number;
  durationMs: number;
}

const MAX_BOOK_CHARS = 8000;

function buildExtractPrompt(args: {
  projectName: string;
  genre: string;
  bookText: string;
}): { system: string; user: string } {
  return {
    system: [
      "你是一位中文小说编辑兼世界观分析师。",
      "任务：阅读小说正文，抽取**已经在文中出现过**的人物、世界条目和它们之间的关系。",
      "**只抽取确实在文中提到的内容，不要凭空创造。**",
      "",
      "输出**严格 JSON**（不要 markdown 围栏、不要解释、不要其他文字），结构：",
      `{`,
      `  "characters": [{"name":"角色名","persona":"一句话定位","backstory":"简短背景 50 字内"}],`,
      `  "entries": [{"category":"place|item|faction|event|concept|organization","title":"标题","content":"50-100 字描述"}],`,
      `  "relationships": [{"src":{"kind":"character|world_entry","name":"X"},"dst":{"kind":"character|world_entry","name":"Y"},"label":"关系标签","weight":1-10}]`,
      `}`,
      "",
      "category 限定六类之一。relationships 中的 name 必须是 characters/entries 里出现过的 name。",
      "如果某类条目文中没有，输出空数组。最多 30 个角色 + 30 个条目 + 50 条关系。",
    ].join("\n"),
    user: [
      `作品：${args.projectName}`,
      args.genre ? `类型：${args.genre}` : "",
      "",
      "正文片段（可能为节选）：",
      args.bookText,
      "",
      "请抽取并输出 JSON。",
    ].join("\n"),
  };
}

function parseExtractJson(raw: string): ExtractedJson {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<ExtractedJson>;
  return {
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
  };
}

async function streamCollect(args: {
  providerRecord: ReturnType<typeof resolveProviderRecord>;
  apiKey: string;
  systemPrompt: string;
  userMessage: string;
  model?: string;
}): Promise<string> {
  if (!args.providerRecord) throw new Error("provider_not_configured");
  const stream = streamText({
    providerRecord: args.providerRecord,
    apiKey: args.apiKey,
    model: args.model ?? args.providerRecord.defaultModel,
    systemPrompt: args.systemPrompt,
    userMessage: args.userMessage,
    temperature: 0.4,
    maxTokens: 4000,
  });
  let acc = "";
  for await (const chunk of stream) {
    if (chunk.type === "delta" && chunk.textDelta) acc += chunk.textDelta;
    if (chunk.type === "error" && chunk.error) throw new Error(chunk.error);
  }
  return acc.trim();
}

export async function extractWorldFromBook(input: {
  projectId: string;
}): Promise<WorldExtractStats> {
  const start = Date.now();
  const ctx = getAppContext();
  const project = getProject(ctx.db, input.projectId);
  if (!project) throw new Error(`project_not_found:${input.projectId}`);

  const chapters = listChapters(ctx.db, input.projectId).sort((a, b) => a.order - b.order);
  if (chapters.length === 0) throw new Error("no_chapters");

  const segments: string[] = [];
  let bookCharsTotal = 0;
  for (const ch of chapters) {
    let body = "";
    try {
      body = readChapterFile(project.path, ch.filePath);
    } catch {
      continue;
    }
    bookCharsTotal += body.length;
    segments.push(`# 第${ch.order}章 ${ch.title}\n${body}`);
  }
  let bookText = segments.join("\n\n");
  const bookCharsUsed = Math.min(bookText.length, MAX_BOOK_CHARS);
  if (bookText.length > MAX_BOOK_CHARS) {
    bookText = bookText.slice(0, MAX_BOOK_CHARS) + "\n\n[已截断，仅展示前部分]";
  }

  const providerRecord = resolveProviderRecord(undefined);
  if (!providerRecord) throw new Error("provider_not_configured");
  const apiKey = await resolveApiKey(providerRecord);
  if (!apiKey) throw new Error("api_key_missing");

  const prompts = buildExtractPrompt({
    projectName: project.name,
    genre: project.genre,
    bookText,
  });
  const raw = await streamCollect({
    providerRecord,
    apiKey,
    systemPrompt: prompts.system,
    userMessage: prompts.user,
  });
  const extracted = parseExtractJson(raw);

  const existingChars = listNovelCharacters(ctx.db, input.projectId);
  const existingEntries = listWorldEntries(ctx.db, { projectId: input.projectId });
  const existingRels = listWorldRelationships(ctx.db, input.projectId);

  const charByName = new Map(existingChars.map((c) => [c.name, c.id]));
  const entryByTitle = new Map(existingEntries.map((e) => [e.title, e.id]));
  const relKey = (sk: string, si: string, dk: string, di: string) =>
    `${sk}:${si}->${dk}:${di}`;
  const existingRelKeys = new Set(
    existingRels.map((r) => relKey(r.srcKind, r.srcId, r.dstKind, r.dstId)),
  );

  let charsInserted = 0;
  for (const c of extracted.characters) {
    if (!c.name || charByName.has(c.name)) continue;
    const id = randomUUID();
    insertNovelCharacter(ctx.db, {
      id,
      projectId: input.projectId,
      name: c.name,
      persona: c.persona ?? null,
      backstory: c.backstory ?? "",
      traits: {},
      relations: [],
    });
    charByName.set(c.name, id);
    charsInserted++;
  }

  let entriesInserted = 0;
  const validCats = new Set([
    "place",
    "item",
    "faction",
    "event",
    "concept",
    "organization",
  ]);
  for (const e of extracted.entries) {
    if (!e.title || entryByTitle.has(e.title)) continue;
    const category = validCats.has(e.category) ? e.category : "concept";
    const id = randomUUID();
    insertWorldEntry(ctx.db, {
      id,
      projectId: input.projectId,
      category,
      title: e.title,
      content: e.content ?? "",
      aliases: [],
      tags: [],
    });
    entryByTitle.set(e.title, id);
    entriesInserted++;
  }

  let relsInserted = 0;
  for (const r of extracted.relationships) {
    if (!r.src?.name || !r.dst?.name) continue;
    const srcKind = (r.src.kind === "world_entry" ? "world_entry" : "character") as WorldGraphEndpointKind;
    const dstKind = (r.dst.kind === "world_entry" ? "world_entry" : "character") as WorldGraphEndpointKind;
    const srcId =
      srcKind === "character" ? charByName.get(r.src.name) : entryByTitle.get(r.src.name);
    const dstId =
      dstKind === "character" ? charByName.get(r.dst.name) : entryByTitle.get(r.dst.name);
    if (!srcId || !dstId) continue;
    const key = relKey(srcKind, srcId, dstKind, dstId);
    if (existingRelKeys.has(key)) continue;
    const weight = Math.max(1, Math.min(10, Math.round(r.weight ?? 5)));
    saveWorldRelationship(ctx.db, {
      projectId: input.projectId,
      srcKind,
      srcId,
      dstKind,
      dstId,
      label: r.label || null,
      weight,
    });
    existingRelKeys.add(key);
    relsInserted++;
  }

  return {
    charactersTotal: extracted.characters.length,
    charactersInserted: charsInserted,
    entriesTotal: extracted.entries.length,
    entriesInserted,
    relationshipsTotal: extracted.relationships.length,
    relationshipsInserted: relsInserted,
    bookCharsUsed,
    bookCharsTotal,
    durationMs: Date.now() - start,
  };
}
