import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AppSettings } from "@inkforge/shared";
import { settingsApi } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";
import { useT } from "../../lib/i18n";
import { SceneRoutingPanel } from "../SceneRoutingPanel";
import { SampleLibPanel } from "../SampleLibPanel";

export function AITab(): JSX.Element {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const t = useT();

  const mut = useMutation({
    mutationFn: (updates: Partial<AppSettings>) => settingsApi.set({ updates }),
    onSuccess: (next) => setSettings(next),
  });

  const [threshold, setThreshold] = useState(settings.analysisThreshold);
  const [dailyGoal, setDailyGoal] = useState(settings.defaultDailyGoal);
  useEffect(() => setThreshold(settings.analysisThreshold), [settings.analysisThreshold]);
  useEffect(() => setDailyGoal(settings.defaultDailyGoal), [settings.defaultDailyGoal]);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase text-ink-400">
          {t("settings.section.writing")}
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={settings.analysisEnabled}
              onChange={(e) => mut.mutate({ analysisEnabled: e.target.checked })}
            />
            <span>{t("settings.analysisEnabled")}</span>
          </label>

          <label className="flex items-center gap-3">
            <span className="text-ink-300">{t("settings.analysisThreshold")}</span>
            <input
              type="number"
              min={50}
              step={50}
              className="w-24 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || settings.analysisThreshold)}
              onBlur={() => {
                if (threshold !== settings.analysisThreshold)
                  mut.mutate({ analysisThreshold: threshold });
              }}
            />
            <span className="text-xs text-ink-500">
              {t("settings.analysisThresholdHint", { n: threshold })}
            </span>
          </label>

          <label className="flex items-center gap-3">
            <span className="text-ink-300">默认每日字数目标</span>
            <input
              type="number"
              min={0}
              step={100}
              className="w-24 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value) || 0)}
              onBlur={() => {
                if (dailyGoal !== settings.defaultDailyGoal)
                  mut.mutate({ defaultDailyGoal: dailyGoal });
              }}
            />
            <span className="text-xs text-ink-500">字</span>
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase text-ink-400">AI 路由</h3>
        <SceneRoutingPanel />
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase text-ink-400">参考小说库 (RAG)</h3>
        <SampleLibPanel />
      </section>
    </div>
  );
}
