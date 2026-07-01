import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TavernCardRecord, TavernMode, TavernSessionRecord } from "@inkforge/shared";
import { tavernEventsApi, tavernRoundApi, tavernSummaryApi } from "../../lib/api";

interface DirectorPanelProps {
  session: TavernSessionRecord;
  cards: TavernCardRecord[];
}

type RoundLifecycle = "idle" | "running" | "stopping" | "failed";

export function DirectorPanel({ session, cards }: DirectorPanelProps): JSX.Element {
  const queryClient = useQueryClient();

  const [lifecycle, setLifecycle] = useState<RoundLifecycle>("idle");
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);

  // Refs keep the IPC subscription stable (deps: [session.id] only — no churn,
  // no dropped events) and let late mutation callbacks reconcile against rounds
  // that already settled.
  const activeRoundIdRef = useRef<string | null>(null);
  const settledRoundsRef = useRef<Set<string>>(new Set());

  const [mode, setMode] = useState<TavernMode>(session.mode);
  const [participants, setParticipants] = useState<string[]>([]);
  const [autoRounds, setAutoRounds] = useState(3);
  const [directorMessage, setDirectorMessage] = useState("");
  const [compactKeepLastK, setCompactKeepLastK] = useState(session.lastK);
  const [compactOpen, setCompactOpen] = useState(false);

  const isRunning = lifecycle === "running" || lifecycle === "stopping";

  const settleToIdle = (failed: boolean) => {
    activeRoundIdRef.current = null;
    setLifecycle(failed ? "failed" : "idle");
    setCurrentSpeaker(null);
    setCurrentRound(0);
    setTotalRounds(0);
  };

  // Reset execution state strictly on session identity change (config values
  // like mode/lastK are immutable per session, so they belong to this reset).
  useEffect(() => {
    activeRoundIdRef.current = null;
    settledRoundsRef.current = new Set();
    setLifecycle("idle");
    setCurrentSpeaker(null);
    setCurrentRound(0);
    setTotalRounds(0);
    setMode(session.mode);
    setParticipants([]);
    setCompactKeepLastK(session.lastK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // Progress is driven by per-turn streaming; lifecycle settles on the round-level done.
  useEffect(() => {
    const offChunk = tavernEventsApi.onChunk((e) => {
      if (e.sessionId !== session.id) return;
      setCurrentSpeaker(e.speakerName);
      setCurrentRound(e.roundIndex + 1);
    });
    const offDone = tavernEventsApi.onDone((e) => {
      if (e.sessionId !== session.id || e.kind !== "round") return;
      settledRoundsRef.current.add(e.roundId);
      if (activeRoundIdRef.current && e.roundId === activeRoundIdRef.current) {
        settleToIdle(e.status === "failed");
      }
    });
    return () => {
      offChunk?.();
      offDone?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  const toggleParticipant = (cardId: string) => {
    setParticipants((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  };

  const runMut = useMutation({
    mutationFn: () =>
      tavernRoundApi.run({
        sessionId: session.id,
        mode,
        participants,
        lastK: session.lastK,
        autoRounds: mode === "auto" ? autoRounds : undefined,
        directorMessage: directorMessage.trim() ? directorMessage.trim() : undefined,
      }),
    onSuccess: (res) => {
      setDirectorMessage("");
      // A very fast / failed round may have already emitted its round-done before
      // this callback ran — don't strand the UI in "running".
      if (settledRoundsRef.current.has(res.roundId)) {
        settleToIdle(false);
        return;
      }
      activeRoundIdRef.current = res.roundId;
      setLifecycle("running");
      setCurrentSpeaker(null);
      setCurrentRound(1);
      setTotalRounds(mode === "auto" ? autoRounds : 1);
    },
    onError: (err) => {
      setLifecycle("failed");
      alert(`推进失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const stopMut = useMutation({
    mutationFn: (roundId: string) => tavernRoundApi.stop({ roundId }),
    onMutate: () => setLifecycle("stopping"),
    // Stay "stopping" until the orchestrator emits its round-level done (which
    // flips us to idle). Returning early here would re-enable 推进 into the
    // backend re-entry guard while the round is still settling.
    onError: () => setLifecycle("running"),
  });

  const compactMut = useMutation({
    mutationFn: (keepLastK: number) =>
      tavernSummaryApi.compact({ sessionId: session.id, keepLastK }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tavernMessages", session.id] });
      setCompactOpen(false);
    },
    onError: (err) => {
      alert(`压缩失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const canRun =
    participants.length >= 1 &&
    (lifecycle === "idle" || lifecycle === "failed") &&
    !runMut.isPending &&
    !stopMut.isPending &&
    !compactMut.isPending;

  return (
    <div className="border-t border-ink-700 bg-ink-800/40 p-3 space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-ink-400">模式:</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="tavern-mode"
            checked={mode === "director"}
            onChange={() => setMode("director")}
            disabled={isRunning}
            className="accent-amber-500"
          />
          <span className="text-ink-200">导演</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="tavern-mode"
            checked={mode === "auto"}
            onChange={() => setMode("auto")}
            disabled={isRunning}
            className="accent-amber-500"
          />
          <span className="text-ink-200">自动</span>
        </label>
        {mode === "auto" && (
          <label className="flex items-center gap-1 ml-4">
            <span className="text-ink-400">轮数:</span>
            <input
              type="number"
              value={autoRounds}
              onChange={(e) =>
                setAutoRounds(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))
              }
              disabled={isRunning}
              className="w-12 rounded border border-ink-700 bg-ink-900 px-1 py-0.5 text-ink-100 text-xs disabled:opacity-50"
              min={1}
              max={10}
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {cards.length === 0 && (
          <span className="text-xs text-ink-500 italic">当前项目无可用角色卡</span>
        )}
        {cards.map((card) => {
          const selected = participants.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggleParticipant(card.id)}
              disabled={isRunning}
              className={`rounded px-2 py-1 text-xs transition disabled:opacity-50 ${
                selected
                  ? "bg-amber-500/20 text-amber-200 border border-amber-500/50"
                  : "bg-ink-900/60 text-ink-400 border border-ink-700 hover:bg-ink-900"
              }`}
              title={`${card.providerId}/${card.model}`}
            >
              {selected ? "✓ " : ""}
              {card.name}
            </button>
          );
        })}
      </div>

      <textarea
        value={directorMessage}
        onChange={(e) => setDirectorMessage(e.target.value)}
        disabled={isRunning}
        placeholder="导演指令（可选）：引导本次推进的剧情走向，对每个角色生效，不写入对话历史"
        className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100 resize-none h-12 disabled:opacity-50"
      />

      <div className="flex items-center gap-2">
        {isRunning ? (
          <>
            <button
              type="button"
              onClick={() => activeRoundIdRef.current && stopMut.mutate(activeRoundIdRef.current)}
              disabled={lifecycle === "stopping"}
              className="rounded bg-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-50"
            >
              {lifecycle === "stopping" ? "停止中…" : "⏸ 停止"}
            </button>
            <span className="text-xs text-ink-400">
              {totalRounds > 1 && (
                <span className="text-ink-300">
                  回合 {currentRound}/{totalRounds} ·{" "}
                </span>
              )}
              {currentSpeaker ? (
                <span className="text-amber-300">{currentSpeaker} 发言中…</span>
              ) : (
                "推进中…"
              )}
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => runMut.mutate()}
            disabled={!canRun}
            className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-amber-400 disabled:opacity-40"
          >
            ▶ {runMut.isPending ? "启动中…" : "推进"}
          </button>
        )}
        {lifecycle === "failed" && (
          <span className="text-xs text-red-400">上次推进失败，可重试</span>
        )}
        <button
          type="button"
          onClick={() => setCompactOpen(true)}
          disabled={isRunning || compactMut.isPending}
          className="ml-auto rounded bg-ink-700/60 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-700 disabled:opacity-50"
        >
          📜 压缩历史
        </button>
      </div>

      {compactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-ink-700 bg-ink-800 p-5 shadow-xl">
            <h3 className="text-sm font-medium text-amber-300 mb-3">压缩历史</h3>
            <label className="block text-xs text-ink-300 mb-2">保留最近 K 条完整消息</label>
            <input
              type="number"
              value={compactKeepLastK}
              onChange={(e) => setCompactKeepLastK(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-ink-100"
              min={1}
            />
            <p className="text-[11px] text-ink-500 mt-2">
              早于这 {compactKeepLastK} 条的非摘要消息将被摘要模型压缩为一条摘要消息。需要会话配置摘要 Provider。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompactOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-ink-400 hover:text-ink-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => compactMut.mutate(compactKeepLastK)}
                disabled={compactMut.isPending}
                className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-amber-400 disabled:opacity-50"
              >
                {compactMut.isPending ? "压缩中…" : "开始压缩"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
