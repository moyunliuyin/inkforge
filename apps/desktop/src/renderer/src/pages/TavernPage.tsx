import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "../stores/app-store";
import { tavernSessionApi, tavernEventsApi } from "../lib/api";
import { SessionSidebar } from "../components/tavern/SessionSidebar";
import { Stage } from "../components/tavern/Stage";

export function TavernPage(): JSX.Element {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const activeTavernSessionId = useAppStore((s) => s.activeTavernSessionId);
  const setActiveTavernSessionId = useAppStore((s) => s.setActiveTavernSessionId);
  const updateTavernStreamBuffer = useAppStore((s) => s.updateTavernStreamBuffer);
  const setTavernBudgetState = useAppStore((s) => s.setTavernBudgetState);
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["tavernSessions", currentProjectId],
    queryFn: () =>
      currentProjectId
        ? tavernSessionApi.list({ projectId: currentProjectId })
        : Promise.resolve([]),
    enabled: !!currentProjectId,
  });

  // Subscribe to tavern streaming events
  useEffect(() => {
    const offChunk = tavernEventsApi.onChunk((e) => {
      updateTavernStreamBuffer(e.sessionId, {
        roundId: e.roundId,
        speakerCardId: e.speakerCardId,
        speakerName: e.speakerName,
        text: e.accumulatedText,
      });
    });
    const offDone = tavernEventsApi.onDone((e) => {
      // Round-level done is lifecycle-only (handled in DirectorPanel); the
      // per-turn done is what flushes the streaming buffer into a saved message.
      if (e.kind === "round") return;
      // clear buffer & refresh messages
      updateTavernStreamBuffer(e.sessionId, null);
      queryClient.invalidateQueries({ queryKey: ["tavernMessages", e.sessionId] });
    });
    const offBudget = tavernEventsApi.onBudgetWarning((e) => {
      // A budget event also rides along after auto-compaction replaces history.
      queryClient.invalidateQueries({ queryKey: ["tavernMessages", e.sessionId] });
      if (e.state) {
        setTavernBudgetState(e.sessionId, e.state);
      } else {
        setTavernBudgetState(e.sessionId, {
          sessionId: e.sessionId,
          budgetTokens: 0,
          usedTokens: 0,
          remainingTokens: e.remainingTokens,
          shouldWarn: true,
          warnAt: e.emittedAt,
        });
      }
    });
    return () => {
      offChunk?.();
      offDone?.();
      offBudget?.();
    };
  }, [updateTavernStreamBuffer, setTavernBudgetState, queryClient]);

  if (!currentProjectId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-900/60 text-ink-300">
        <div className="max-w-md rounded-lg border border-ink-700 bg-ink-800/60 p-6 text-center">
          <div className="mb-2 text-lg text-amber-300">🎭 酒馆舞台</div>
          <p className="text-sm text-ink-300">请先在侧边栏选择或创建一个项目以开启酒馆会话。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-ink-900 overflow-hidden">
      <aside className="w-[260px] shrink-0 border-r border-ink-700">
        <SessionSidebar
          projectId={currentProjectId}
          sessions={sessionsQuery.data || []}
          activeId={activeTavernSessionId}
          onSelect={setActiveTavernSessionId}
        />
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <Stage sessionId={activeTavernSessionId} sessions={sessionsQuery.data || []} />
      </main>
    </div>
  );
}
