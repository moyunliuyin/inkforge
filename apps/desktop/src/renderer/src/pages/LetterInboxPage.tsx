import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  CharacterLetterRecord,
  CharacterLetterTone,
} from "@inkforge/shared";
import { letterApi, novelCharacterApi } from "../lib/api";
import { useAppStore } from "../stores/app-store";

const TONE_LABEL: Record<CharacterLetterTone, { label: string; color: string }> = {
  grateful: { label: "🌸 感激", color: "bg-rose-500/15 text-rose-200 ring-rose-400/30" },
  complaint: { label: "😤 抱怨", color: "bg-amber-500/15 text-amber-200 ring-amber-400/30" },
  curious: { label: "🤔 好奇", color: "bg-sky-500/15 text-sky-200 ring-sky-400/30" },
  encouraging: {
    label: "💪 鼓励",
    color: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  },
  neutral: { label: "📝 日常", color: "bg-ink-700/40 text-ink-200 ring-ink-600" },
};

/**
 * 角色来信收件箱。
 * 左侧信件列表 + 右侧详情阅读区；顶部"生成新信件"按钮。
 */
export function LetterInboxPage(): JSX.Element {
  const projectId = useAppStore((s) => s.currentProjectId);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGen, setShowGen] = useState(false);

  const lettersQuery = useQuery({
    queryKey: ["letters", projectId],
    queryFn: () => letterApi.list({ projectId: projectId ?? "" }),
    enabled: !!projectId,
    refetchInterval: 60_000,
  });

  const charactersQuery = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => novelCharacterApi.list({ projectId: projectId ?? "" }),
    enabled: !!projectId,
  });

  const markReadMut = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      letterApi.markRead({ letterId: id, read }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["letters", projectId] }),
  });
  const pinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      letterApi.pin({ letterId: id, pinned }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["letters", projectId] }),
  });
  const dismissMut = useMutation({
    mutationFn: (id: string) => letterApi.dismiss({ letterId: id }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["letters", projectId] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => letterApi.delete({ letterId: id }),
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["letters", projectId] });
    },
  });

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center text-ink-400">
        请先在「写作」视图选择一本书。
      </div>
    );
  }

  const letters = lettersQuery.data ?? [];
  const characters = charactersQuery.data ?? [];
  const characterMap = new Map(characters.map((c) => [c.id, c]));
  const selected = letters.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* 左侧：列表 */}
      <div className="flex w-72 shrink-0 flex-col border-r border-ink-700 bg-ink-900/40">
        <div className="flex items-center justify-between border-b border-ink-700 p-3">
          <h2 className="text-sm font-semibold text-ink-100">📬 收件箱</h2>
          <button
            type="button"
            onClick={() => setShowGen(true)}
            className="rounded-md bg-amber-500/20 px-2 py-1 text-[11px] text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/30"
          >
            ✨ 生成新信
          </button>
        </div>
        <VirtualLetterList
          letters={letters}
          selectedId={selectedId}
          characterMap={characterMap}
          onSelect={(id, l) => {
            setSelectedId(id);
            if (!l.read) markReadMut.mutate({ id, read: true });
          }}
          onPin={(l) => pinMut.mutate({ id: l.id, pinned: !l.pinned })}
          onDismiss={(l) => dismissMut.mutate(l.id)}
        />
      </div>

      {/* 右侧：详情 */}
      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-ink-900 via-ink-800/60 to-ink-900">
        {selected ? (
          <LetterDetail
            letter={selected}
            characterName={
              characterMap.get(selected.characterId)?.name ?? "未知角色"
            }
            onDelete={() => {
              if (confirm("确定要删除这封信？")) deleteMut.mutate(selected.id);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-500">
            选择一封信查看
          </div>
        )}
      </div>

      {showGen && (
        <GenerateLetterDialog
          projectId={projectId}
          characters={characters}
          onClose={() => setShowGen(false)}
          onGenerated={() => {
            queryClient.invalidateQueries({ queryKey: ["letters", projectId] });
            setShowGen(false);
          }}
        />
      )}
    </div>
  );
}

function VirtualLetterList({
  letters,
  selectedId,
  characterMap,
  onSelect,
  onPin,
  onDismiss,
}: {
  letters: CharacterLetterRecord[];
  selectedId: string | null;
  characterMap: ReadonlyMap<string, { name: string }>;
  onSelect: (id: string, letter: CharacterLetterRecord) => void;
  onPin: (letter: CharacterLetterRecord) => void;
  onDismiss: (letter: CharacterLetterRecord) => void;
}): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: letters.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 76,
    overscan: 8,
    getItemKey: (index) => letters[index]?.id ?? index,
  });

  if (letters.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-2">
        <div className="p-6 text-center text-xs text-ink-500">
          还没有信件。点上方「✨ 生成新信」让你笔下的人物给你写一封。
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const l = letters[vRow.index];
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
              }}
            >
              <LetterRow
                letter={l}
                characterName={characterMap.get(l.characterId)?.name ?? "未知角色"}
                active={l.id === selectedId}
                onClick={() => onSelect(l.id, l)}
                onPin={() => onPin(l)}
                onDismiss={() => onDismiss(l)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LetterRow({
  letter,
  characterName,
  active,
  onClick,
  onPin,
  onDismiss,
}: {
  letter: CharacterLetterRecord;
  characterName: string;
  active: boolean;
  onClick: () => void;
  onPin: () => void;
  onDismiss: () => void;
}): JSX.Element {
  const tone = TONE_LABEL[letter.tone];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group mb-1 flex cursor-pointer flex-col rounded-md border px-2.5 py-2 transition-colors ${
        active
          ? "border-amber-400/40 bg-amber-500/10"
          : "border-transparent hover:bg-ink-800/60"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {!letter.read && (
          <span
            aria-label="未读"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
          />
        )}
        {letter.pinned && <span aria-hidden>📌</span>}
        <span className="truncate text-[12px] font-medium text-ink-100">
          {letter.subject}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[10.5px] text-ink-400">
        <span className="truncate">{characterName}</span>
        <span>{new Date(letter.generatedAt).toLocaleDateString()}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9.5px] ring-1 ${tone.color}`}
        >
          {tone.label}
        </span>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className="text-[10px] text-ink-500 hover:text-amber-300"
          >
            {letter.pinned ? "取消" : "📌"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-[10px] text-ink-500 hover:text-rose-400"
          >
            归档
          </button>
        </div>
      </div>
    </div>
  );
}

function LetterDetail({
  letter,
  characterName,
  onDelete,
}: {
  letter: CharacterLetterRecord;
  characterName: string;
  onDelete: () => void;
}): JSX.Element {
  const tone = TONE_LABEL[letter.tone];
  return (
    <div className="flex h-full flex-col overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${tone.color}`}>
            {tone.label}
          </span>
          <span className="text-xs text-ink-500">
            {new Date(letter.generatedAt).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-xs text-ink-500 hover:text-rose-400"
          >
            🗑 删除
          </button>
        </div>
        <h1 className="mb-1 text-2xl font-semibold text-ink-50">{letter.subject}</h1>
        <div className="mb-6 text-sm text-ink-400">来自：{characterName}</div>

        <div className="rounded-2xl border border-amber-100/10 bg-gradient-to-br from-amber-50/[0.06] to-transparent p-6 shadow-inner">
          <div className="mb-3 text-xs italic text-amber-200/70">
            亲爱的作者：
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-100">
            {letter.body}
          </div>
          <div className="mt-6 text-right text-sm text-ink-300">
            —— {characterName}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateLetterDialog({
  projectId,
  characters,
  onClose,
  onGenerated,
}: {
  projectId: string;
  characters: { id: string; name: string }[];
  onClose: () => void;
  onGenerated: () => void;
}): JSX.Element {
  const [characterId, setCharacterId] = useState<string>("");
  const [tone, setTone] = useState<CharacterLetterTone | "">("");
  const [error, setError] = useState<string | null>(null);

  const genMut = useMutation({
    mutationFn: () =>
      letterApi.generate({
        projectId,
        characterId: characterId || undefined,
        tone: tone || undefined,
      }),
    onSuccess: () => onGenerated(),
    onError: (err) => setError(String(err)),
  });

  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold text-ink-100">
          ✨ 生成一封新的来信
        </h2>
        <p className="mb-4 text-xs text-ink-400">
          选一位你笔下的人物，让 AI 用 ta 的口吻给你写一封信。
        </p>

        {characters.length === 0 ? (
          <div className="rounded-md bg-rose-500/10 p-3 text-xs text-rose-300">
            当前项目还没有人物档案。请先去「人物」页面创建一位。
          </div>
        ) : (
          <>
            <label className="mb-3 block text-xs">
              <div className="mb-1 text-ink-400">角色</div>
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1.5 text-sm text-ink-100"
              >
                <option value="">🎲 随机挑一位</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-4 block text-xs">
              <div className="mb-1 text-ink-400">语气</div>
              <select
                value={tone}
                onChange={(e) =>
                  setTone(e.target.value as CharacterLetterTone | "")
                }
                className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1.5 text-sm text-ink-100"
              >
                <option value="">🎲 随机（推荐）</option>
                <option value="grateful">🌸 感激</option>
                <option value="complaint">😤 抱怨</option>
                <option value="curious">🤔 好奇</option>
                <option value="encouraging">💪 鼓励</option>
                <option value="neutral">📝 日常</option>
              </select>
            </label>

            {error && (
              <div className="mb-3 rounded-md bg-rose-500/10 p-2 text-[11px] text-rose-300">
                {error}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800"
          >
            取消
          </button>
          <button
            type="button"
            disabled={genMut.isPending || characters.length === 0}
            onClick={() => {
              setError(null);
              genMut.mutate();
            }}
            className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-medium text-ink-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {genMut.isPending ? "生成中…" : "生成"}
          </button>
        </div>
      </div>
    </div>
  );
}
