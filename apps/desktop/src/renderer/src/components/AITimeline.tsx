import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore } from "../stores/app-store";
import { feedbackApi } from "../lib/api";
import type { AIFeedbackRecord } from "@inkforge/shared";

type DisplayItem = {
  kind: "streaming" | "history";
  id: string;
  type: string;
  status: "streaming" | "completed" | "failed";
  text: string;
  error?: string;
  createdAt: string;
  dismissed?: boolean;
};

const TYPE_META: Record<string, { label: string; badgeClass: string }> = {
  analysis: { label: "静默分析", badgeClass: "bg-sky-500/20 text-sky-300" },
  critique: { label: "选中审查", badgeClass: "bg-amber-500/20 text-amber-300" },
};

function summarize(text: string, max = 60): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max) + "…";
}

export function AITimeline(): JSX.Element {
  const currentChapterId = useAppStore((s) => s.currentChapterId);
  const analyses = useAppStore((s) => s.analyses);
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const historyQuery = useQuery<AIFeedbackRecord[]>({
    queryKey: ["feedbacks", currentChapterId],
    queryFn: () =>
      currentChapterId ? feedbackApi.list({ chapterId: currentChapterId }) : Promise.resolve([]),
    enabled: !!currentChapterId,
  });

  const dismiss = useMutation({
    mutationFn: ({ id, dismissed }: { id: string; dismissed: boolean }) =>
      feedbackApi.dismiss({ id, dismissed }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feedbacks", currentChapterId] });
    },
  });

  useEffect(() => {
    if (analyses.some((a) => a.status === "completed")) {
      void queryClient.invalidateQueries({ queryKey: ["feedbacks", currentChapterId] });
    }
  }, [analyses, currentChapterId, queryClient]);

  const items: DisplayItem[] = useMemo(() => {
    const streamingItems: DisplayItem[] = analyses
      .filter((a) => a.chapterId === currentChapterId)
      .map((a) => ({
        kind: "streaming" as const,
        id: a.analysisId,
        type: "analysis",
        status: a.status,
        text: a.accumulatedText,
        error: a.error,
        createdAt: a.startedAt,
      }));
    const historyItems: DisplayItem[] = (historyQuery.data ?? [])
      .filter((f) => !streamingItems.some((s) => s.id === f.id))
      .map((f) => ({
        kind: "history" as const,
        id: f.id,
        type: f.type || "analysis",
        status: "completed" as const,
        text: typeof f.payload?.text === "string" ? (f.payload.text as string) : "",
        error: undefined,
        createdAt: f.createdAt,
        dismissed: f.dismissed,
      }));
    return [...streamingItems, ...historyItems];
  }, [analyses, currentChapterId, historyQuery.data]);

  const visible = useMemo(
    () => items.filter((item) => showDismissed || !item.dismissed),
    [items, showDismissed],
  );
  const dismissedCount = items.filter((item) => item.dismissed).length;

  // M9: 虚拟化可见列表。展开/streaming 行高动态，由 measureElement 实测兜底。
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const item = visible[index];
      const expanded = expandedId === item?.id || item?.status === "streaming";
      return expanded ? 180 : 44;
    },
    overscan: 6,
    getItemKey: (index) => visible[index]?.id ?? index,
  });

  return (
    <div className="flex h-full flex-col">
      {dismissedCount > 0 && (
        <div className="flex items-center justify-end border-b border-ink-700 px-3 py-1.5 text-xs">
          <button
            className="rounded px-2 py-0.5 text-[11px] text-ink-400 hover:bg-ink-700"
            onClick={() => setShowDismissed((v) => !v)}
          >
            {showDismissed ? "隐藏已忽略" : `显示已忽略 (${dismissedCount})`}
          </button>
        </div>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto scrollbar-thin px-3 py-3">
        {!currentChapterId && (
          <p className="text-xs text-ink-400">选定一章后，AI 建议会在这里出现。</p>
        )}
        {currentChapterId && visible.length === 0 && (
          <p className="text-xs text-ink-400">写满 200 字后，AI 会在这里留下一条静默建议。</p>
        )}
        {visible.length > 0 && (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const item = visible[vRow.index];
              const expanded = expandedId === item.id || item.status === "streaming";
              const meta = TYPE_META[item.type] ?? TYPE_META.analysis;
              return (
                <div
                  key={vRow.key}
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vRow.start}px)`,
                    paddingBottom: 8,
                  }}
                >
                  <div
                    className={`rounded-lg border text-sm transition-colors ${
                      item.status === "failed"
                        ? "border-red-500/40 bg-red-500/10 text-red-200"
                        : item.dismissed
                          ? "border-ink-700 bg-ink-800/30 text-ink-400"
                          : "border-ink-700 bg-ink-800/60 text-ink-100"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      title={summarize(item.text || "", 120)}
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <span className="flex-1 truncate text-[12px] text-ink-300">
                        {item.status === "streaming"
                          ? "生成中…"
                          : item.status === "failed"
                            ? `失败：${item.error ?? ""}`
                            : summarize(item.text || "", 40) || "(空)"}
                      </span>
                      <time className="shrink-0 text-[10px] text-ink-500">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </time>
                    </button>
                    {expanded && (
                      <div className="border-t border-ink-700/60 px-3 py-2">
                        <div className="whitespace-pre-wrap text-[13px] leading-6">
                          {item.text || (item.status === "streaming" ? "…" : "")}
                        </div>
                        {item.kind === "history" && item.status !== "failed" && (
                          <div className="mt-2 flex justify-end gap-2 text-xs">
                            {item.dismissed ? (
                              <button
                                className="rounded px-2 py-0.5 text-ink-400 hover:bg-ink-700"
                                onClick={() => dismiss.mutate({ id: item.id, dismissed: false })}
                                disabled={dismiss.isPending}
                              >
                                恢复
                              </button>
                            ) : (
                              <button
                                className="rounded px-2 py-0.5 text-ink-400 hover:bg-ink-700"
                                onClick={() => dismiss.mutate({ id: item.id, dismissed: true })}
                                disabled={dismiss.isPending}
                              >
                                忽略
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
