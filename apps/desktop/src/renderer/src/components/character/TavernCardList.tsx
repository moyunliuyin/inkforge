import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NovelCharacterRecord, TavernCardRecord, ProviderRecord, TavernCardImportReport } from "@inkforge/shared";
import { tavernCardApi, providerApi } from "../../lib/api";
import { useQuery } from "@tanstack/react-query";
import { TavernCardAvatar } from "./TavernCardAvatar";

interface TavernCardListProps {
  projectId: string;
  cards: TavernCardRecord[];
  activeId: string | null;
  onSelect: (id: string) => void;
  novelCharacters: NovelCharacterRecord[];
}

export function TavernCardList({
  projectId,
  cards,
  activeId,
  onSelect,
  novelCharacters,
}: TavernCardListProps): JSX.Element {
  const queryClient = useQueryClient();
  const providersQuery = useQuery({
    queryKey: ["providers"],
    queryFn: () => providerApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (input: any) => tavernCardApi.create(input),
    onSuccess: (newCard) => {
      queryClient.invalidateQueries({ queryKey: ["tavernCards"] });
      onSelect(newCard.id);
    },
  });

  const [importReport, setImportReport] = useState<{ cardName: string; report: TavernCardImportReport } | null>(null);

  const importMut = useMutation({
    mutationFn: () => tavernCardApi.importCard(),
    onSuccess: (res) => {
      if (res.cancelled) return;
      if (!res.ok) {
        alert(`导入失败（${res.error.code}）：${res.error.message}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["tavernCards"] });
      onSelect(res.card.id);
      if (res.report.droppedFields.length > 0 || res.report.warnings.length > 0) {
        setImportReport({ cardName: res.card.name, report: res.report });
      }
    },
    onError: (err) => {
      alert(`导入失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const handleCreateFromNovel = (char: NovelCharacterRecord) => {
    const defaultProvider = providersQuery.data?.[0]?.id || "default";
    createMut.mutate({
      name: char.name,
      persona: char.persona || "",
      providerId: defaultProvider,
      model: "default",
      linkedNovelCharacterId: char.id,
      syncMode: "two-way"
    });
  };

  const handleCreateBlank = () => {
    const provider = providersQuery.data?.[0];
    if (!provider) {
      alert("请先在设置中配置一个 AI Provider");
      return;
    }
    createMut.mutate({
      name: "新角色卡",
      persona: "",
      providerId: provider.id,
      // May be empty — the editor's required-model gate forces a real value before save.
      model: provider.defaultModel,
      syncMode: "detached",
    });
  };

  const unlinkedNovelChars = novelCharacters.filter(c => !c.linkedTavernCardId);

  return (
    <div className="flex h-full flex-col bg-ink-800/40 border-l border-ink-700">
      <div className="flex items-center justify-between border-b border-ink-700 p-3">
        <h2 className="text-sm font-medium text-amber-300">酒馆卡 (AI)</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCreateBlank}
            disabled={createMut.isPending}
            className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
          >
            ＋新建
          </button>
          <button
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending}
            title="导入 SillyTavern 角色卡（PNG / JSON）"
            className="rounded bg-ink-700/60 px-2 py-1 text-xs text-ink-300 hover:bg-ink-700 disabled:opacity-50"
          >
            {importMut.isPending ? "导入中…" : "导入"}
          </button>
          <div className="relative group">
            <button className="rounded bg-ink-700/60 px-2 py-1 text-xs text-ink-300 hover:bg-ink-700">
              从书中创建
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 w-48 rounded-md border border-ink-700 bg-ink-800 shadow-xl py-1">
              {unlinkedNovelChars.map(char => (
                <button
                  key={char.id}
                  onClick={() => handleCreateFromNovel(char)}
                  className="w-full px-3 py-2 text-left text-xs text-ink-300 hover:bg-ink-700"
                >
                  {char.name}
                </button>
              ))}
              {unlinkedNovelChars.length === 0 && (
                <div className="px-3 py-2 text-xs text-ink-500">没有待绑定的书中人物</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin">
        {cards.map((card) => {
          const providerLabel = providersQuery.data?.find(p => p.id === card.providerId)?.label || card.providerId;
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              className={`flex w-full items-start gap-3 p-3 text-left transition-colors border-b border-ink-700/50 ${
                activeId === card.id ? "bg-ink-700/50" : "hover:bg-ink-700/20"
              }`}
            >
              <TavernCardAvatar card={card} sizeClassName="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-ink-100">{card.name}</span>
                  <span className="shrink-0 rounded bg-ink-800 px-1 text-[9px] text-ink-400 uppercase">
                    {card.syncMode}
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-ink-500">
                  {providerLabel} / {card.model}
                </div>
                {card.firstMes && (
                  <div className="mt-0.5 truncate text-[11px] italic text-ink-500">
                    “{card.firstMes.replaceAll("{{char}}", card.name)}”
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {cards.length === 0 && (
          <div className="p-8 text-center text-xs text-ink-500">暂无酒馆卡</div>
        )}
      </div>

      {importReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-ink-700 bg-ink-800 p-5 shadow-xl">
            <h3 className="mb-2 text-sm font-medium text-amber-300">导入完成</h3>
            <p className="mb-3 text-xs text-ink-200">
              「{importReport.cardName}」已导入（{importReport.report.spec === "chara_card_v2" ? "V2 卡" : "V1 旧格式"}
              {importReport.report.savedAvatar ? "，头像已保存" : ""}），以下内容做了调整：
            </p>
            <ul className="mb-4 max-h-48 space-y-1 overflow-auto text-xs text-ink-400 scrollbar-thin">
              {importReport.report.droppedFields.map((field) => (
                <li key={field}>
                  · 忽略暂不支持的字段 <span className="font-mono text-ink-300">{field}</span>
                </li>
              ))}
              {importReport.report.warnings.map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setImportReport(null)}
                className="rounded bg-amber-500 px-4 py-1.5 text-xs font-medium text-ink-950 hover:bg-amber-400"
              >
                好的
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
