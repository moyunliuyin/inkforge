import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NovelCharacterRecord, TavernCardRecord, ProviderRecord } from "@inkforge/shared";
import { tavernCardApi, providerApi } from "../../lib/api";
import { useQuery } from "@tanstack/react-query";

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
      model: provider.defaultModel || "default",
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-lg">
                🎭
              </div>
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
    </div>
  );
}
