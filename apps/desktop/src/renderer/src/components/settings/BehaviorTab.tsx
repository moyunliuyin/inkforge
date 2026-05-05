import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AppSettings } from "@inkforge/shared";
import { settingsApi } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";

export function BehaviorTab(): JSX.Element {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  const mut = useMutation({
    mutationFn: (updates: Partial<AppSettings>) => settingsApi.set({ updates }),
    onSuccess: (next) => setSettings(next),
  });

  const [autoSave, setAutoSave] = useState(settings.autoSaveInterval);
  useEffect(() => setAutoSave(settings.autoSaveInterval), [settings.autoSaveInterval]);

  return (
    <div className="space-y-4">
      <Toggle
        checked={settings.companionEnabled}
        onChange={(v) => mut.mutate({ companionEnabled: v })}
        title="启用桌宠"
        hint="关闭后右下角不再显示陪伴桌宠"
      />

      <Toggle
        checked={settings.autoOpenLastProject}
        onChange={(v) => mut.mutate({ autoOpenLastProject: v })}
        title="启动时自动打开上次项目"
      />

      <Toggle
        checked={settings.pageProjectSwitcher}
        onChange={(v) => mut.mutate({ pageProjectSwitcher: v })}
        title="页面内显示项目切换器"
        hint="开启后写作 / 大纲 / 世界观页顶部额外显示项目切换器（标题栏始终保留）"
      />

      <Toggle
        checked={settings.devModeEnabled}
        onChange={(v) => mut.mutate({ devModeEnabled: v })}
        title="开发者模式"
        hint="显示调试工具与原始 IPC 输出"
      />

      <label className="flex items-center gap-3">
        <span className="w-32 shrink-0 text-ink-300">自动保存间隔</span>
        <input
          type="number"
          min={0}
          max={3600}
          step={5}
          className="w-24 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
          value={autoSave}
          onChange={(e) => setAutoSave(Number(e.target.value) || 0)}
          onBlur={() => {
            if (autoSave !== settings.autoSaveInterval)
              mut.mutate({ autoSaveInterval: autoSave });
          }}
        />
        <span className="text-xs text-ink-500">秒，0 = 关闭</span>
      </label>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint?: string;
}): JSX.Element {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <div className="text-sm font-medium text-ink-100">{title}</div>
        {hint && <div className="text-xs text-ink-400">{hint}</div>}
      </div>
    </label>
  );
}
