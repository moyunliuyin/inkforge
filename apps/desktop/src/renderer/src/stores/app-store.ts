import { create } from "zustand";
import type {
  AIFeedbackRecord,
  AppSettings,
  ChapterRecord,
  ProjectRecord,
  SyncDiffRow,
  TokenBudgetState,
} from "@inkforge/shared";

export type MainView =
  | "writing"
  | "skill"
  | "character"
  | "tavern"
  | "world"
  | "research"
  | "review"
  | "bookshelf"
  | "achievement"
  | "letters"
  | "outline";

export interface StreamingAnalysis {
  analysisId: string;
  projectId: string;
  chapterId: string;
  providerId: string;
  status: "streaming" | "completed" | "failed";
  accumulatedText: string;
  error?: string;
  feedback?: AIFeedbackRecord;
  startedAt: string;
  finishedAt?: string;
}

export interface ChapterLiveStats {
  cjk: number;
  en: number;
  tokens: number;
  graphemes: number;
}

export interface AppState {
  currentProjectId: string | null;
  currentChapterId: string | null;
  settings: AppSettings;
  settingsLoaded: boolean;
  settingsPanelOpen: boolean;
  providerPanelOpen: boolean;
  mainView: MainView;
  rightPanel: "timeline" | "chat";
  terminalOpen: boolean;
  terminalHeight: number;
  analyses: StreamingAnalysis[];
  activeSkillId: string | null;
  skillEditorDirty: boolean;
  
  // Character & Tavern
  activeNovelCharacterId: string | null;
  activeTavernCardId: string | null;
  syncDiffData: { previewData: SyncDiffRow[]; novelCharId: string; tavernCardId: string } | null;
  activeTavernSessionId: string | null;
  tavernBudgetState: Record<string, TokenBudgetState>;
  tavernStreamBuffers: Record<string, { roundId: string; speakerCardId: string; speakerName: string; text: string }>;

  // World
  activeWorldCategory: string | null;
  activeWorldEntryId: string | null;
  worldSearchQuery: string;

  // Editor live stats (for StatusBar three-column display)
  currentChapterStats: ChapterLiveStats | null;

  setProject: (projectId: string | null) => void;
  setChapter: (chapterId: string | null) => void;
  setSettings: (settings: AppSettings) => void;
  patchSettings: (updates: Partial<AppSettings>) => void;
  openSettings: (open?: boolean) => void;
  openProviderPanel: (open?: boolean) => void;
  setMainView: (view: MainView) => void;
  setRightPanel: (panel: "timeline" | "chat") => void;
  toggleTerminal: (open?: boolean) => void;
  setTerminalHeight: (h: number) => void;
  upsertStreaming: (analysis: StreamingAnalysis) => void;
  finishAnalysis: (
    analysisId: string,
    status: "completed" | "failed",
    patch: Partial<StreamingAnalysis>,
  ) => void;
  clearAnalysesForChapter: (chapterId: string) => void;
  setActiveSkillId: (id: string | null) => void;
  setSkillEditorDirty: (dirty: boolean) => void;
  
  // Character & Tavern
  setActiveNovelCharacterId: (id: string | null) => void;
  setActiveTavernCardId: (id: string | null) => void;
  setSyncDiffData: (data: { previewData: SyncDiffRow[]; novelCharId: string; tavernCardId: string } | null) => void;
  setActiveTavernSessionId: (id: string | null) => void;
  setTavernBudgetState: (sessionId: string, state: TokenBudgetState) => void;
  updateTavernStreamBuffer: (
    sessionId: string,
    patch: { roundId: string; speakerCardId: string; speakerName: string; text: string } | null,
  ) => void;

  // World
  setActiveWorldCategory: (category: string | null) => void;
  setActiveWorldEntryId: (id: string | null) => void;
  setWorldSearchQuery: (query: string) => void;

  // Editor live stats
  setCurrentChapterStats: (stats: ChapterLiveStats | null) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  activeProviderId: null,
  analysisEnabled: true,
  analysisThreshold: 200,
  uiLanguage: "zh",
  devModeEnabled: false,
  onboardingCompleted: false,
  sceneRoutingMode: "basic",
  editorFontSize: 14,
  editorFontFamily: "",
  companionEnabled: true,
  autoSaveInterval: 60,
  autoOpenLastProject: true,
  dataDir: null,
  autoBackup: false,
  defaultDailyGoal: 1000,
  pageProjectSwitcher: false,
};

export const useAppStore = create<AppState>((set) => ({
  currentProjectId: null,
  currentChapterId: null,
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,
  settingsPanelOpen: false,
  providerPanelOpen: false,
  mainView: "writing",
  rightPanel: "timeline",
  terminalOpen: false,
  terminalHeight: 240,
  analyses: [],
  activeSkillId: null,
  skillEditorDirty: false,
  
  activeNovelCharacterId: null,
  activeTavernCardId: null,
  syncDiffData: null,
  activeTavernSessionId: null,
  tavernBudgetState: {},
  tavernStreamBuffers: {},

  activeWorldCategory: null,
  activeWorldEntryId: null,
  worldSearchQuery: "",

  currentChapterStats: null,

  setProject: (projectId) =>
    set(() => ({
      currentProjectId: projectId,
      currentChapterId: null,
      analyses: [],
    })),
  setChapter: (chapterId) => set(() => ({ currentChapterId: chapterId })),
  setSettings: (settings) => set(() => ({ settings, settingsLoaded: true })),
  patchSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } })),
  openSettings: (open = true) => set(() => ({ settingsPanelOpen: open })),
  openProviderPanel: (open = true) => set(() => ({ providerPanelOpen: open })),
  setMainView: (view) => set(() => ({ mainView: view })),
  setRightPanel: (panel) => set(() => ({ rightPanel: panel })),
  toggleTerminal: (open) =>
    set((state) => ({ terminalOpen: typeof open === "boolean" ? open : !state.terminalOpen })),
  setTerminalHeight: (h) =>
    set(() => ({ terminalHeight: Math.max(120, Math.min(700, Math.round(h))) })),
  upsertStreaming: (analysis) =>
    set((state) => {
      const next = state.analyses.filter((a) => a.analysisId !== analysis.analysisId);
      next.unshift(analysis);
      return { analyses: next.slice(0, 50) };
    }),
  finishAnalysis: (analysisId, status, patch) =>
    set((state) => ({
      analyses: state.analyses.map((a) =>
        a.analysisId === analysisId
          ? {
              ...a,
              ...patch,
              status,
              finishedAt: new Date().toISOString(),
            }
          : a,
      ),
    })),
  clearAnalysesForChapter: (chapterId) =>
    set((state) => ({
      analyses: state.analyses.filter((a) => a.chapterId !== chapterId),
    })),
  setActiveSkillId: (id) => set(() => ({ activeSkillId: id })),
  setSkillEditorDirty: (dirty) => set(() => ({ skillEditorDirty: dirty })),
  
  setActiveNovelCharacterId: (id) => set(() => ({ activeNovelCharacterId: id })),
  setActiveTavernCardId: (id) => set(() => ({ activeTavernCardId: id })),
  setSyncDiffData: (data) => set(() => ({ syncDiffData: data })),
  setActiveTavernSessionId: (id) => set(() => ({ activeTavernSessionId: id })),
  setTavernBudgetState: (sessionId, state) =>
    set((s) => ({ tavernBudgetState: { ...s.tavernBudgetState, [sessionId]: state } })),
  updateTavernStreamBuffer: (sessionId, patch) =>
    set((s) => {
      const newBuffers = { ...s.tavernStreamBuffers };
      if (patch === null) {
        // Clear buffer
        delete newBuffers[sessionId];
      } else {
        newBuffers[sessionId] = patch;
      }
      return { tavernStreamBuffers: newBuffers };
    }),

  setActiveWorldCategory: (category) => set(() => ({ activeWorldCategory: category })),
  setActiveWorldEntryId: (id) => set(() => ({ activeWorldEntryId: id })),
  setWorldSearchQuery: (query) => set(() => ({ worldSearchQuery: query })),

  setCurrentChapterStats: (stats) => set(() => ({ currentChapterStats: stats })),
}));

export type { ProjectRecord, ChapterRecord };
