import { useState } from "react";
import type { TavernMessageRecord } from "@inkforge/shared";
import { useAppStore } from "../../stores/app-store";
import { chapterApi } from "../../lib/api";

interface RoleBubbleProps {
  message: TavernMessageRecord;
  cardName?: string;
  providerHint?: string;
  userName?: string;
  isStreaming?: boolean;
}

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export function RoleBubble({
  message,
  cardName,
  providerHint,
  userName,
  isStreaming = false,
}: RoleBubbleProps): JSX.Element {
  const currentChapterId = useAppStore((s) => s.currentChapterId);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleExtract = async () => {
    setMenuOpen(false);
    if (!currentChapterId) {
      alert("请先打开某一章节");
      return;
    }
    try {
      const existing = await chapterApi.read({ id: currentChapterId });
      const title = cardName || message.role;
      const blockquote = `\n\n> （摘录自酒馆・${title}）${message.content}\n`;
      await chapterApi.update({
        id: currentChapterId,
        content: existing.content + blockquote,
      });
      alert("已追加到当前章节末尾。");
    } catch (err) {
      alert(`摘录失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const isDirector = message.role === "director";
  const isSummary = message.role === "summary";
  const isCharacter = message.role === "character";
  const isUser = message.role === "user";
  const rightAligned = isDirector || isUser;
  const userLabel = userName || "User";

  if (isSummary) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full rounded border border-ink-700 bg-ink-800/60 px-3 py-2 text-center text-xs text-ink-400 hover:bg-ink-800/80 transition"
        >
          📜 历史摘要 {expanded ? "（点击收起）" : "（点击展开）"}
        </button>
        {expanded && (
          <div className="mt-1 rounded border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-300 whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
    );
  }

  const avatarColor = isCharacter && message.characterId ? hashColor(message.characterId) : "#3b82f6";
  const avatarLetter = isUser
    ? userLabel.charAt(0)
    : (cardName || (isDirector ? "导" : "?")).charAt(0);

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={`flex gap-2 ${rightAligned ? "justify-end" : "justify-start"}`}
      >
        {!rightAligned && (
          <div
            className="shrink-0 w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarLetter}
          </div>
        )}
        <div className={`max-w-[75%] ${rightAligned ? "text-right" : "text-left"}`}>
          <div className="flex items-center gap-2 text-[11px] text-ink-400 mb-0.5">
            {!rightAligned && (
              <>
                <span className="font-medium text-ink-200">{cardName || "?"}</span>
                {providerHint && <span>{providerHint}</span>}
              </>
            )}
            {isDirector && <span className="font-medium text-blue-300">导演</span>}
            {isUser && <span className="font-medium text-amber-300">{userLabel}</span>}
            {(message.tokensIn > 0 || message.tokensOut > 0) && (
              <span>
                {message.tokensIn}↑ / {message.tokensOut}↓
              </span>
            )}
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              isDirector
                ? "border border-blue-500/50 bg-blue-500/10 text-blue-100"
                : isUser
                  ? "border border-amber-500/50 bg-amber-500/10 text-amber-100"
                  : "border border-ink-700 bg-ink-800/60 text-ink-100"
            }`}
            style={
              isCharacter
                ? { borderColor: `${avatarColor}66`, backgroundColor: `${avatarColor}15` }
                : undefined
            }
          >
            {message.content}
            {isStreaming && <span className="ml-0.5 animate-pulse text-amber-300">▋</span>}
          </div>
        </div>
        {rightAligned && (
          <div
            className={`shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
              isUser ? "bg-amber-500 text-ink-950" : "bg-blue-500 text-white"
            }`}
          >
            {avatarLetter}
          </div>
        )}
      </div>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className="fixed z-50 rounded-md border border-ink-700 bg-ink-800 py-1 shadow-xl"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              onClick={handleExtract}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-200 hover:bg-ink-700"
            >
              📋 摘录到编辑器
            </button>
          </div>
        </>
      )}
    </>
  );
}
