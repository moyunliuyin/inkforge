import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderRecord, TavernCardRecord, TavernMode } from "@inkforge/shared";
import { providerApi, tavernCardApi, tavernSessionApi } from "../../lib/api";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: (sessionId: string) => void;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: NewSessionDialogProps): JSX.Element | null {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<TavernMode>("auto");
  const [budgetTokens, setBudgetTokens] = useState(20000);
  const [lastK, setLastK] = useState(6);
  const [participants, setParticipants] = useState<string[]>([]);
  const [summaryProviderId, setSummaryProviderId] = useState<string>("");
  const [summaryModel, setSummaryModel] = useState("");
  const [userEnabled, setUserEnabled] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPersona, setUserPersona] = useState("");

  const queryClient = useQueryClient();

  const cardsQuery = useQuery<TavernCardRecord[]>({
    queryKey: ["tavernCards", projectId],
    queryFn: () => tavernCardApi.list({ projectId }),
    enabled: open,
  });

  const providersQuery = useQuery<ProviderRecord[]>({
    queryKey: ["providers"],
    queryFn: () => providerApi.list(),
    enabled: open,
  });

  const effectiveTitle = useMemo(() => {
    if (title.trim()) return title.trim();
    return topic.trim().slice(0, 12) || "新会话";
  }, [title, topic]);

  const createMut = useMutation({
    mutationFn: () =>
      tavernSessionApi.create({
        projectId,
        title: effectiveTitle,
        topic: topic.trim(),
        mode,
        budgetTokens,
        lastK,
        summaryProviderId: summaryProviderId || undefined,
        summaryModel: summaryProviderId && summaryModel ? summaryModel : undefined,
        userName: userEnabled && userName.trim() ? userName.trim() : undefined,
        userPersona: userEnabled && userName.trim() && userPersona.trim() ? userPersona.trim() : undefined,
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["tavernSessions", projectId] });
      onCreated?.(session.id);
      // reset form
      setTopic("");
      setTitle("");
      setParticipants([]);
      setMode("auto");
      setBudgetTokens(20000);
      setLastK(6);
      setSummaryProviderId("");
      setSummaryModel("");
      setUserEnabled(false);
      setUserName("");
      setUserPersona("");
    },
    onError: (err) => {
      alert(`创建失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });

  if (!open) return null;

  const toggleParticipant = (cardId: string) => {
    setParticipants((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  };

  const canSubmit = topic.trim().length > 0 && participants.length >= 1 && !createMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-ink-700 bg-ink-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="border-b border-ink-700 px-6 py-4">
          <h2 className="text-base font-semibold text-amber-300">新建酒馆会话</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            组织 2~6 位角色围绕一个议题展开讨论。
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4 scrollbar-thin">
          <div>
            <label className="block text-xs text-ink-300 mb-1">议题（必填）</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：林晚应不应该接下师门的任务？"
              className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 resize-none h-20"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-300 mb-1">标题（可选，默认取议题前 12 字）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={topic.slice(0, 12) || "新会话"}
              className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-300 mb-1">
              参与角色（已选 {participants.length} 张，建议 2~6 张）
            </label>
            <div className="rounded border border-ink-700 bg-ink-900/60 p-2 max-h-48 overflow-auto scrollbar-thin">
              {(cardsQuery.data || []).length === 0 && (
                <div className="p-4 text-center text-xs text-ink-500 italic">
                  当前项目无可用角色卡，请先到「人物」页创建。
                </div>
              )}
              {(cardsQuery.data || []).map((card) => {
                const selected = participants.includes(card.id);
                return (
                  <label
                    key={card.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer transition ${
                      selected ? "bg-amber-500/10" : "hover:bg-ink-700/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleParticipant(card.id)}
                      className="accent-amber-500"
                    />
                    <span className="text-sm text-ink-100">{card.name}</span>
                    <span className="ml-auto text-[11px] text-ink-500">
                      {card.providerId}/{card.model}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setUserEnabled((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200"
            >
              {userEnabled ? "▾" : "▸"} 启用玩家角色（我要下场参与对话）
            </button>
            {userEnabled && (
              <div className="mt-2 space-y-2 border-l border-ink-700 pl-3">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="你的角色名（必填才生效）"
                  className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
                />
                <textarea
                  value={userPersona}
                  onChange={(e) => setUserPersona(e.target.value)}
                  placeholder="你的人设/动机（可选）：角色们会知道这些"
                  className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 resize-none h-16"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-ink-300 mb-1">模式</label>
              <div className="flex gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="new-mode"
                    checked={mode === "auto"}
                    onChange={() => setMode("auto")}
                    className="accent-amber-500"
                  />
                  <span className="text-ink-200">自动</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="new-mode"
                    checked={mode === "director"}
                    onChange={() => setMode("director")}
                    className="accent-amber-500"
                  />
                  <span className="text-ink-200">导演</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs text-ink-300 mb-1">预算 tokens</label>
              <input
                type="number"
                value={budgetTokens}
                onChange={(e) => setBudgetTokens(Math.max(1000, Math.min(200000, parseInt(e.target.value) || 20000)))}
                className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-ink-100"
                min={1000}
                max={200000}
              />
            </div>
            <div>
              <label className="block text-xs text-ink-300 mb-1">lastK</label>
              <input
                type="number"
                value={lastK}
                onChange={(e) => setLastK(Math.max(1, Math.min(30, parseInt(e.target.value) || 6)))}
                className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-ink-100"
                min={1}
                max={30}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-300 mb-1">摘要 Provider（可选，用于压缩历史）</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={summaryProviderId}
                onChange={(e) => setSummaryProviderId(e.target.value)}
                className="rounded border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-ink-100"
              >
                <option value="">不配置</option>
                {(providersQuery.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={summaryModel}
                onChange={(e) => setSummaryModel(e.target.value)}
                placeholder="模型名（可选，默认取 provider 默认）"
                disabled={!summaryProviderId}
                className="rounded border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-ink-100 disabled:opacity-50"
              />
            </div>
            <p className="mt-1 text-[10px] text-ink-500">
              不配置时，「压缩历史」功能将不可用。
            </p>
          </div>
        </div>

        <div className="border-t border-ink-700 bg-ink-900/20 px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded px-4 py-2 text-sm text-ink-400 hover:text-ink-200 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={!canSubmit}
            className="rounded bg-amber-500 px-6 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-400 disabled:opacity-40 transition"
          >
            {createMut.isPending ? "创建中…" : "开演"}
          </button>
        </div>
      </div>
    </div>
  );
}
