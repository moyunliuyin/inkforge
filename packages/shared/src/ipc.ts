import type {
  AIFeedbackRecord,
  AppSettings,
  ChapterRecord,
  CharacterSyncLogRecord,
  CompactResult,
  DailyProgressRecord,
  DailySummaryRecord,
  NovelCharacterRecord,
  OutlineCardRecord,
  ProjectRecord,
  ProviderHealthSnapshot,
  ProviderKeyRecord,
  ProviderKeyStrategy,
  ProviderRecord,
  ProviderVendor,
  ResearchNoteRecord,
  ResearchProvider,
  ResearchSearchHit,
  ReviewBuiltinId,
  ReviewDimensionKind,
  ReviewDimensionRecord,
  ReviewFindingRecord,
  ReviewReportRecord,
  ReviewReportStatus,
  ReviewReportSummary,
  ReviewScope,
  ReviewSeverity,
  SkillDefinition,
  SkillImportReport,
  SkillPackV1,
  SkillRunUsage,
  SkillScope,
  SkillTriggerType,
  SyncDiffRow,
  TavernCardRecord,
  TavernMessageRecord,
  TavernMode,
  TavernSessionRecord,
  TokenBudgetState,
  WorldEntryRecord,
  // ----- M7 · Bookshelf -----
  AutoWriterAgentBinding,
  AutoWriterAgentRole,
  AutoWriterCorrectionEntry,
  AutoWriterRunRecord,
  AutoWriterRunStatus,
  BookCoverRecord,
  ChapterLogEntryKind,
  ChapterLogEntryRecord,
  ChapterOrigin,
  ChapterOriginTagRecord,
  ChapterSnapshotKind,
  ChapterSnapshotRecord,
  // ----- Scene Bindings -----
  SceneBindingRecord,
  SceneKey,
  SceneRoutingMode,
  // ----- Sample Library -----
  SampleLibRecord,
  SampleChunkRecord,
  // ----- World Relationships -----
  WorldRelationshipRecord,
  WorldGraphEndpointKind,
  WorldTimelineEventRecord,
  WorldTimelineSaveInput,
} from "./domain";

export const ipcChannels = {
  projectCreate: "project:create",
  projectList: "project:list",
  projectUpdate: "project:update",
  projectDelete: "project:delete",
  projectOpen: "project:open",
  chapterCreate: "chapter:create",
  chapterUpdate: "chapter:update",
  chapterList: "chapter:list",
  chapterRead: "chapter:read",
  chapterDelete: "chapter:delete",
  chapterReorder: "chapter:reorder",
  chapterImportMd: "chapter:import-md",
  chapterExportMd: "chapter:export-md",
  chapterAutosaveWrite: "chapter:autosave-write",
  chapterAutosavePeek: "chapter:autosave-peek",
  chapterAutosaveClear: "chapter:autosave-clear",
  providerSave: "provider:save",
  providerList: "provider:list",
  providerDelete: "provider:delete",
  providerTest: "provider:test",
  llmAnalyze: "llm:analyze",
  llmQuick: "llm:quick",
  llmChat: "llm:chat",
  feedbackList: "feedback:list",
  feedbackDismiss: "feedback:dismiss",
  outlineCreate: "outline:create",
  outlineUpdate: "outline:update",
  outlineDelete: "outline:delete",
  outlineList: "outline:list",
  dailyProgress: "daily:progress",
  settingsGet: "settings:get",
  settingsSet: "settings:set",
  fsPickFile: "fs:pick-file",
  fsSaveFile: "fs:save-file",
  terminalSpawn: "terminal:spawn",
  terminalInput: "terminal:input",
  terminalResize: "terminal:resize",
  terminalDispose: "terminal:dispose",
  skillCreate: "skill:create",
  skillUpdate: "skill:update",
  skillGet: "skill:get",
  skillList: "skill:list",
  skillDelete: "skill:delete",
  skillRun: "skill:run",
  skillImportJson: "skill:import-json",
  skillExportJson: "skill:export-json",
  tavernCardCreate: "tavern-card:create",
  tavernCardUpdate: "tavern-card:update",
  tavernCardGet: "tavern-card:get",
  tavernCardList: "tavern-card:list",
  tavernCardDelete: "tavern-card:delete",
  tavernCardImport: "tavern-card:import",
  tavernCardExport: "tavern-card:export",
  tavernCardAvatarGet: "tavern-card-avatar:get",
  novelCharacterCreate: "novel-character:create",
  novelCharacterUpdate: "novel-character:update",
  novelCharacterGet: "novel-character:get",
  novelCharacterList: "novel-character:list",
  novelCharacterDelete: "novel-character:delete",
  characterSyncPreview: "character-sync:preview",
  characterSyncApply: "character-sync:apply",
  characterSyncHistory: "character-sync:history",
  tavernSessionCreate: "tavern-session:create",
  tavernSessionGet: "tavern-session:get",
  tavernSessionList: "tavern-session:list",
  tavernSessionDelete: "tavern-session:delete",
  tavernMessageList: "tavern-message:list",
  tavernDirectorPost: "tavern-director:post",
  tavernUserPost: "tavern-user:post",
  tavernRoundRun: "tavern-round:run",
  tavernRoundStop: "tavern-round:stop",
  tavernSummaryCompact: "tavern-summary:compact",
  worldList: "world:list",
  worldGet: "world:get",
  worldCreate: "world:create",
  worldUpdate: "world:update",
  worldDelete: "world:delete",
  worldSearch: "world:search",
  researchSearch: "research:search",
  researchList: "research:list",
  researchGet: "research:get",
  researchSave: "research:save",
  researchUpdate: "research:update",
  researchDelete: "research:delete",
  researchCredentialStatus: "research:credential-status",
  researchCredentialUpsert: "research:credential-upsert",
  researchCredentialDelete: "research:credential-delete",
  reviewDimList: "review-dim:list",
  reviewDimUpsert: "review-dim:upsert",
  reviewDimDelete: "review-dim:delete",
  reviewDimReorder: "review-dim:reorder",
  reviewRun: "review:run",
  reviewCancel: "review:cancel",
  reviewList: "review:list",
  reviewGet: "review:get",
  reviewDismissFinding: "review:dismiss-finding",
  reviewExport: "review:export",
  dailySummaryGenerate: "daily:summary-generate",
  dailySummaryGet: "daily:summary-get",
  dailySummaryList: "daily:summary-list",
  providerKeyList: "provider-key:list",
  providerKeyUpsert: "provider-key:upsert",
  providerKeyDelete: "provider-key:delete",
  providerKeySetDisabled: "provider-key:set-disabled",
  providerKeyHealth: "provider-key:health",
  diagSnapshot: "diag:snapshot",
  diagCrashStatus: "diag:crash-status",
  diagCrashDismiss: "diag:crash-dismiss",
  updateCheck: "update:check",
  updateDownload: "update:download",
  updateInstall: "update:install",
  updateStatus: "update:get-status",
  updateOpenDownloadPage: "update:open-download-page",
  marketFetchRegistry: "market:fetch-registry",
  marketInstallSkill: "market:install-skill",
  marketBuildPublishBundle: "market:build-publish-bundle",
  // ===== M7 · Bookshelf =====
  bookshelfListBooks: "bookshelf:list-books",
  bookCoverUpload: "book-cover:upload",
  bookCoverGet: "book-cover:get",
  bookCoverDelete: "book-cover:delete",
  // ----- Origin Tag -----
  originTagSet: "origin-tag:set",
  originTagGet: "origin-tag:get",
  originTagListByOrigin: "origin-tag:list-by-origin",
  // ----- Chapter Log -----
  chapterLogList: "chapter-log:list",
  chapterLogAppendManual: "chapter-log:append-manual",
  chapterLogAppendAi: "chapter-log:append-ai",
  chapterLogDelete: "chapter-log:delete",
  // ----- Auto Writer -----
  autoWriterStart: "auto-writer:start",
  autoWriterStop: "auto-writer:stop",
  autoWriterPause: "auto-writer:pause",
  autoWriterResume: "auto-writer:resume",
  autoWriterGetRun: "auto-writer:get-run",
  autoWriterListRuns: "auto-writer:list-runs",
  autoWriterInjectIdea: "auto-writer:inject-idea",
  autoWriterCorrect: "auto-writer:correct",
  // ----- Snapshot -----
  snapshotCreate: "snapshot:create",
  snapshotList: "snapshot:list",
  snapshotGet: "snapshot:get",
  snapshotRestore: "snapshot:restore",
  snapshotDelete: "snapshot:delete",
  // ----- Window 控制（自定义 titlebar 用） -----
  windowMinimize: "window:minimize",
  windowToggleMaximize: "window:toggle-maximize",
  windowClose: "window:close",
  windowIsMaximized: "window:is-maximized",
  // ----- M8 · 活人感（Achievements + Letters） -----
  achievementList: "achievement:list",
  achievementCheck: "achievement:check",
  achievementStats: "achievement:stats",
  letterList: "letter:list",
  letterGenerate: "letter:generate",
  letterMarkRead: "letter:mark-read",
  letterPin: "letter:pin",
  letterDismiss: "letter:dismiss",
  letterDelete: "letter:delete",
  // ----- Scene Bindings (ported from ainovel) -----
  sceneBindingList: "scene-binding:list",
  sceneBindingUpsert: "scene-binding:upsert",
  sceneBindingReset: "scene-binding:reset",
  sceneBindingGetMode: "scene-binding:get-mode",
  sceneBindingSetMode: "scene-binding:set-mode",
  // ----- Sample Library (参考小说库, ported from ainovel) -----
  sampleLibList: "sample-lib:list",
  sampleLibCreate: "sample-lib:create",
  sampleLibDelete: "sample-lib:delete",
  sampleLibImportText: "sample-lib:import-text",
  sampleLibImportEpub: "sample-lib:import-epub",
  // ----- World Relationships (graph, ported from ainovel) -----
  worldRelationshipList: "world-relationship:list",
  worldRelationshipSave: "world-relationship:save",
  worldRelationshipDelete: "world-relationship:delete",
  worldTimelineList: "world-timeline:list",
  worldTimelineSave: "world-timeline:save",
  worldTimelineDelete: "world-timeline:delete",
  worldExtractRun: "world-extract:run",
  // ----- Project Export + Chapter Bulk Import (ported from ainovel) -----
  projectExportTxt: "project:export-txt",
  projectExportMd: "project:export-md",
  projectExportHtml: "project:export-html",
  projectExportDocx: "project:export-docx",
  projectExportEpub: "project:export-epub",
  chapterImportTxt: "chapter:import-txt",
  chapterImportEpub: "chapter:import-epub",
  // ----- Module 6: AI outline + chapter generation (ainovel-style chained) -----
  projectUpdateMeta: "project:update-meta",
  outlineGenerateMaster: "outline:generate-master",
  outlineGenerateChapters: "outline:generate-chapters",
  outlineRefine: "outline:refine",
  outlineUndoRefine: "outline:undo-refine",
  chapterGenerateFromOutline: "chapter:generate-from-outline",
  chapterCommitDraft: "chapter:commit-draft",
  // ----- Provider remote model list (ainovel-style discovery) -----
  providerListRemoteModels: "provider:list-remote-models",
} as const;

export const ipcEventChannels = {
  llmChunk: "llm:chunk",
  llmDone: "llm:done",
  terminalData: "terminal:data",
  terminalExit: "terminal:exit",
  skillChunk: "skill:chunk",
  skillDone: "skill:done",
  tavernChunk: "tavern:chunk",
  tavernDone: "tavern:done",
  tavernBudgetWarning: "tavern:budget-warning",
  reviewProgress: "review:progress",
  reviewDone: "review:done",
  dailySummaryChunk: "daily:summary-chunk",
  dailySummaryDone: "daily:summary-done",
  updateStatus: "update:status",
  // ===== M7 · Bookshelf =====
  autoWriterChunk: "auto-writer:chunk",
  autoWriterPhase: "auto-writer:phase",
  autoWriterDone: "auto-writer:done",
  autoWriterSnapshot: "auto-writer:snapshot",
  chapterLogReminder: "chapter-log:daily-reminder",
  windowMaximizedChanged: "window:maximized-changed",
  // ----- M8 · 活人感 -----
  achievementUnlocked: "achievement:unlocked",
  letterArrived: "letter:arrived",
} as const;

export interface ProjectCreateInput {
  name: string;
  /** Absolute path; if omitted, server places project under workspaceDir/projects/<safe-name>. */
  path?: string;
  dailyGoal?: number;
}

export interface ProjectUpdateInput {
  id: string;
  name?: string;
  dailyGoal?: number;
}

export interface ProjectDeleteInput {
  id: string;
  removeFiles?: boolean;
}

export interface ProjectOpenInput {
  id: string;
}

export interface ChapterCreateInput {
  projectId: string;
  parentId?: string | null;
  title: string;
  order?: number;
  status?: string;
  wordCount?: number;
  filePath: string;
}

export interface ChapterUpdateInput {
  id: string;
  title?: string;
  status?: string;
  wordCount?: number;
  filePath?: string;
  content?: string;
}

export interface ChapterListInput {
  projectId: string;
}

export interface ChapterReadInput {
  id: string;
}

export interface ChapterReadResponse {
  chapter: ChapterRecord;
  content: string;
}

export interface ChapterDeleteInput {
  id: string;
}

export interface ChapterReorderInput {
  projectId: string;
  orderedIds: string[];
}

export interface ChapterImportMdInput {
  projectId: string;
  title?: string;
  content: string;
  parentId?: string | null;
}

export interface ChapterExportMdInput {
  id: string;
}

export interface ChapterExportMdResponse {
  id: string;
  title: string;
  fileName: string;
  content: string;
  savedPath?: string;
}

export interface ChapterAutosaveWriteInput {
  id: string;
  content: string;
}

export interface ChapterAutosavePeekInput {
  id: string;
}

export interface ChapterAutosavePeekResponse {
  /** null when no autosave exists or it is not newer than the last DB save. */
  content: string | null;
  /** Autosave file mtime (ms) when present. */
  savedAt: number | null;
  /** Chapter row `updatedAt` (ms) used for the staleness comparison. */
  chapterUpdatedAt: number | null;
}

export interface ChapterAutosaveClearInput {
  id: string;
}

export interface FeedbackListInput {
  chapterId: string;
  limit?: number;
}

export interface FeedbackDismissInput {
  id: string;
  dismissed?: boolean;
}

export interface ProviderSaveInput {
  id?: string;
  label: string;
  vendor: ProviderVendor;
  baseUrl?: string;
  apiKey?: string;
  defaultModel: string;
  tags?: string[];
}

export interface ProviderDeleteInput {
  id: string;
}

export interface ProviderTestInput {
  id: string;
}

export interface ProviderTestResponse {
  ok: boolean;
  durationMs: number;
  error?: string;
}

export interface LLMAnalyzeInput {
  projectId: string;
  chapterId: string;
  chapterText: string;
  providerId?: string;
  model?: string;
  trigger?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMAnalyzeResponse {
  analysisId: string;
  status: "started";
}

export interface LLMChunkEvent {
  analysisId: string;
  projectId: string;
  chapterId: string;
  delta: string;
  accumulatedText: string;
  providerId: string;
  emittedAt: string;
}

export interface LLMDoneEvent {
  analysisId: string;
  projectId: string;
  chapterId: string;
  providerId: string;
  status: "completed" | "failed";
  error?: string;
  feedback?: AIFeedbackRecord;
}

export type LLMQuickActionKind =
  | "polish"
  | "critique"
  | "continue"
  | "inspire"
  | "rephrase";

export interface LLMQuickActionInput {
  kind: LLMQuickActionKind;
  selectedText?: string;
  contextBefore?: string;
  contextAfter?: string;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  persona?: string;
  options?: number;
  extraInstruction?: string;
  projectId?: string;
  chapterId?: string;
}

export interface LLMQuickActionResponse {
  actionId: string;
  kind: LLMQuickActionKind;
  status: "completed" | "failed";
  text?: string;
  options?: string[];
  error?: string;
  durationMs: number;
  providerId: string;
}

export interface LLMChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMChatInput {
  messages: LLMChatMessage[];
  providerId?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  projectId?: string;
  chapterId?: string;
  chapterExcerpt?: string;
}

export interface LLMChatResponse {
  messageId: string;
  status: "completed" | "failed";
  text?: string;
  error?: string;
  durationMs: number;
  providerId: string;
}

export interface OutlineCreateInput {
  projectId: string;
  chapterId?: string | null;
  title: string;
  content?: string;
  status?: string;
  order?: number;
}

export interface OutlineUpdateInput {
  id: string;
  title?: string;
  content?: string;
  status?: string;
  order?: number;
  chapterId?: string | null;
}

export interface OutlineDeleteInput {
  id: string;
}

export interface OutlineListInput {
  projectId: string;
  chapterId?: string;
}

export interface DailyProgressInput {
  projectId: string;
  date?: string;
}

export interface SettingsGetInput {
  key?: string;
}

export interface SettingsSetInput {
  updates: Partial<AppSettings>;
}

export interface DiagSnapshotInput {
  tailLines?: number;
}

export interface DiagSnapshotResponse {
  text: string;
  generatedAt: string;
}

export interface DiagCrashStatusResponse {
  crashed: boolean;
  crashedAt: number | null;
  reason: string | null;
}

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; version: string; releaseUrl: string | null }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

export interface MarketSkillMetaDTO {
  id: string;
  title: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  scope: SkillScope;
  url: string;
  license?: string;
  homepage?: string;
}

export interface MarketRegistryDTO {
  format: "inkforge-market.v1";
  updatedAt: string;
  skills: MarketSkillMetaDTO[];
}

export interface MarketFetchRegistryInput {
  registryUrl?: string;
}

export interface MarketInstallSkillInput {
  url: string;
  scope?: SkillScope;
  projectId?: string | null;
}

export interface MarketInstallSkillResponse {
  installed: boolean;
  skillId: string;
}

export interface MarketBuildPublishBundleInput {
  skillId: string;
}

export interface MarketBuildPublishBundleResponse {
  skillJson: string;
  prInstructions: string;
}

export interface FsPickFileInput {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface FsPickFileResponse {
  path: string | null;
  content: string | null;
  fileName: string | null;
}

export interface FsSaveFileInput {
  defaultPath?: string;
  content: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface FsSaveFileResponse {
  path: string | null;
}

export interface TerminalSpawnInput {
  cwd?: string;
  cols?: number;
  rows?: number;
  shell?: string;
}

export interface TerminalSpawnResponse {
  id: string;
  shell: string;
  cwd: string;
}

export interface TerminalInputPayload {
  id: string;
  data: string;
}

export interface TerminalResizePayload {
  id: string;
  cols: number;
  rows: number;
}

export interface TerminalDisposePayload {
  id: string;
}

export interface TerminalDataEvent {
  id: string;
  data: string;
}

export interface TerminalExitEvent {
  id: string;
  exitCode: number;
  signal?: number;
}

export interface SkillCreateInput {
  name: string;
  prompt: string;
  variables: SkillDefinition["variables"];
  triggers: SkillDefinition["triggers"];
  binding: SkillDefinition["binding"];
  output: SkillDefinition["output"];
  enabled?: boolean;
  scope: SkillScope;
}

export interface SkillUpdateInput {
  id: string;
  name?: string;
  prompt?: string;
  variables?: SkillDefinition["variables"];
  triggers?: SkillDefinition["triggers"];
  binding?: SkillDefinition["binding"];
  output?: SkillDefinition["output"];
  enabled?: boolean;
  scope?: SkillScope;
}

export interface SkillGetInput {
  id: string;
}

export interface SkillListInput {
  scope?: SkillScope;
  enabledOnly?: boolean;
  projectId?: string;
}

export interface SkillDeleteInput {
  id: string;
}

export interface SkillRunInput {
  skillId: string;
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  chapterText: string;
  selection?: string;
  character?: {
    id?: string;
    name?: string;
    persona?: string;
  };
  manualVariables?: Record<string, string>;
  triggerType?: SkillTriggerType;
  persist?: boolean;
}

export interface SkillRunResponse {
  runId: string;
  status: "started";
}

export interface SkillImportJsonInput {
  content: string;
  onConflict?: "replace" | "skip" | "rename";
  scopeOverride?: SkillScope;
}

export interface SkillExportJsonInput {
  ids?: string[];
  scope?: SkillScope;
  includeDisabled?: boolean;
}

export interface SkillExportJsonResponse {
  fileName: string;
  content: string;
  format: SkillPackV1["format"];
  version: SkillPackV1["version"];
}

export interface SkillChunkEvent {
  runId: string;
  skillId: string;
  projectId: string;
  chapterId: string;
  delta: string;
  accumulatedText: string;
  providerId: string;
  model: string;
  emittedAt: string;
}

export interface SkillDoneEvent {
  runId: string;
  skillId: string;
  projectId: string;
  chapterId: string;
  status: "completed" | "failed" | "cancelled";
  error?: string;
  feedbackId?: string;
  usage?: SkillRunUsage;
  finishedAt: string;
}

export interface TavernCardCreateInput {
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
  syncMode?: TavernCardRecord["syncMode"];
}

export interface TavernCardUpdateInput {
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
  syncMode?: TavernCardRecord["syncMode"];
}

export interface TavernCardGetInput {
  id: string;
}

export interface TavernCardListInput {
  projectId?: string;
}

export interface TavernCardDeleteInput {
  id: string;
}

// ---------- Tavern card import/export (SillyTavern V2 cards) ----------

export type TavernCardImportSource = "png" | "json";
export type TavernCardSpecKind = "chara_card_v2" | "legacy_v1";

export type TavernCardIoErrorCode =
  | "not-a-png"
  | "no-chara-chunk"
  | "bad-base64"
  | "bad-json"
  | "unsupported-spec"
  | "no-provider"
  | "card-not-found"
  | "file-too-large"
  | "io-error";

export interface TavernCardIoError {
  code: TavernCardIoErrorCode;
  message: string;
}

export interface TavernCardImportReport {
  source: TavernCardImportSource;
  spec: TavernCardSpecKind;
  /** Non-empty V2 fields we have no model for (character_book, alternate_greetings, …). */
  droppedFields: string[];
  warnings: string[];
  savedAvatar: boolean;
}

export type TavernCardImportResponse =
  | { ok: true; cancelled: false; card: TavernCardRecord; report: TavernCardImportReport }
  | { ok: false; cancelled: true; card: null; report: null }
  | { ok: false; cancelled: false; card: null; report: null; error: TavernCardIoError };

export interface TavernCardExportInput {
  id: string;
}

export type TavernCardExportResponse =
  | { ok: true; cancelled: false; path: string; format: "png" | "json"; usedPlaceholderAvatar: boolean }
  | { ok: false; cancelled: true; path: null }
  | { ok: false; cancelled: false; path: null; error: TavernCardIoError };

export interface TavernCardAvatarGetInput {
  id: string;
}

export interface TavernCardAvatarGetResponse {
  /** Base64 PNG bytes for direct renderer display; null when the card has no stored avatar. */
  base64: string | null;
}

export interface NovelCharacterCreateInput {
  projectId: string;
  name: string;
  persona?: string | null;
  traits?: Record<string, unknown>;
  backstory?: string;
  relations?: Array<{ otherId: string; label: string }>;
  linkedTavernCardId?: string | null;
}

export interface NovelCharacterUpdateInput {
  id: string;
  name?: string;
  persona?: string | null;
  traits?: Record<string, unknown>;
  backstory?: string;
  relations?: Array<{ otherId: string; label: string }>;
  linkedTavernCardId?: string | null;
}

export interface NovelCharacterGetInput {
  id: string;
}

export interface NovelCharacterListInput {
  projectId: string;
}

export interface NovelCharacterDeleteInput {
  id: string;
}

export type CharacterSyncRequestDirection = "novel_to_card" | "card_to_novel" | "auto";

export interface CharacterSyncPreviewInput {
  novelCharId: string;
  tavernCardId: string;
  direction?: CharacterSyncRequestDirection;
}

export interface CharacterSyncPreviewResponse {
  diffs: SyncDiffRow[];
}

export interface CharacterSyncResolutionInput {
  field: SyncDiffRow["field"];
  winner: "novel" | "card";
}

export interface CharacterSyncApplyInput {
  novelCharId: string;
  tavernCardId: string;
  direction: CharacterSyncRequestDirection;
  resolutions?: CharacterSyncResolutionInput[];
}

export interface CharacterSyncApplyResponse {
  updatedNovelCharacter: NovelCharacterRecord;
  updatedTavernCard: TavernCardRecord;
  logsWritten: number;
}

export interface CharacterSyncHistoryInput {
  novelCharId?: string;
  tavernCardId?: string;
  limit?: number;
}

export interface TavernSessionCreateInput {
  projectId: string;
  title: string;
  topic: string;
  mode: TavernMode;
  budgetTokens: number;
  summaryProviderId?: string;
  summaryModel?: string;
  lastK?: number;
  userName?: string;
  userPersona?: string;
}

export interface TavernSessionGetInput {
  sessionId: string;
}

export interface TavernSessionListInput {
  projectId: string;
  limit?: number;
}

export interface TavernSessionDeleteInput {
  sessionId: string;
}

export interface TavernMessageListInput {
  sessionId: string;
  limit?: number;
  beforeCreatedAt?: string;
  order?: "asc" | "desc";
}

export interface TavernDirectorPostInput {
  sessionId: string;
  content: string;
}

export interface TavernDirectorPostResponse {
  messageId: string;
}

export interface TavernUserPostInput {
  sessionId: string;
  content: string;
}

export interface TavernUserPostResponse {
  messageId: string;
}

export interface TavernRoundRunInput {
  sessionId: string;
  mode?: TavernMode;
  participants: string[];
  lastK?: number;
  autoRounds?: number;
  directorMessage?: string;
}

export interface TavernRoundRunResponse {
  roundId: string;
  status: "started";
}

export interface TavernRoundStopInput {
  roundId: string;
}

export interface TavernRoundStopResponse {
  roundId: string;
  stopped: true;
}

export interface TavernSummaryCompactInput {
  sessionId: string;
  keepLastK: number;
}

export interface TavernChunkEvent {
  roundId: string;
  sessionId: string;
  roundIndex: number;
  turnIndex: number;
  speakerCardId: string;
  speakerName: string;
  delta: string;
  accumulatedText: string;
  providerId: string;
  model: string;
  emittedAt: string;
}

export interface TavernDoneEvent {
  /** "turn" fires after each speaker; "round" fires once when the whole run settles. */
  kind: "turn" | "round";
  roundId: string;
  sessionId: string;
  roundIndex?: number;
  turnIndex?: number;
  speakerCardId: string;
  messageId?: string;
  status: "completed" | "failed" | "stopped";
  usage?: SkillRunUsage;
  error?: string;
  finishedAt: string;
}

export interface TavernBudgetWarningEvent {
  sessionId: string;
  remainingTokens: number;
  estimatedNextRoundTokens: number;
  threshold: number;
  emittedAt: string;
  state?: TokenBudgetState;
}

// ---------- M4 · World ----------
export interface WorldListInput {
  projectId: string;
  category?: string;
  search?: string;
}
export interface WorldGetInput {
  id: string;
}
export interface WorldCreateInput {
  projectId: string;
  category: string;
  title: string;
  content?: string;
  aliases?: string[];
  tags?: string[];
}
export interface WorldUpdateInput {
  id: string;
  category?: string;
  title?: string;
  content?: string;
  aliases?: string[];
  tags?: string[];
}
export interface WorldDeleteInput {
  id: string;
}
export interface WorldSearchInput {
  projectId: string;
  query: string;
  limit?: number;
}

// ---------- M4 · Research ----------
export interface ResearchSearchInput {
  projectId: string;
  query: string;
  provider?: ResearchProvider;
  topK?: number;
  apiKey?: string;
}
export interface ResearchSearchResponse {
  hits: ResearchSearchHit[];
  usedProvider: ResearchProvider;
  fellBackToLlm?: boolean;
  error?: string;
}
export interface ResearchListInput {
  projectId: string;
  topic?: string;
  limit?: number;
}
export interface ResearchGetInput {
  id: string;
}
export interface ResearchSaveInput {
  projectId: string;
  topic: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceProvider: ResearchProvider;
  excerpt: string;
  note?: string;
  tags?: string[];
}
export interface ResearchUpdateInput {
  id: string;
  topic?: string;
  note?: string;
  tags?: string[];
}
export interface ResearchDeleteInput {
  id: string;
}

export interface ResearchCredentialStatus {
  provider: ResearchProvider;
  configured: boolean;
}
export interface ResearchCredentialStatusInput {
  providers?: ResearchProvider[];
}
export interface ResearchCredentialUpsertInput {
  provider: ResearchProvider;
  apiKey: string;
}
export interface ResearchCredentialDeleteInput {
  provider: ResearchProvider;
}

// ---------- M4 · Review ----------
export interface ReviewDimListInput {
  projectId: string;
}
export interface ReviewDimUpsertInput {
  id?: string;
  projectId: string | null;
  name: string;
  kind: ReviewDimensionKind;
  builtinId?: ReviewBuiltinId | null;
  skillId?: string | null;
  scope?: ReviewScope;
  severity?: ReviewSeverity;
  enabled?: boolean;
  order?: number;
}
export interface ReviewDimDeleteInput {
  id: string;
}
export interface ReviewDimReorderInput {
  projectId: string;
  orderedIds: string[];
}
export interface ReviewRunInput {
  projectId: string;
  rangeKind: "book" | "chapter" | "range";
  rangeIds?: string[];
  dimensionIds?: string[];
  providerId?: string;
  model?: string;
}
export interface ReviewRunResponse {
  reportId: string;
  status: "started";
}
export interface ReviewCancelInput {
  reportId: string;
}
export interface ReviewCancelResponse {
  reportId: string;
  cancelled: true;
}
export interface ReviewListInput {
  projectId: string;
  limit?: number;
}
export interface ReviewGetInput {
  reportId: string;
}
export interface ReviewGetResponse {
  report: ReviewReportRecord;
  findings: ReviewFindingRecord[];
}
export interface ReviewDismissFindingInput {
  findingId: string;
  dismissed?: boolean;
}
export interface ReviewDismissFindingResponse {
  findingId: string;
  dismissed: boolean;
}
export interface ReviewExportInput {
  reportId: string;
  format?: "md";
}
export interface ReviewExportResponse {
  fileName: string;
  content: string;
  format: "md";
}
export interface ReviewProgressEvent {
  reportId: string;
  phase: "map" | "reduce" | "persist";
  processedChapters: number;
  totalChapters: number;
  partialFindings?: number;
  emittedAt: string;
}
export interface ReviewDoneEvent {
  reportId: string;
  status: ReviewReportStatus;
  summary?: ReviewReportSummary;
  error?: string;
  finishedAt: string;
}

// ---------- M4 · Daily summary ----------
export interface DailySummaryGenerateInput {
  projectId: string;
  date?: string;
  providerId?: string;
  model?: string;
}
export interface DailySummaryGenerateResponse {
  summaryId: string;
  status: "started";
}
export interface DailySummaryGetInput {
  projectId: string;
  date: string;
}
export interface DailySummaryListInput {
  projectId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
export interface DailySummaryChunkEvent {
  summaryId: string;
  projectId: string;
  date: string;
  delta: string;
  accumulatedText: string;
  emittedAt: string;
}
export interface DailySummaryDoneEvent {
  summaryId: string;
  projectId: string;
  date: string;
  status: "completed" | "failed" | "cancelled";
  summary?: string;
  error?: string;
  finishedAt: string;
}

// ---------- M4 · Provider Multi-Key ----------
export interface ProviderKeyListInput {
  providerId: string;
}
export interface ProviderKeyUpsertInput {
  providerId: string;
  id?: string;
  label: string;
  apiKey?: string;
  weight?: number;
  disabled?: boolean;
  strategy?: ProviderKeyStrategy;
  cooldownMs?: number;
}
export interface ProviderKeyDeleteInput {
  id: string;
}
export interface ProviderKeySetDisabledInput {
  id: string;
  disabled: boolean;
}
export interface ProviderKeyHealthInput {
  providerId: string;
}

export interface IpcRequestMap {
  [ipcChannels.projectCreate]: { req: ProjectCreateInput; res: ProjectRecord };
  [ipcChannels.projectList]: { req: void; res: ProjectRecord[] };
  [ipcChannels.projectUpdate]: { req: ProjectUpdateInput; res: ProjectRecord };
  [ipcChannels.projectDelete]: { req: ProjectDeleteInput; res: { id: string } };
  [ipcChannels.projectOpen]: { req: ProjectOpenInput; res: ProjectRecord };
  [ipcChannels.chapterCreate]: { req: ChapterCreateInput; res: ChapterRecord };
  [ipcChannels.chapterUpdate]: { req: ChapterUpdateInput; res: ChapterRecord };
  [ipcChannels.chapterList]: { req: ChapterListInput; res: ChapterRecord[] };
  [ipcChannels.chapterRead]: { req: ChapterReadInput; res: ChapterReadResponse };
  [ipcChannels.chapterDelete]: { req: ChapterDeleteInput; res: { id: string } };
  [ipcChannels.chapterReorder]: { req: ChapterReorderInput; res: ChapterRecord[] };
  [ipcChannels.chapterImportMd]: { req: ChapterImportMdInput; res: ChapterRecord };
  [ipcChannels.chapterExportMd]: { req: ChapterExportMdInput; res: ChapterExportMdResponse };
  [ipcChannels.chapterAutosaveWrite]: {
    req: ChapterAutosaveWriteInput;
    res: { savedAt: number };
  };
  [ipcChannels.chapterAutosavePeek]: {
    req: ChapterAutosavePeekInput;
    res: ChapterAutosavePeekResponse;
  };
  [ipcChannels.chapterAutosaveClear]: {
    req: ChapterAutosaveClearInput;
    res: { ok: true };
  };
  [ipcChannels.providerSave]: { req: ProviderSaveInput; res: ProviderRecord };
  [ipcChannels.providerList]: { req: void; res: ProviderRecord[] };
  [ipcChannels.providerDelete]: { req: ProviderDeleteInput; res: { id: string } };
  [ipcChannels.providerTest]: { req: ProviderTestInput; res: ProviderTestResponse };
  [ipcChannels.llmAnalyze]: { req: LLMAnalyzeInput; res: LLMAnalyzeResponse };
  [ipcChannels.llmQuick]: { req: LLMQuickActionInput; res: LLMQuickActionResponse };
  [ipcChannels.llmChat]: { req: LLMChatInput; res: LLMChatResponse };
  [ipcChannels.feedbackList]: { req: FeedbackListInput; res: AIFeedbackRecord[] };
  [ipcChannels.feedbackDismiss]: { req: FeedbackDismissInput; res: { id: string; dismissed: boolean } };
  [ipcChannels.outlineCreate]: { req: OutlineCreateInput; res: OutlineCardRecord };
  [ipcChannels.outlineUpdate]: { req: OutlineUpdateInput; res: OutlineCardRecord };
  [ipcChannels.outlineDelete]: { req: OutlineDeleteInput; res: { id: string } };
  [ipcChannels.outlineList]: { req: OutlineListInput; res: OutlineCardRecord[] };
  [ipcChannels.dailyProgress]: { req: DailyProgressInput; res: DailyProgressRecord };
  [ipcChannels.settingsGet]: { req: SettingsGetInput; res: AppSettings };
  [ipcChannels.settingsSet]: { req: SettingsSetInput; res: AppSettings };
  [ipcChannels.fsPickFile]: { req: FsPickFileInput; res: FsPickFileResponse };
  [ipcChannels.fsSaveFile]: { req: FsSaveFileInput; res: FsSaveFileResponse };
  [ipcChannels.terminalSpawn]: { req: TerminalSpawnInput; res: TerminalSpawnResponse };
  [ipcChannels.terminalInput]: { req: TerminalInputPayload; res: { ok: true } };
  [ipcChannels.terminalResize]: { req: TerminalResizePayload; res: { ok: true } };
  [ipcChannels.terminalDispose]: { req: TerminalDisposePayload; res: { ok: true } };
  [ipcChannels.skillCreate]: { req: SkillCreateInput; res: SkillDefinition };
  [ipcChannels.skillUpdate]: { req: SkillUpdateInput; res: SkillDefinition };
  [ipcChannels.skillGet]: { req: SkillGetInput; res: SkillDefinition | null };
  [ipcChannels.skillList]: { req: SkillListInput; res: SkillDefinition[] };
  [ipcChannels.skillDelete]: { req: SkillDeleteInput; res: { id: string } };
  [ipcChannels.skillRun]: { req: SkillRunInput; res: SkillRunResponse };
  [ipcChannels.skillImportJson]: { req: SkillImportJsonInput; res: SkillImportReport };
  [ipcChannels.skillExportJson]: { req: SkillExportJsonInput; res: SkillExportJsonResponse };
  [ipcChannels.tavernCardCreate]: { req: TavernCardCreateInput; res: TavernCardRecord };
  [ipcChannels.tavernCardUpdate]: { req: TavernCardUpdateInput; res: TavernCardRecord };
  [ipcChannels.tavernCardGet]: { req: TavernCardGetInput; res: TavernCardRecord | null };
  [ipcChannels.tavernCardList]: { req: TavernCardListInput; res: TavernCardRecord[] };
  [ipcChannels.tavernCardDelete]: { req: TavernCardDeleteInput; res: { id: string } };
  [ipcChannels.tavernCardImport]: { req: Record<string, never>; res: TavernCardImportResponse };
  [ipcChannels.tavernCardExport]: { req: TavernCardExportInput; res: TavernCardExportResponse };
  [ipcChannels.tavernCardAvatarGet]: { req: TavernCardAvatarGetInput; res: TavernCardAvatarGetResponse };
  [ipcChannels.novelCharacterCreate]: { req: NovelCharacterCreateInput; res: NovelCharacterRecord };
  [ipcChannels.novelCharacterUpdate]: { req: NovelCharacterUpdateInput; res: NovelCharacterRecord };
  [ipcChannels.novelCharacterGet]: { req: NovelCharacterGetInput; res: NovelCharacterRecord | null };
  [ipcChannels.novelCharacterList]: { req: NovelCharacterListInput; res: NovelCharacterRecord[] };
  [ipcChannels.novelCharacterDelete]: { req: NovelCharacterDeleteInput; res: { id: string } };
  [ipcChannels.characterSyncPreview]: { req: CharacterSyncPreviewInput; res: CharacterSyncPreviewResponse };
  [ipcChannels.characterSyncApply]: { req: CharacterSyncApplyInput; res: CharacterSyncApplyResponse };
  [ipcChannels.characterSyncHistory]: { req: CharacterSyncHistoryInput; res: CharacterSyncLogRecord[] };
  [ipcChannels.tavernSessionCreate]: { req: TavernSessionCreateInput; res: TavernSessionRecord };
  [ipcChannels.tavernSessionGet]: { req: TavernSessionGetInput; res: TavernSessionRecord | null };
  [ipcChannels.tavernSessionList]: { req: TavernSessionListInput; res: TavernSessionRecord[] };
  [ipcChannels.tavernSessionDelete]: { req: TavernSessionDeleteInput; res: { sessionId: string } };
  [ipcChannels.tavernMessageList]: { req: TavernMessageListInput; res: TavernMessageRecord[] };
  [ipcChannels.tavernDirectorPost]: { req: TavernDirectorPostInput; res: TavernDirectorPostResponse };
  [ipcChannels.tavernUserPost]: { req: TavernUserPostInput; res: TavernUserPostResponse };
  [ipcChannels.tavernRoundRun]: { req: TavernRoundRunInput; res: TavernRoundRunResponse };
  [ipcChannels.tavernRoundStop]: { req: TavernRoundStopInput; res: TavernRoundStopResponse };
  [ipcChannels.tavernSummaryCompact]: { req: TavernSummaryCompactInput; res: CompactResult };
  [ipcChannels.worldList]: { req: WorldListInput; res: WorldEntryRecord[] };
  [ipcChannels.worldGet]: { req: WorldGetInput; res: WorldEntryRecord | null };
  [ipcChannels.worldCreate]: { req: WorldCreateInput; res: WorldEntryRecord };
  [ipcChannels.worldUpdate]: { req: WorldUpdateInput; res: WorldEntryRecord };
  [ipcChannels.worldDelete]: { req: WorldDeleteInput; res: { id: string } };
  [ipcChannels.worldSearch]: { req: WorldSearchInput; res: WorldEntryRecord[] };
  [ipcChannels.researchSearch]: { req: ResearchSearchInput; res: ResearchSearchResponse };
  [ipcChannels.researchList]: { req: ResearchListInput; res: ResearchNoteRecord[] };
  [ipcChannels.researchGet]: { req: ResearchGetInput; res: ResearchNoteRecord | null };
  [ipcChannels.researchSave]: { req: ResearchSaveInput; res: ResearchNoteRecord };
  [ipcChannels.researchUpdate]: { req: ResearchUpdateInput; res: ResearchNoteRecord };
  [ipcChannels.researchDelete]: { req: ResearchDeleteInput; res: { id: string } };
  [ipcChannels.researchCredentialStatus]: {
    req: ResearchCredentialStatusInput;
    res: ResearchCredentialStatus[];
  };
  [ipcChannels.researchCredentialUpsert]: {
    req: ResearchCredentialUpsertInput;
    res: ResearchCredentialStatus;
  };
  [ipcChannels.researchCredentialDelete]: {
    req: ResearchCredentialDeleteInput;
    res: ResearchCredentialStatus;
  };
  [ipcChannels.reviewDimList]: { req: ReviewDimListInput; res: ReviewDimensionRecord[] };
  [ipcChannels.reviewDimUpsert]: { req: ReviewDimUpsertInput; res: ReviewDimensionRecord };
  [ipcChannels.reviewDimDelete]: { req: ReviewDimDeleteInput; res: { id: string } };
  [ipcChannels.reviewDimReorder]: {
    req: ReviewDimReorderInput;
    res: ReviewDimensionRecord[];
  };
  [ipcChannels.reviewRun]: { req: ReviewRunInput; res: ReviewRunResponse };
  [ipcChannels.reviewCancel]: { req: ReviewCancelInput; res: ReviewCancelResponse };
  [ipcChannels.reviewList]: { req: ReviewListInput; res: ReviewReportRecord[] };
  [ipcChannels.reviewGet]: { req: ReviewGetInput; res: ReviewGetResponse | null };
  [ipcChannels.reviewDismissFinding]: {
    req: ReviewDismissFindingInput;
    res: ReviewDismissFindingResponse;
  };
  [ipcChannels.reviewExport]: { req: ReviewExportInput; res: ReviewExportResponse };
  [ipcChannels.dailySummaryGenerate]: {
    req: DailySummaryGenerateInput;
    res: DailySummaryGenerateResponse;
  };
  [ipcChannels.dailySummaryGet]: {
    req: DailySummaryGetInput;
    res: DailySummaryRecord | null;
  };
  [ipcChannels.dailySummaryList]: {
    req: DailySummaryListInput;
    res: DailySummaryRecord[];
  };
  [ipcChannels.providerKeyList]: {
    req: ProviderKeyListInput;
    res: ProviderKeyRecord[];
  };
  [ipcChannels.providerKeyUpsert]: {
    req: ProviderKeyUpsertInput;
    res: ProviderKeyRecord;
  };
  [ipcChannels.providerKeyDelete]: {
    req: ProviderKeyDeleteInput;
    res: { id: string };
  };
  [ipcChannels.providerKeySetDisabled]: {
    req: ProviderKeySetDisabledInput;
    res: ProviderKeyRecord;
  };
  [ipcChannels.providerKeyHealth]: {
    req: ProviderKeyHealthInput;
    res: ProviderHealthSnapshot;
  };
  [ipcChannels.diagSnapshot]: { req: DiagSnapshotInput; res: DiagSnapshotResponse };
  [ipcChannels.diagCrashStatus]: { req: void; res: DiagCrashStatusResponse };
  [ipcChannels.diagCrashDismiss]: { req: void; res: { ok: true } };
  [ipcChannels.updateCheck]: { req: void; res: UpdateStatus };
  [ipcChannels.updateDownload]: { req: void; res: { ok: true } };
  [ipcChannels.updateInstall]: { req: void; res: { ok: true } };
  [ipcChannels.updateStatus]: { req: void; res: UpdateStatus };
  [ipcChannels.updateOpenDownloadPage]: { req: void; res: { ok: true } };
  [ipcChannels.marketFetchRegistry]: {
    req: MarketFetchRegistryInput;
    res: MarketRegistryDTO;
  };
  [ipcChannels.marketInstallSkill]: {
    req: MarketInstallSkillInput;
    res: MarketInstallSkillResponse;
  };
  [ipcChannels.marketBuildPublishBundle]: {
    req: MarketBuildPublishBundleInput;
    res: MarketBuildPublishBundleResponse;
  };
}

export interface IpcEventMap {
  [ipcEventChannels.llmChunk]: LLMChunkEvent;
  [ipcEventChannels.llmDone]: LLMDoneEvent;
  [ipcEventChannels.terminalData]: TerminalDataEvent;
  [ipcEventChannels.terminalExit]: TerminalExitEvent;
  [ipcEventChannels.skillChunk]: SkillChunkEvent;
  [ipcEventChannels.skillDone]: SkillDoneEvent;
  [ipcEventChannels.tavernChunk]: TavernChunkEvent;
  [ipcEventChannels.tavernDone]: TavernDoneEvent;
  [ipcEventChannels.tavernBudgetWarning]: TavernBudgetWarningEvent;
  [ipcEventChannels.reviewProgress]: ReviewProgressEvent;
  [ipcEventChannels.reviewDone]: ReviewDoneEvent;
  [ipcEventChannels.dailySummaryChunk]: DailySummaryChunkEvent;
  [ipcEventChannels.dailySummaryDone]: DailySummaryDoneEvent;
  [ipcEventChannels.updateStatus]: UpdateStatus;
}

export type IpcChannel = keyof IpcRequestMap;
export type IpcEventChannel = keyof IpcEventMap;

// =====================================================================
// M7 · Bookshelf Module
// 新 IPC 契约。利用 TypeScript interface declaration merging 扩展
// IpcRequestMap / IpcEventMap，避免修改上方现有定义的内部顺序。
// =====================================================================

// ---------- Bookshelf · 书架视图 ----------

/** 书架列表项：聚合 ProjectRecord + 封面 + 进度统计 + 各 origin 章节计数。 */
export interface BookSummary {
  project: ProjectRecord;
  cover: BookCoverRecord | null;
  chapterCount: number;
  totalWords: number;
  /** 当日新增字数（按 daily_logs 取）。 */
  todayWords: number;
  /** 最近一次章节更新的 ISO 时间，便于按"最近编辑"排序。 */
  lastChapterUpdatedAt: string | null;
  /** 各 origin 分类的章节数。'manual' 包含未打标签的旧章节。 */
  originCounts: Record<ChapterOrigin, number>;
}

export type BookshelfListBooksResponse = BookSummary[];

// ---------- Bookshelf · 封面 ----------

export interface BookCoverUploadInput {
  projectId: string;
  /** 原始文件名，用于推断扩展名。 */
  fileName: string;
  /** Base64-encoded bytes，主进程解码后写入。 */
  base64: string;
  mime: string;
}

export interface BookCoverUploadResponse {
  cover: BookCoverRecord;
}

export interface BookCoverGetInput {
  projectId: string;
}

export interface BookCoverGetResponse {
  cover: BookCoverRecord | null;
  /** 若 cover 存在，返回 base64 内容供 renderer 直接显示。 */
  base64: string | null;
}

export interface BookCoverDeleteInput {
  projectId: string;
}

// ---------- Origin Tag ----------

export interface OriginTagSetInput {
  chapterId: string;
  origin: ChapterOrigin;
}

export interface OriginTagGetInput {
  chapterId: string;
}

export interface OriginTagListByOriginInput {
  projectId: string;
  origin: ChapterOrigin;
  /**
   * 仅 origin === 'manual' 时生效。默认 true：把未打标签的旧章节也纳入此分类。
   * 这样老用户进入书房时不需要批量打标。
   */
  includeUntagged?: boolean;
}

export interface OriginTagListByOriginResponse {
  chapterIds: string[];
}

// ---------- Chapter Log ----------

export interface ChapterLogListInput {
  chapterId: string;
  limit?: number;
  /** 默认 true：最新在前。 */
  desc?: boolean;
}

export interface ChapterLogAppendManualInput {
  chapterId: string;
  projectId: string;
  content: string;
}

export interface ChapterLogAppendAiInput {
  chapterId: string;
  projectId: string;
  /** AI 触发的日志类型：ai-run / progress 二选一。 */
  kind: Extract<ChapterLogEntryKind, "ai-run" | "progress">;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChapterLogDeleteInput {
  entryId: string;
}

// ---------- Auto Writer ----------

export interface AutoWriterStartInput {
  projectId: string;
  chapterId: string;
  userIdeas: string;
  /**
   * Agent 与模型的绑定。常见两种形态：
   *   - 默认（统一模型）：传 1 条带 role='writer' 的 binding，主进程把它复制给其他 3 个角色
   *   - 高级（分别绑定）：传 4 条 binding，每条对应一个角色
   */
  agents: AutoWriterAgentBinding[];
  /** 单段长度目标（字数），默认 400。 */
  targetSegmentLength?: number;
  /** 期望段数上限（含 Planner 提的 beat 数）。默认 12。 */
  maxSegments?: number;
  /** 单段最多重写次数（Critic 不通过时回炉次数上限），默认 3。 */
  maxRewritesPerSegment?: number;
  /** 是否启用 OOC 守门员（默认 true）。 */
  enableOocGate?: boolean;
}

export interface AutoWriterStartResponse {
  runId: string;
  status: "started";
}

export interface AutoWriterStopInput {
  runId: string;
}

export interface AutoWriterStopResponse {
  runId: string;
  stopped: true;
}

export interface AutoWriterPauseInput {
  runId: string;
}

export interface AutoWriterResumeInput {
  runId: string;
}

export interface AutoWriterGetRunInput {
  runId: string;
}

export interface AutoWriterListRunsInput {
  /** chapterId 与 projectId 至少传一个。 */
  chapterId?: string;
  projectId?: string;
  limit?: number;
  status?: AutoWriterRunStatus;
}

export interface AutoWriterInjectIdeaInput {
  runId: string;
  /** 用户中途追加的思路/约束，下一段 Writer 会作为 extraSystem 注入。 */
  content: string;
}

export interface AutoWriterCorrectInput {
  runId: string;
  content: string;
  /** 用户标记的错误段落原文片段，便于 Critic / Writer 定位。 */
  targetExcerpt?: string;
}

export interface AutoWriterCorrectResponse {
  runId: string;
  correction: AutoWriterCorrectionEntry;
  run: AutoWriterRunRecord;
}

// ---------- Auto Writer · 流式事件 ----------

export interface AutoWriterChunkEvent {
  runId: string;
  chapterId: string;
  agentRole: AutoWriterAgentRole;
  segmentIndex: number;
  delta: string;
  accumulatedText: string;
  emittedAt: string;
}

/** 状态机切换事件。前端用它驱动「Phase 指示器」。 */
export type AutoWriterPhase =
  | "planner"
  | "writer"
  | "critic"
  | "reflector"
  | "rewrite-segment"
  | "next-segment"
  | "done";

export interface AutoWriterPhaseEvent {
  runId: string;
  chapterId: string;
  phase: AutoWriterPhase;
  segmentIndex: number;
  /** 仅 phase='rewrite-segment' 时有：本段累计重写次数（含本次）。 */
  rewriteCount?: number;
  /** 仅 phase='critic' 完成时有：findings 按 severity 计数。 */
  criticSummary?: { errorCount: number; warnCount: number; infoCount: number };
  emittedAt: string;
}

export interface AutoWriterDoneEvent {
  runId: string;
  chapterId: string;
  status: AutoWriterRunStatus;
  totalSegments: number;
  totalRewrites: number;
  totalTokensIn: number;
  totalTokensOut: number;
  error?: string;
  finishedAt: string;
}

export interface AutoWriterSnapshotEvent {
  runId: string;
  chapterId: string;
  snapshot: ChapterSnapshotRecord;
  emittedAt: string;
}

// ---------- Snapshot ----------

export interface SnapshotCreateInput {
  chapterId: string;
  projectId: string;
  /** 用户为手动快照命名，可选；自动快照传 null。 */
  label?: string | null;
  /** 默认 'manual'。 */
  kind?: ChapterSnapshotKind;
  /** 关联的 AutoWriter 运行 id。 */
  runId?: string;
  agentRole?: AutoWriterAgentRole;
  sourceMessageId?: string;
}

export interface SnapshotCreateResponse {
  snapshot: ChapterSnapshotRecord;
}

export interface SnapshotListInput {
  chapterId: string;
  limit?: number;
  kinds?: ChapterSnapshotKind[];
  runId?: string;
}

export interface SnapshotGetInput {
  snapshotId: string;
}

export interface SnapshotGetResponse {
  snapshot: ChapterSnapshotRecord;
  /** 快照文件正文（utf-8）。 */
  content: string;
}

export interface SnapshotRestoreInput {
  snapshotId: string;
}

export interface SnapshotRestoreResponse {
  /** 被还原回章节的快照。 */
  restored: ChapterSnapshotRecord;
  /** 还原前自动产生的 'pre-restore' 快照（让还原本身也可撤销）。 */
  preRestoreSnapshot: ChapterSnapshotRecord;
  /** 还原后章节最新内容（renderer 用它刷新编辑器）。 */
  chapterContent: string;
}

export interface SnapshotDeleteInput {
  snapshotId: string;
}

// ---------- 每日日志提醒 ----------

export interface ChapterLogDailyReminderEvent {
  /** 该提醒覆盖的项目和章节范围；空表示全局提醒。 */
  projectId?: string;
  chapterIds?: string[];
  emittedAt: string;
}

// ---------- 通过接口合并扩展请求/事件映射 ----------

export interface IpcRequestMap {
  // Bookshelf
  [ipcChannels.bookshelfListBooks]: { req: void; res: BookshelfListBooksResponse };
  [ipcChannels.bookCoverUpload]: { req: BookCoverUploadInput; res: BookCoverUploadResponse };
  [ipcChannels.bookCoverGet]: { req: BookCoverGetInput; res: BookCoverGetResponse };
  [ipcChannels.bookCoverDelete]: {
    req: BookCoverDeleteInput;
    res: { projectId: string };
  };
  // Origin Tag
  [ipcChannels.originTagSet]: {
    req: OriginTagSetInput;
    res: ChapterOriginTagRecord;
  };
  [ipcChannels.originTagGet]: {
    req: OriginTagGetInput;
    res: ChapterOriginTagRecord | null;
  };
  [ipcChannels.originTagListByOrigin]: {
    req: OriginTagListByOriginInput;
    res: OriginTagListByOriginResponse;
  };
  // Chapter Log
  [ipcChannels.chapterLogList]: {
    req: ChapterLogListInput;
    res: ChapterLogEntryRecord[];
  };
  [ipcChannels.chapterLogAppendManual]: {
    req: ChapterLogAppendManualInput;
    res: ChapterLogEntryRecord;
  };
  [ipcChannels.chapterLogAppendAi]: {
    req: ChapterLogAppendAiInput;
    res: ChapterLogEntryRecord;
  };
  [ipcChannels.chapterLogDelete]: {
    req: ChapterLogDeleteInput;
    res: { entryId: string };
  };
  // Auto Writer
  [ipcChannels.autoWriterStart]: {
    req: AutoWriterStartInput;
    res: AutoWriterStartResponse;
  };
  [ipcChannels.autoWriterStop]: {
    req: AutoWriterStopInput;
    res: AutoWriterStopResponse;
  };
  [ipcChannels.autoWriterPause]: {
    req: AutoWriterPauseInput;
    res: AutoWriterRunRecord;
  };
  [ipcChannels.autoWriterResume]: {
    req: AutoWriterResumeInput;
    res: AutoWriterRunRecord;
  };
  [ipcChannels.autoWriterGetRun]: {
    req: AutoWriterGetRunInput;
    res: AutoWriterRunRecord | null;
  };
  [ipcChannels.autoWriterListRuns]: {
    req: AutoWriterListRunsInput;
    res: AutoWriterRunRecord[];
  };
  [ipcChannels.autoWriterInjectIdea]: {
    req: AutoWriterInjectIdeaInput;
    res: AutoWriterRunRecord;
  };
  [ipcChannels.autoWriterCorrect]: {
    req: AutoWriterCorrectInput;
    res: AutoWriterCorrectResponse;
  };
  // Snapshot
  [ipcChannels.snapshotCreate]: {
    req: SnapshotCreateInput;
    res: SnapshotCreateResponse;
  };
  [ipcChannels.snapshotList]: {
    req: SnapshotListInput;
    res: ChapterSnapshotRecord[];
  };
  [ipcChannels.snapshotGet]: {
    req: SnapshotGetInput;
    res: SnapshotGetResponse;
  };
  [ipcChannels.snapshotRestore]: {
    req: SnapshotRestoreInput;
    res: SnapshotRestoreResponse;
  };
  [ipcChannels.snapshotDelete]: {
    req: SnapshotDeleteInput;
    res: { snapshotId: string };
  };
  // Window
  [ipcChannels.windowMinimize]: { req: void; res: { ok: true } };
  [ipcChannels.windowToggleMaximize]: { req: void; res: { isMaximized: boolean } };
  [ipcChannels.windowClose]: { req: void; res: { ok: true } };
  [ipcChannels.windowIsMaximized]: { req: void; res: { isMaximized: boolean } };
}

export interface IpcEventMap {
  [ipcEventChannels.autoWriterChunk]: AutoWriterChunkEvent;
  [ipcEventChannels.autoWriterPhase]: AutoWriterPhaseEvent;
  [ipcEventChannels.autoWriterDone]: AutoWriterDoneEvent;
  [ipcEventChannels.autoWriterSnapshot]: AutoWriterSnapshotEvent;
  [ipcEventChannels.chapterLogReminder]: ChapterLogDailyReminderEvent;
  [ipcEventChannels.windowMaximizedChanged]: { isMaximized: boolean };
}

// =====================================================================
// M8 · 活人感 IpcRequestMap / IpcEventMap 扩展
// =====================================================================

export interface AchievementListInput {
  projectId: string;
}

export interface AchievementCheckInput {
  projectId: string;
  /** 触发原因：用于在多个事件源里去重检查；可选。 */
  trigger?:
    | "chapter-update"
    | "chapter-create"
    | "character-create"
    | "world-create"
    | "auto-writer-done"
    | "letter-generate"
    | "snapshot-create"
    | "review-done"
    | "manual";
}

export interface AchievementCheckResponse {
  newlyUnlocked: import("./domain").AchievementUnlockedRecord[];
}

export interface AchievementStatsResponse {
  totalUnlocked: number;
  totalCatalog: number;
  /** 各 rarity 解锁数量。 */
  byRarity: Record<import("./domain").AchievementRarity, number>;
  /** 累计字数 / 章节数 / 角色数 / 世界观条目 / AutoWriter 次数等概要。 */
  stats: {
    totalWords: number;
    totalChapters: number;
    totalCharacters: number;
    totalWorldEntries: number;
    autoWriterRuns: number;
    snapshotsManual: number;
    streakDays: number;
    longestStreak: number;
  };
}

export interface LetterListInput {
  projectId: string;
  includeDismissed?: boolean;
  characterId?: string;
  limit?: number;
}

export interface LetterGenerateInput {
  projectId: string;
  /** 留空让 service 自动挑一个最久没出场的角色。 */
  characterId?: string;
  /** 留空让 service 随机挑（带权重，complaint 概率较低）。 */
  tone?: import("./domain").CharacterLetterTone;
  /** 用于 LLM 调用：指定 provider/model；省略走默认。 */
  providerId?: string;
  model?: string;
}

export interface LetterMarkReadInput {
  letterId: string;
  read: boolean;
}

export interface LetterPinInput {
  letterId: string;
  pinned: boolean;
}

export interface LetterDismissInput {
  letterId: string;
}

export interface LetterDeleteInput {
  letterId: string;
}

export interface AchievementUnlockedEvent {
  projectId: string;
  achievement: import("./domain").AchievementUnlockedRecord;
}

export interface LetterArrivedEvent {
  projectId: string;
  letter: import("./domain").CharacterLetterRecord;
}

declare module "./ipc" {
  // 这里通过 declaration merging 把 M8 增量挂上 IpcRequestMap / IpcEventMap，
  // 但因为 ipc.ts 自身是模块文件，runtime 上同一文件内 `declare module "./ipc"`
  // 不会生效；我们改用直接扩接口的方式。下方 `IpcRequestMapM8` 仅声明，
  // 主进程 / preload 用具体类型而非映射键。
}

export interface IpcRequestMapM8 {
  [ipcChannels.achievementList]: {
    req: AchievementListInput;
    res: import("./domain").AchievementUnlockedRecord[];
  };
  [ipcChannels.achievementCheck]: {
    req: AchievementCheckInput;
    res: AchievementCheckResponse;
  };
  [ipcChannels.achievementStats]: {
    req: { projectId: string };
    res: AchievementStatsResponse;
  };
  [ipcChannels.letterList]: {
    req: LetterListInput;
    res: import("./domain").CharacterLetterRecord[];
  };
  [ipcChannels.letterGenerate]: {
    req: LetterGenerateInput;
    res: import("./domain").CharacterLetterRecord;
  };
  [ipcChannels.letterMarkRead]: {
    req: LetterMarkReadInput;
    res: { letterId: string };
  };
  [ipcChannels.letterPin]: {
    req: LetterPinInput;
    res: { letterId: string };
  };
  [ipcChannels.letterDismiss]: {
    req: LetterDismissInput;
    res: { letterId: string };
  };
  [ipcChannels.letterDelete]: {
    req: LetterDeleteInput;
    res: { letterId: string };
  };
}

// 通过同文件 interface declaration merging 把 M8 接入主映射
// （TS 同名 interface 自动合并）
export interface IpcRequestMap {
  [ipcChannels.achievementList]: {
    req: AchievementListInput;
    res: import("./domain").AchievementUnlockedRecord[];
  };
  [ipcChannels.achievementCheck]: {
    req: AchievementCheckInput;
    res: AchievementCheckResponse;
  };
  [ipcChannels.achievementStats]: {
    req: { projectId: string };
    res: AchievementStatsResponse;
  };
  [ipcChannels.letterList]: {
    req: LetterListInput;
    res: import("./domain").CharacterLetterRecord[];
  };
  [ipcChannels.letterGenerate]: {
    req: LetterGenerateInput;
    res: import("./domain").CharacterLetterRecord;
  };
  [ipcChannels.letterMarkRead]: {
    req: LetterMarkReadInput;
    res: { letterId: string };
  };
  [ipcChannels.letterPin]: {
    req: LetterPinInput;
    res: { letterId: string };
  };
  [ipcChannels.letterDismiss]: {
    req: LetterDismissInput;
    res: { letterId: string };
  };
  [ipcChannels.letterDelete]: {
    req: LetterDeleteInput;
    res: { letterId: string };
  };
}

export interface IpcEventMap {
  [ipcEventChannels.achievementUnlocked]: AchievementUnlockedEvent;
  [ipcEventChannels.letterArrived]: LetterArrivedEvent;
}

// =====================================================================
// Scene Bindings (ported from ainovel) · IpcRequestMap extension
// =====================================================================

export interface SceneBindingListResponse {
  mode: SceneRoutingMode;
  basic: SceneBindingRecord[];
  advanced: SceneBindingRecord[];
}

export interface SceneBindingUpsertInput {
  mode: SceneRoutingMode;
  sceneKey: SceneKey;
  providerId: string | null;
  model: string | null;
}

export interface SceneBindingResetInput {
  mode: SceneRoutingMode;
  sceneKey: SceneKey;
}

export interface SceneBindingSetModeInput {
  mode: SceneRoutingMode;
}

export interface IpcRequestMap {
  [ipcChannels.sceneBindingList]: {
    req: void;
    res: SceneBindingListResponse;
  };
  [ipcChannels.sceneBindingUpsert]: {
    req: SceneBindingUpsertInput;
    res: SceneBindingRecord;
  };
  [ipcChannels.sceneBindingReset]: {
    req: SceneBindingResetInput;
    res: { sceneKey: SceneKey };
  };
  [ipcChannels.sceneBindingGetMode]: {
    req: void;
    res: { mode: SceneRoutingMode };
  };
  [ipcChannels.sceneBindingSetMode]: {
    req: SceneBindingSetModeInput;
    res: { mode: SceneRoutingMode };
  };
}

// =====================================================================
// Sample Library (参考小说库, ported from ainovel) · IpcRequestMap extension
// =====================================================================

export interface SampleLibListInput {
  projectId: string;
}

export interface SampleLibCreateInput {
  projectId: string;
  title: string;
  author?: string;
  notes?: string;
  /** Pre-built chunks (e.g. from manual paste). */
  chunks?: Array<{ ordinal: number; chapterTitle?: string; text: string }>;
}

export interface SampleLibDeleteInput {
  libId: string;
}

export interface SampleLibImportTextInput {
  projectId: string;
  title: string;
  author?: string;
  notes?: string;
  /** Raw plain-text content; service splits by `第 X 章` regex. */
  text: string;
}

export interface SampleLibImportEpubInput {
  projectId: string;
  /** Absolute path to the EPUB file (selected via fs.pickFile). */
  filePath: string;
  /** Optional override; defaults to OPF metadata. */
  title?: string;
  author?: string;
  notes?: string;
}

export interface SampleLibImportResponse {
  lib: SampleLibRecord;
  chunkCount: number;
}

export interface IpcRequestMap {
  [ipcChannels.sampleLibList]: {
    req: SampleLibListInput;
    res: SampleLibRecord[];
  };
  [ipcChannels.sampleLibCreate]: {
    req: SampleLibCreateInput;
    res: SampleLibRecord;
  };
  [ipcChannels.sampleLibDelete]: {
    req: SampleLibDeleteInput;
    res: { libId: string };
  };
  [ipcChannels.sampleLibImportText]: {
    req: SampleLibImportTextInput;
    res: SampleLibImportResponse;
  };
  [ipcChannels.sampleLibImportEpub]: {
    req: SampleLibImportEpubInput;
    res: SampleLibImportResponse;
  };
}

// =====================================================================
// World Relationships (graph, ported from ainovel) · IpcRequestMap extension
// =====================================================================

export interface WorldRelationshipListInput {
  projectId: string;
}

export interface WorldRelationshipSaveInput {
  /** Optional id; absent = create. */
  id?: string;
  projectId: string;
  srcKind: WorldGraphEndpointKind;
  srcId: string;
  dstKind: WorldGraphEndpointKind;
  dstId: string;
  label?: string | null;
  weight?: number;
}

export interface WorldRelationshipDeleteInput {
  id: string;
}

export interface WorldTimelineListInput {
  projectId: string;
  entryKind?: WorldGraphEndpointKind;
  entryId?: string;
  upToChapterOrder?: number;
}

export interface WorldTimelineDeleteInput {
  id: string;
}

export interface WorldExtractRunInput {
  projectId: string;
}

export interface WorldExtractRunResponse {
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

export interface IpcRequestMap {
  [ipcChannels.worldRelationshipList]: {
    req: WorldRelationshipListInput;
    res: WorldRelationshipRecord[];
  };
  [ipcChannels.worldRelationshipSave]: {
    req: WorldRelationshipSaveInput;
    res: WorldRelationshipRecord;
  };
  [ipcChannels.worldRelationshipDelete]: {
    req: WorldRelationshipDeleteInput;
    res: { id: string };
  };
  [ipcChannels.worldTimelineList]: {
    req: WorldTimelineListInput;
    res: WorldTimelineEventRecord[];
  };
  [ipcChannels.worldTimelineSave]: {
    req: WorldTimelineSaveInput;
    res: WorldTimelineEventRecord;
  };
  [ipcChannels.worldTimelineDelete]: {
    req: WorldTimelineDeleteInput;
    res: { id: string };
  };
  [ipcChannels.worldExtractRun]: {
    req: WorldExtractRunInput;
    res: WorldExtractRunResponse;
  };
}

// =====================================================================
// Project Export + Chapter Bulk Import (ported from ainovel) · IpcRequestMap
// =====================================================================

export interface ProjectExportInput {
  projectId: string;
  /** Optional override; absent triggers save dialog. */
  outputPath?: string;
  /** Optional override; falls back to project.title. */
  fileName?: string;
}

export interface ProjectExportResponse {
  projectId: string;
  outputPath: string;
  byteCount: number;
  chapterCount: number;
}

export interface ChapterImportTxtInput {
  projectId: string;
  filePath: string;
}

export interface ChapterImportEpubInput {
  projectId: string;
  filePath: string;
}

export interface ChapterImportBulkResponse {
  projectId: string;
  created: number;
  /** Imported chapter IDs (top-level only). */
  chapterIds: string[];
}

export interface IpcRequestMap {
  [ipcChannels.projectExportTxt]: { req: ProjectExportInput; res: ProjectExportResponse };
  [ipcChannels.projectExportMd]: { req: ProjectExportInput; res: ProjectExportResponse };
  [ipcChannels.projectExportHtml]: { req: ProjectExportInput; res: ProjectExportResponse };
  [ipcChannels.projectExportDocx]: { req: ProjectExportInput; res: ProjectExportResponse };
  [ipcChannels.projectExportEpub]: { req: ProjectExportInput; res: ProjectExportResponse };
  [ipcChannels.chapterImportTxt]: { req: ChapterImportTxtInput; res: ChapterImportBulkResponse };
  [ipcChannels.chapterImportEpub]: { req: ChapterImportEpubInput; res: ChapterImportBulkResponse };
}

// =====================================================================
// Module 6: AI outline + chapter generation (ainovel-style chained)
// =====================================================================

export interface ProjectUpdateMetaInput {
  projectId: string;
  synopsis?: string;
  genre?: string;
  subGenre?: string;
  tags?: string[];
}

export interface OutlineGenerateMasterInput {
  projectId: string;
  /** Override the saved synopsis/genre at call time (optional). */
  synopsis?: string;
  genre?: string;
  subGenre?: string;
  tags?: string[];
  /** Provider override (else use scene_binding 'outline_generation'). */
  providerId?: string;
  model?: string;
}

export interface OutlineGenerateMasterResponse {
  projectId: string;
  masterOutline: string;
  durationMs: number;
}

export interface OutlineGenerateChaptersInput {
  projectId: string;
  /** Target chapter count; LLM may emit fewer/more. Default 12. */
  targetCount?: number;
  /** If true, replace existing outline_cards with chapterId=null. Default false (append). */
  replaceExisting?: boolean;
  providerId?: string;
  model?: string;
}

export interface OutlineGenerateChaptersResponse {
  projectId: string;
  cardIds: string[];
  durationMs: number;
}

export type OutlineRefineTarget =
  | { kind: "master"; projectId: string }
  | { kind: "card"; cardId: string };

export interface OutlineRefineInput {
  target: OutlineRefineTarget;
  intent: string;
  providerId?: string;
  model?: string;
}

export interface OutlineRefineResponse {
  /** New text. For master target, also persisted to projects.master_outline. */
  text: string;
  /** Whether an undo snapshot was saved (master only). */
  hasUndo: boolean;
  durationMs: number;
}

export interface OutlineUndoRefineInput {
  /** Master-level undo only (cards undo handled inline by frontend). */
  projectId: string;
}

export interface OutlineUndoRefineResponse {
  projectId: string;
  /** Restored master outline text; empty when no snapshot existed. */
  masterOutline: string;
  restored: boolean;
}

export interface ChapterGenerateFromOutlineInput {
  projectId: string;
  /** Outline card to source the chapter from. */
  outlineCardId: string;
  /** Number of parallel candidates 1/2/3. Default 1. */
  candidates?: 1 | 2 | 3;
  /** If provided, includes prior chapter's tail as continuity context. */
  prevChapterId?: string;
  providerId?: string;
  model?: string;
  /** Override; default 1500. */
  maxTokens?: number;
}

export interface ChapterGenerateFromOutlineResponse {
  /** N candidate texts (caller picks one and calls chapterCommitDraft). */
  candidates: Array<{
    text: string;
    durationMs: number;
    providerId: string;
  }>;
  outlineCardId: string;
  outlineTitle: string;
}

export interface ChapterCommitDraftInput {
  projectId: string;
  /** Selected candidate text from chapter:generate-from-outline. */
  text: string;
  /** Title to use for the new (or existing) chapter. */
  title: string;
  /** If present, overwrite this chapter's file. Else create a new chapter. */
  chapterId?: string;
  /** Optional outline card to link via outline_cards.chapter_id. */
  outlineCardId?: string;
}

export interface ChapterCommitDraftResponse {
  chapterId: string;
  filePath: string;
  wordCount: number;
}

export interface IpcRequestMap {
  [ipcChannels.projectUpdateMeta]: { req: ProjectUpdateMetaInput; res: import("./domain").ProjectRecord };
  [ipcChannels.outlineGenerateMaster]: { req: OutlineGenerateMasterInput; res: OutlineGenerateMasterResponse };
  [ipcChannels.outlineGenerateChapters]: { req: OutlineGenerateChaptersInput; res: OutlineGenerateChaptersResponse };
  [ipcChannels.outlineRefine]: { req: OutlineRefineInput; res: OutlineRefineResponse };
  [ipcChannels.outlineUndoRefine]: { req: OutlineUndoRefineInput; res: OutlineUndoRefineResponse };
  [ipcChannels.chapterGenerateFromOutline]: { req: ChapterGenerateFromOutlineInput; res: ChapterGenerateFromOutlineResponse };
  [ipcChannels.chapterCommitDraft]: { req: ChapterCommitDraftInput; res: ChapterCommitDraftResponse };
}

// =====================================================================
// Provider remote model list (fetch /v1/models or vendor equivalent)
// =====================================================================

export interface ProviderListRemoteModelsInput {
  /** Either reference an existing saved provider by id ... */
  providerId?: string;
  /** ... or pass ad-hoc credentials (used in the "新建 provider" flow before save). */
  vendor?: import("./domain").ProviderVendor;
  baseUrl?: string;
  apiKey?: string;
}

export interface RemoteModelInfo {
  id: string;
  /** Optional vendor-supplied owner ("openai" / "system" / etc). */
  ownedBy?: string;
  /** Optional context window in tokens. */
  contextLength?: number;
  /** Optional human label. */
  displayName?: string;
}

export interface ProviderListRemoteModelsResponse {
  models: RemoteModelInfo[];
  /** Vendor-reported total or models.length when not paginated. */
  count: number;
  durationMs: number;
}

export interface IpcRequestMap {
  [ipcChannels.providerListRemoteModels]: {
    req: ProviderListRemoteModelsInput;
    res: ProviderListRemoteModelsResponse;
  };
}
