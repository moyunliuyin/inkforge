import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type {
  NovelCharacterRecord,
  WorldEntryRecord,
  WorldGraphEndpointKind,
  WorldRelationshipRecord,
  WorldRelationshipSaveInput,
} from "@inkforge/shared";
import {
  novelCharacterApi,
  worldApi,
  worldRelationshipApi,
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

  const [pendingSrcId, setPendingSrcId] = useState<string | null>(null);
  const [edgeForm, setEdgeForm] = useState<{
    src: { kind: WorldGraphEndpointKind; id: string; label: string };
    dst: { kind: WorldGraphEndpointKind; id: string; label: string };
  } | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NebulaLink | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editWeight, setEditWeight] = useState(5);

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
    return { nodes, links };
  }, [charactersQuery.data, worldsQuery.data, relationshipsQuery.data]);

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
      n.fx = undefined;
      n.fy = undefined;
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
          <div className="text-ink-500">点击边可编辑/删除；拖动节点固定位置；空白处取消</div>
        </div>
      </div>

      <div className="absolute right-3 top-3 flex gap-2">
        <button
          className="pointer-events-auto rounded-md border border-ink-600 bg-ink-800/80 px-3 py-1 text-xs text-ink-200 hover:bg-ink-700"
          onClick={releasePinned}
          title="解除所有节点固定位置"
        >
          🌀 重新发散
        </button>
      </div>

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
