import { contextBridge, ipcRenderer } from "electron";
import {
  ipcChannels,
  ipcEventChannels,
  type InkforgeApi,
  type Unsubscribe,
} from "@inkforge/shared";

function subscribe<T>(
  channel: string,
  listener: (payload: T) => void,
): Unsubscribe {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: T) => {
    try {
      listener(payload);
    } catch (error) {
      console.error("inkforge listener error", error);
    }
  };
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

const api: InkforgeApi = {
  project: {
    create: (input) => ipcRenderer.invoke(ipcChannels.projectCreate, input),
    list: () => ipcRenderer.invoke(ipcChannels.projectList),
    update: (input) => ipcRenderer.invoke(ipcChannels.projectUpdate, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.projectDelete, input),
    open: (input) => ipcRenderer.invoke(ipcChannels.projectOpen, input),
  },
  chapter: {
    create: (input) => ipcRenderer.invoke(ipcChannels.chapterCreate, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.chapterUpdate, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.chapterList, input),
    read: (input) => ipcRenderer.invoke(ipcChannels.chapterRead, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.chapterDelete, input),
    reorder: (input) => ipcRenderer.invoke(ipcChannels.chapterReorder, input),
    importMd: (input) => ipcRenderer.invoke(ipcChannels.chapterImportMd, input),
    exportMd: (input) => ipcRenderer.invoke(ipcChannels.chapterExportMd, input),
    autosaveWrite: (input) => ipcRenderer.invoke(ipcChannels.chapterAutosaveWrite, input),
    autosavePeek: (input) => ipcRenderer.invoke(ipcChannels.chapterAutosavePeek, input),
    autosaveClear: (input) => ipcRenderer.invoke(ipcChannels.chapterAutosaveClear, input),
  },
  provider: {
    save: (input) => ipcRenderer.invoke(ipcChannels.providerSave, input),
    list: () => ipcRenderer.invoke(ipcChannels.providerList),
    delete: (input) => ipcRenderer.invoke(ipcChannels.providerDelete, input),
    test: (input) => ipcRenderer.invoke(ipcChannels.providerTest, input),
    listRemoteModels: (input) => ipcRenderer.invoke(ipcChannels.providerListRemoteModels, input),
  },
  llm: {
    analyze: (input) => ipcRenderer.invoke(ipcChannels.llmAnalyze, input),
    quick: (input) => ipcRenderer.invoke(ipcChannels.llmQuick, input),
    chat: (input) => ipcRenderer.invoke(ipcChannels.llmChat, input),
    onChunk: (listener) => subscribe(ipcEventChannels.llmChunk, listener),
    onDone: (listener) => subscribe(ipcEventChannels.llmDone, listener),
  },
  feedback: {
    list: (input) => ipcRenderer.invoke(ipcChannels.feedbackList, input),
    dismiss: (input) => ipcRenderer.invoke(ipcChannels.feedbackDismiss, input),
  },
  outline: {
    create: (input) => ipcRenderer.invoke(ipcChannels.outlineCreate, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.outlineUpdate, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.outlineDelete, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.outlineList, input),
  },
  daily: {
    progress: (input) => ipcRenderer.invoke(ipcChannels.dailyProgress, input),
  },
  settings: {
    get: (input) => ipcRenderer.invoke(ipcChannels.settingsGet, input),
    set: (input) => ipcRenderer.invoke(ipcChannels.settingsSet, input),
  },
  diag: {
    snapshot: (input) => ipcRenderer.invoke(ipcChannels.diagSnapshot, input ?? {}),
    crashStatus: () => ipcRenderer.invoke(ipcChannels.diagCrashStatus),
    crashDismiss: () => ipcRenderer.invoke(ipcChannels.diagCrashDismiss),
  },
  update: {
    check: () => ipcRenderer.invoke(ipcChannels.updateCheck),
    download: () => ipcRenderer.invoke(ipcChannels.updateDownload),
    install: () => ipcRenderer.invoke(ipcChannels.updateInstall),
    status: () => ipcRenderer.invoke(ipcChannels.updateStatus),
    openDownloadPage: () => ipcRenderer.invoke(ipcChannels.updateOpenDownloadPage),
    onStatus: (listener) => subscribe(ipcEventChannels.updateStatus, listener),
  },
  market: {
    fetchRegistry: (input) =>
      ipcRenderer.invoke(ipcChannels.marketFetchRegistry, input ?? {}),
    installSkill: (input) =>
      ipcRenderer.invoke(ipcChannels.marketInstallSkill, input),
    buildPublishBundle: (input) =>
      ipcRenderer.invoke(ipcChannels.marketBuildPublishBundle, input),
  },
  fs: {
    pickFile: (input) => ipcRenderer.invoke(ipcChannels.fsPickFile, input),
    saveFile: (input) => ipcRenderer.invoke(ipcChannels.fsSaveFile, input),
  },
  terminal: {
    spawn: (input) => ipcRenderer.invoke(ipcChannels.terminalSpawn, input),
    input: (payload) => ipcRenderer.invoke(ipcChannels.terminalInput, payload),
    resize: (payload) => ipcRenderer.invoke(ipcChannels.terminalResize, payload),
    dispose: (payload) => ipcRenderer.invoke(ipcChannels.terminalDispose, payload),
    onData: (listener) => subscribe(ipcEventChannels.terminalData, listener),
    onExit: (listener) => subscribe(ipcEventChannels.terminalExit, listener),
  },
  skill: {
    create: (input) => ipcRenderer.invoke(ipcChannels.skillCreate, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.skillUpdate, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.skillGet, input),
    list: (input = {}) => ipcRenderer.invoke(ipcChannels.skillList, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.skillDelete, input),
    run: (input) => ipcRenderer.invoke(ipcChannels.skillRun, input),
    importJson: (input) => ipcRenderer.invoke(ipcChannels.skillImportJson, input),
    exportJson: (input) => ipcRenderer.invoke(ipcChannels.skillExportJson, input),
    onChunk: (listener) => subscribe(ipcEventChannels.skillChunk, listener),
    onDone: (listener) => subscribe(ipcEventChannels.skillDone, listener),
  },
  tavernCard: {
    create: (input) => ipcRenderer.invoke(ipcChannels.tavernCardCreate, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.tavernCardUpdate, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.tavernCardGet, input),
    list: (input = {}) => ipcRenderer.invoke(ipcChannels.tavernCardList, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.tavernCardDelete, input),
    importCard: () => ipcRenderer.invoke(ipcChannels.tavernCardImport, {}),
    exportCard: (input) => ipcRenderer.invoke(ipcChannels.tavernCardExport, input),
    getAvatar: (input) => ipcRenderer.invoke(ipcChannels.tavernCardAvatarGet, input),
  },
  novelCharacter: {
    create: (input) => ipcRenderer.invoke(ipcChannels.novelCharacterCreate, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.novelCharacterUpdate, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.novelCharacterGet, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.novelCharacterList, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.novelCharacterDelete, input),
  },
  characterSync: {
    preview: (input) => ipcRenderer.invoke(ipcChannels.characterSyncPreview, input),
    apply: (input) => ipcRenderer.invoke(ipcChannels.characterSyncApply, input),
    history: (input = {}) => ipcRenderer.invoke(ipcChannels.characterSyncHistory, input),
  },
  tavernSession: {
    create: (input) => ipcRenderer.invoke(ipcChannels.tavernSessionCreate, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.tavernSessionGet, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.tavernSessionList, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.tavernSessionDelete, input),
  },
  tavernMessage: {
    list: (input) => ipcRenderer.invoke(ipcChannels.tavernMessageList, input),
  },
  tavernRound: {
    run: (input) => ipcRenderer.invoke(ipcChannels.tavernRoundRun, input),
    stop: (input) => ipcRenderer.invoke(ipcChannels.tavernRoundStop, input),
    directorPost: (input) => ipcRenderer.invoke(ipcChannels.tavernDirectorPost, input),
    onChunk: (listener) => subscribe(ipcEventChannels.tavernChunk, listener),
    onDone: (listener) => subscribe(ipcEventChannels.tavernDone, listener),
    onBudgetWarning: (listener) => subscribe(ipcEventChannels.tavernBudgetWarning, listener),
  },
  tavernSummary: {
    compact: (input) => ipcRenderer.invoke(ipcChannels.tavernSummaryCompact, input),
  },
  world: {
    list: (input) => ipcRenderer.invoke(ipcChannels.worldList, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.worldGet, input),
    create: (input) => ipcRenderer.invoke(ipcChannels.worldCreate, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.worldUpdate, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.worldDelete, input),
    search: (input) => ipcRenderer.invoke(ipcChannels.worldSearch, input),
  },
  research: {
    search: (input) => ipcRenderer.invoke(ipcChannels.researchSearch, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.researchList, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.researchGet, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.researchSave, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.researchUpdate, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.researchDelete, input),
    credentialStatus: (input) =>
      ipcRenderer.invoke(ipcChannels.researchCredentialStatus, input),
    credentialUpsert: (input) =>
      ipcRenderer.invoke(ipcChannels.researchCredentialUpsert, input),
    credentialDelete: (input) =>
      ipcRenderer.invoke(ipcChannels.researchCredentialDelete, input),
  },
  reviewDim: {
    list: (input) => ipcRenderer.invoke(ipcChannels.reviewDimList, input),
    upsert: (input) => ipcRenderer.invoke(ipcChannels.reviewDimUpsert, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.reviewDimDelete, input),
    reorder: (input) => ipcRenderer.invoke(ipcChannels.reviewDimReorder, input),
  },
  review: {
    run: (input) => ipcRenderer.invoke(ipcChannels.reviewRun, input),
    cancel: (input) => ipcRenderer.invoke(ipcChannels.reviewCancel, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.reviewList, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.reviewGet, input),
    dismissFinding: (input) => ipcRenderer.invoke(ipcChannels.reviewDismissFinding, input),
    export: (input) => ipcRenderer.invoke(ipcChannels.reviewExport, input),
    onProgress: (listener) => subscribe(ipcEventChannels.reviewProgress, listener),
    onDone: (listener) => subscribe(ipcEventChannels.reviewDone, listener),
  },
  dailySummary: {
    generate: (input) => ipcRenderer.invoke(ipcChannels.dailySummaryGenerate, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.dailySummaryGet, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.dailySummaryList, input),
    onChunk: (listener) => subscribe(ipcEventChannels.dailySummaryChunk, listener),
    onDone: (listener) => subscribe(ipcEventChannels.dailySummaryDone, listener),
  },
  providerKey: {
    list: (input) => ipcRenderer.invoke(ipcChannels.providerKeyList, input),
    upsert: (input) => ipcRenderer.invoke(ipcChannels.providerKeyUpsert, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.providerKeyDelete, input),
    setDisabled: (input) => ipcRenderer.invoke(ipcChannels.providerKeySetDisabled, input),
    health: (input) => ipcRenderer.invoke(ipcChannels.providerKeyHealth, input),
  },
  // ----- M7 · Bookshelf -----
  snapshot: {
    create: (input) => ipcRenderer.invoke(ipcChannels.snapshotCreate, input),
    list: (input) => ipcRenderer.invoke(ipcChannels.snapshotList, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.snapshotGet, input),
    restore: (input) => ipcRenderer.invoke(ipcChannels.snapshotRestore, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.snapshotDelete, input),
  },
  bookshelf: {
    listBooks: () => ipcRenderer.invoke(ipcChannels.bookshelfListBooks),
  },
  cover: {
    upload: (input) => ipcRenderer.invoke(ipcChannels.bookCoverUpload, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.bookCoverGet, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.bookCoverDelete, input),
  },
  originTag: {
    set: (input) => ipcRenderer.invoke(ipcChannels.originTagSet, input),
    get: (input) => ipcRenderer.invoke(ipcChannels.originTagGet, input),
    listByOrigin: (input) => ipcRenderer.invoke(ipcChannels.originTagListByOrigin, input),
  },
  chapterLog: {
    list: (input) => ipcRenderer.invoke(ipcChannels.chapterLogList, input),
    appendManual: (input) => ipcRenderer.invoke(ipcChannels.chapterLogAppendManual, input),
    appendAi: (input) => ipcRenderer.invoke(ipcChannels.chapterLogAppendAi, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.chapterLogDelete, input),
    onReminder: (listener) => subscribe(ipcEventChannels.chapterLogReminder, listener),
  },
  autoWriter: {
    start: (input) => ipcRenderer.invoke(ipcChannels.autoWriterStart, input),
    stop: (input) => ipcRenderer.invoke(ipcChannels.autoWriterStop, input),
    pause: (input) => ipcRenderer.invoke(ipcChannels.autoWriterPause, input),
    resume: (input) => ipcRenderer.invoke(ipcChannels.autoWriterResume, input),
    getRun: (input) => ipcRenderer.invoke(ipcChannels.autoWriterGetRun, input),
    listRuns: (input) => ipcRenderer.invoke(ipcChannels.autoWriterListRuns, input),
    injectIdea: (input) => ipcRenderer.invoke(ipcChannels.autoWriterInjectIdea, input),
    correct: (input) => ipcRenderer.invoke(ipcChannels.autoWriterCorrect, input),
    onChunk: (listener) => subscribe(ipcEventChannels.autoWriterChunk, listener),
    onPhase: (listener) => subscribe(ipcEventChannels.autoWriterPhase, listener),
    onDone: (listener) => subscribe(ipcEventChannels.autoWriterDone, listener),
    onSnapshot: (listener) => subscribe(ipcEventChannels.autoWriterSnapshot, listener),
  },
  window: {
    minimize: () => ipcRenderer.invoke(ipcChannels.windowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(ipcChannels.windowToggleMaximize),
    close: () => ipcRenderer.invoke(ipcChannels.windowClose),
    isMaximized: () => ipcRenderer.invoke(ipcChannels.windowIsMaximized),
    onMaximizedChanged: (listener) =>
      subscribe(ipcEventChannels.windowMaximizedChanged, listener),
  },
  achievement: {
    list: (input) => ipcRenderer.invoke(ipcChannels.achievementList, input),
    check: (input) => ipcRenderer.invoke(ipcChannels.achievementCheck, input),
    stats: (input) => ipcRenderer.invoke(ipcChannels.achievementStats, input),
    onUnlocked: (listener) =>
      subscribe(ipcEventChannels.achievementUnlocked, listener),
  },
  letter: {
    list: (input) => ipcRenderer.invoke(ipcChannels.letterList, input),
    generate: (input) => ipcRenderer.invoke(ipcChannels.letterGenerate, input),
    markRead: (input) => ipcRenderer.invoke(ipcChannels.letterMarkRead, input),
    pin: (input) => ipcRenderer.invoke(ipcChannels.letterPin, input),
    dismiss: (input) => ipcRenderer.invoke(ipcChannels.letterDismiss, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.letterDelete, input),
    onArrived: (listener) => subscribe(ipcEventChannels.letterArrived, listener),
  },
  // ----- Scene Bindings (ported from ainovel) -----
  sceneBinding: {
    list: () => ipcRenderer.invoke(ipcChannels.sceneBindingList),
    upsert: (input) => ipcRenderer.invoke(ipcChannels.sceneBindingUpsert, input),
    reset: (input) => ipcRenderer.invoke(ipcChannels.sceneBindingReset, input),
    getMode: () => ipcRenderer.invoke(ipcChannels.sceneBindingGetMode),
    setMode: (input) => ipcRenderer.invoke(ipcChannels.sceneBindingSetMode, input),
  },
  // ----- Sample Library + RAG (ported from ainovel) -----
  sampleLib: {
    list: (input) => ipcRenderer.invoke(ipcChannels.sampleLibList, input),
    create: (input) => ipcRenderer.invoke(ipcChannels.sampleLibCreate, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.sampleLibDelete, input),
    importText: (input) => ipcRenderer.invoke(ipcChannels.sampleLibImportText, input),
    importEpub: (input) => ipcRenderer.invoke(ipcChannels.sampleLibImportEpub, input),
  },
  // ----- World Relationships (graph, ported from ainovel) -----
  worldRelationship: {
    list: (input) => ipcRenderer.invoke(ipcChannels.worldRelationshipList, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.worldRelationshipSave, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.worldRelationshipDelete, input),
  },
  worldTimeline: {
    list: (input) => ipcRenderer.invoke(ipcChannels.worldTimelineList, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.worldTimelineSave, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.worldTimelineDelete, input),
  },
  worldExtract: {
    run: (input) => ipcRenderer.invoke(ipcChannels.worldExtractRun, input),
  },
  // ----- Project Export + Chapter Bulk Import (ported from ainovel) -----
  projectExport: {
    txt: (input) => ipcRenderer.invoke(ipcChannels.projectExportTxt, input),
    md: (input) => ipcRenderer.invoke(ipcChannels.projectExportMd, input),
    html: (input) => ipcRenderer.invoke(ipcChannels.projectExportHtml, input),
    docx: (input) => ipcRenderer.invoke(ipcChannels.projectExportDocx, input),
    epub: (input) => ipcRenderer.invoke(ipcChannels.projectExportEpub, input),
  },
  chapterImport: {
    txt: (input) => ipcRenderer.invoke(ipcChannels.chapterImportTxt, input),
    epub: (input) => ipcRenderer.invoke(ipcChannels.chapterImportEpub, input),
  },
  // ----- Module 6: AI outline + chapter generation (ainovel-style) -----
  outlineGen: {
    updateProjectMeta: (input) => ipcRenderer.invoke(ipcChannels.projectUpdateMeta, input),
    generateMaster: (input) => ipcRenderer.invoke(ipcChannels.outlineGenerateMaster, input),
    generateChapters: (input) => ipcRenderer.invoke(ipcChannels.outlineGenerateChapters, input),
    refine: (input) => ipcRenderer.invoke(ipcChannels.outlineRefine, input),
    undoRefine: (input) => ipcRenderer.invoke(ipcChannels.outlineUndoRefine, input),
  },
  chapterGen: {
    fromOutline: (input) => ipcRenderer.invoke(ipcChannels.chapterGenerateFromOutline, input),
    commitDraft: (input) => ipcRenderer.invoke(ipcChannels.chapterCommitDraft, input),
  },
};

try {
  contextBridge.exposeInMainWorld("inkforge", api);
} catch (error) {
  console.error("Failed to expose inkforge API", error);
}
