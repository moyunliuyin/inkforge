import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dailyApi, providerApi, projectApi, settingsApi } from "./lib/api";
import { useAppStore } from "./stores/app-store";
import { OnboardingPage } from "./pages/OnboardingPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { SkillPage } from "./pages/SkillPage";
import { CharacterPage } from "./pages/CharacterPage";
import { TavernPage } from "./pages/TavernPage";
import { WorldPage } from "./pages/WorldPage";
import { OutlinePage } from "./pages/OutlinePage";
import { ResearchPage } from "./pages/ResearchPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ActivityBar } from "./components/ActivityBar";
import { AchievementHallPage } from "./pages/AchievementHallPage";
import { LetterInboxPage } from "./pages/LetterInboxPage";
import { AchievementToast } from "./components/achievement";
import { BookshelfPage } from "./components/bookshelf";
import { Companion } from "./components/companion";
import { ReminderToast } from "./components/log";
import { TitleBar } from "./components/titlebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CrashRecoveryBanner } from "./components/CrashRecoveryBanner";
import { SettingsDrawer } from "./components/settings";

export function App(): JSX.Element {
  const setSettings = useAppStore((s) => s.setSettings);
  const settings = useAppStore((s) => s.settings);
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const mainView = useAppStore((s) => s.mainView);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const lang = settings.uiLanguage;

  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => settingsApi.get({}),
  });

  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data, setSettings]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: "dark" | "light") => {
      root.classList.remove("theme-light", "theme-dark");
      root.classList.add(mode === "light" ? "theme-light" : "theme-dark");
    };
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      apply(mq.matches ? "light" : "dark");
      const onChange = (e: MediaQueryListEvent) => apply(e.matches ? "light" : "dark");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    apply(settings.theme);
    return undefined;
  }, [settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    const safeSize = Math.max(8, Math.min(72, settings.editorFontSize || 14));
    root.style.setProperty("--editor-font-size", `${safeSize}px`);
    root.style.setProperty(
      "--editor-font-family",
      settings.editorFontFamily || "inherit",
    );
  }, [settings.editorFontSize, settings.editorFontFamily]);

  const providersQuery = useQuery({
    queryKey: ["providers"],
    queryFn: () => providerApi.list(),
    enabled: settingsQuery.isSuccess,
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectApi.list(),
    enabled: providersQuery.isSuccess,
  });

  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    if (settings.onboardingCompleted) {
      setOnboarded(true);
    } else if (providersQuery.data && projectsQuery.data) {
      if (providersQuery.data.length > 0 && projectsQuery.data.length > 0) {
        setOnboarded(true);
      }
    }
  }, [providersQuery.data, projectsQuery.data, settings.onboardingCompleted]);

  const loading =
    !settingsLoaded ||
    providersQuery.isLoading ||
    projectsQuery.isLoading ||
    settingsQuery.isLoading;

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col">
        <TitleBar />
        <div className="flex flex-1 items-center justify-center text-ink-300">
          <div className="animate-pulse">正在打开 InkForge…</div>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return (
      <ErrorBoundary label="Onboarding" lang={lang}>
        <div className="flex h-full w-full flex-col">
          <TitleBar />
          <div className="min-h-0 flex-1">
            <OnboardingPage onFinish={() => setOnboarded(true)} />
          </div>
        </div>
        <SettingsDrawer />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary label="InkForge" lang={lang}>
      <div className="flex h-full w-full flex-col">
        <TitleBar />
        <CrashRecoveryBanner />
        <ReminderToast />
        <AchievementToast />
        <div className="flex min-h-0 flex-1">
          <ErrorBoundary label="ActivityBar" lang={lang}>
            <ActivityBar />
          </ErrorBoundary>
          <div className="flex min-w-0 flex-1 flex-col">
            <ErrorBoundary label={mainView} lang={lang}>
              {mainView === "writing" && <WorkspacePage />}
              {mainView === "skill" && <SkillPage />}
              {mainView === "character" && <CharacterPage />}
              {mainView === "tavern" && <TavernPage />}
              {mainView === "world" && <WorldPage />}
              {mainView === "research" && <ResearchPage />}
              {mainView === "review" && <ReviewPage />}
              {mainView === "bookshelf" && <BookshelfPage />}
              {mainView === "achievement" && <AchievementHallPage />}
              {mainView === "letters" && <LetterInboxPage />}
              {mainView === "outline" && <OutlinePage />}
            </ErrorBoundary>
          </div>
        </div>
        {settings.companionEnabled && <CompanionMount projectId={currentProjectId ?? null} />}
        <SettingsDrawer />
      </div>
    </ErrorBoundary>
  );
}

/**
 * Companion 包装：根据 currentProjectId 拉今日字数判断是否达成日目标。
 * 抽离避免 App 组件下方再加一个 useQuery 让顶层代码冗长。
 */
function CompanionMount({ projectId }: { projectId: string | null }): JSX.Element {
  const dailyQuery = useQuery({
    queryKey: ["daily-progress", projectId],
    queryFn: () => dailyApi.progress({ projectId: projectId ?? "" }),
    enabled: !!projectId,
    refetchInterval: 30_000,
  });
  const dailyAchieved = (() => {
    const r = dailyQuery.data;
    if (!r) return false;
    return r.goalHit;
  })();
  return <Companion dailyAchieved={dailyAchieved} />;
}
