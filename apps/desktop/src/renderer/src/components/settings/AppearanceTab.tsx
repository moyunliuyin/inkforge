import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AppSettings, Lang } from "@inkforge/shared";
import { getAnalysisThreshold } from "@inkforge/shared";
import { settingsApi } from "../../lib/api";
import { useAppStore } from "../../stores/app-store";

export function AppearanceTab(): JSX.Element {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  const mut = useMutation({
    mutationFn: (updates: Partial<AppSettings>) => settingsApi.set({ updates }),
    onSuccess: (next) => setSettings(next),
  });

  const handleLanguageChange = (lang: Lang) => {
    const nextDefault = getAnalysisThreshold(lang);
    const currentIsDefault =
      settings.analysisThreshold === getAnalysisThreshold(settings.uiLanguage);
    const updates: Partial<AppSettings> = { uiLanguage: lang };
    if (currentIsDefault && settings.analysisThreshold !== nextDefault) {
      updates.analysisThreshold = nextDefault;
    }
    mut.mutate(updates);
  };

  const [fontSize, setFontSize] = useState(settings.editorFontSize);
  const [fontFamily, setFontFamily] = useState(settings.editorFontFamily);
  useEffect(() => setFontSize(settings.editorFontSize), [settings.editorFontSize]);
  useEffect(() => setFontFamily(settings.editorFontFamily), [settings.editorFontFamily]);

  const themes: Array<{ value: AppSettings["theme"]; label: string }> = [
    { value: "dark", label: "深色" },
    { value: "light", label: "浅色" },
    { value: "system", label: "跟随系统" },
  ];

  return (
    <div className="space-y-6">
      <Field label="主题">
        <div className="flex overflow-hidden rounded-md border border-ink-600">
          {themes.map((t) => (
            <button
              key={t.value}
              className={`px-3 py-1 text-xs ${
                settings.theme === t.value
                  ? "bg-amber-500 text-ink-900"
                  : "text-ink-300 hover:bg-ink-700"
              }`}
              onClick={() => mut.mutate({ theme: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="界面语言">
        <select
          className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
          value={settings.uiLanguage}
          onChange={(e) => handleLanguageChange(e.target.value as Lang)}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </Field>

      <Field label="编辑器字号" hint={`${fontSize}px`}>
        <input
          type="range"
          min={10}
          max={28}
          step={1}
          className="w-48"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          onMouseUp={() => {
            if (fontSize !== settings.editorFontSize) mut.mutate({ editorFontSize: fontSize });
          }}
          onTouchEnd={() => {
            if (fontSize !== settings.editorFontSize) mut.mutate({ editorFontSize: fontSize });
          }}
        />
      </Field>

      <Field label="编辑器字体" hint="留空使用默认 CJK 字体">
        <input
          type="text"
          className="w-64 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
          placeholder="例如：Noto Serif CJK SC, sans-serif"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          onBlur={() => {
            if (fontFamily !== settings.editorFontFamily)
              mut.mutate({ editorFontFamily: fontFamily });
          }}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-ink-300">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </label>
  );
}
