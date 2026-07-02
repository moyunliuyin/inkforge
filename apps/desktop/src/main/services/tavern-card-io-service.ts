import * as fs from "fs";
import * as path from "path";
import { dialog, type BrowserWindow } from "electron";
import { listProviders } from "@inkforge/storage";
import type {
  TavernCardAvatarGetInput,
  TavernCardAvatarGetResponse,
  TavernCardCreateInput,
  TavernCardExportInput,
  TavernCardExportResponse,
  TavernCardImportReport,
  TavernCardImportResponse,
  TavernCardIoError,
  TavernCardIoErrorCode,
  TavernCardRecord,
  TavernCardSpecKind,
} from "@inkforge/shared";
import { getAppContext } from "./app-state";
import { logger } from "./logger";
import {
  PngFormatError,
  createSolidPng,
  extractTextChunk,
  replaceTextChunk,
} from "./png-text-chunk";
import {
  createTavernCard,
  getTavernCardRecord,
  updateTavernCardRecord,
} from "./tavern-card-service";

const AVATAR_DIR = "tavern-avatars";
const CHARA_KEYWORD = "chara";
const MAX_CARD_FILE_BYTES = 16 * 1024 * 1024;

const CARD_FILE_FILTERS = [
  { name: "SillyTavern Character Card", extensions: ["png", "json"] },
  { name: "PNG", extensions: ["png"] },
  { name: "JSON", extensions: ["json"] },
];

/** V2 fields we have no model for — reported (not silently dropped) when non-empty. */
const UNSUPPORTED_V2_FIELDS = [
  "system_prompt",
  "post_history_instructions",
  "alternate_greetings",
  "character_book",
  "creator_notes",
  "tags",
  "creator",
  "character_version",
  "extensions",
] as const;

class CardIoError extends Error {
  readonly code: TavernCardIoErrorCode;
  constructor(code: TavernCardIoErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function toIoError(error: unknown): TavernCardIoError {
  if (error instanceof CardIoError) return { code: error.code, message: error.message };
  return { code: "io-error", message: error instanceof Error ? error.message : String(error) };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

interface ParsedCard {
  spec: TavernCardSpecKind;
  input: Omit<TavernCardCreateInput, "providerId" | "model">;
  droppedFields: string[];
}

function parseSillyTavernJson(jsonText: string): ParsedCard {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new CardIoError("bad-json", "card payload is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new CardIoError("bad-json", "card payload is not a JSON object");
  }
  const root = parsed as Record<string, unknown>;

  let spec: TavernCardSpecKind;
  let data: Record<string, unknown>;
  if (root.spec === "chara_card_v2" && typeof root.data === "object" && root.data !== null) {
    spec = "chara_card_v2";
    data = root.data as Record<string, unknown>;
  } else if (typeof root.name === "string") {
    spec = "legacy_v1";
    data = root;
  } else {
    throw new CardIoError("unsupported-spec", "not a chara_card_v2 or legacy v1 card");
  }

  const name = asString(data.name).trim();
  if (!name) throw new CardIoError("unsupported-spec", "card has no name");

  const description = asString(data.description).trim();
  const personality = asString(data.personality).trim();
  const persona = personality
    ? `${description}${description ? "\n\n" : ""}性格：${personality}`
    : description;

  const droppedFields = UNSUPPORTED_V2_FIELDS.filter((field) => isNonEmpty(data[field]));

  return {
    spec,
    input: {
      name,
      persona,
      scenario: asString(data.scenario),
      firstMes: asString(data.first_mes),
      mesExample: asString(data.mes_example),
      syncMode: "detached",
    },
    droppedFields,
  };
}

function buildSillyTavernV2Json(card: TavernCardRecord): object {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: card.name,
      description: card.persona,
      personality: "",
      scenario: card.scenario,
      first_mes: card.firstMes,
      mes_example: card.mesExample,
      creator_notes: "",
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: [],
      tags: [],
      creator: "",
      character_version: "",
      extensions: {},
    },
  };
}

function avatarDirAbsolute(): string {
  return path.resolve(getAppContext().userDataDir, AVATAR_DIR);
}

/** Resolve a stored (relative) avatarPath, refusing anything outside the avatar dir. */
function resolveAvatarAbsolute(avatarPath: string | null): string | null {
  if (!avatarPath) return null;
  const abs = path.resolve(getAppContext().userDataDir, avatarPath);
  const dir = avatarDirAbsolute();
  if (abs !== dir && !abs.startsWith(dir + path.sep)) return null;
  return abs;
}

function saveImportedAvatar(cardId: string, pngBytes: Buffer): string {
  const dir = avatarDirAbsolute();
  fs.mkdirSync(dir, { recursive: true });
  const relative = `${AVATAR_DIR}/${cardId}.png`;
  fs.writeFileSync(path.join(dir, `${cardId}.png`), pngBytes);
  return relative;
}

function decodeCharaChunk(pngBytes: Buffer): string {
  let charaText: string | null;
  try {
    charaText = extractTextChunk(pngBytes, CHARA_KEYWORD);
  } catch (error) {
    if (error instanceof PngFormatError) {
      throw new CardIoError("not-a-png", error.message);
    }
    throw error;
  }
  if (charaText === null) {
    throw new CardIoError("no-chara-chunk", "PNG has no embedded chara tEXt chunk");
  }
  const compact = charaText.replace(/\s+/g, "");
  if (compact.length === 0 || compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    throw new CardIoError("bad-base64", "chara chunk is not valid base64");
  }
  return Buffer.from(compact, "base64").toString("utf8");
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function placeholderAvatar(cardId: string): Buffer {
  let hash = 0;
  for (let i = 0; i < cardId.length; i += 1) {
    hash = cardId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const [r, g, b] = hslToRgb(Math.abs(hash) % 360, 0.55, 0.55);
  return createSolidPng({ width: 256, height: 256, rgba: [r, g, b, 255] });
}

export async function importTavernCardFromDialog(
  win: BrowserWindow | null,
): Promise<TavernCardImportResponse> {
  try {
    const dialogOptions = {
      title: "导入 SillyTavern 角色卡",
      filters: CARD_FILE_FILTERS,
      properties: ["openFile" as const],
    };
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, cancelled: true, card: null, report: null };
    }
    const filePath = result.filePaths[0];
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_CARD_FILE_BYTES) {
      throw new CardIoError("file-too-large", `card file exceeds ${MAX_CARD_FILE_BYTES} bytes`);
    }

    const isPng = filePath.toLowerCase().endsWith(".png");
    const source = isPng ? ("png" as const) : ("json" as const);
    let pngBytes: Buffer | null = null;
    let jsonText: string;
    if (isPng) {
      pngBytes = fs.readFileSync(filePath);
      jsonText = decodeCharaChunk(pngBytes);
    } else {
      jsonText = fs.readFileSync(filePath, "utf8");
    }

    const parsed = parseSillyTavernJson(jsonText);

    const ctx = getAppContext();
    const providers = listProviders(ctx.db);
    if (providers.length === 0) {
      throw new CardIoError("no-provider", "configure an AI provider before importing cards");
    }
    const provider = providers[0];

    const warnings: string[] = [];
    if (!provider.defaultModel) {
      warnings.push("默认 Provider 未设置模型，请在编辑器中补填模型名");
    }

    let card = createTavernCard({
      ...parsed.input,
      providerId: provider.id,
      model: provider.defaultModel,
    });

    let savedAvatar = false;
    if (pngBytes) {
      const relative = saveImportedAvatar(card.id, pngBytes);
      card = updateTavernCardRecord({ id: card.id, avatarPath: relative });
      savedAvatar = true;
    }

    const report: TavernCardImportReport = {
      source,
      spec: parsed.spec,
      droppedFields: parsed.droppedFields,
      warnings,
      savedAvatar,
    };
    return { ok: true, cancelled: false, card, report };
  } catch (error) {
    logger.warn("tavern card import failed", error);
    return { ok: false, cancelled: false, card: null, report: null, error: toIoError(error) };
  }
}

export async function exportTavernCardToDialog(
  input: TavernCardExportInput,
  win: BrowserWindow | null,
): Promise<TavernCardExportResponse> {
  try {
    const card = getTavernCardRecord({ id: input.id });
    if (!card) throw new CardIoError("card-not-found", `tavern card not found: ${input.id}`);

    const safeName = card.name.replace(/[\\/:*?"<>|]/g, "_").trim() || "character-card";
    const dialogOptions = {
      title: "导出 SillyTavern 角色卡",
      defaultPath: `${safeName}.png`,
      filters: CARD_FILE_FILTERS,
    };
    const result = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);
    if (result.canceled || !result.filePath) {
      return { ok: false, cancelled: true, path: null };
    }
    const outPath = result.filePath;
    const v2Json = buildSillyTavernV2Json(card);

    if (outPath.toLowerCase().endsWith(".json")) {
      fs.writeFileSync(outPath, JSON.stringify(v2Json, null, 2), "utf8");
      return { ok: true, cancelled: false, path: outPath, format: "json", usedPlaceholderAvatar: false };
    }

    const avatarAbs = resolveAvatarAbsolute(card.avatarPath);
    let baseBytes: Buffer | null = null;
    if (avatarAbs && fs.existsSync(avatarAbs)) {
      baseBytes = fs.readFileSync(avatarAbs);
    }
    const usedPlaceholderAvatar = baseBytes === null;
    const basePng = baseBytes ?? placeholderAvatar(card.id);
    const charaBase64 = Buffer.from(JSON.stringify(v2Json), "utf8").toString("base64");
    const { png } = replaceTextChunk(basePng, CHARA_KEYWORD, charaBase64);
    fs.writeFileSync(outPath, png);
    return { ok: true, cancelled: false, path: outPath, format: "png", usedPlaceholderAvatar };
  } catch (error) {
    logger.warn("tavern card export failed", error);
    return { ok: false, cancelled: false, path: null, error: toIoError(error) };
  }
}

export function getTavernCardAvatar(
  input: TavernCardAvatarGetInput,
): TavernCardAvatarGetResponse {
  const card = getTavernCardRecord({ id: input.id });
  const abs = resolveAvatarAbsolute(card?.avatarPath ?? null);
  if (!abs || !fs.existsSync(abs)) return { base64: null };
  try {
    return { base64: fs.readFileSync(abs).toString("base64") };
  } catch (error) {
    logger.warn("tavern card avatar read failed", error);
    return { base64: null };
  }
}
