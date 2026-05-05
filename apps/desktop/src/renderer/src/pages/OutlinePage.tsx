import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChapterGenerateFromOutlineResponse,
  OutlineCardRecord,
  ProjectRecord,
} from "@inkforge/shared";
import { chapterGenApi, outlineApi, outlineGenApi, projectApi } from "../lib/api";
import { useAppStore } from "../stores/app-store";
import { ProjectSwitcher } from "../components/ProjectSwitcher";

interface ProjectMetaDraft {
  synopsis: string;
  genre: string;
  subGenre: string;
  tags: string;          // CSV input
}

export function OutlinePage(): JSX.Element {
  const projectId = useAppStore((s) => s.currentProjectId);
  const pageProjectSwitcher = useAppStore((s) => s.settings.pageProjectSwitcher);
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ["projects-list-for-outline"],
    queryFn: () => projectApi.list(),
  });
  const project: ProjectRecord | undefined = useMemo(
    () => projectsQuery.data?.find((p) => p.id === projectId),
    [projectsQuery.data, projectId],
  );

  const cardsQuery = useQuery({
    queryKey: ["outline-cards", projectId],
    queryFn: () => projectId ? outlineApi.list({ projectId }) : Promise.resolve([]),
    enabled: !!projectId,
  });

  const projectLevelCards = useMemo(
    () => (cardsQuery.data ?? []).filter((c) => c.chapterId === null).sort((a, b) => a.order - b.order),
    [cardsQuery.data],
  );

  const [metaOpen, setMetaOpen] = useState(false);
  const [metaDraft, setMetaDraft] = useState<ProjectMetaDraft>({
    synopsis: "", genre: "", subGenre: "", tags: "",
  });
  const [busy, setBusy] = useState<null | "master" | "chapters" | "refine-master" | string /* refine-card-<id> */>(null);
  const [error, setError] = useState<string | null>(null);
  const [refineIntent, setRefineIntent] = useState("");
  const [cardRefineIntents, setCardRefineIntents] = useState<Record<string, string>>({});
  const [cardUndoSnapshots, setCardUndoSnapshots] = useState<Record<string, string>>({});
  const [genTargetCount, setGenTargetCount] = useState(12);
  const [chapterDraft, setChapterDraft] = useState<{
    cardId: string;
    cardTitle: string;
    candidates: ChapterGenerateFromOutlineResponse["candidates"];
  } | null>(null);
  const [candidateCount, setCandidateCount] = useState<1 | 2 | 3>(1);

  // Sync meta draft when project changes
  useEffect(() => {
    if (project) {
      setMetaDraft({
        synopsis: project.synopsis,
        genre: project.genre,
        subGenre: project.subGenre,
        tags: project.tags.join(", "),
      });
    }
  }, [project?.id]);

  const updateMeta = useMutation({
    mutationFn: outlineGenApi.updateProjectMeta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-list-for-outline"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const undoRefine = useMutation({
    mutationFn: outlineGenApi.undoRefine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-list-for-outline"] });
    },
  });

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center bg-ink-900/60 text-ink-300">
        <div className="max-w-md rounded-lg border border-ink-700 bg-ink-800/60 p-6 text-center">
          <div className="mb-2 text-lg text-amber-300">📋 大纲生成</div>
          <p className="text-sm">请先选择或创建一个项目。</p>
        </div>
      </div>
    );
  }
  if (!project) return <div className="p-6 text-ink-400">加载项目元数据…</div>;

  const handleSaveMeta = async () => {
    setBusy("master");
    try {
      await updateMeta.mutateAsync({
        projectId,
        synopsis: metaDraft.synopsis.trim(),
        genre: metaDraft.genre.trim(),
        subGenre: metaDraft.subGenre.trim(),
        tags: metaDraft.tags.split(/[,，、\n]/).map((t) => t.trim()).filter(Boolean),
      });
      setMetaOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleGenerateMaster = async () => {
    setBusy("master");
    setError(null);
    try {
      await outlineGenApi.generateMaster({ projectId });
      queryClient.invalidateQueries({ queryKey: ["projects-list-for-outline"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleGenerateChapters = async () => {
    setBusy("chapters");
    setError(null);
    try {
      await outlineGenApi.generateChapters({ projectId, targetCount: genTargetCount, replaceExisting: true });
      queryClient.invalidateQueries({ queryKey: ["outline-cards"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleRefineMaster = async () => {
    if (!refineIntent.trim()) return;
    setBusy("refine-master");
    setError(null);
    try {
      await outlineGenApi.refine({
        target: { kind: "master", projectId },
        intent: refineIntent.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["projects-list-for-outline"] });
      setRefineIntent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleUndoMaster = async () => {
    setBusy("refine-master");
    try {
      await undoRefine.mutateAsync({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleRefineCard = async (card: OutlineCardRecord) => {
    const intent = cardRefineIntents[card.id]?.trim();
    if (!intent) return;
    setBusy(`refine-card-${card.id}`);
    setError(null);
    try {
      // Save current content for undo before mutating
      setCardUndoSnapshots((prev) => ({ ...prev, [card.id]: card.content }));
      await outlineGenApi.refine({
        target: { kind: "card", cardId: card.id },
        intent,
      });
      queryClient.invalidateQueries({ queryKey: ["outline-cards"] });
      setCardRefineIntents((prev) => ({ ...prev, [card.id]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleUndoCard = async (card: OutlineCardRecord) => {
    const snap = cardUndoSnapshots[card.id];
    if (!snap) return;
    await outlineApi.update({ id: card.id, content: snap });
    setCardUndoSnapshots((prev) => {
      const next = { ...prev };
      delete next[card.id];
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["outline-cards"] });
  };

  const handleGenerateChapter = async (card: OutlineCardRecord) => {
    setBusy(`gen-chapter-${card.id}`);
    setError(null);
    try {
      // Optional: pick prev card's chapter as continuity context
      const idx = projectLevelCards.findIndex((c) => c.id === card.id);
      const prev = idx > 0 ? projectLevelCards[idx - 1] : null;
      const res = await chapterGenApi.fromOutline({
        projectId,
        outlineCardId: card.id,
        candidates: candidateCount,
        prevChapterId: prev?.chapterId ?? undefined,
      });
      setChapterDraft({
        cardId: card.id,
        cardTitle: res.outlineTitle,
        candidates: res.candidates,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleAdoptCandidate = async (text: string) => {
    if (!chapterDraft) return;
    try {
      await chapterGenApi.commitDraft({
        projectId,
        text,
        title: chapterDraft.cardTitle,
        outlineCardId: chapterDraft.cardId,
      });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({ queryKey: ["outline-cards"] });
      setChapterDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-ink-900 text-ink-100">
      <header className="flex shrink-0 items-center gap-3 border-b border-ink-700 px-4 py-3">
        <h1 className="text-base font-semibold">📋 {project.name} · 大纲生成</h1>
        {pageProjectSwitcher && <ProjectSwitcher variant="inline" />}
        <button
          className="ml-auto rounded-md border border-ink-600 px-3 py-1 text-xs hover:bg-ink-700"
          onClick={() => setMetaOpen(true)}
        >
          {project.synopsis || project.genre ? "编辑项目设定" : "+ 填写项目设定"}
        </button>
      </header>

      {error ? (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {error}
          <button className="ml-2 text-ink-400 hover:text-ink-200" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      ) : null}

      <main className="flex flex-1 overflow-hidden">
        {/* Left: master outline */}
        <section className="w-1/2 shrink-0 overflow-y-auto border-r border-ink-700 p-4">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold">总大纲</h2>
            <button
              className="ml-auto rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-ink-900 hover:bg-amber-400 disabled:opacity-50"
              disabled={busy !== null || (!project.synopsis && !project.genre && project.tags.length === 0)}
              onClick={handleGenerateMaster}
            >
              {busy === "master" ? "生成中…" : project.masterOutline ? "重新生成" : "AI 生成总大纲"}
            </button>
          </div>

          {project.masterOutline ? (
            <pre className="whitespace-pre-wrap rounded-md border border-ink-700 bg-ink-900/40 p-3 text-xs leading-6 text-ink-200">
              {project.masterOutline}
            </pre>
          ) : (
            <p className="rounded-md border border-dashed border-ink-700 p-4 text-xs text-ink-500">
              尚未生成总大纲。点击右上「+ 填写项目设定」补全梗概/类型/标签后，再点「AI 生成总大纲」。
            </p>
          )}

          {project.masterOutline ? (
            <div className="mt-4 space-y-2 rounded-md border border-ink-700 p-3">
              <h3 className="text-xs font-medium text-ink-300">优化总大纲</h3>
              <textarea
                className="h-16 w-full resize-y rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs"
                placeholder="例：节奏太快，开端要更慢；删去 X 角色的支线"
                value={refineIntent}
                onChange={(e) => setRefineIntent(e.target.value)}
                maxLength={500}
              />
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-ink-900 hover:bg-amber-400 disabled:opacity-50"
                  disabled={busy !== null || !refineIntent.trim()}
                  onClick={handleRefineMaster}
                >
                  {busy === "refine-master" ? "优化中…" : "AI 优化"}
                </button>
                {project.preRefineMasterOutline ? (
                  <button
                    className="rounded-md border border-ink-600 px-3 py-1 text-xs hover:bg-ink-700 disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={handleUndoMaster}
                  >
                    撤销最近优化
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {/* Right: chapter outline cards */}
        <section className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-ink-700 p-3">
            <h2 className="text-sm font-semibold">章节大纲卡 ({projectLevelCards.length})</h2>
            <label className="ml-auto flex items-center gap-1 text-xs text-ink-400">
              目标章数
              <input
                type="number"
                min={3}
                max={50}
                step={1}
                className="w-14 rounded-md border border-ink-600 bg-ink-900 px-2 py-0.5 text-xs"
                value={genTargetCount}
                onChange={(e) => setGenTargetCount(Number(e.target.value) || 12)}
              />
            </label>
            <button
              className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-ink-900 hover:bg-amber-400 disabled:opacity-50"
              disabled={busy !== null || !project.masterOutline}
              onClick={handleGenerateChapters}
              title={!project.masterOutline ? "先生成总大纲" : undefined}
            >
              {busy === "chapters" ? "拆分中…" : "AI 拆分章节"}
            </button>
            <label className="ml-2 flex items-center gap-1 text-xs text-ink-400" title="生成正文时并发候选数">
              候选
              <select
                className="rounded border border-ink-600 bg-ink-900 px-1 py-0.5 text-xs text-ink-100"
                value={candidateCount}
                onChange={(e) => setCandidateCount(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {projectLevelCards.length === 0 ? (
              <p className="rounded-md border border-dashed border-ink-700 p-4 text-xs text-ink-500">
                尚无章节大纲卡。生成总大纲后点击「AI 拆分章节」。
              </p>
            ) : (
              projectLevelCards.map((card) => (
                <div key={card.id} className="rounded-md border border-ink-700 bg-ink-900/40 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-medium">{card.title}</h3>
                    {card.chapterId ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">已写</span>
                    ) : null}
                    <button
                      className="ml-auto rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-medium text-ink-900 hover:bg-amber-400 disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => handleGenerateChapter(card)}
                    >
                      {busy === `gen-chapter-${card.id}` ? "生成中…" : `AI 写本章 ×${candidateCount}`}
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-6 text-ink-300">{card.content || "（空）"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs"
                      placeholder="优化此章意图（如：增强紧迫感）"
                      value={cardRefineIntents[card.id] ?? ""}
                      onChange={(e) =>
                        setCardRefineIntents((prev) => ({ ...prev, [card.id]: e.target.value }))
                      }
                    />
                    <button
                      className="rounded-md border border-ink-600 px-2 py-1 text-[11px] hover:bg-ink-700 disabled:opacity-50"
                      disabled={busy !== null || !(cardRefineIntents[card.id]?.trim())}
                      onClick={() => handleRefineCard(card)}
                    >
                      {busy === `refine-card-${card.id}` ? "优化中…" : "优化"}
                    </button>
                    {cardUndoSnapshots[card.id] ? (
                      <button
                        className="rounded-md border border-ink-600 px-2 py-1 text-[11px] hover:bg-ink-700"
                        onClick={() => handleUndoCard(card)}
                      >
                        撤销
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Project meta dialog */}
      {metaOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-8"
          role="dialog"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMetaOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-ink-600 bg-ink-800 p-6 shadow-2xl">
            <h2 className="mb-3 text-base font-semibold">项目设定</h2>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-ink-400">主类型（如 玄幻 / 都市 / 科幻 / 言情）</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm"
                  value={metaDraft.genre}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, genre: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs text-ink-400">子类型（如 修仙 / 末世 / 校园）</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm"
                  value={metaDraft.subGenre}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, subGenre: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs text-ink-400">标签（用逗号分隔）</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm"
                  value={metaDraft.tags}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, tags: e.target.value }))}
                  placeholder="爽文, 双男主, 悬疑"
                />
              </label>
              <label className="block">
                <span className="text-xs text-ink-400">梗概（200-500 字最佳）</span>
                <textarea
                  className="mt-1 h-32 w-full resize-y rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm leading-6"
                  value={metaDraft.synopsis}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, synopsis: e.target.value }))}
                  placeholder="主角 X 在 Y 世界遭遇 Z..."
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="rounded-md bg-amber-500 px-3 py-1 text-sm font-medium text-ink-900 hover:bg-amber-400 disabled:opacity-50"
                disabled={busy !== null}
                onClick={handleSaveMeta}
              >
                {busy === "master" ? "保存中…" : "保存"}
              </button>
              <button
                className="rounded-md border border-ink-600 px-3 py-1 text-sm hover:bg-ink-700"
                onClick={() => setMetaOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Candidate picker for chapter generation */}
      {chapterDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" role="dialog">
          <div className="flex max-h-[88vh] w-full max-w-6xl flex-col rounded-2xl border border-ink-600 bg-ink-800 p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-base font-semibold">选择候选 · {chapterDraft.cardTitle}</h2>
              <span className="text-xs text-ink-400">{chapterDraft.candidates.length} 个候选</span>
              <button
                className="ml-auto rounded px-2 py-1 text-sm text-ink-300 hover:bg-ink-700"
                onClick={() => setChapterDraft(null)}
              >
                ✕
              </button>
            </div>
            <div className={`grid flex-1 gap-3 overflow-y-auto ${chapterDraft.candidates.length === 1 ? "grid-cols-1" : chapterDraft.candidates.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {chapterDraft.candidates.map((c, i) => (
                <div key={i} className="flex flex-col rounded-md border border-ink-700 bg-ink-900/40">
                  <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2 text-xs text-ink-400">
                    <span className="font-medium text-ink-200">候选 {i + 1}</span>
                    <span>{Array.from(c.text).filter((ch) => /\S/.test(ch)).length} 字</span>
                    <span className="ml-auto">{(c.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                  <pre className="flex-1 overflow-y-auto whitespace-pre-wrap p-3 text-xs leading-6 text-ink-100">
                    {c.text}
                  </pre>
                  <div className="flex gap-2 border-t border-ink-700 p-2">
                    <button
                      className="flex-1 rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-ink-900 hover:bg-amber-400"
                      onClick={() => handleAdoptCandidate(c.text)}
                    >
                      采用此版本
                    </button>
                    <button
                      className="rounded-md border border-ink-600 px-2 py-1 text-xs hover:bg-ink-700"
                      onClick={() => navigator.clipboard.writeText(c.text)}
                    >
                      复制
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
