import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ChapterRecord } from "@inkforge/shared";

interface ChapterTreeProps {
  chapters: ChapterRecord[];
  currentChapterId: string | null;
  onSelect: (chapterId: string) => void;
  onCreate: () => void;
  onRename: (chapterId: string, title: string) => void;
  onDelete: (chapterId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onImportMd: () => void;
  creating: boolean;
  importing: boolean;
}

interface MenuState {
  chapterId: string;
  x: number;
  y: number;
}

function buildTree(chapters: ChapterRecord[]): ChapterRecord[] {
  const sorted = [...chapters].sort((a, b) => a.order - b.order);
  const byId = new Map<string, ChapterRecord[]>();
  const roots: ChapterRecord[] = [];
  for (const c of sorted) {
    if (c.parentId) {
      const arr = byId.get(c.parentId) ?? [];
      arr.push(c);
      byId.set(c.parentId, arr);
    } else {
      roots.push(c);
    }
  }
  const result: ChapterRecord[] = [];
  const walk = (node: ChapterRecord, depth: number): void => {
    result.push({ ...node, order: depth });
    const children = byId.get(node.id) ?? [];
    for (const child of children) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);
  return result;
}

export function ChapterTree({
  chapters,
  currentChapterId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReorder,
  onImportMd,
  creating,
  importing,
}: ChapterTreeProps): JSX.Element {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const flat = useMemo(() => buildTree(chapters), [chapters]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const orderedIds = useMemo(() => flat.map((c) => c.id), [flat]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // M9: 虚拟化章节列表，千章也只渲染可视行。行高近似固定，rename input 改高由 measureElement 兜底。
  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 12,
    getItemKey: (index) => flat[index]?.id ?? index,
  });

  const handleMove = (chapterId: string, direction: -1 | 1) => {
    const idx = orderedIds.indexOf(chapterId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next);
  };

  const handleRenameSubmit = () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (name) onRename(renamingId, name);
    setRenamingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
        <span className="text-sm font-medium text-ink-200">章节</span>
        <div className="flex items-center gap-1">
          <button
            className="rounded-md px-2 py-1 text-xs text-ink-200 hover:bg-ink-700/70 disabled:opacity-60"
            onClick={onImportMd}
            disabled={importing}
            title="从 Markdown 导入"
          >
            {importing ? "…" : "导入"}
          </button>
          <button
            className="rounded-md bg-ink-700 px-2 py-1 text-xs text-ink-100 hover:bg-ink-600 disabled:opacity-60"
            onClick={onCreate}
            disabled={creating}
          >
            {creating ? "创建中…" : "+ 新章"}
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        {flat.length === 0 && (
          <p className="px-3 py-3 text-xs text-ink-400">还没有章节，点右上新建一章开始。</p>
        )}
        <div
          role="list"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          {virtualizer.getVirtualItems().map((vRow) => {
            const chapter = flat[vRow.index];
            const idx = vRow.index;
            const active = chapter.id === currentChapterId;
            const depth = chapter.order;
            const isRenaming = chapter.id === renamingId;
            return (
              <div
                key={vRow.key}
                role="listitem"
                data-index={vRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                <div
                  className={`group flex items-center px-3 py-1.5 text-sm transition-colors ${
                    active ? "bg-amber-500/20 text-amber-200" : "text-ink-200 hover:bg-ink-700/60"
                  }`}
                  style={{ paddingLeft: `${12 + depth * 12}px` }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ chapterId: chapter.id, x: e.clientX, y: e.clientY });
                  }}
                >
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      className="flex-1 rounded border border-amber-400 bg-ink-900 px-2 py-0.5 text-sm text-ink-100 outline-none"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={handleRenameSubmit}
                    />
                  ) : (
                    <button
                      className="flex flex-1 items-center justify-between overflow-hidden text-left"
                      onClick={() => onSelect(chapter.id)}
                      onDoubleClick={() => {
                        setRenamingId(chapter.id);
                        setRenameValue(chapter.title);
                      }}
                    >
                      <span className="truncate">{chapter.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-ink-400">{chapter.wordCount}</span>
                    </button>
                  )}
                  {!isRenaming && (
                    <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="rounded px-1 text-xs text-ink-400 hover:bg-ink-700 hover:text-ink-200 disabled:opacity-40"
                        onClick={() => handleMove(chapter.id, -1)}
                        disabled={idx === 0}
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        className="rounded px-1 text-xs text-ink-400 hover:bg-ink-700 hover:text-ink-200 disabled:opacity-40"
                        onClick={() => handleMove(chapter.id, 1)}
                        disabled={idx === flat.length - 1}
                        title="下移"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-36 overflow-hidden rounded-md border border-ink-600 bg-ink-800 py-1 text-sm shadow-xl"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            className="block w-full px-3 py-1.5 text-left text-ink-200 hover:bg-ink-700"
            onClick={() => {
              const ch = chapters.find((c) => c.id === menu.chapterId);
              if (ch) {
                setRenamingId(ch.id);
                setRenameValue(ch.title);
              }
              setMenu(null);
            }}
          >
            重命名
          </button>
          <button
            className="block w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-500/20"
            onClick={() => {
              const ch = chapters.find((c) => c.id === menu.chapterId);
              if (ch && window.confirm(`删除「${ch.title}」？此操作不可撤销。`)) {
                onDelete(ch.id);
              }
              setMenu(null);
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}
