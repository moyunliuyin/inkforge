export type ProviderVendor = "anthropic" | "openai" | "gemini" | "openai-compat";

export interface ProjectRecord {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  dailyGoal: number;
  lastOpened: string | null;
  // ----- v19: creative metadata for AI outline/chapter generation -----
  synopsis: string;
  genre: string;
  subGenre: string;
  tags: string[];
  masterOutline: string;
  preRefineMasterOutline: string | null;
}

export interface ChapterRecord {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  filePath: string;
  /** ISO-8601 of last DB write. May be null on rows created before migration v13. */
  updatedAt: string | null;
}

export interface ProviderRecord {
  id: string;
  label: string;
  vendor: ProviderVendor;
  baseUrl: string;
  defaultModel: string;
  tags: string[];
}

export interface AIFeedbackRecord {
  id: string;
  projectId: string;
  chapterId: string;
  type: string;
  payload: Record<string, unknown>;
  trigger: string;
  createdAt: string;
  dismissed: boolean;
}

export interface OutlineCardRecord {
  id: string;
  projectId: string;
  chapterId: string | null;
  title: string;
  content: string;
  status: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyProgressRecord {
  date: string;
  projectId: string;
  wordsAdded: number;
  goal: number;
  goalHit: boolean;
}

export type AppSettingKey =
  | "theme"
  | "activeProviderId"
  | "analysisEnabled"
  | "analysisThreshold"
  | "uiLanguage"
  | "devModeEnabled"
  | "onboardingCompleted"
  | "sceneRoutingMode"
  | "editorFontSize"
  | "editorFontFamily"
  | "companionEnabled"
  | "autoSaveInterval"
  | "autoOpenLastProject"
  | "dataDir"
  | "autoBackup"
  | "defaultDailyGoal";

export interface AppSettings {
  theme: "dark" | "light" | "system";
  activeProviderId: string | null;
  analysisEnabled: boolean;
  analysisThreshold: number;
  uiLanguage: "zh" | "en" | "ja";
  devModeEnabled: boolean;
  onboardingCompleted: boolean;
  sceneRoutingMode: SceneRoutingMode;
  editorFontSize: number;
  editorFontFamily: string;
  companionEnabled: boolean;
  autoSaveInterval: number;
  autoOpenLastProject: boolean;
  dataDir: string | null;
  autoBackup: boolean;
  defaultDailyGoal: number;
}

// ===== Scene Bindings (ported from ainovel) =====
export type SceneRoutingMode = "basic" | "advanced";

export type SceneKeyBasic =
  | "outline_generation"
  | "main_generation"
  | "extract"
  | "summarize"
  | "inline";

export type SceneKeyAdvanced =
  | "analyze"
  | "quick"
  | "chat"
  | "skill"
  | "tavern"
  | "auto-writer"
  | "review"
  | "daily-summary"
  | "letter";

export type SceneKey = SceneKeyBasic | SceneKeyAdvanced;

export interface SceneBindingRecord {
  sceneKey: SceneKey;
  providerId: string | null;
  model: string | null;
  updatedAt: string;
}

export const SCENE_KEYS_BASIC: readonly SceneKeyBasic[] = [
  "outline_generation",
  "main_generation",
  "extract",
  "summarize",
  "inline",
] as const;

export const SCENE_KEYS_ADVANCED: readonly SceneKeyAdvanced[] = [
  "analyze",
  "quick",
  "chat",
  "skill",
  "tavern",
  "auto-writer",
  "review",
  "daily-summary",
  "letter",
] as const;

// ===== Sample Library (参考小说库, ported from ainovel) =====
export interface SampleLibRecord {
  id: string;
  projectId: string;
  title: string;
  author: string | null;
  notes: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SampleChunkRecord {
  id: string;
  libId: string;
  ordinal: number;
  chapterTitle: string | null;
  text: string;
}

// ===== World Relationships (graph, ported from ainovel) =====
export type WorldGraphEndpointKind = "character" | "world_entry";

export interface WorldRelationshipRecord {
  id: string;
  projectId: string;
  srcKind: WorldGraphEndpointKind;
  srcId: string;
  dstKind: WorldGraphEndpointKind;
  dstId: string;
  label: string | null;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export type SkillScope = "global" | "project" | "community";

export type SkillTriggerType =
  | "selection"
  | "every-n-chars"
  | "on-save"
  | "on-chapter-end"
  | "manual";

export type SkillOutputTarget =
  | "ai-feedback"
  | "replace-selection"
  | "insert-after-selection"
  | "append-chapter";

export interface SkillVariableDef {
  key: string;
  label: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface SkillTriggerDef {
  type: SkillTriggerType;
  enabled: boolean;
  everyNChars?: number;
  debounceMs?: number;
  cooldownMs?: number;
}

export interface SkillBinding {
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  summaryProviderId?: string;
  summaryModel?: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  prompt: string;
  variables: SkillVariableDef[];
  triggers: SkillTriggerDef[];
  binding: SkillBinding;
  output: SkillOutputTarget;
  enabled: boolean;
  scope: SkillScope;
  createdAt: string;
  updatedAt: string;
}

export type TavernMode = "director" | "auto";

export type TavernRole = "director" | "character" | "summary";

export type SyncMode = "two-way" | "snapshot" | "detached";

export interface TavernCardRecord {
  id: string;
  name: string;
  persona: string;
  avatarPath: string | null;
  providerId: string;
  model: string;
  temperature: number;
  linkedNovelCharacterId: string | null;
  syncMode: SyncMode;
  createdAt: string;
  updatedAt: string;
}

export interface NovelCharacterRecord {
  id: string;
  projectId: string;
  name: string;
  persona: string | null;
  traits: Record<string, unknown>;
  backstory: string;
  relations: Array<{ otherId: string; label: string }>;
  linkedTavernCardId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CharacterSyncField = "persona" | "backstory" | "traits";

export type CharacterSyncDirection =
  | "novel_to_card"
  | "card_to_novel"
  | "manual_merge";

export interface CharacterSyncLogRecord {
  id: string;
  novelCharId: string;
  tavernCardId: string | null;
  field: CharacterSyncField;
  oldValue: string;
  newValue: string;
  direction: CharacterSyncDirection;
  at: string;
}

export interface TavernSessionRecord {
  id: string;
  projectId: string;
  title: string;
  topic: string;
  mode: TavernMode;
  budgetTokens: number;
  summaryProviderId: string | null;
  summaryModel: string | null;
  lastK: number;
  createdAt: string;
}

export interface TavernMessageRecord {
  id: string;
  sessionId: string;
  characterId: string | null;
  role: TavernRole;
  content: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
}

export interface SkillRunUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedInputTokens?: number;
}

export interface SkillPackV1 {
  format: "inkforge.skill-pack";
  version: "1.0.0";
  exportedAt: string;
  source: "inkforge-desktop";
  skills: SkillDefinition[];
}

export interface SkillImportReport {
  format: string;
  version: string;
  total: number;
  imported: number;
  replaced: number;
  skipped: number;
  errors: Array<{ skillId?: string; reason: string }>;
}

export interface SyncDiffRow {
  field: CharacterSyncField;
  novelValue: unknown;
  cardValue: unknown;
  winner: "novel" | "card" | null;
  conflict: boolean;
}

export interface TokenBudgetState {
  sessionId: string;
  budgetTokens: number;
  usedTokens: number;
  remainingTokens: number;
  shouldWarn: boolean;
  warnAt: string | null;
}

export interface CompactResult {
  summaryMessageId: string;
  replacedMessageCount: number;
  usage: SkillRunUsage;
}

// ---------- M4 · World ----------

export type WorldEntryCategory = string;

export interface WorldEntryRecord {
  id: string;
  projectId: string;
  category: string;
  title: string;
  content: string;
  aliases: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------- M4 · Research ----------

export type ResearchProvider =
  | "tavily"
  | "bing"
  | "serpapi"
  | "llm-fallback"
  | "manual";

export interface ResearchNoteRecord {
  id: string;
  projectId: string;
  topic: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceProvider: ResearchProvider;
  excerpt: string;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSearchHit {
  title: string;
  url: string;
  snippet: string;
  provider: ResearchProvider;
  score?: number;
}

// ---------- M4 · Review ----------

export type ReviewBuiltinId =
  | "consistency-character"
  | "consistency-timeline"
  | "foreshadowing"
  | "worldbuilding"
  | "style";

export type ReviewDimensionKind = "builtin" | "skill";

export type ReviewScope = "book" | "chapter" | "selection";

export type ReviewSeverity = "info" | "warn" | "error";

export type ReviewReportStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ReviewDimensionRecord {
  id: string;
  projectId: string | null;
  name: string;
  kind: ReviewDimensionKind;
  builtinId: ReviewBuiltinId | null;
  skillId: string | null;
  scope: ReviewScope;
  severity: ReviewSeverity;
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewReportSummary {
  totals: Record<ReviewSeverity, number>;
  perDimension: Array<{ dimensionId: string; count: number }>;
  perChapter: Array<{ chapterId: string; count: number }>;
  usage?: SkillRunUsage;
}

export interface ReviewReportRecord {
  id: string;
  projectId: string;
  rangeKind: "book" | "chapter" | "range";
  rangeIds: string[];
  startedAt: string;
  finishedAt: string | null;
  status: ReviewReportStatus;
  summary: ReviewReportSummary;
  error: string | null;
}

export interface ReviewFindingRecord {
  id: string;
  reportId: string;
  dimensionId: string;
  chapterId: string | null;
  excerpt: string;
  excerptStart: number | null;
  excerptEnd: number | null;
  severity: ReviewSeverity;
  suggestion: string;
  dismissed: boolean;
  createdAt: string;
}

// ---------- M4 · Daily Summary ----------

export interface DailySummaryRecord {
  date: string;
  projectId: string;
  wordsAdded: number;
  goal: number;
  goalHit: boolean;
  summary: string | null;
  summaryProviderId: string | null;
  summaryModel: string | null;
  generatedAt: string | null;
}

// ---------- M4 · Provider Multi-Key ----------

export type ProviderKeyStrategy =
  | "single"
  | "round-robin"
  | "weighted"
  | "sticky";

export interface ProviderKeyRecord {
  id: string;
  providerId: string;
  label: string;
  weight: number;
  disabled: boolean;
  storedInKeychain: boolean;
  lastFailedAt: string | null;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderKeyHealth {
  keyId: string;
  label: string;
  disabled: boolean;
  recentSuccesses: number;
  recentFailures: number;
  cooldownUntil: string | null;
}

export interface ProviderHealthSnapshot {
  providerId: string;
  strategy: ProviderKeyStrategy;
  cooldownMs: number;
  keys: ProviderKeyHealth[];
}

// =====================================================================
// M7 · Bookshelf Module (Plan: shiny-booping-honey.md, schema v14)
// 该段类型完全独立，不修改任何现有表对应的 Record 形状。
// =====================================================================

/** 章节来源：AI 全自动 / AI 陪写 / 纯手写。旧章节没标记时按 'manual' 渲染。 */
export type ChapterOrigin = "ai-auto" | "ai-assisted" | "manual";

/** 章节日志条目类型。 */
export type ChapterLogEntryKind =
  | "progress" // 章节状态从 in_progress → completed 时自动追加
  | "ai-run" // AutoWriter 运行结束时自动追加
  | "manual" // 用户手动追加
  | "daily-reminder"; // 每日 12:00 提醒触发后用户记录

/** 日志条目作者。 */
export type ChapterLogEntryAuthor = "user" | "ai";

/** 章节快照类型。pre-* 在动作前打，post-* 在完成后打，manual 是用户主动备份。 */
export type ChapterSnapshotKind =
  | "manual"
  | "pre-ai"
  | "post-ai"
  | "pre-rewrite"
  | "pre-restore"
  | "auto-periodic";

/** AutoWriter 多 Agent 协作中的 4 个角色。 */
export type AutoWriterAgentRole = "planner" | "writer" | "critic" | "reflector";

/** AutoWriter 一次运行的状态机。 */
export type AutoWriterRunStatus =
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "stopped";

export interface BookCoverRecord {
  id: string;
  projectId: string;
  /** 相对项目根的路径，例如 `.bookshelf/cover.png`。 */
  filePath: string;
  mime: string;
  uploadedAt: string;
}

export interface ChapterOriginTagRecord {
  chapterId: string;
  origin: ChapterOrigin;
  taggedAt: string;
}

export interface ChapterLogRecord {
  id: string;
  chapterId: string;
  projectId: string;
  createdAt: string;
}

export interface ChapterLogEntryRecord {
  id: string;
  logId: string;
  chapterId: string;
  kind: ChapterLogEntryKind;
  author: ChapterLogEntryAuthor;
  content: string;
  /** 自由结构的元数据：tokens / runId / rewrites 等。 */
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ChapterSnapshotRecord {
  id: string;
  chapterId: string;
  projectId: string;
  kind: ChapterSnapshotKind;
  /** 用户为手动快照命名；自动快照可为 null。 */
  label: string | null;
  /** sha256(content)，用于去重检测。 */
  contentHash: string;
  /** 相对项目根：`.history/snapshots/<chapId>/<id>.md`。 */
  filePath: string;
  wordCount: number;
  /** 关联到 auto_writer_runs.id；手动快照为 null。 */
  runId: string | null;
  /** 关联到具体的 Agent；手动快照为 null。 */
  agentRole: AutoWriterAgentRole | null;
  /** 关联到 ai_feedbacks.id 或 tavern_messages.id（若适用）。 */
  sourceMessageId: string | null;
  createdAt: string;
}

/** AutoWriter 一个角色与 LLM provider/model 的绑定。 */
export interface AutoWriterAgentBinding {
  role: AutoWriterAgentRole;
  providerId: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AutoWriterCorrectionEntry {
  at: string;
  content: string;
  /** 用户标记的错误段落原文片段，便于 Critic / Writer 定位。 */
  targetExcerpt?: string;
}

export interface AutoWriterRunRecord {
  id: string;
  projectId: string;
  chapterId: string;
  status: AutoWriterRunStatus;
  /** 用户初始输入的多行思路。 */
  userIdeas: string;
  /** 中途介入累积的纠错列表。 */
  userCorrections: AutoWriterCorrectionEntry[];
  /** 4 个角色的模型绑定。可只配置一个 'writer' 表示统一模型。 */
  agentsConfig: AutoWriterAgentBinding[];
  /** Planner 产出的 beat sheet（保持 JSON 字符串，方便 schema 演进）。 */
  outlineJson: string | null;
  /** 统计：tokensIn/Out、段数、重写次数、耗时等。 */
  statsJson: Record<string, unknown>;
  lastSnapshotId: string | null;
  createdAt: string;
  updatedAt: string;
}

// =====================================================================
// M8 · 活人感套装：成就 + 角色来信
// =====================================================================

/**
 * 成就 ID。前端的徽章目录与该 ID 一一对应（catalog 在 shared/achievements.ts）。
 * 字符串列表保持开放式：未来追加只需扩 catalog，无需改表。
 */
export type AchievementId =
  // 字数里程碑
  | "first_word"
  | "words_1k"
  | "words_5k"
  | "words_10k"
  | "words_50k"
  | "words_100k"
  | "words_300k"
  // 章节
  | "first_chapter"
  | "chapters_5"
  | "chapters_20"
  | "chapters_50"
  // 连续打卡
  | "streak_3"
  | "streak_7"
  | "streak_30"
  // 时段
  | "night_owl" // 0-3 点写作
  | "early_bird" // 5-7 点写作
  | "weekend_warrior" // 周末写满日目标
  // 角色 / 世界观
  | "first_character"
  | "characters_5"
  | "characters_15"
  | "first_world_entry"
  | "worldbuilder" // 5 条世界观条目
  // AI / 工具
  | "first_auto_writer_run"
  | "auto_writer_3"
  | "first_letter_received"
  | "letters_pen_pal" // 收 5 封信
  | "first_review" // 第一次 Review
  | "snapshot_keeper" // 创建 10 个手动快照
  | "rewrite_master"; // 单段重写 ≥3 次仍出稿

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface AchievementUnlockedRecord {
  id: string;
  projectId: string;
  achievementId: AchievementId;
  unlockedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * 角色来信「语气」。AI 生成时强约束这一字段以保证多样性。
 *  - grateful：感谢戏份 / 角色发展
 *  - complaint：抱怨太久没出场或台词糟糕
 *  - curious：对剧情走向好奇 / 提问
 *  - encouraging：鼓励作者坚持
 *  - neutral：日常 / 无特殊情绪
 */
export type CharacterLetterTone =
  | "grateful"
  | "complaint"
  | "curious"
  | "encouraging"
  | "neutral";

export interface CharacterLetterRecord {
  id: string;
  projectId: string;
  characterId: string;
  subject: string;
  body: string;
  tone: CharacterLetterTone;
  generatedAt: string;
  read: boolean;
  pinned: boolean;
  dismissed: boolean;
  providerId: string | null;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
}
