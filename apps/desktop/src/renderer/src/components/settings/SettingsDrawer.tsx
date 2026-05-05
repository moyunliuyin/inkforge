import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/app-store";
import { useT } from "../../lib/i18n";
import { AppearanceTab } from "./AppearanceTab";
import { BehaviorTab } from "./BehaviorTab";
import { DataTab } from "./DataTab";
import { AITab } from "./AITab";

type TabKey = "appearance" | "behavior" | "data" | "ai";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "appearance", label: "外观" },
  { key: "behavior", label: "行为" },
  { key: "data", label: "数据" },
  { key: "ai", label: "AI" },
];

export function SettingsDrawer(): JSX.Element | null {
  const open = useAppStore((s) => s.settingsPanelOpen);
  const setOpen = useAppStore((s) => s.openSettings);
  const [active, setActive] = useState<TabKey>("appearance");
  const t = useT();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-drawer-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex h-full w-[520px] flex-col border-l border-ink-700 bg-ink-800 text-ink-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 px-5 py-3">
          <h2 id="settings-drawer-title" className="text-base font-semibold">
            {t("settings.title")}
          </h2>
          <button
            className="rounded px-2 py-1 text-sm text-ink-300 hover:bg-ink-700"
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-ink-700 px-3 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`rounded-t-md border-b-2 px-3 py-1.5 text-sm transition-colors ${
                active === tab.key
                  ? "border-amber-500 text-amber-300"
                  : "border-transparent text-ink-400 hover:text-ink-200"
              }`}
              onClick={() => setActive(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {active === "appearance" && <AppearanceTab />}
          {active === "behavior" && <BehaviorTab />}
          {active === "data" && <DataTab />}
          {active === "ai" && <AITab />}
        </div>
      </div>
    </div>
  );
}
