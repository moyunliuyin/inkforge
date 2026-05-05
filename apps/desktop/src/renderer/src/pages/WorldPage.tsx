import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../stores/app-store";
import { worldApi } from "../lib/api";
import { WorldCategorySidebar } from "../components/world/WorldCategorySidebar";
import { WorldEntryList } from "../components/world/WorldEntryList";
import { WorldEntryDetail } from "../components/world/WorldEntryDetail";
import { WorldGraph } from "../components/world/WorldGraph";
import { ProjectSwitcher } from "../components/ProjectSwitcher";

const DRAFT_ID = "__draft__";
type WorldTab = "entries" | "graph";

export function WorldPage(): JSX.Element {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const activeCategory = useAppStore((s) => s.activeWorldCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveWorldCategory);
  const activeEntryId = useAppStore((s) => s.activeWorldEntryId);
  const setActiveEntryId = useAppStore((s) => s.setActiveWorldEntryId);
  const searchQuery = useAppStore((s) => s.worldSearchQuery);
  const setSearchQuery = useAppStore((s) => s.setWorldSearchQuery);
  const [tab, setTab] = useState<WorldTab>("entries");
  const pageProjectSwitcher = useAppStore((s) => s.settings.pageProjectSwitcher);

  const allEntriesQuery = useQuery({
    queryKey: ["world-entries", currentProjectId],
    queryFn: () =>
      currentProjectId
        ? worldApi.list({ projectId: currentProjectId })
        : Promise.resolve([]),
    enabled: !!currentProjectId,
  });

  const filteredEntries = useMemo(() => {
    const list = allEntriesQuery.data ?? [];
    const query = searchQuery.trim().toLowerCase();
    return list.filter((entry) => {
      if (activeCategory && entry.category !== activeCategory) return false;
      if (!query) return true;
      if (entry.title.toLowerCase().includes(query)) return true;
      if (entry.category.toLowerCase().includes(query)) return true;
      if (entry.aliases.some((a) => a.toLowerCase().includes(query))) return true;
      if (entry.tags.some((t) => t.toLowerCase().includes(query))) return true;
      if (entry.content.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [allEntriesQuery.data, activeCategory, searchQuery]);

  const activeEntry = useMemo(() => {
    if (!activeEntryId || activeEntryId === DRAFT_ID) return null;
    return (
      (allEntriesQuery.data ?? []).find((entry) => entry.id === activeEntryId) ?? null
    );
  }, [allEntriesQuery.data, activeEntryId]);

  useEffect(() => {
    if (
      activeEntryId &&
      activeEntryId !== DRAFT_ID &&
      allEntriesQuery.data &&
      !allEntriesQuery.data.some((e) => e.id === activeEntryId)
    ) {
      setActiveEntryId(null);
    }
  }, [activeEntryId, allEntriesQuery.data, setActiveEntryId]);

  if (!currentProjectId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-900/60 text-ink-300">
        <div className="max-w-md rounded-lg border border-ink-700 bg-ink-800/60 p-6 text-center">
          <div className="mb-2 text-lg text-amber-300">🌍 世界观设定库</div>
          <p className="text-sm text-ink-300">
            请先在侧边栏选择或创建一个项目以管理设定条目。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-ink-900">
      <div className="flex shrink-0 items-center gap-1 border-b border-ink-700 px-3 py-1.5 text-xs">
        <button
          className={`rounded-md px-3 py-1 ${tab === "entries" ? "bg-amber-500 text-ink-900" : "text-ink-300 hover:bg-ink-800"}`}
          onClick={() => setTab("entries")}
        >
          条目
        </button>
        <button
          className={`rounded-md px-3 py-1 ${tab === "graph" ? "bg-amber-500 text-ink-900" : "text-ink-300 hover:bg-ink-800"}`}
          onClick={() => setTab("graph")}
        >
          关系图
        </button>
        {pageProjectSwitcher && (
          <div className="ml-auto">
            <ProjectSwitcher variant="inline" />
          </div>
        )}
      </div>
      {tab === "entries" ? (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-[220px] shrink-0">
            <WorldCategorySidebar
              entries={allEntriesQuery.data ?? []}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </aside>
          <section className="w-[300px] shrink-0">
            <WorldEntryList
              entries={filteredEntries}
              activeId={activeEntryId}
              searchQuery={searchQuery}
              onQueryChange={setSearchQuery}
              onSelect={setActiveEntryId}
              onCreate={() => setActiveEntryId(DRAFT_ID)}
            />
          </section>
          <WorldEntryDetail
            projectId={currentProjectId}
            entry={activeEntry}
            onDeleted={() => setActiveEntryId(null)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <WorldGraph projectId={currentProjectId} />
        </div>
      )}
    </div>
  );
}
