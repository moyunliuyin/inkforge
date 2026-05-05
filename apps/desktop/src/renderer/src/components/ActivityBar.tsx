import type { MainView } from "../stores/app-store";
import { useAppStore } from "../stores/app-store";

interface NavItem {
  view: MainView;
  icon: string;
  label: string;
  shortcut: string;
}

const ITEMS: NavItem[] = [
  { view: "writing", icon: "✍", label: "写作", shortcut: "Ctrl+1" },
  { view: "outline", icon: "📋", label: "大纲", shortcut: "Ctrl+`" },
  { view: "skill", icon: "🧩", label: "Skill", shortcut: "Ctrl+2" },
  { view: "character", icon: "👥", label: "人物", shortcut: "Ctrl+3" },
  { view: "tavern", icon: "🎭", label: "酒馆", shortcut: "Ctrl+4" },
  { view: "world", icon: "🌍", label: "世界观", shortcut: "Ctrl+5" },
  { view: "research", icon: "📚", label: "资料", shortcut: "Ctrl+6" },
  { view: "review", icon: "📊", label: "审查", shortcut: "Ctrl+7" },
  { view: "bookshelf", icon: "📖", label: "书房", shortcut: "Ctrl+8" },
  { view: "letters", icon: "📬", label: "来信", shortcut: "Ctrl+9" },
  { view: "achievement", icon: "🏆", label: "成就", shortcut: "Ctrl+0" },
];

export function ActivityBar(): JSX.Element {
  const mainView = useAppStore((s) => s.mainView);
  const setMainView = useAppStore((s) => s.setMainView);
  const openSettings = useAppStore((s) => s.openSettings);

  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-ink-700 bg-ink-900/90 py-2">
      {ITEMS.map((item) => {
        const active = mainView === item.view;
        return (
          <button
            key={item.view}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-md text-lg transition-colors ${
              active
                ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                : "text-ink-300 hover:bg-ink-700/60 hover:text-ink-100"
            }`}
            onClick={() => setMainView(item.view)}
            title={`${item.label} (${item.shortcut})`}
          >
            <span aria-hidden>{item.icon}</span>
            <span className="pointer-events-none absolute left-12 z-20 whitespace-nowrap rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-ink-100 opacity-0 shadow transition-opacity group-hover:opacity-100">
              {item.label}
              <span className="ml-2 text-ink-400">{item.shortcut}</span>
            </span>
          </button>
        );
      })}

      <button
        className="group relative mt-auto flex h-10 w-10 items-center justify-center rounded-md text-lg text-ink-300 transition-colors hover:bg-ink-700/60 hover:text-ink-100"
        onClick={() => openSettings(true)}
        title="设置"
      >
        <span aria-hidden>⚙</span>
        <span className="pointer-events-none absolute left-12 z-20 whitespace-nowrap rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-ink-100 opacity-0 shadow transition-opacity group-hover:opacity-100">
          设置
        </span>
      </button>
    </nav>
  );
}
