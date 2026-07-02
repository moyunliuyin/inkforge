import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TavernCardRecord, TavernMessageRecord, TavernSessionRecord } from "@inkforge/shared";
import { useAppStore } from "../../stores/app-store";
import { tavernCardApi, tavernSessionApi } from "../../lib/api";
import { ContextBudgetBar } from "./ContextBudgetBar";
import { DirectorPanel } from "./DirectorPanel";
import { RoleBubble } from "./RoleBubble";

interface StageProps {
  sessionId: string | null;
  sessions: TavernSessionRecord[];
}

export function Stage({ sessionId, sessions }: StageProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const tavernStreamBuffers = useAppStore((s) => s.tavernStreamBuffers);

  const messagesQuery = useQuery<TavernMessageRecord[]>({
    queryKey: ["tavernMessages", sessionId],
    queryFn: () =>
      sessionId
        ? tavernSessionApi.listMessages({ sessionId })
        : Promise.resolve([]),
    enabled: !!sessionId,
  });

  const cardsQuery = useQuery<TavernCardRecord[]>({
    queryKey: ["tavernCards", currentProjectId],
    queryFn: () => tavernCardApi.list({ projectId: currentProjectId || undefined }),
    enabled: !!currentProjectId,
  });

  const streamBuffer = sessionId ? tavernStreamBuffers[sessionId] : null;
  const messages = messagesQuery.data || [];
  const cards = cardsQuery.data || [];

  // Auto-scroll when new content arrives
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 80) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, streamBuffer?.text.length]);

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-400 text-sm italic">
        请选择或新建一个会话
      </div>
    );
  }

  const session = sessions.find((s) => s.id === sessionId);
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-500 text-sm italic">
        会话已被删除
      </div>
    );
  }

  const getCardName = (cardId: string | null) =>
    cardId ? cards.find((c) => c.id === cardId)?.name : undefined;

  const getProviderHint = (cardId: string | null) => {
    if (!cardId) return undefined;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return undefined;
    return `${card.providerId}/${card.model}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ContextBudgetBar sessionId={sessionId} />

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto scrollbar-thin px-4 py-3 space-y-2"
      >
        {messages.length === 0 && !streamBuffer && (
          <div className="flex h-full items-center justify-center text-ink-500 text-sm italic">
            议题：{session.topic}
            <br />
            点击下方「推进」开始第一轮对话。
          </div>
        )}
        {messages.map((msg) => (
          <RoleBubble
            key={msg.id}
            message={msg}
            cardName={getCardName(msg.characterId) ?? undefined}
            providerHint={getProviderHint(msg.characterId) ?? undefined}
            userName={session.userName ?? undefined}
          />
        ))}
        {streamBuffer && streamBuffer.text.length > 0 && (
          <RoleBubble
            message={{
              id: `streaming-${streamBuffer.roundId}`,
              sessionId,
              characterId: streamBuffer.speakerCardId,
              role: "character",
              content: streamBuffer.text,
              tokensIn: 0,
              tokensOut: 0,
              createdAt: new Date().toISOString(),
            }}
            cardName={streamBuffer.speakerName}
            providerHint={getProviderHint(streamBuffer.speakerCardId) ?? undefined}
            isStreaming
          />
        )}
      </div>

      <DirectorPanel session={session} cards={cards} />
    </div>
  );
}
