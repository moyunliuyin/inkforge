import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type {
  ChapterRecord,
  NovelCharacterRecord,
  WorldEntryRecord,
  WorldGraphEndpointKind,
  WorldRelationshipRecord,
  WorldRelationshipSaveInput,
  WorldTimelineAction,
  WorldTimelineEventRecord,
  WorldTimelineSaveInput,
} from "@inkforge/shared";
import {
  chapterApi,
  novelCharacterApi,
  worldApi,
  worldExtractApi,
  worldRelationshipApi,
  worldTimelineApi,
} from "../../lib/api";

interface NebulaNode {
  id: string;
  kind: WorldGraphEndpointKind;
  label: string;
  category?: string;
  color: string;
  size: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface NebulaLink {
  source: string | NebulaNode;
  target: string | NebulaNode;
  relId: string;
  label: string | null;
  weight: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  place: "#7c3aed",
  item: "#f59e0b",
  faction: "#ef4444",
  event: "#06b6d4",
  concept: "#8b5cf6",
  organization: "#ec4899",
};

function makeNodeId(kind: WorldGraphEndpointKind, id: string): string {
  return `${kind}:${id}`;
}

function categoryColor(category?: string): string {
  if (!category) return "#475569";
  return CATEGORY_COLOR[category] ?? "#475569";
}

interface WorldNebulaGraphProps {
  projectId: string;
}

export function WorldNebulaGraph({ projectId }: WorldNebulaGraphProps): JSX.Element {
  const queryClient = useQueryClient();
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const charactersQuery = useQuery({
    queryKey: ["novel-characters", projectId],
    queryFn: () => novelCharacterApi.list({ projectId }),
  });
  const worldsQuery = useQuery({
    queryKey: ["world-entries", projectId],
    queryFn: () => worldApi.list({ projectId }),
  });
  const relationshipsQuery = useQuery({
    queryKey: ["world-relationships", projectId],
    queryFn: () => worldRelationshipApi.list({ projectId }),
  });

  const chaptersQuery = useQuery({
    queryKey: ["chapters", projectId],
    queryFn: () => chapterApi.list({ projectId }),
  });

  const timelineQuery = useQuery({
    queryKey: ["world-timeline", projectId],
    queryFn: () => worldTimelineApi.list({ projectId }),
  });

  const saveMutation = useMutation({
    mutationFn: (input: WorldRelationshipSaveInput) => worldRelationshipApi.save(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["world-relationships", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => worldRelationshipApi.delete({ id }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["world-relationships", projectId] }),
  });

  const timelineSaveMutation = useMutation({
    mutationFn: (input: WorldTimelineSaveInput) => worldTimelineApi.save(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["world-timeline", projectId] }),
  });

  const timelineDeleteMutation = useMutation({
    mutationFn: (id: string) => worldTimelineApi.delete({ id }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["world-timeline", projectId] }),
  });

  const extractMutation = useMutation({
    mutationFn: () => worldExtractApi.run({ projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novel-characters", projectId] });
      queryClient.invalidateQueries({ queryKey: ["world-entries", projectId] });
      queryClient.invalidateQueries({ queryKey: ["world-relationships", projectId] });
    },
  });

  const [extractResult, setExtractResult] = useState<{
    charactersInserted: number;
    entriesInserted: number;
    relationshipsInserted: number;
    bookCharsUsed: number;
    bookCharsTotal: number;
  } | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (extractMutation.isPending) return;
    if (!confirm(
      "将调用 LLM 扫描全书并抽取人物 / 世界条目 / 关系。\n" +
        "已存在的（按名字匹配）会跳过，仅新增。\n" +
        "继续？",
    )) return;
    setExtractError(null);
    setExtractResult(null);
    try {
      const r = await extractMutation.mutateAsync();
      setExtractResult({
        charactersInserted: r.charactersInserted,
        entriesInserted: r.entriesInserted,
        relationshipsInserted: r.relationshipsInserted,
        bookCharsUsed: r.bookCharsUsed,
        bookCharsTotal: r.bookCharsTotal,
      });
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : String(e));
    }
  };

  const [pendingSrcId, setPendingSrcId] = useState<string | null>(null);
  const [edgeForm, setEdgeForm] = useState<{
    src: { kind: WorldGraphEndpointKind; id: string; label: string };
    dst: { kind: WorldGraphEndpointKind; id: string; label: string };
  } | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NebulaLink | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editWeight, setEditWeight] = useState(5);

  const [chapterIdx, setChapterIdx] = useState(0);
  const [innerIdx, setInnerIdx] = useState(100);
  const [timelineNode, setTimelineNode] = useState<{
    kind: WorldGraphEndpointKind;
    id: string;
    label: string;
  } | null>(null);

  const chapters = chaptersQuery.data ?? [];
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters],
  );
  const maxChapterOrder = sortedChapters.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const characters = charactersQuery.data ?? [];
    const worldEntries = worldsQuery.data ?? [];
    const relationships = relationshipsQuery.data ?? [];
    const timelineEvents = timelineQuery.data ?? [];

    const nodes: NebulaNode[] = [
      ...characters.map((c: NovelCharacterRecord) => ({
        id: makeNodeId("character", c.id),
        kind: "character" as const,
        label: c.name,
        color: "#3b82f6",
        size: 8,
      })),
      ...worldEntries.map((w: WorldEntryRecord) => ({
        id: makeNodeId("world_entry", w.id),
        kind: "world_entry" as const,
        label: w.title,
        category: w.category,
        color: categoryColor(w.category),
        size: 6,
      })),
    ];

    const links: NebulaLink[] = relationships.map((r: WorldRelationshipRecord) => ({
      source: makeNodeId(r.srcKind, r.srcId),
      target: makeNodeId(r.dstKind, r.dstId),
      relId: r.id,
      label: r.label,
      weight: r.weight,
    }));

    // Compute ownership at current scrubber position; add ephemeral edges
    const events = [...timelineEvents]
      .filter(
        (e) =>
          e.chapterOrder < chapterIdx ||
          (e.chapterOrder === chapterIdx && e.innerOrder <= innerIdx),
      )
      .sort((a, b) =>
        a.chapterOrder !== b.chapterOrder
          ? a.chapterOrder - b.chapterOrder
          : a.innerOrder - b.innerOrder,
      );
    const owner = new Map<string, { kind: WorldGraphEndpointKind; id: string } | null>();
    for (const e of events) {
      const k = makeNodeId(e.entryKind, e.entryId);
      if (e.action === "destroy") owner.set(k, null);
      else if (e.ownerKind && e.ownerId)
        owner.set(k, { kind: e.ownerKind, id: e.ownerId });
      else owner.set(k, null);
    }
    let synthetic = 0;
    for (const [entryNodeId, ow] of owner) {
      if (!ow) continue;
      const ownerNodeId = makeNodeId(ow.kind, ow.id);
      const exists = links.some(
        (l) =>
          (typeof l.source === "string" ? l.source : l.source.id) === ownerNodeId &&
          (typeof l.target === "string" ? l.target : l.target.id) === entryNodeId,
      );
      if (exists) continue;
      links.push({
        source: ownerNodeId,
        target: entryNodeId,
        relId: `__synthetic_${synthetic++}`,
        label: "持有",
        weight: 6,
      });
    }

    return { nodes, links };
  }, [
    charactersQuery.data,
    worldsQuery.data,
    relationshipsQuery.data,
    timelineQuery.data,
    chapterIdx,
    innerIdx,
  ]);

  const handleNodeClick = useCallback(
    (node: NebulaNode) => {
      setSelectedEdge(null);
      if (!pendingSrcId) {
        setPendingSrcId(node.id);
        return;
      }
      if (pendingSrcId === node.id) {
        setPendingSrcId(null);
        return;
      }
      const src = graphData.nodes.find((n) => n.id === pendingSrcId);
      if (!src) {
        setPendingSrcId(null);
        return;
      }
      setEdgeForm({
        src: { kind: src.kind, id: src.id.split(":")[1], label: src.label },
        dst: { kind: node.kind, id: node.id.split(":")[1], label: node.label },
      });
      setEditLabel("");
      setEditWeight(5);
      setPendingSrcId(null);
    },
    [pendingSrcId, graphData.nodes],
  );

  const handleLinkClick = useCallback((link: NebulaLink) => {
    setSelectedEdge(link);
    setEditLabel(link.label ?? "");
    setEditWeight(link.weight);
    setPendingSrcId(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setPendingSrcId(null);
    setSelectedEdge(null);
  }, []);

  const handleNodeDragEnd = useCallback((node: NebulaNode) => {
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const handleNodeRightClick = useCallback(
    (node: NebulaNode, event: MouseEvent) => {
      event.preventDefault();
      setTimelineNode({ kind: node.kind, id: node.id.split(":")[1], label: node.label });
    },
    [],
  );

  const handleSaveEdge = async () => {
    if (!edgeForm) return;
    await saveMutation.mutateAsync({
      projectId,
      srcKind: edgeForm.src.kind,
      srcId: edgeForm.src.id,
      dstKind: edgeForm.dst.kind,
      dstId: edgeForm.dst.id,
      label: editLabel || null,
      weight: editWeight,
    });
    setEdgeForm(null);
  };

  const handleUpdateEdge = async () => {
    if (!selectedEdge) return;
    const [srcKind, srcId] = (selectedEdge.source as NebulaNode).id.split(":");
    const [dstKind, dstId] = (selectedEdge.target as NebulaNode).id.split(":");
    await saveMutation.mutateAsync({
      id: selectedEdge.relId,
      projectId,
      srcKind: srcKind as WorldGraphEndpointKind,
      srcId,
      dstKind: dstKind as WorldGraphEndpointKind,
      dstId,
      label: editLabel || null,
      weight: editWeight,
    });
    setSelectedEdge(null);
  };

  const handleDeleteEdge = async () => {
    if (!selectedEdge) return;
    if (!confirm("确认删除这条关系？")) return;
    await deleteMutation.mutateAsync(selectedEdge.relId);
    setSelectedEdge(null);
  };

  const releasePinned = () => {
    graphData.nodes.forEach((n) => {
      const node = n as unknown as Record<string, unknown>;
      delete node.fx;
      delete node.fy;
    });
    fgRef.current?.d3ReheatSimulation();
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-ink-900">
      <ForceGraph2D
        ref={fgRef as never}
        graphData={graphData}
        width={size.width}
        height={size.height}
        backgroundColor="#0b1220"
        nodeRelSize={6}
        nodeLabel={(n) => (n as NebulaNode).label}
        nodeColor={(n) => (n as NebulaNode).color}
        linkColor={() => "#64748b"}
        linkWidth={(l) => 1 + (l as NebulaLink).weight * 0.3}
        linkLabel={(l) => (l as NebulaLink).label ?? ""}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.004}
        cooldownTicks={120}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        onNodeClick={handleNodeClick as never}
        onNodeRightClick={handleNodeRightClick as never}
        onLinkClick={handleLinkClick as never}
        onBackgroundClick={handleBackgroundClick}
        onNodeDragEnd={handleNodeDragEnd as never}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as NebulaNode;
          const r = n.size;
          const isPending = pendingSrcId === n.id;

          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = n.color;
          ctx.fill();

          if (isPending) {
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          const fontSize = Math.max(10, 12 / globalScale);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#e2e8f0";
          ctx.fillText(n.label, n.x ?? 0, (n.y ?? 0) + r + 2);
        }}
      />

      <div className="pointer-events-none absolute left-3 top-3 max-w-md text-[11px] text-ink-300">
        <div className="pointer-events-auto rounded-md border border-ink-700 bg-ink-800/80 px-3 py-2 shadow backdrop-blur">
          <div>
            点击节点 →{" "}
            {pendingSrcId ? (
              <span className="text-amber-300">
                选第二个节点建关系，或再点同节点取消
              </span>
            ) : (
              <span>选起点</span>
            )}
          </div>
          <div className="text-ink-500">点击边可编辑/删除；右键节点编辑时间线；拖动节点固定位置；空白处取消</div>
        </div>
      </div>

      <div className="absolute right-3 top-3 flex gap-2">
        <button
          className="pointer-events-auto rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
          onClick={handleExtract}
          disabled={extractMutation.isPending}
          title="调用 LLM 扫描全书，抽取人物 / 世界条目 / 关系（仅追加新的）"
        >
          {extractMutation.isPending ? "🤖 抽取中…" : "🤖 从全书提取"}
        </button>
        <button
          className="pointer-events-auto rounded-md border border-ink-600 bg-ink-800/80 px-3 py-1 text-xs text-ink-200 hover:bg-ink-700"
          onClick={releasePinned}
          title="解除所有节点固定位置"
        >
          🌀 重新发散
        </button>
      </div>

      {(extractResult || extractError) && (
        <div className="pointer-events-auto absolute right-3 top-12 w-[300px] rounded-md border border-ink-700 bg-ink-800/95 p-3 text-xs text-ink-100 shadow-lg">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">提取结果</span>
            <button
              onClick={() => {
                setExtractResult(null);
                setExtractError(null);
              }}
              className="text-ink-400 hover:text-ink-200"
            >
              ✕
            </button>
          </div>
          {extractError ? (
            <div className="text-red-300">失败：{extractError}</div>
          ) : extractResult ? (
            <div className="space-y-1 text-ink-300">
              <div>✓ 新增人物：{extractResult.charactersInserted}</div>
              <div>✓ 新增条目：{extractResult.entriesInserted}</div>
              <div>✓ 新增关系：{extractResult.relationshipsInserted}</div>
              <div className="pt-1 text-ink-500">
                {extractResult.bookCharsUsed < extractResult.bookCharsTotal
                  ? `仅扫描前 ${extractResult.bookCharsUsed} / ${extractResult.bookCharsTotal} 字（截断）`
                  : `扫描全书 ${extractResult.bookCharsTotal} 字`}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-3 bottom-3 rounded-lg border border-ink-700 bg-ink-800/85 p-3 text-[11px] text-ink-200 shadow backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-ink-400">时间轴 · 拖动查看物品归属变化</span>
          <span className="text-amber-300">
            {sortedChapters[chapterIdx - 1]?.title ?? (chapterIdx === 0 ? "起点（第 0 章前）" : `第 ${chapterIdx} 章`)}
            {" · "}
            章内 {innerIdx}/100
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-ink-500">章节</span>
          <input
            type="range"
            min={0}
            max={maxChapterOrder}
            step={1}
            value={chapterIdx}
            onChange={(e) => setChapterIdx(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-10 shrink-0 text-right text-ink-400">
            {chapterIdx}/{maxChapterOrder}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="w-12 shrink-0 text-ink-500">章内</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={innerIdx}
            onChange={(e) => setInnerIdx(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-10 shrink-0 text-right text-ink-400">{innerIdx}</span>
        </div>
      </div>

      {timelineNode && (
        <TimelineEditor
          projectId={projectId}
          node={timelineNode}
          chapters={sortedChapters}
          characters={charactersQuery.data ?? []}
          worldEntries={worldsQuery.data ?? []}
          events={(timelineQuery.data ?? []).filter(
            (e) => e.entryKind === timelineNode.kind && e.entryId === timelineNode.id,
          )}
          onSave={(input) => timelineSaveMutation.mutateAsync(input)}
          onDelete={(id) => timelineDeleteMutation.mutateAsync(id)}
          onClose={() => setTimelineNode(null)}
        />
      )}

      {edgeForm && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="w-[420px] rounded-lg border border-ink-700 bg-ink-800 p-5 text-sm text-ink-100 shadow-2xl">
            <h3 className="mb-3 text-base font-semibold">新建关系</h3>
            <div className="mb-3 text-xs text-ink-400">
              <span className="text-amber-300">{edgeForm.src.label}</span> →{" "}
              <span className="text-amber-300">{edgeForm.dst.label}</span>
            </div>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs text-ink-400">标签（可选）</span>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="例如：师徒 / 持有 / 居住于"
                className="w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1 focus:border-amber-500 focus:outline-none"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs text-ink-400">权重 ({editWeight})</span>
              <input
                type="range"
                min={1}
                max={10}
                value={editWeight}
                onChange={(e) => setEditWeight(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEdgeForm(null)}
                className="rounded-md border border-ink-600 px-3 py-1 text-xs hover:bg-ink-700"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdge}
                className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-ink-900 hover:bg-amber-400"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEdge && (
        <div className="absolute right-3 bottom-3 w-[320px] rounded-lg border border-ink-700 bg-ink-800 p-4 text-sm text-ink-100 shadow-2xl">
          <h3 className="mb-2 text-sm font-semibold">编辑关系</h3>
          <div className="mb-3 text-xs text-ink-400">
            <span>{(selectedEdge.source as NebulaNode).label}</span> →{" "}
            <span>{(selectedEdge.target as NebulaNode).label}</span>
          </div>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] text-ink-400">标签</span>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[11px] text-ink-400">权重 ({editWeight})</span>
            <input
              type="range"
              min={1}
              max={10}
              value={editWeight}
              onChange={(e) => setEditWeight(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleDeleteEdge}
              className="rounded-md border border-red-500/50 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
            >
              删除
            </button>
            <button
              onClick={() => setSelectedEdge(null)}
              className="rounded-md border border-ink-600 px-2 py-1 text-xs hover:bg-ink-700"
            >
              关闭
            </button>
            <button
              onClick={handleUpdateEdge}
              className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-ink-900 hover:bg-amber-400"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelineEditorProps {
  projectId: string;
  node: { kind: WorldGraphEndpointKind; id: string; label: string };
  chapters: ChapterRecord[];
  characters: NovelCharacterRecord[];
  worldEntries: WorldEntryRecord[];
  events: WorldTimelineEventRecord[];
  onSave: (input: WorldTimelineSaveInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onClose: () => void;
}

const ACTION_LABEL: Record<WorldTimelineAction, string> = {
  create: "出现",
  transfer: "易主",
  destroy: "销毁",
  modify: "状态变化",
};

function TimelineEditor({
  projectId,
  node,
  chapters,
  characters,
  worldEntries,
  events,
  onSave,
  onDelete,
  onClose,
}: TimelineEditorProps): JSX.Element {
  const [draft, setDraft] = useState<WorldTimelineSaveInput>(() => ({
    projectId,
    entryKind: node.kind,
    entryId: node.id,
    chapterId: chapters[0]?.id ?? null,
    chapterOrder: chapters[0]?.order ?? 0,
    innerOrder: 50,
    action: "transfer",
    ownerKind: null,
    ownerId: null,
    note: "",
  }));

  const ownerOptions = useMemo(() => {
    const opts: Array<{ kind: WorldGraphEndpointKind; id: string; label: string }> = [];
    characters.forEach((c) =>
      opts.push({ kind: "character", id: c.id, label: `👤 ${c.name}` }),
    );
    worldEntries
      .filter((w) => w.id !== node.id)
      .forEach((w) =>
        opts.push({ kind: "world_entry", id: w.id, label: `📦 ${w.title}` }),
      );
    return opts;
  }, [characters, worldEntries, node.id]);

  const handleAdd = async () => {
    await onSave(draft);
    setDraft({ ...draft, note: "" });
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[600px] max-h-[80vh] overflow-y-auto rounded-lg border border-ink-700 bg-ink-800 p-5 text-sm text-ink-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">时间线 · {node.label}</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-ink-400 hover:bg-ink-700">
            ✕
          </button>
        </div>

        <div className="mb-4 max-h-48 space-y-1 overflow-y-auto rounded border border-ink-700 bg-ink-900/50 p-2 text-xs">
          {events.length === 0 && <div className="text-ink-500">尚无时间线事件</div>}
          {events.map((e) => {
            const ownerName =
              e.ownerKind === "character"
                ? characters.find((c) => c.id === e.ownerId)?.name
                : e.ownerKind === "world_entry"
                  ? worldEntries.find((w) => w.id === e.ownerId)?.title
                  : null;
            const chapterTitle = chapters.find((c) => c.id === e.chapterId)?.title;
            return (
              <div key={e.id} className="flex items-start gap-2 rounded p-1 hover:bg-ink-800">
                <span className="shrink-0 text-amber-300">
                  第 {e.chapterOrder} 章{chapterTitle ? `·${chapterTitle}` : ""} ({e.innerOrder})
                </span>
                <span className="shrink-0 rounded bg-ink-700 px-1 text-[10px]">
                  {ACTION_LABEL[e.action]}
                </span>
                <span className="flex-1 text-ink-300">
                  {ownerName ? `→ ${ownerName}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                <button
                  onClick={() => onDelete(e.id)}
                  className="shrink-0 rounded text-[10px] text-red-400 hover:text-red-300"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <h4 className="mb-2 text-xs font-semibold text-ink-300">添加事件</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-400">章节</span>
            <select
              value={draft.chapterId ?? ""}
              onChange={(e) => {
                const ch = chapters.find((c) => c.id === e.target.value);
                setDraft({
                  ...draft,
                  chapterId: ch?.id ?? null,
                  chapterOrder: ch?.order ?? 0,
                });
              }}
              className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs"
            >
              <option value="">— 未指定 —</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  第 {c.order} 章 · {c.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-400">章内时刻 ({draft.innerOrder})</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.innerOrder}
              onChange={(e) => setDraft({ ...draft, innerOrder: Number(e.target.value) })}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-400">动作</span>
            <select
              value={draft.action}
              onChange={(e) =>
                setDraft({ ...draft, action: e.target.value as WorldTimelineAction })
              }
              className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs"
            >
              {(["create", "transfer", "destroy", "modify"] as WorldTimelineAction[]).map(
                (a) => (
                  <option key={a} value={a}>
                    {ACTION_LABEL[a]}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-400">归属（可选）</span>
            <select
              value={draft.ownerKind && draft.ownerId ? `${draft.ownerKind}:${draft.ownerId}` : ""}
              onChange={(e) => {
                if (!e.target.value) {
                  setDraft({ ...draft, ownerKind: null, ownerId: null });
                  return;
                }
                const [k, i] = e.target.value.split(":");
                setDraft({
                  ...draft,
                  ownerKind: k as WorldGraphEndpointKind,
                  ownerId: i,
                });
              }}
              className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs"
            >
              <option value="">— 无归属 —</option>
              {ownerOptions.map((o) => (
                <option key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[11px] text-ink-400">备注</span>
            <input
              type="text"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="例如：交予主角，此后剑随其身"
              className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-ink-600 px-3 py-1 text-xs hover:bg-ink-700"
          >
            关闭
          </button>
          <button
            onClick={handleAdd}
            className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-ink-900 hover:bg-amber-400"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
