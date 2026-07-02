import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderRecord, SyncMode, TavernCardRecord } from "@inkforge/shared";
import { providerApi, tavernCardApi } from "../../lib/api";

interface TavernCardDetailProps {
  card: TavernCardRecord;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface CardForm {
  name: string;
  persona: string;
  firstMes: string;
  scenario: string;
  mesExample: string;
  providerId: string;
  model: string;
  temperature: number;
  maxTokens: string;
  syncMode: SyncMode;
}

function formFromCard(card: TavernCardRecord): CardForm {
  return {
    name: card.name,
    persona: card.persona,
    firstMes: card.firstMes,
    scenario: card.scenario,
    mesExample: card.mesExample,
    providerId: card.providerId,
    model: card.model,
    temperature: card.temperature,
    maxTokens: card.maxTokens === null ? "" : String(card.maxTokens),
    syncMode: card.syncMode,
  };
}

/** Mirror of what save/server normalization produces — trim-insignificant edits don't count as dirty. */
function comparableForm(form: CardForm): CardForm {
  return {
    ...form,
    name: form.name.trim(),
    model: form.model.trim(),
    firstMes: form.firstMes.trim(),
    scenario: form.scenario.trim(),
    mesExample: form.mesExample.trim(),
    maxTokens: form.maxTokens.trim(),
  };
}

export function TavernCardDetail({ card, onClose, onDirtyChange }: TavernCardDetailProps): JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CardForm>(() => formFromCard(card));

  const dirty = useMemo(
    () => JSON.stringify(comparableForm(form)) !== JSON.stringify(comparableForm(formFromCard(card))),
    [form, card],
  );
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const cardIdRef = useRef(card.id);

  // Reset the form on card switch, always. On a mere updatedAt bump (save
  // refetch / external sync) keep in-flight edits: resetting would clobber
  // keystrokes typed while the save was in flight.
  useEffect(() => {
    const switched = cardIdRef.current !== card.id;
    cardIdRef.current = card.id;
    if (switched || !dirtyRef.current) {
      setForm(formFromCard(card));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, card.updatedAt]);

  const providersQuery = useQuery<ProviderRecord[]>({
    queryKey: ["providers"],
    queryFn: () => providerApi.list(),
  });

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const saveMut = useMutation({
    mutationFn: () =>
      tavernCardApi.update({
        id: card.id,
        name: form.name.trim(),
        persona: form.persona,
        firstMes: form.firstMes,
        scenario: form.scenario,
        mesExample: form.mesExample,
        providerId: form.providerId,
        model: form.model.trim(),
        temperature: form.temperature,
        maxTokens: form.maxTokens.trim() === "" ? null : parseInt(form.maxTokens, 10),
        syncMode: form.syncMode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tavernCards"] });
    },
    onError: (err) => {
      alert(`保存失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const set = <K extends keyof CardForm>(key: K, value: CardForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSave = dirty && form.name.trim().length > 0 && form.model.trim().length > 0 && !saveMut.isPending;
  const providers = providersQuery.data || [];
  const providerKnown = providers.some((p) => p.id === form.providerId);
  const firstMesPreview = form.firstMes.trim()
    ? form.firstMes.replaceAll("{{char}}", form.name.trim() || "角色")
    : "";

  const longField = (
    label: string,
    key: "persona" | "scenario" | "firstMes" | "mesExample",
    rows: number,
    placeholder: string,
    hint?: string,
  ) => (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-xs font-medium text-ink-200">{label}</label>
        {hint && <span className="text-[10px] text-ink-500">{hint}</span>}
      </div>
      <textarea
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded border border-ink-700 bg-ink-900 px-2.5 py-2 text-xs text-ink-100 resize-y focus:border-amber-500/60 outline-none"
      />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-ink-700 bg-ink-800/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-lg">
            🎭
          </div>
          <div className="min-w-0">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="角色名（必填）"
              className="w-56 bg-transparent text-sm font-medium text-ink-50 border-b border-transparent focus:border-amber-500 outline-none pb-0.5"
            />
            <p className="text-[10px] text-ink-500">
              {card.linkedNovelCharacterId ? "已关联书中人物" : "独立酒馆卡"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[11px] text-amber-400">未保存</span>}
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={!canSave}
            className="rounded bg-amber-500 px-4 py-1.5 text-xs font-medium text-ink-950 hover:bg-amber-400 disabled:opacity-40"
          >
            {saveMut.isPending ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1.5 text-xs text-ink-400 hover:text-ink-200"
            title="关闭编辑器"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3 space-y-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                模型配置
              </h4>
              <div>
                <label className="mb-1 block text-xs text-ink-400">Provider</label>
                <select
                  value={form.providerId}
                  onChange={(e) => set("providerId", e.target.value)}
                  className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
                >
                  {!providerKnown && form.providerId && (
                    <option value={form.providerId}>{form.providerId}（已失效）</option>
                  )}
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-400">模型（必填）</label>
                <input
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder="如 deepseek-chat"
                  className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-ink-400">温度</span>
                  <span className="font-mono text-amber-400">{form.temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={form.temperature}
                  onChange={(e) => set("temperature", parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-400">
                  最大回复 tokens（留空 = Provider 默认）
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxTokens}
                  onChange={(e) => set("maxTokens", e.target.value)}
                  placeholder="默认"
                  className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100 font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-400">与书中人物同步</label>
                <select
                  value={form.syncMode}
                  onChange={(e) => set("syncMode", e.target.value as SyncMode)}
                  className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
                >
                  <option value="two-way">two-way · 双向同步</option>
                  <option value="snapshot">snapshot · 单次快照</option>
                  <option value="detached">detached · 不同步</option>
                </select>
              </div>
            </div>
            <p className="px-1 text-[10px] leading-relaxed text-ink-500">
              persona / 场景 / 开场白 / 示例对白中可用 {"{{char}}"} 指代角色名，运行时自动替换。
            </p>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {longField(
              "人设 persona",
              "persona",
              6,
              "角色的背景、性格、口癖、动机……",
            )}
            {longField(
              "场景 scenario",
              "scenario",
              3,
              "如：{{char}}与旅人在暴雨夜的酒馆相遇。",
              "注入系统提示，约束对话发生的场景",
            )}
            <div>
              {longField(
                "开场白 first message",
                "firstMes",
                4,
                "会话开始时该角色的第一句发言。",
                "首次推进且对话为空时自动作为角色发言出现",
              )}
              {firstMesPreview && (
                <div className="mt-1 rounded border border-ink-700 bg-ink-900/60 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">预览</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-xs italic leading-relaxed text-ink-300">
                    {firstMesPreview}
                  </div>
                </div>
              )}
            </div>
            {longField(
              "示例对白 example dialogue",
              "mesExample",
              5,
              "示例问答，用于锚定语气与节奏。",
              "仅作语气参考注入，不会被复述",
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
