import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../stores/app-store";
import { novelCharacterApi, tavernCardApi } from "../lib/api";
import { NovelCharacterList } from "../components/character/NovelCharacterList";
import { NovelCharacterDetail } from "../components/character/NovelCharacterDetail";
import { TavernCardList } from "../components/character/TavernCardList";
import { TavernCardDetail } from "../components/character/TavernCardDetail";
import { SyncDiffDialog } from "../components/character/SyncDiffDialog";

export function CharacterPage(): JSX.Element {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const activeNovelCharacterId = useAppStore((s) => s.activeNovelCharacterId);
  const setActiveNovelCharacterId = useAppStore((s) => s.setActiveNovelCharacterId);
  const activeTavernCardId = useAppStore((s) => s.activeTavernCardId);
  const setActiveTavernCardId = useAppStore((s) => s.setActiveTavernCardId);
  const syncDiffData = useAppStore((s) => s.syncDiffData);
  const setSyncDiffData = useAppStore((s) => s.setSyncDiffData);
  const [cardEditorDirty, setCardEditorDirty] = useState(false);

  const novelCharsQuery = useQuery({
    queryKey: ["novelCharacters", currentProjectId],
    queryFn: () => currentProjectId ? novelCharacterApi.list({ projectId: currentProjectId }) : Promise.resolve([]),
    enabled: !!currentProjectId,
  });

  const tavernCardsQuery = useQuery({
    queryKey: ["tavernCards", currentProjectId],
    queryFn: () => tavernCardApi.list({ projectId: currentProjectId || undefined }),
  });

  if (!currentProjectId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-900/60 text-ink-300">
        <div className="max-w-md rounded-lg border border-ink-700 bg-ink-800/60 p-6 text-center">
          <div className="mb-2 text-lg text-amber-300">未选择项目</div>
          <p className="text-sm text-ink-300">请先在侧边栏选择或创建一个项目以管理人物。</p>
        </div>
      </div>
    );
  }

  const activeChar = (novelCharsQuery.data || []).find(c => c.id === activeNovelCharacterId);
  const activeTavernCard = (tavernCardsQuery.data || []).find(c => c.id === activeTavernCardId);

  const guardCardDirty = (): boolean => {
    if (!cardEditorDirty) return true;
    return window.confirm("酒馆卡有未保存的修改，切换将丢失。继续？");
  };

  return (
    <div className="flex h-full w-full bg-ink-900 overflow-hidden">
      {/* Left Column: Novel Character List */}
      <aside className="w-[300px] shrink-0 border-r border-ink-700">
        <NovelCharacterList
          projectId={currentProjectId}
          characters={novelCharsQuery.data || []}
          activeId={activeNovelCharacterId}
          onSelect={(id) => {
            if (!guardCardDirty()) return;
            setCardEditorDirty(false);
            setActiveTavernCardId(null);
            setActiveNovelCharacterId(id);
          }}
        />
      </aside>

      {/* Center Column: Detail Editor (tavern card takes priority when selected) */}
      <main className="flex-1 min-w-0 flex flex-col">
        {activeTavernCard ? (
          <TavernCardDetail
            card={activeTavernCard}
            onClose={() => {
              if (!guardCardDirty()) return;
              setCardEditorDirty(false);
              setActiveTavernCardId(null);
            }}
            onDirtyChange={setCardEditorDirty}
          />
        ) : activeChar ? (
          <NovelCharacterDetail
            novelCharacter={activeChar}
            tavernCards={tavernCardsQuery.data || []}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-500 text-sm italic">
            请从左侧选择一个角色，或从右侧选择一张酒馆卡开始编辑
          </div>
        )}
      </main>

      {/* Right Column: Tavern Card List */}
      <aside className="w-[320px] shrink-0">
        <TavernCardList
          projectId={currentProjectId}
          cards={tavernCardsQuery.data || []}
          activeId={activeTavernCardId}
          onSelect={(id) => {
            if (id === activeTavernCardId) return;
            if (!guardCardDirty()) return;
            setCardEditorDirty(false);
            setActiveTavernCardId(id);
          }}
          novelCharacters={novelCharsQuery.data || []}
          importDisabled={cardEditorDirty}
        />
      </aside>

      {/* Conflict Dialog */}
      {syncDiffData && (
        <SyncDiffDialog 
          open={true}
          previewData={syncDiffData.previewData}
          novelCharId={syncDiffData.novelCharId}
          tavernCardId={syncDiffData.tavernCardId}
          onClose={() => setSyncDiffData(null)}
          onApplied={() => setSyncDiffData(null)}
        />
      )}
    </div>
  );
}
