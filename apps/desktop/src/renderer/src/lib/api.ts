import type {
  AIFeedbackRecord,
  AppSettings,
  ChapterCreateInput,
  ChapterDeleteInput,
  ChapterExportMdInput,
  ChapterExportMdResponse,
  ChapterImportMdInput,
  ChapterListInput,
  ChapterReadInput,
  ChapterReadResponse,
  ChapterRecord,
  ChapterReorderInput,
  ChapterUpdateInput,
  DailyProgressInput,
  DailyProgressRecord,
  FeedbackDismissInput,
  FeedbackListInput,
  FsPickFileInput,
  FsPickFileResponse,
  FsSaveFileInput,
  FsSaveFileResponse,
  LLMAnalyzeInput,
  LLMAnalyzeResponse,
  LLMChatInput,
  LLMChatResponse,
  LLMChunkEvent,
  LLMDoneEvent,
  LLMQuickActionInput,
  LLMQuickActionResponse,
  OutlineCardRecord,
  OutlineCreateInput,
  OutlineDeleteInput,
  OutlineListInput,
  OutlineUpdateInput,
  ProjectCreateInput,
  ProjectDeleteInput,
  ProjectOpenInput,
  ProjectRecord,
  ProjectUpdateInput,
  ProviderDeleteInput,
  ProviderRecord,
  ProviderSaveInput,
  ProviderTestInput,
  ProviderTestResponse,
  SettingsGetInput,
  SettingsSetInput,
  SkillChunkEvent,
  SkillCreateInput,
  SkillDefinition,
  SkillDeleteInput,
  SkillDoneEvent,
  SkillExportJsonInput,
  SkillExportJsonResponse,
  SkillGetInput,
  SkillImportJsonInput,
  SkillImportReport,
  SkillListInput,
  SkillRunInput,
  SkillRunResponse,
  SkillUpdateInput,
  TavernDirectorPostInput,
  TavernDirectorPostResponse,
  TavernMessageListInput,
  TavernMessageRecord,
  TavernRoundRunInput,
  TavernRoundRunResponse,
  TavernRoundStopInput,
  TavernRoundStopResponse,
  TavernSessionCreateInput,
  TavernSessionDeleteInput,
  TavernSessionGetInput,
  TavernSessionListInput,
  TavernSessionRecord,
  TavernSummaryCompactInput,
  TerminalDataEvent,
  TerminalDisposePayload,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSpawnInput,
  TerminalSpawnResponse,
} from "@inkforge/shared";

function api() {
  if (typeof window === "undefined" || !window.inkforge) {
    throw new Error("window.inkforge is not available. Running outside Electron preload?");
  }
  return window.inkforge;
}

export const projectApi = {
  create: (input: ProjectCreateInput): Promise<ProjectRecord> => api().project.create(input),
  list: (): Promise<ProjectRecord[]> => api().project.list(),
  update: (input: ProjectUpdateInput): Promise<ProjectRecord> => api().project.update(input),
  delete: (input: ProjectDeleteInput): Promise<{ id: string }> => api().project.delete(input),
  open: (input: ProjectOpenInput): Promise<ProjectRecord> => api().project.open(input),
};

export const chapterApi = {
  create: (input: ChapterCreateInput): Promise<ChapterRecord> => api().chapter.create(input),
  update: (input: ChapterUpdateInput): Promise<ChapterRecord> => api().chapter.update(input),
  list: (input: ChapterListInput): Promise<ChapterRecord[]> => api().chapter.list(input),
  read: (input: ChapterReadInput): Promise<ChapterReadResponse> => api().chapter.read(input),
  delete: (input: ChapterDeleteInput): Promise<{ id: string }> => api().chapter.delete(input),
  reorder: (input: ChapterReorderInput): Promise<ChapterRecord[]> => api().chapter.reorder(input),
  importMd: (input: ChapterImportMdInput): Promise<ChapterRecord> => api().chapter.importMd(input),
  exportMd: (input: ChapterExportMdInput): Promise<ChapterExportMdResponse> =>
    api().chapter.exportMd(input),
  autosaveWrite: (
    input: import("@inkforge/shared").ChapterAutosaveWriteInput,
  ): Promise<{ savedAt: number }> => api().chapter.autosaveWrite(input),
  autosavePeek: (
    input: import("@inkforge/shared").ChapterAutosavePeekInput,
  ): Promise<import("@inkforge/shared").ChapterAutosavePeekResponse> =>
    api().chapter.autosavePeek(input),
  autosaveClear: (
    input: import("@inkforge/shared").ChapterAutosaveClearInput,
  ): Promise<{ ok: true }> => api().chapter.autosaveClear(input),
};

export const providerApi = {
  save: (input: ProviderSaveInput): Promise<ProviderRecord> => api().provider.save(input),
  list: (): Promise<ProviderRecord[]> => api().provider.list(),
  delete: (input: ProviderDeleteInput): Promise<{ id: string }> => api().provider.delete(input),
  test: (input: ProviderTestInput): Promise<ProviderTestResponse> => api().provider.test(input),
  listRemoteModels: (input: import("@inkforge/shared").ProviderListRemoteModelsInput): Promise<import("@inkforge/shared").ProviderListRemoteModelsResponse> => api().provider.listRemoteModels(input),
};

export const llmApi = {
  analyze: (input: LLMAnalyzeInput): Promise<LLMAnalyzeResponse> => api().llm.analyze(input),
  quick: (input: LLMQuickActionInput): Promise<LLMQuickActionResponse> => api().llm.quick(input),
  chat: (input: LLMChatInput): Promise<LLMChatResponse> => api().llm.chat(input),
  onChunk: (listener: (payload: LLMChunkEvent) => void) => api().llm.onChunk(listener),
  onDone: (listener: (payload: LLMDoneEvent) => void) => api().llm.onDone(listener),
};

export interface SkillCancelResponse {
  runId: string;
  cancelled: false;
  reason: "not_supported_in_m3b";
}

export const skillApi = {
  list: (input: SkillListInput = {}): Promise<SkillDefinition[]> => api().skill.list(input),
  get: (input: SkillGetInput): Promise<SkillDefinition | null> => api().skill.get(input),
  create: (input: SkillCreateInput): Promise<SkillDefinition> => api().skill.create(input),
  update: (input: SkillUpdateInput): Promise<SkillDefinition> => api().skill.update(input),
  delete: (input: SkillDeleteInput): Promise<{ id: string }> => api().skill.delete(input),
  run: (input: SkillRunInput): Promise<SkillRunResponse> => api().skill.run(input),
  cancel: async (runId: string): Promise<SkillCancelResponse> => ({
    runId,
    cancelled: false,
    reason: "not_supported_in_m3b",
  }),
  importJson: (input: SkillImportJsonInput): Promise<SkillImportReport> =>
    api().skill.importJson(input),
  exportJson: (input: SkillExportJsonInput): Promise<SkillExportJsonResponse> =>
    api().skill.exportJson(input),
  onChunk: (listener: (payload: SkillChunkEvent) => void) => api().skill.onChunk(listener),
  onDone: (listener: (payload: SkillDoneEvent) => void) => api().skill.onDone(listener),
};

export const feedbackApi = {
  list: (input: FeedbackListInput): Promise<AIFeedbackRecord[]> => api().feedback.list(input),
  dismiss: (input: FeedbackDismissInput): Promise<{ id: string; dismissed: boolean }> =>
    api().feedback.dismiss(input),
};

export const outlineApi = {
  create: (input: OutlineCreateInput): Promise<OutlineCardRecord> => api().outline.create(input),
  update: (input: OutlineUpdateInput): Promise<OutlineCardRecord> => api().outline.update(input),
  delete: (input: OutlineDeleteInput): Promise<{ id: string }> => api().outline.delete(input),
  list: (input: OutlineListInput): Promise<OutlineCardRecord[]> => api().outline.list(input),
};

export const dailyApi = {
  progress: (input: DailyProgressInput): Promise<DailyProgressRecord> => api().daily.progress(input),
};

export const settingsApi = {
  get: (input: SettingsGetInput = {}): Promise<AppSettings> => api().settings.get(input),
  set: (input: SettingsSetInput): Promise<AppSettings> => api().settings.set(input),
};

export const diagApi = {
  crashStatus: (): Promise<import("@inkforge/shared").DiagCrashStatusResponse> =>
    api().diag.crashStatus(),
  crashDismiss: (): Promise<{ ok: true }> => api().diag.crashDismiss(),
};

export const fsApi = {
  pickFile: (input: FsPickFileInput = {}): Promise<FsPickFileResponse> => api().fs.pickFile(input),
  saveFile: (input: FsSaveFileInput): Promise<FsSaveFileResponse> => api().fs.saveFile(input),
};

export const terminalApi = {
  spawn: (input: TerminalSpawnInput = {}): Promise<TerminalSpawnResponse> =>
    api().terminal.spawn(input),
  input: (payload: TerminalInputPayload): Promise<{ ok: true }> => api().terminal.input(payload),
  resize: (payload: TerminalResizePayload): Promise<{ ok: true }> => api().terminal.resize(payload),
  dispose: (payload: TerminalDisposePayload): Promise<{ ok: true }> =>
    api().terminal.dispose(payload),
  onData: (listener: (payload: TerminalDataEvent) => void) => api().terminal.onData(listener),
  onExit: (listener: (payload: TerminalExitEvent) => void) => api().terminal.onExit(listener),
};

export const novelCharacterApi = {
  create: (input: import("@inkforge/shared").NovelCharacterCreateInput): Promise<import("@inkforge/shared").NovelCharacterRecord> => api().novelCharacter.create(input),
  update: (input: import("@inkforge/shared").NovelCharacterUpdateInput): Promise<import("@inkforge/shared").NovelCharacterRecord> => api().novelCharacter.update(input),
  get: (input: import("@inkforge/shared").NovelCharacterGetInput): Promise<import("@inkforge/shared").NovelCharacterRecord | null> => api().novelCharacter.get(input),
  list: (input: import("@inkforge/shared").NovelCharacterListInput): Promise<import("@inkforge/shared").NovelCharacterRecord[]> => api().novelCharacter.list(input),
  delete: (input: import("@inkforge/shared").NovelCharacterDeleteInput): Promise<{ id: string }> => api().novelCharacter.delete(input),
};

export const tavernCardApi = {
  create: (input: import("@inkforge/shared").TavernCardCreateInput): Promise<import("@inkforge/shared").TavernCardRecord> => api().tavernCard.create(input),
  update: (input: import("@inkforge/shared").TavernCardUpdateInput): Promise<import("@inkforge/shared").TavernCardRecord> => api().tavernCard.update(input),
  get: (input: import("@inkforge/shared").TavernCardGetInput): Promise<import("@inkforge/shared").TavernCardRecord | null> => api().tavernCard.get(input),
  list: (input?: import("@inkforge/shared").TavernCardListInput): Promise<import("@inkforge/shared").TavernCardRecord[]> => api().tavernCard.list(input),
  delete: (input: import("@inkforge/shared").TavernCardDeleteInput): Promise<{ id: string }> => api().tavernCard.delete(input),
};

export const characterSyncApi = {
  preview: (input: import("@inkforge/shared").CharacterSyncPreviewInput): Promise<import("@inkforge/shared").CharacterSyncPreviewResponse> => api().characterSync.preview(input),
  apply: (input: import("@inkforge/shared").CharacterSyncApplyInput): Promise<import("@inkforge/shared").CharacterSyncApplyResponse> => api().characterSync.apply(input),
  history: (input?: import("@inkforge/shared").CharacterSyncHistoryInput): Promise<import("@inkforge/shared").CharacterSyncLogRecord[]> => api().characterSync.history(input),
};

export const tavernSessionApi = {
  list: (input: TavernSessionListInput): Promise<TavernSessionRecord[]> => api().tavernSession.list(input),
  get: (input: TavernSessionGetInput): Promise<TavernSessionRecord | null> => api().tavernSession.get(input),
  create: (input: TavernSessionCreateInput): Promise<TavernSessionRecord> => api().tavernSession.create(input),
  delete: (input: TavernSessionDeleteInput): Promise<{ sessionId: string }> => api().tavernSession.delete(input),
  listMessages: (input: TavernMessageListInput): Promise<TavernMessageRecord[]> => api().tavernMessage.list(input),
  postDirector: (input: TavernDirectorPostInput): Promise<TavernDirectorPostResponse> => api().tavernRound.directorPost(input),
};

export const tavernRoundApi = {
  run: (input: TavernRoundRunInput): Promise<TavernRoundRunResponse> => api().tavernRound.run(input),
  stop: (input: TavernRoundStopInput): Promise<TavernRoundStopResponse> => api().tavernRound.stop(input),
};

export const tavernSummaryApi = {
  compact: (input: TavernSummaryCompactInput) => api().tavernSummary.compact(input),
};

export const tavernEventsApi = {
  onChunk: (listener: (payload: import("@inkforge/shared").IpcEventMap["tavern:chunk"]) => void) => api().tavernRound.onChunk(listener),
  onDone: (listener: (payload: import("@inkforge/shared").IpcEventMap["tavern:done"]) => void) => api().tavernRound.onDone(listener),
  onBudgetWarning: (listener: (payload: import("@inkforge/shared").IpcEventMap["tavern:budget-warning"]) => void) => api().tavernRound.onBudgetWarning(listener),
};

export const worldApi = {
  list: (input: import("@inkforge/shared").WorldListInput): Promise<import("@inkforge/shared").WorldEntryRecord[]> => api().world.list(input),
  get: (input: import("@inkforge/shared").WorldGetInput): Promise<import("@inkforge/shared").WorldEntryRecord | null> => api().world.get(input),
  create: (input: import("@inkforge/shared").WorldCreateInput): Promise<import("@inkforge/shared").WorldEntryRecord> => api().world.create(input),
  update: (input: import("@inkforge/shared").WorldUpdateInput): Promise<import("@inkforge/shared").WorldEntryRecord> => api().world.update(input),
  delete: (input: import("@inkforge/shared").WorldDeleteInput): Promise<{ id: string }> => api().world.delete(input),
  search: (input: import("@inkforge/shared").WorldSearchInput): Promise<import("@inkforge/shared").WorldEntryRecord[]> => api().world.search(input),
};

export const providerKeyApi = {
  list: (input: import("@inkforge/shared").ProviderKeyListInput): Promise<import("@inkforge/shared").ProviderKeyRecord[]> => api().providerKey.list(input),
  upsert: (input: import("@inkforge/shared").ProviderKeyUpsertInput): Promise<import("@inkforge/shared").ProviderKeyRecord> => api().providerKey.upsert(input),
  delete: (input: import("@inkforge/shared").ProviderKeyDeleteInput): Promise<{ id: string }> => api().providerKey.delete(input),
  setDisabled: (input: import("@inkforge/shared").ProviderKeySetDisabledInput): Promise<import("@inkforge/shared").ProviderKeyRecord> => api().providerKey.setDisabled(input),
  health: (input: import("@inkforge/shared").ProviderKeyHealthInput): Promise<import("@inkforge/shared").ProviderHealthSnapshot> => api().providerKey.health(input),
};

export const dailySummaryApi = {
  generate: (input: import("@inkforge/shared").DailySummaryGenerateInput): Promise<import("@inkforge/shared").DailySummaryGenerateResponse> => api().dailySummary.generate(input),
  get: (input: import("@inkforge/shared").DailySummaryGetInput): Promise<import("@inkforge/shared").DailySummaryRecord | null> => api().dailySummary.get(input),
  list: (input: import("@inkforge/shared").DailySummaryListInput): Promise<import("@inkforge/shared").DailySummaryRecord[]> => api().dailySummary.list(input),
  onChunk: (listener: (payload: import("@inkforge/shared").IpcEventMap["daily:summary-chunk"]) => void) => api().dailySummary.onChunk(listener),
  onDone: (listener: (payload: import("@inkforge/shared").IpcEventMap["daily:summary-done"]) => void) => api().dailySummary.onDone(listener),
};

export const researchApi = {
  search: (input: import("@inkforge/shared").ResearchSearchInput): Promise<import("@inkforge/shared").ResearchSearchResponse> => api().research.search(input),
  list: (input: import("@inkforge/shared").ResearchListInput): Promise<import("@inkforge/shared").ResearchNoteRecord[]> => api().research.list(input),
  get: (input: import("@inkforge/shared").ResearchGetInput): Promise<import("@inkforge/shared").ResearchNoteRecord | null> => api().research.get(input),
  save: (input: import("@inkforge/shared").ResearchSaveInput): Promise<import("@inkforge/shared").ResearchNoteRecord> => api().research.save(input),
  update: (input: import("@inkforge/shared").ResearchUpdateInput): Promise<import("@inkforge/shared").ResearchNoteRecord> => api().research.update(input),
  delete: (input: import("@inkforge/shared").ResearchDeleteInput): Promise<{ id: string }> => api().research.delete(input),
  credentialStatus: (input: import("@inkforge/shared").ResearchCredentialStatusInput = {}): Promise<import("@inkforge/shared").ResearchCredentialStatus[]> => api().research.credentialStatus(input),
  credentialUpsert: (input: import("@inkforge/shared").ResearchCredentialUpsertInput): Promise<import("@inkforge/shared").ResearchCredentialStatus> => api().research.credentialUpsert(input),
  credentialDelete: (input: import("@inkforge/shared").ResearchCredentialDeleteInput): Promise<import("@inkforge/shared").ResearchCredentialStatus> => api().research.credentialDelete(input),
};

export const reviewDimApi = {
  list: (input: import("@inkforge/shared").ReviewDimListInput): Promise<import("@inkforge/shared").ReviewDimensionRecord[]> => api().reviewDim.list(input),
  upsert: (input: import("@inkforge/shared").ReviewDimUpsertInput): Promise<import("@inkforge/shared").ReviewDimensionRecord> => api().reviewDim.upsert(input),
  delete: (input: import("@inkforge/shared").ReviewDimDeleteInput): Promise<{ id: string }> => api().reviewDim.delete(input),
  reorder: (input: import("@inkforge/shared").ReviewDimReorderInput): Promise<import("@inkforge/shared").ReviewDimensionRecord[]> => api().reviewDim.reorder(input),
};

export const reviewApi = {
  run: (input: import("@inkforge/shared").ReviewRunInput): Promise<import("@inkforge/shared").ReviewRunResponse> => api().review.run(input),
  cancel: (input: import("@inkforge/shared").ReviewCancelInput): Promise<import("@inkforge/shared").ReviewCancelResponse> => api().review.cancel(input),
  list: (input: import("@inkforge/shared").ReviewListInput): Promise<import("@inkforge/shared").ReviewReportRecord[]> => api().review.list(input),
  get: (input: import("@inkforge/shared").ReviewGetInput): Promise<import("@inkforge/shared").ReviewGetResponse | null> => api().review.get(input),
  dismissFinding: (input: import("@inkforge/shared").ReviewDismissFindingInput): Promise<import("@inkforge/shared").ReviewDismissFindingResponse> => api().review.dismissFinding(input),
  export: (input: import("@inkforge/shared").ReviewExportInput): Promise<import("@inkforge/shared").ReviewExportResponse> => api().review.export(input),
  onProgress: (listener: (payload: import("@inkforge/shared").IpcEventMap["review:progress"]) => void) => api().review.onProgress(listener),
  onDone: (listener: (payload: import("@inkforge/shared").IpcEventMap["review:done"]) => void) => api().review.onDone(listener),
};

// ===== M7 · Bookshelf =====

export const snapshotApi = {
  create: (input: import("@inkforge/shared").SnapshotCreateInput): Promise<import("@inkforge/shared").SnapshotCreateResponse> => api().snapshot.create(input),
  list: (input: import("@inkforge/shared").SnapshotListInput): Promise<import("@inkforge/shared").ChapterSnapshotRecord[]> => api().snapshot.list(input),
  get: (input: import("@inkforge/shared").SnapshotGetInput): Promise<import("@inkforge/shared").SnapshotGetResponse> => api().snapshot.get(input),
  restore: (input: import("@inkforge/shared").SnapshotRestoreInput): Promise<import("@inkforge/shared").SnapshotRestoreResponse> => api().snapshot.restore(input),
  delete: (input: import("@inkforge/shared").SnapshotDeleteInput): Promise<{ snapshotId: string }> => api().snapshot.delete(input),
};

export const bookshelfApi = {
  listBooks: (): Promise<import("@inkforge/shared").BookshelfListBooksResponse> => api().bookshelf.listBooks(),
};

export const coverApi = {
  upload: (input: import("@inkforge/shared").BookCoverUploadInput): Promise<import("@inkforge/shared").BookCoverUploadResponse> => api().cover.upload(input),
  get: (input: import("@inkforge/shared").BookCoverGetInput): Promise<import("@inkforge/shared").BookCoverGetResponse> => api().cover.get(input),
  delete: (input: import("@inkforge/shared").BookCoverDeleteInput): Promise<{ projectId: string }> => api().cover.delete(input),
};

export const originTagApi = {
  set: (input: import("@inkforge/shared").OriginTagSetInput): Promise<import("@inkforge/shared").ChapterOriginTagRecord> => api().originTag.set(input),
  get: (input: import("@inkforge/shared").OriginTagGetInput): Promise<import("@inkforge/shared").ChapterOriginTagRecord | null> => api().originTag.get(input),
  listByOrigin: (input: import("@inkforge/shared").OriginTagListByOriginInput): Promise<import("@inkforge/shared").OriginTagListByOriginResponse> => api().originTag.listByOrigin(input),
};

export const chapterLogApi = {
  list: (input: import("@inkforge/shared").ChapterLogListInput): Promise<import("@inkforge/shared").ChapterLogEntryRecord[]> => api().chapterLog.list(input),
  appendManual: (input: import("@inkforge/shared").ChapterLogAppendManualInput): Promise<import("@inkforge/shared").ChapterLogEntryRecord> => api().chapterLog.appendManual(input),
  appendAi: (input: import("@inkforge/shared").ChapterLogAppendAiInput): Promise<import("@inkforge/shared").ChapterLogEntryRecord> => api().chapterLog.appendAi(input),
  delete: (input: import("@inkforge/shared").ChapterLogDeleteInput): Promise<{ entryId: string }> => api().chapterLog.delete(input),
  onReminder: (listener: (payload: import("@inkforge/shared").IpcEventMap["chapter-log:daily-reminder"]) => void) => api().chapterLog.onReminder(listener),
};

export const autoWriterApi = {
  start: (input: import("@inkforge/shared").AutoWriterStartInput): Promise<import("@inkforge/shared").AutoWriterStartResponse> => api().autoWriter.start(input),
  stop: (input: import("@inkforge/shared").AutoWriterStopInput): Promise<import("@inkforge/shared").AutoWriterStopResponse> => api().autoWriter.stop(input),
  pause: (input: import("@inkforge/shared").AutoWriterPauseInput): Promise<import("@inkforge/shared").AutoWriterRunRecord> => api().autoWriter.pause(input),
  resume: (input: import("@inkforge/shared").AutoWriterResumeInput): Promise<import("@inkforge/shared").AutoWriterRunRecord> => api().autoWriter.resume(input),
  getRun: (input: import("@inkforge/shared").AutoWriterGetRunInput): Promise<import("@inkforge/shared").AutoWriterRunRecord | null> => api().autoWriter.getRun(input),
  listRuns: (input: import("@inkforge/shared").AutoWriterListRunsInput): Promise<import("@inkforge/shared").AutoWriterRunRecord[]> => api().autoWriter.listRuns(input),
  injectIdea: (input: import("@inkforge/shared").AutoWriterInjectIdeaInput): Promise<import("@inkforge/shared").AutoWriterRunRecord> => api().autoWriter.injectIdea(input),
  correct: (input: import("@inkforge/shared").AutoWriterCorrectInput): Promise<import("@inkforge/shared").AutoWriterCorrectResponse> => api().autoWriter.correct(input),
  onChunk: (listener: (payload: import("@inkforge/shared").IpcEventMap["auto-writer:chunk"]) => void) => api().autoWriter.onChunk(listener),
  onPhase: (listener: (payload: import("@inkforge/shared").IpcEventMap["auto-writer:phase"]) => void) => api().autoWriter.onPhase(listener),
  onDone: (listener: (payload: import("@inkforge/shared").IpcEventMap["auto-writer:done"]) => void) => api().autoWriter.onDone(listener),
  onSnapshot: (listener: (payload: import("@inkforge/shared").IpcEventMap["auto-writer:snapshot"]) => void) => api().autoWriter.onSnapshot(listener),
};

// ----- M8 · Achievements -----
export const achievementApi = {
  list: (input: import("@inkforge/shared").AchievementListInput): Promise<import("@inkforge/shared").AchievementUnlockedRecord[]> => api().achievement.list(input),
  check: (input: import("@inkforge/shared").AchievementCheckInput): Promise<import("@inkforge/shared").AchievementCheckResponse> => api().achievement.check(input),
  stats: (input: { projectId: string }): Promise<import("@inkforge/shared").AchievementStatsResponse> => api().achievement.stats(input),
  onUnlocked: (listener: (payload: import("@inkforge/shared").IpcEventMap["achievement:unlocked"]) => void) => api().achievement.onUnlocked(listener),
};

// ----- M8 · Letters -----
export const letterApi = {
  list: (input: import("@inkforge/shared").LetterListInput): Promise<import("@inkforge/shared").CharacterLetterRecord[]> => api().letter.list(input),
  generate: (input: import("@inkforge/shared").LetterGenerateInput): Promise<import("@inkforge/shared").CharacterLetterRecord> => api().letter.generate(input),
  markRead: (input: import("@inkforge/shared").LetterMarkReadInput): Promise<{ letterId: string }> => api().letter.markRead(input),
  pin: (input: import("@inkforge/shared").LetterPinInput): Promise<{ letterId: string }> => api().letter.pin(input),
  dismiss: (input: import("@inkforge/shared").LetterDismissInput): Promise<{ letterId: string }> => api().letter.dismiss(input),
  delete: (input: import("@inkforge/shared").LetterDeleteInput): Promise<{ letterId: string }> => api().letter.delete(input),
  onArrived: (listener: (payload: import("@inkforge/shared").IpcEventMap["letter:arrived"]) => void) => api().letter.onArrived(listener),
};

// ----- Scene Bindings (ported from ainovel) -----
export const sceneBindingApi = {
  list: (): Promise<import("@inkforge/shared").SceneBindingListResponse> => api().sceneBinding.list(),
  upsert: (input: import("@inkforge/shared").SceneBindingUpsertInput): Promise<import("@inkforge/shared").SceneBindingRecord> => api().sceneBinding.upsert(input),
  reset: (input: import("@inkforge/shared").SceneBindingResetInput): Promise<{ sceneKey: import("@inkforge/shared").SceneKey }> => api().sceneBinding.reset(input),
  getMode: (): Promise<{ mode: import("@inkforge/shared").SceneRoutingMode }> => api().sceneBinding.getMode(),
  setMode: (input: import("@inkforge/shared").SceneBindingSetModeInput): Promise<{ mode: import("@inkforge/shared").SceneRoutingMode }> => api().sceneBinding.setMode(input),
};

// ----- Sample Library + RAG (ported from ainovel) -----
export const sampleLibApi = {
  list: (input: import("@inkforge/shared").SampleLibListInput): Promise<import("@inkforge/shared").SampleLibRecord[]> => api().sampleLib.list(input),
  create: (input: import("@inkforge/shared").SampleLibCreateInput): Promise<import("@inkforge/shared").SampleLibRecord> => api().sampleLib.create(input),
  delete: (input: import("@inkforge/shared").SampleLibDeleteInput): Promise<{ libId: string }> => api().sampleLib.delete(input),
  importText: (input: import("@inkforge/shared").SampleLibImportTextInput): Promise<import("@inkforge/shared").SampleLibImportResponse> => api().sampleLib.importText(input),
  importEpub: (input: import("@inkforge/shared").SampleLibImportEpubInput): Promise<import("@inkforge/shared").SampleLibImportResponse> => api().sampleLib.importEpub(input),
};

// ----- World Relationships (graph, ported from ainovel) -----
export const worldRelationshipApi = {
  list: (input: import("@inkforge/shared").WorldRelationshipListInput): Promise<import("@inkforge/shared").WorldRelationshipRecord[]> => api().worldRelationship.list(input),
  save: (input: import("@inkforge/shared").WorldRelationshipSaveInput): Promise<import("@inkforge/shared").WorldRelationshipRecord> => api().worldRelationship.save(input),
  delete: (input: import("@inkforge/shared").WorldRelationshipDeleteInput): Promise<{ id: string }> => api().worldRelationship.delete(input),
};

export const worldTimelineApi = {
  list: (input: import("@inkforge/shared").WorldTimelineListInput): Promise<import("@inkforge/shared").WorldTimelineEventRecord[]> => api().worldTimeline.list(input),
  save: (input: import("@inkforge/shared").WorldTimelineSaveInput): Promise<import("@inkforge/shared").WorldTimelineEventRecord> => api().worldTimeline.save(input),
  delete: (input: import("@inkforge/shared").WorldTimelineDeleteInput): Promise<{ id: string }> => api().worldTimeline.delete(input),
};

export const worldExtractApi = {
  run: (input: import("@inkforge/shared").WorldExtractRunInput): Promise<import("@inkforge/shared").WorldExtractRunResponse> => api().worldExtract.run(input),
};

// ----- Project Export + Chapter Bulk Import (ported from ainovel) -----
export const projectExportApi = {
  txt: (input: import("@inkforge/shared").ProjectExportInput): Promise<import("@inkforge/shared").ProjectExportResponse> => api().projectExport.txt(input),
  md: (input: import("@inkforge/shared").ProjectExportInput): Promise<import("@inkforge/shared").ProjectExportResponse> => api().projectExport.md(input),
  html: (input: import("@inkforge/shared").ProjectExportInput): Promise<import("@inkforge/shared").ProjectExportResponse> => api().projectExport.html(input),
  docx: (input: import("@inkforge/shared").ProjectExportInput): Promise<import("@inkforge/shared").ProjectExportResponse> => api().projectExport.docx(input),
  epub: (input: import("@inkforge/shared").ProjectExportInput): Promise<import("@inkforge/shared").ProjectExportResponse> => api().projectExport.epub(input),
};

export const chapterImportApi = {
  txt: (input: import("@inkforge/shared").ChapterImportTxtInput): Promise<import("@inkforge/shared").ChapterImportBulkResponse> => api().chapterImport.txt(input),
  epub: (input: import("@inkforge/shared").ChapterImportEpubInput): Promise<import("@inkforge/shared").ChapterImportBulkResponse> => api().chapterImport.epub(input),
};

// ----- Module 6: AI outline + chapter generation (ainovel-style) -----
export const outlineGenApi = {
  updateProjectMeta: (input: import("@inkforge/shared").ProjectUpdateMetaInput): Promise<import("@inkforge/shared").ProjectRecord> => api().outlineGen.updateProjectMeta(input),
  generateMaster: (input: import("@inkforge/shared").OutlineGenerateMasterInput): Promise<import("@inkforge/shared").OutlineGenerateMasterResponse> => api().outlineGen.generateMaster(input),
  generateChapters: (input: import("@inkforge/shared").OutlineGenerateChaptersInput): Promise<import("@inkforge/shared").OutlineGenerateChaptersResponse> => api().outlineGen.generateChapters(input),
  refine: (input: import("@inkforge/shared").OutlineRefineInput): Promise<import("@inkforge/shared").OutlineRefineResponse> => api().outlineGen.refine(input),
  undoRefine: (input: import("@inkforge/shared").OutlineUndoRefineInput): Promise<import("@inkforge/shared").OutlineUndoRefineResponse> => api().outlineGen.undoRefine(input),
};

export const chapterGenApi = {
  fromOutline: (input: import("@inkforge/shared").ChapterGenerateFromOutlineInput): Promise<import("@inkforge/shared").ChapterGenerateFromOutlineResponse> => api().chapterGen.fromOutline(input),
  commitDraft: (input: import("@inkforge/shared").ChapterCommitDraftInput): Promise<import("@inkforge/shared").ChapterCommitDraftResponse> => api().chapterGen.commitDraft(input),
};
