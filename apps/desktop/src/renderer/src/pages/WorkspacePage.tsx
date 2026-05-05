import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChapterRecord } from "@inkforge/shared";
import { chapterApi, fsApi, llmApi, projectApi, providerApi, settingsApi } from "../lib/api";
import { useAppStore } from "../stores/app-store";
import { useAppShortcuts } from "../lib/use-app-shortcuts";
import { EditorPane } from "../components/EditorPane";
import { ChapterTree } from "../components/ChapterTree";
import { AITimeline } from "../components/AITimeline";
import { ChatPanel } from "../components/ChatPanel";
import { TerminalPanel } from "../components/TerminalPanel";
import { StatusBar } from "../components/StatusBar";
import { ProviderSwitcher } from "../components/ProviderSwitcher";
import { ProviderSettingsPanel } from "../components/ProviderSettingsPanel";
import { ExportDialog } from "../components/ExportDialog";

export function WorkspacePage(): JSX.Element {
  const queryClient = useQueryClient();
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setProject = useAppStore((s) => s.setProject);
  const setChapter = useAppStore((s) => s.setChapter);
  const currentChapterId = useAppStore((s) => s.currentChapterId);
  const upsertStreaming = useAppStore((s) => s.upsertStreaming);
  const finishAnalysis = useAppStore((s) => s.finishAnalysis);
  const openSettings = useAppStore((s) => s.openSettings);
  const openProviderPanel = useAppStore((s) => s.openProviderPanel);
  const pageProjectSwitcher = useAppStore((s) => s.settings.pageProjectSwitcher);
  const rightPanel = useAppStore((s) => s.rightPanel);
  const setRightPanel = useAppStore((s) => s.setRightPanel);
  const terminalOpen = useAppStore((s) => s.terminalOpen);
  const terminalHeight = useAppStore((s) => s.terminalHeight);
  const toggleTerminal = useAppStore((s) => s.toggleTerminal);
  const setTerminalHeight = useAppStore((s) => s.setTerminalHeight);
  const setSettings = useAppStore((s) => s.setSettings);
  const settings = useAppStore((s) => s.settings);

  const [exportOpen, setExportOpen] = useState(false);
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => projectApi.list() });
  const providersQuery = useQuery({ queryKey: ["providers"], queryFn: () => providerApi.list() });

  const resolvedProjectId = currentProjectId ?? projectsQuery.data?.[0]?.id ?? null;

  useEffect(() => {
    if (!currentProjectId && projectsQuery.data && projectsQuery.data.length > 0) {
      setProject(projectsQuery.data[0].id);
    }
  }, [currentProjectId, projectsQuery.data, setProject]);

  const chaptersQuery = useQuery<ChapterRecord[]>({
    queryKey: ["chapters", resolvedProjectId],
    queryFn: () =>
      resolvedProjectId ? chapterApi.list({ projectId: resolvedProjectId }) : Promise.resolve([]),
    enabled: !!resolvedProjectId,
  });

  const chapters = useMemo(() => chaptersQuery.data ?? [], [chaptersQuery.data]);
  const currentChapter = useMemo(
    () => chapters.find((c) => c.id === currentChapterId) ?? null,
    [chapters, currentChapterId],
  );

  useEffect(() => {
    if (chapters.length === 0) return;
    if (!currentChapterId || !chapters.some((c) => c.id === currentChapterId)) {
      setChapter(chapters[0].id);
    }
  }, [chapters, currentChapterId, setChapter]);

  useEffect(() => {
    const offChunk = llmApi.onChunk((payload) => {
      upsertStreaming({
        analysisId: payload.analysisId,
        projectId: payload.projectId,
        chapterId: payload.chapterId,
        providerId: payload.providerId,
        status: "streaming",
        accumulatedText: payload.accumulatedText,
        startedAt: payload.emittedAt,
      });
    });
    const offDone = llmApi.onDone((payload) => {
      finishAnalysis(payload.analysisId, payload.status, {
        feedback: payload.feedback,
        error: payload.error,
        providerId: payload.providerId,
      });
    });
    return () => {
      offChunk();
      offDone();
    };
  }, [upsertStreaming, finishAnalysis]);

  // Auto-activate first provider if none set yet.
  useEffect(() => {
    const providers = providersQuery.data ?? [];
    if (!settings.activeProviderId && providers.length > 0) {
      settingsApi.set({ updates: { activeProviderId: providers[0].id } }).then(setSettings).catch(() => {});
    }
  }, [providersQuery.data, settings.activeProviderId, setSettings]);

  const createChapter = useMutation({
    mutationFn: async () => {
      if (!resolvedProjectId) throw new Error("No project selected");
      const n = chapters.length + 1;
      return chapterApi.create({
        projectId: resolvedProjectId,
        title: `第 ${n} 章`,
        filePath: `chapters/chapter-${String(n).padStart(2, "0")}.md`,
        order: n,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["chapters", resolvedProjectId] });
      setChapter(created.id);
    },
  });

  const renameChapter = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chapterApi.update({ id, title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chapters", resolvedProjectId] });
    },
  });

  const deleteChapter = useMutation({
    mutationFn: (id: string) => chapterApi.delete({ id }),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["chapters", resolvedProjectId] });
      if (currentChapterId === id) setChapter(null);
    },
  });

  const reorderChapters = useMutation({
    mutationFn: (orderedIds: string[]) => {
      if (!resolvedProjectId) throw new Error("no project");
      return chapterApi.reorder({ projectId: resolvedProjectId, orderedIds });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chapters", resolvedProjectId] });
    },
  });

  const importMd = useMutation({
    mutationFn: async () => {
      if (!resolvedProjectId) throw new Error("no project");
      const picked = await fsApi.pickFile({
        title: "选择要导入的 Markdown 文件",
      });
      if (!picked.path || picked.content === null) return null;
      return chapterApi.importMd({
        projectId: resolvedProjectId,
        title: picked.fileName?.replace(/\.(md|markdown|txt)$/i, ""),
        content: picked.content,
      });
    },
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: ["chapters", resolvedProjectId] });
      if (record) setChapter(record.id);
    },
  });

  const switchProject = useMutation({
    mutationFn: async (id: string) => projectApi.open({ id }),
    onSuccess: async (project) => {
      setProject(project.id);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["chapters", project.id] });
    },
  });

  const setMainView = useAppStore((s) => s.setMainView);

  useAppShortcuts({
    onNewChapter: () => createChapter.mutate(),
    onOpenSettings: () => openSettings(true),
    onOpenProviders: () => openProviderPanel(true),
    onToggleTerminal: () => toggleTerminal(),
    onSwitchMainView: (v) => setMainView(v),
  });

  const resolvedProject = projectsQuery.data?.find((p) => p.id === resolvedProjectId) ?? null;

  return (
    <div className="flex h-full w-full flex-col bg-ink-900 text-ink-100">
      <header className="flex items-center justify-between border-b border-ink-700 bg-ink-800/70 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-amber-300">墨炉</span>
          {pageProjectSwitcher && (
            <select
              className="max-w-xs rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-sm text-ink-200 focus:border-amber-500 focus:outline-none"
              value={resolvedProjectId ?? ""}
              onChange={(e) => switchProject.mutate(e.target.value)}
            >
              {(projectsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
            ))}
            </select>
          )}
          {resolvedProject && (
            <span className="text-xs text-ink-400">目标 {resolvedProject.dailyGoal} 字/日</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ProviderSwitcher providers={providersQuery.data ?? []} />
          <button
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              terminalOpen
                ? "border-amber-500/60 bg-amber-500/20 text-amber-200"
                : "border-ink-600 text-ink-300 hover:bg-ink-700"
            }`}
            onClick={() => toggleTerminal()}
            title="切换终端 (Ctrl+`)"
          >
            终端
          </button>
          <button
            className="rounded-md border border-ink-600 px-2 py-1 text-xs text-ink-300 hover:bg-ink-700"
            onClick={() => setExportOpen(true)}
            disabled={!currentProjectId}
            title="导入 / 导出"
          >
            导出
          </button>
          <button
            className="rounded-md border border-ink-600 px-2 py-1 text-xs text-ink-300 hover:bg-ink-700"
            onClick={() => openSettings(true)}
            title="设置 (Ctrl+,)"
          >
            设置
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col border-r border-ink-700 bg-ink-800/40">
          <ChapterTree
            chapters={chapters}
            currentChapterId={currentChapterId}
            onSelect={setChapter}
            onCreate={() => createChapter.mutate()}
            onRename={(id, title) => renameChapter.mutate({ id, title })}
            onDelete={(id) => deleteChapter.mutate(id)}
            onReorder={(ids) => reorderChapters.mutate(ids)}
            onImportMd={() => importMd.mutate()}
            creating={createChapter.isPending}
            importing={importMd.isPending}
          />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <EditorPane chapter={currentChapter} providers={providersQuery.data ?? []} />
        </section>

        <aside className="flex w-96 shrink-0 flex-col border-l border-ink-700 bg-ink-800/40">
          <div className="flex shrink-0 border-b border-ink-700 text-xs">
            <button
              className={`flex-1 py-2 transition-colors ${
                rightPanel === "timeline"
                  ? "border-b-2 border-amber-500 text-amber-300"
                  : "text-ink-400 hover:text-ink-200"
              }`}
              onClick={() => setRightPanel("timeline")}
            >
              AI 时间线
            </button>
            <button
              className={`flex-1 py-2 transition-colors ${
                rightPanel === "chat"
                  ? "border-b-2 border-amber-500 text-amber-300"
                  : "text-ink-400 hover:text-ink-200"
              }`}
              onClick={() => setRightPanel("chat")}
            >
              聊天助手
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {rightPanel === "timeline" ? <AITimeline /> : <ChatPanel />}
          </div>
        </aside>
      </main>

      {terminalOpen && (
        <TerminalPanel
          height={terminalHeight}
          onClose={() => toggleTerminal(false)}
          onResizeDrag={(delta) => setTerminalHeight(terminalHeight + delta)}
        />
      )}

      <StatusBar />
      <ProviderSettingsPanel />
      {currentProjectId ? (
        <ExportDialog
          projectId={currentProjectId}
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ["chapters"] })}
        />
      ) : null}
    </div>
  );
}
