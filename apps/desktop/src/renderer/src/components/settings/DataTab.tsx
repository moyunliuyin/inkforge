import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AppSettings } from "@inkforge/shared";
import { settingsApi } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";
import { useT } from "../../lib/i18n";

export function DataTab(): JSX.Element {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const t = useT();

  const mut = useMutation({
    mutationFn: (updates: Partial<AppSettings>) => settingsApi.set({ updates }),
    onSuccess: (next) => setSettings(next),
  });

  const [dataDir, setDataDir] = useState(settings.dataDir ?? "");
  useEffect(() => setDataDir(settings.dataDir ?? ""), [settings.dataDir]);

  const handleCopyDiag = async () => {
    try {
      const res = await window.inkforge.diag.snapshot({});
      await navigator.clipboard.writeText(res.text);
      alert(t("common.copy") + " ✓");
    } catch (err) {
      alert(t("error.generic") + ": " + String(err));
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-ink-300">数据目录（重启生效）</span>
        <input
          type="text"
          className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          placeholder="留空使用默认位置（用户数据目录）"
          value={dataDir}
          onChange={(e) => setDataDir(e.target.value)}
          onBlur={() => {
            const v = dataDir.trim() || null;
            if (v !== settings.dataDir) mut.mutate({ dataDir: v });
          }}
        />
        <span className="text-xs text-ink-500">
          自定义后请确保 InkForge 对该目录有读写权限。
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={settings.autoBackup}
          onChange={(e) => mut.mutate({ autoBackup: e.target.checked })}
        />
        <div>
          <div className="text-sm font-medium text-ink-100">自动备份</div>
          <div className="text-xs text-ink-400">启动时备份 SQLite 数据库到 backup/ 子目录</div>
        </div>
      </label>

      <div className="pt-2">
        <button
          className="rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-700 hover:text-ink-100"
          onClick={handleCopyDiag}
        >
          {t("error.boundary.copyDiag")}
        </button>
        <span className="ml-3 text-xs text-ink-500">复制系统/版本/路径诊断信息到剪贴板</span>
      </div>
    </div>
  );
}
