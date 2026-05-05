import type {
  ChapterCreateInput,
  ChapterDeleteInput,
  ChapterExportMdInput,
  ChapterExportMdResponse,
  ChapterAutosaveClearInput,
  ChapterAutosavePeekInput,
  ChapterAutosavePeekResponse,
  ChapterAutosaveWriteInput,
  ChapterImportMdInput,
  ChapterListInput,
  ChapterReadInput,
  ChapterReadResponse,
  ChapterReorderInput,
  ChapterUpdateInput,
  CharacterSyncApplyInput,
  CharacterSyncApplyResponse,
  CharacterSyncHistoryInput,
  CharacterSyncPreviewInput,
  CharacterSyncPreviewResponse,
  DailyProgressInput,
  DailySummaryGenerateInput,
  DailySummaryGenerateResponse,
  DailySummaryGetInput,
  DailySummaryListInput,
  FeedbackDismissInput,
  FeedbackListInput,
  FsPickFileInput,
  FsPickFileResponse,
  FsSaveFileInput,
  FsSaveFileResponse,
  IpcEventMap,
  LLMAnalyzeInput,
  LLMAnalyzeResponse,
  LLMChatInput,
  LLMChatResponse,
  LLMQuickActionInput,
  LLMQuickActionResponse,
  NovelCharacterCreateInput,
  NovelCharacterDeleteInput,
  NovelCharacterGetInput,
  NovelCharacterListInput,
  NovelCharacterUpdateInput,
  OutlineCreateInput,
  OutlineDeleteInput,
  OutlineListInput,
  OutlineUpdateInput,
  ProjectCreateInput,
  ProjectDeleteInput,
  ProjectOpenInput,
  ProjectUpdateInput,
  ProviderDeleteInput,
  ProviderKeyDeleteInput,
  ProviderKeyHealthInput,
  ProviderKeyListInput,
  ProviderKeySetDisabledInput,
  ProviderKeyUpsertInput,
  ProviderSaveInput,
  ProviderTestInput,
  ProviderTestResponse,
  ResearchDeleteInput,
  ResearchCredentialDeleteInput,
  ResearchCredentialStatus,
  ResearchCredentialStatusInput,
  ResearchCredentialUpsertInput,
  ResearchGetInput,
  ResearchListInput,
  ResearchSaveInput,
  ResearchSearchInput,
  ResearchSearchResponse,
  ResearchUpdateInput,
  ReviewCancelInput,
  ReviewCancelResponse,
  ReviewDimDeleteInput,
  ReviewDimListInput,
  ReviewDimReorderInput,
  ReviewDimUpsertInput,
  ReviewDismissFindingInput,
  ReviewDismissFindingResponse,
  ReviewExportInput,
  ReviewExportResponse,
  ReviewGetInput,
  ReviewGetResponse,
  ReviewListInput,
  ReviewRunInput,
  ReviewRunResponse,
  SettingsGetInput,
  SettingsSetInput,
  DiagSnapshotInput,
  DiagSnapshotResponse,
  DiagCrashStatusResponse,
  UpdateStatus,
  MarketFetchRegistryInput,
  MarketRegistryDTO,
  MarketInstallSkillInput,
  MarketInstallSkillResponse,
  MarketBuildPublishBundleInput,
  MarketBuildPublishBundleResponse,
  SkillCreateInput,
  SkillDeleteInput,
  SkillExportJsonInput,
  SkillExportJsonResponse,
  SkillGetInput,
  SkillImportJsonInput,
  SkillListInput,
  SkillRunInput,
  SkillRunResponse,
  SkillUpdateInput,
  TavernCardCreateInput,
  TavernCardDeleteInput,
  TavernCardGetInput,
  TavernCardListInput,
  TavernCardUpdateInput,
  TavernDirectorPostInput,
  TavernDirectorPostResponse,
  TavernMessageListInput,
  TavernRoundRunInput,
  TavernRoundRunResponse,
  TavernRoundStopInput,
  TavernRoundStopResponse,
  TavernSessionCreateInput,
  TavernSessionDeleteInput,
  TavernSessionGetInput,
  TavernSessionListInput,
  TavernSummaryCompactInput,
  TerminalDisposePayload,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSpawnInput,
  TerminalSpawnResponse,
  WorldCreateInput,
  WorldDeleteInput,
  WorldGetInput,
  WorldListInput,
  WorldSearchInput,
  WorldUpdateInput,
} from "./ipc";
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
  ProviderRecord,
  ResearchNoteRecord,
  ReviewDimensionRecord,
  ReviewReportRecord,
  SkillDefinition,
  SkillImportReport,
  TavernCardRecord,
  TavernMessageRecord,
  TavernSessionRecord,
  WorldEntryRecord,
} from "./domain";

export type Unsubscribe = () => void;

export interface InkforgeApi {
  project: {
    create(input: ProjectCreateInput): Promise<ProjectRecord>;
    list(): Promise<ProjectRecord[]>;
    update(input: ProjectUpdateInput): Promise<ProjectRecord>;
    delete(input: ProjectDeleteInput): Promise<{ id: string }>;
    open(input: ProjectOpenInput): Promise<ProjectRecord>;
  };
  chapter: {
    create(input: ChapterCreateInput): Promise<ChapterRecord>;
    update(input: ChapterUpdateInput): Promise<ChapterRecord>;
    list(input: ChapterListInput): Promise<ChapterRecord[]>;
    read(input: ChapterReadInput): Promise<ChapterReadResponse>;
    delete(input: ChapterDeleteInput): Promise<{ id: string }>;
    reorder(input: ChapterReorderInput): Promise<ChapterRecord[]>;
    importMd(input: ChapterImportMdInput): Promise<ChapterRecord>;
    exportMd(input: ChapterExportMdInput): Promise<ChapterExportMdResponse>;
    autosaveWrite(input: ChapterAutosaveWriteInput): Promise<{ savedAt: number }>;
    autosavePeek(input: ChapterAutosavePeekInput): Promise<ChapterAutosavePeekResponse>;
    autosaveClear(input: ChapterAutosaveClearInput): Promise<{ ok: true }>;
  };
  provider: {
    save(input: ProviderSaveInput): Promise<ProviderRecord>;
    list(): Promise<ProviderRecord[]>;
    delete(input: ProviderDeleteInput): Promise<{ id: string }>;
    test(input: ProviderTestInput): Promise<ProviderTestResponse>;
    listRemoteModels(input: ProviderListRemoteModelsInput): Promise<ProviderListRemoteModelsResponse>;
  };
  llm: {
    analyze(input: LLMAnalyzeInput): Promise<LLMAnalyzeResponse>;
    quick(input: LLMQuickActionInput): Promise<LLMQuickActionResponse>;
    chat(input: LLMChatInput): Promise<LLMChatResponse>;
    onChunk(listener: (payload: IpcEventMap["llm:chunk"]) => void): Unsubscribe;
    onDone(listener: (payload: IpcEventMap["llm:done"]) => void): Unsubscribe;
  };
  feedback: {
    list(input: FeedbackListInput): Promise<AIFeedbackRecord[]>;
    dismiss(input: FeedbackDismissInput): Promise<{ id: string; dismissed: boolean }>;
  };
  outline: {
    create(input: OutlineCreateInput): Promise<OutlineCardRecord>;
    update(input: OutlineUpdateInput): Promise<OutlineCardRecord>;
    delete(input: OutlineDeleteInput): Promise<{ id: string }>;
    list(input: OutlineListInput): Promise<OutlineCardRecord[]>;
  };
  daily: {
    progress(input: DailyProgressInput): Promise<DailyProgressRecord>;
  };
  settings: {
    get(input: SettingsGetInput): Promise<AppSettings>;
    set(input: SettingsSetInput): Promise<AppSettings>;
  };
  diag: {
    snapshot(input?: DiagSnapshotInput): Promise<DiagSnapshotResponse>;
    crashStatus(): Promise<DiagCrashStatusResponse>;
    crashDismiss(): Promise<{ ok: true }>;
  };
  update: {
    check(): Promise<UpdateStatus>;
    download(): Promise<{ ok: true }>;
    install(): Promise<{ ok: true }>;
    status(): Promise<UpdateStatus>;
    openDownloadPage(): Promise<{ ok: true }>;
    onStatus(listener: (status: UpdateStatus) => void): () => void;
  };
  market: {
    fetchRegistry(input?: MarketFetchRegistryInput): Promise<MarketRegistryDTO>;
    installSkill(input: MarketInstallSkillInput): Promise<MarketInstallSkillResponse>;
    buildPublishBundle(
      input: MarketBuildPublishBundleInput,
    ): Promise<MarketBuildPublishBundleResponse>;
  };
  fs: {
    pickFile(input: FsPickFileInput): Promise<FsPickFileResponse>;
    saveFile(input: FsSaveFileInput): Promise<FsSaveFileResponse>;
  };
  terminal: {
    spawn(input: TerminalSpawnInput): Promise<TerminalSpawnResponse>;
    input(payload: TerminalInputPayload): Promise<{ ok: true }>;
    resize(payload: TerminalResizePayload): Promise<{ ok: true }>;
    dispose(payload: TerminalDisposePayload): Promise<{ ok: true }>;
    onData(listener: (payload: IpcEventMap["terminal:data"]) => void): Unsubscribe;
    onExit(listener: (payload: IpcEventMap["terminal:exit"]) => void): Unsubscribe;
  };
  skill: {
    create(input: SkillCreateInput): Promise<SkillDefinition>;
    update(input: SkillUpdateInput): Promise<SkillDefinition>;
    get(input: SkillGetInput): Promise<SkillDefinition | null>;
    list(input?: SkillListInput): Promise<SkillDefinition[]>;
    delete(input: SkillDeleteInput): Promise<{ id: string }>;
    run(input: SkillRunInput): Promise<SkillRunResponse>;
    importJson(input: SkillImportJsonInput): Promise<SkillImportReport>;
    exportJson(input: SkillExportJsonInput): Promise<SkillExportJsonResponse>;
    onChunk(listener: (payload: IpcEventMap["skill:chunk"]) => void): Unsubscribe;
    onDone(listener: (payload: IpcEventMap["skill:done"]) => void): Unsubscribe;
  };
  tavernCard: {
    create(input: TavernCardCreateInput): Promise<TavernCardRecord>;
    update(input: TavernCardUpdateInput): Promise<TavernCardRecord>;
    get(input: TavernCardGetInput): Promise<TavernCardRecord | null>;
    list(input?: TavernCardListInput): Promise<TavernCardRecord[]>;
    delete(input: TavernCardDeleteInput): Promise<{ id: string }>;
  };
  novelCharacter: {
    create(input: NovelCharacterCreateInput): Promise<NovelCharacterRecord>;
    update(input: NovelCharacterUpdateInput): Promise<NovelCharacterRecord>;
    get(input: NovelCharacterGetInput): Promise<NovelCharacterRecord | null>;
    list(input: NovelCharacterListInput): Promise<NovelCharacterRecord[]>;
    delete(input: NovelCharacterDeleteInput): Promise<{ id: string }>;
  };
  characterSync: {
    preview(input: CharacterSyncPreviewInput): Promise<CharacterSyncPreviewResponse>;
    apply(input: CharacterSyncApplyInput): Promise<CharacterSyncApplyResponse>;
    history(input?: CharacterSyncHistoryInput): Promise<CharacterSyncLogRecord[]>;
  };
  tavernSession: {
    create(input: TavernSessionCreateInput): Promise<TavernSessionRecord>;
    get(input: TavernSessionGetInput): Promise<TavernSessionRecord | null>;
    list(input: TavernSessionListInput): Promise<TavernSessionRecord[]>;
    delete(input: TavernSessionDeleteInput): Promise<{ sessionId: string }>;
  };
  tavernMessage: {
    list(input: TavernMessageListInput): Promise<TavernMessageRecord[]>;
  };
  tavernRound: {
    run(input: TavernRoundRunInput): Promise<TavernRoundRunResponse>;
    stop(input: TavernRoundStopInput): Promise<TavernRoundStopResponse>;
    directorPost(input: TavernDirectorPostInput): Promise<TavernDirectorPostResponse>;
    onChunk(listener: (payload: IpcEventMap["tavern:chunk"]) => void): Unsubscribe;
    onDone(listener: (payload: IpcEventMap["tavern:done"]) => void): Unsubscribe;
    onBudgetWarning(listener: (payload: IpcEventMap["tavern:budget-warning"]) => void): Unsubscribe;
  };
  tavernSummary: {
    compact(input: TavernSummaryCompactInput): Promise<CompactResult>;
  };
  world: {
    list(input: WorldListInput): Promise<WorldEntryRecord[]>;
    get(input: WorldGetInput): Promise<WorldEntryRecord | null>;
    create(input: WorldCreateInput): Promise<WorldEntryRecord>;
    update(input: WorldUpdateInput): Promise<WorldEntryRecord>;
    delete(input: WorldDeleteInput): Promise<{ id: string }>;
    search(input: WorldSearchInput): Promise<WorldEntryRecord[]>;
  };
  research: {
    search(input: ResearchSearchInput): Promise<ResearchSearchResponse>;
    list(input: ResearchListInput): Promise<ResearchNoteRecord[]>;
    get(input: ResearchGetInput): Promise<ResearchNoteRecord | null>;
    save(input: ResearchSaveInput): Promise<ResearchNoteRecord>;
    update(input: ResearchUpdateInput): Promise<ResearchNoteRecord>;
    delete(input: ResearchDeleteInput): Promise<{ id: string }>;
    credentialStatus(
      input: ResearchCredentialStatusInput,
    ): Promise<ResearchCredentialStatus[]>;
    credentialUpsert(
      input: ResearchCredentialUpsertInput,
    ): Promise<ResearchCredentialStatus>;
    credentialDelete(
      input: ResearchCredentialDeleteInput,
    ): Promise<ResearchCredentialStatus>;
  };
  reviewDim: {
    list(input: ReviewDimListInput): Promise<ReviewDimensionRecord[]>;
    upsert(input: ReviewDimUpsertInput): Promise<ReviewDimensionRecord>;
    delete(input: ReviewDimDeleteInput): Promise<{ id: string }>;
    reorder(input: ReviewDimReorderInput): Promise<ReviewDimensionRecord[]>;
  };
  review: {
    run(input: ReviewRunInput): Promise<ReviewRunResponse>;
    cancel(input: ReviewCancelInput): Promise<ReviewCancelResponse>;
    list(input: ReviewListInput): Promise<ReviewReportRecord[]>;
    get(input: ReviewGetInput): Promise<ReviewGetResponse | null>;
    dismissFinding(input: ReviewDismissFindingInput): Promise<ReviewDismissFindingResponse>;
    export(input: ReviewExportInput): Promise<ReviewExportResponse>;
    onProgress(listener: (payload: IpcEventMap["review:progress"]) => void): Unsubscribe;
    onDone(listener: (payload: IpcEventMap["review:done"]) => void): Unsubscribe;
  };
  dailySummary: {
    generate(input: DailySummaryGenerateInput): Promise<DailySummaryGenerateResponse>;
    get(input: DailySummaryGetInput): Promise<DailySummaryRecord | null>;
    list(input: DailySummaryListInput): Promise<DailySummaryRecord[]>;
    onChunk(listener: (payload: IpcEventMap["daily:summary-chunk"]) => void): Unsubscribe;
    onDone(listener: (payload: IpcEventMap["daily:summary-done"]) => void): Unsubscribe;
  };
  providerKey: {
    list(input: ProviderKeyListInput): Promise<ProviderKeyRecord[]>;
    upsert(input: ProviderKeyUpsertInput): Promise<ProviderKeyRecord>;
    delete(input: ProviderKeyDeleteInput): Promise<{ id: string }>;
    setDisabled(input: ProviderKeySetDisabledInput): Promise<ProviderKeyRecord>;
    health(input: ProviderKeyHealthInput): Promise<ProviderHealthSnapshot>;
  };
}

// =====================================================================
// M7 · Bookshelf · 通过 interface declaration merging 扩展 InkforgeApi
// 这一段每个 PR 增量补一块；本块由 PR-3 引入 snapshot 子接口。
// =====================================================================
import type {
  SnapshotCreateInput,
  SnapshotCreateResponse,
  SnapshotDeleteInput,
  SnapshotGetInput,
  SnapshotGetResponse,
  SnapshotListInput,
  SnapshotRestoreInput,
  SnapshotRestoreResponse,
  // PR-4
  BookCoverDeleteInput,
  BookCoverGetInput,
  BookCoverGetResponse,
  BookCoverUploadInput,
  BookCoverUploadResponse,
  BookshelfListBooksResponse,
  OriginTagGetInput,
  OriginTagListByOriginInput,
  OriginTagListByOriginResponse,
  OriginTagSetInput,
  // PR-5
  ChapterLogAppendAiInput,
  ChapterLogAppendManualInput,
  ChapterLogDeleteInput,
  ChapterLogListInput,
  // PR-7
  AutoWriterCorrectInput,
  AutoWriterCorrectResponse,
  AutoWriterGetRunInput,
  AutoWriterInjectIdeaInput,
  AutoWriterListRunsInput,
  AutoWriterPauseInput,
  AutoWriterResumeInput,
  AutoWriterStartInput,
  AutoWriterStartResponse,
  AutoWriterStopInput,
  AutoWriterStopResponse,
} from "./ipc";
import type {
  ChapterSnapshotRecord,
  ChapterOriginTagRecord,
  ChapterLogEntryRecord,
  AutoWriterRunRecord,
} from "./domain";

export interface InkforgeApi {
  snapshot: {
    create(input: SnapshotCreateInput): Promise<SnapshotCreateResponse>;
    list(input: SnapshotListInput): Promise<ChapterSnapshotRecord[]>;
    get(input: SnapshotGetInput): Promise<SnapshotGetResponse>;
    restore(input: SnapshotRestoreInput): Promise<SnapshotRestoreResponse>;
    delete(input: SnapshotDeleteInput): Promise<{ snapshotId: string }>;
  };
  bookshelf: {
    listBooks(): Promise<BookshelfListBooksResponse>;
  };
  cover: {
    upload(input: BookCoverUploadInput): Promise<BookCoverUploadResponse>;
    get(input: BookCoverGetInput): Promise<BookCoverGetResponse>;
    delete(input: BookCoverDeleteInput): Promise<{ projectId: string }>;
  };
  originTag: {
    set(input: OriginTagSetInput): Promise<ChapterOriginTagRecord>;
    get(input: OriginTagGetInput): Promise<ChapterOriginTagRecord | null>;
    listByOrigin(input: OriginTagListByOriginInput): Promise<OriginTagListByOriginResponse>;
  };
  chapterLog: {
    list(input: ChapterLogListInput): Promise<ChapterLogEntryRecord[]>;
    appendManual(input: ChapterLogAppendManualInput): Promise<ChapterLogEntryRecord>;
    appendAi(input: ChapterLogAppendAiInput): Promise<ChapterLogEntryRecord>;
    delete(input: ChapterLogDeleteInput): Promise<{ entryId: string }>;
    onReminder(listener: (payload: IpcEventMap["chapter-log:daily-reminder"]) => void): Unsubscribe;
  };
  autoWriter: {
    start(input: AutoWriterStartInput): Promise<AutoWriterStartResponse>;
    stop(input: AutoWriterStopInput): Promise<AutoWriterStopResponse>;
    pause(input: AutoWriterPauseInput): Promise<AutoWriterRunRecord>;
    resume(input: AutoWriterResumeInput): Promise<AutoWriterRunRecord>;
    getRun(input: AutoWriterGetRunInput): Promise<AutoWriterRunRecord | null>;
    listRuns(input: AutoWriterListRunsInput): Promise<AutoWriterRunRecord[]>;
    injectIdea(input: AutoWriterInjectIdeaInput): Promise<AutoWriterRunRecord>;
    correct(input: AutoWriterCorrectInput): Promise<AutoWriterCorrectResponse>;
    onChunk(listener: (payload: IpcEventMap["auto-writer:chunk"]) => void): Unsubscribe;
    onPhase(listener: (payload: IpcEventMap["auto-writer:phase"]) => void): Unsubscribe;
    onDone(listener: (payload: IpcEventMap["auto-writer:done"]) => void): Unsubscribe;
    onSnapshot(listener: (payload: IpcEventMap["auto-writer:snapshot"]) => void): Unsubscribe;
  };
  /**
   * 自定义无边框 titlebar 用 —— 渲染端三个窗口按钮（最小化/最大化/关闭）
   * 通过这组 API 操作 BrowserWindow，并订阅 maximize 状态变化以同步图标。
   */
  window: {
    minimize(): Promise<{ ok: true }>;
    toggleMaximize(): Promise<{ isMaximized: boolean }>;
    close(): Promise<{ ok: true }>;
    isMaximized(): Promise<{ isMaximized: boolean }>;
    onMaximizedChanged(
      listener: (payload: IpcEventMap["window:maximized-changed"]) => void,
    ): Unsubscribe;
  };
}

// =====================================================================
// M8 · 活人感（Achievements + Letters）interface declaration merging
// =====================================================================
import type {
  AchievementCheckInput,
  AchievementCheckResponse,
  AchievementListInput,
  AchievementStatsResponse,
  LetterDeleteInput,
  LetterDismissInput,
  LetterGenerateInput,
  LetterListInput,
  LetterMarkReadInput,
  LetterPinInput,
} from "./ipc";
import type {
  AchievementUnlockedRecord,
  CharacterLetterRecord,
} from "./domain";

export interface InkforgeApi {
  achievement: {
    list(input: AchievementListInput): Promise<AchievementUnlockedRecord[]>;
    check(input: AchievementCheckInput): Promise<AchievementCheckResponse>;
    stats(input: { projectId: string }): Promise<AchievementStatsResponse>;
    onUnlocked(
      listener: (payload: IpcEventMap["achievement:unlocked"]) => void,
    ): Unsubscribe;
  };
  letter: {
    list(input: LetterListInput): Promise<CharacterLetterRecord[]>;
    generate(input: LetterGenerateInput): Promise<CharacterLetterRecord>;
    markRead(input: LetterMarkReadInput): Promise<{ letterId: string }>;
    pin(input: LetterPinInput): Promise<{ letterId: string }>;
    dismiss(input: LetterDismissInput): Promise<{ letterId: string }>;
    delete(input: LetterDeleteInput): Promise<{ letterId: string }>;
    onArrived(
      listener: (payload: IpcEventMap["letter:arrived"]) => void,
    ): Unsubscribe;
  };
}

// =====================================================================
// Scene Bindings (ported from ainovel) · interface declaration merging
// =====================================================================
import type {
  SceneBindingListResponse,
  SceneBindingResetInput,
  SceneBindingSetModeInput,
  SceneBindingUpsertInput,
} from "./ipc";
import type {
  SceneBindingRecord,
  SceneKey,
  SceneRoutingMode,
} from "./domain";

export interface InkforgeApi {
  sceneBinding: {
    list(): Promise<SceneBindingListResponse>;
    upsert(input: SceneBindingUpsertInput): Promise<SceneBindingRecord>;
    reset(input: SceneBindingResetInput): Promise<{ sceneKey: SceneKey }>;
    getMode(): Promise<{ mode: SceneRoutingMode }>;
    setMode(input: SceneBindingSetModeInput): Promise<{ mode: SceneRoutingMode }>;
  };
}

// =====================================================================
// Sample Library (参考小说库, ported from ainovel) · interface declaration merging
// =====================================================================
import type {
  SampleLibCreateInput,
  SampleLibDeleteInput,
  SampleLibImportEpubInput,
  SampleLibImportResponse,
  SampleLibImportTextInput,
  SampleLibListInput,
} from "./ipc";
import type {
  SampleLibRecord,
} from "./domain";

export interface InkforgeApi {
  sampleLib: {
    list(input: SampleLibListInput): Promise<SampleLibRecord[]>;
    create(input: SampleLibCreateInput): Promise<SampleLibRecord>;
    delete(input: SampleLibDeleteInput): Promise<{ libId: string }>;
    importText(input: SampleLibImportTextInput): Promise<SampleLibImportResponse>;
    importEpub(input: SampleLibImportEpubInput): Promise<SampleLibImportResponse>;
  };
}

// =====================================================================
// World Relationships (graph, ported from ainovel) · interface declaration merging
// =====================================================================
import type {
  WorldRelationshipDeleteInput,
  WorldRelationshipListInput,
  WorldRelationshipSaveInput,
} from "./ipc";
import type {
  WorldRelationshipRecord,
} from "./domain";

export interface InkforgeApi {
  worldRelationship: {
    list(input: WorldRelationshipListInput): Promise<WorldRelationshipRecord[]>;
    save(input: WorldRelationshipSaveInput): Promise<WorldRelationshipRecord>;
    delete(input: WorldRelationshipDeleteInput): Promise<{ id: string }>;
  };
}

// =====================================================================
// World Timeline Events (per-entry state changes) · interface declaration merging
// =====================================================================
import type {
  WorldTimelineDeleteInput,
  WorldTimelineListInput,
} from "./ipc";
import type {
  WorldTimelineEventRecord,
  WorldTimelineSaveInput,
} from "./domain";

export interface InkforgeApi {
  worldTimeline: {
    list(input: WorldTimelineListInput): Promise<WorldTimelineEventRecord[]>;
    save(input: WorldTimelineSaveInput): Promise<WorldTimelineEventRecord>;
    delete(input: WorldTimelineDeleteInput): Promise<{ id: string }>;
  };
}

// =====================================================================
// World Extract (LLM book scan) · interface declaration merging
// =====================================================================
import type {
  WorldExtractRunInput,
  WorldExtractRunResponse,
} from "./ipc";

export interface InkforgeApi {
  worldExtract: {
    run(input: WorldExtractRunInput): Promise<WorldExtractRunResponse>;
  };
}

// =====================================================================
// Project Export + Chapter Bulk Import (ported from ainovel) · merging
// =====================================================================
import type {
  ChapterImportBulkResponse,
  ChapterImportEpubInput,
  ChapterImportTxtInput,
  ProjectExportInput,
  ProjectExportResponse,
} from "./ipc";

export interface InkforgeApi {
  projectExport: {
    txt(input: ProjectExportInput): Promise<ProjectExportResponse>;
    md(input: ProjectExportInput): Promise<ProjectExportResponse>;
    html(input: ProjectExportInput): Promise<ProjectExportResponse>;
    docx(input: ProjectExportInput): Promise<ProjectExportResponse>;
    epub(input: ProjectExportInput): Promise<ProjectExportResponse>;
  };
  chapterImport: {
    txt(input: ChapterImportTxtInput): Promise<ChapterImportBulkResponse>;
    epub(input: ChapterImportEpubInput): Promise<ChapterImportBulkResponse>;
  };
}

// =====================================================================
// Module 6: AI outline + chapter generation · merging
// =====================================================================
import type {
  ChapterCommitDraftInput,
  ChapterCommitDraftResponse,
  ChapterGenerateFromOutlineInput,
  ChapterGenerateFromOutlineResponse,
  OutlineGenerateChaptersInput,
  OutlineGenerateChaptersResponse,
  OutlineGenerateMasterInput,
  OutlineGenerateMasterResponse,
  OutlineRefineInput,
  OutlineRefineResponse,
  OutlineUndoRefineInput,
  OutlineUndoRefineResponse,
  ProjectUpdateMetaInput,
} from "./ipc";

export interface InkforgeApi {
  outlineGen: {
    updateProjectMeta(input: ProjectUpdateMetaInput): Promise<ProjectRecord>;
    generateMaster(input: OutlineGenerateMasterInput): Promise<OutlineGenerateMasterResponse>;
    generateChapters(input: OutlineGenerateChaptersInput): Promise<OutlineGenerateChaptersResponse>;
    refine(input: OutlineRefineInput): Promise<OutlineRefineResponse>;
    undoRefine(input: OutlineUndoRefineInput): Promise<OutlineUndoRefineResponse>;
  };
  chapterGen: {
    fromOutline(input: ChapterGenerateFromOutlineInput): Promise<ChapterGenerateFromOutlineResponse>;
    commitDraft(input: ChapterCommitDraftInput): Promise<ChapterCommitDraftResponse>;
  };
}

// =====================================================================
// Provider remote model list · merging into existing `provider` namespace
// =====================================================================
import type {
  ProviderListRemoteModelsInput,
  ProviderListRemoteModelsResponse,
} from "./ipc";
