import type { DB } from "../db";
import type { AppSettings, SceneRoutingMode } from "@inkforge/shared";
import { coerceLang } from "@inkforge/shared";

const DEFAULTS: AppSettings = {
  theme: "dark",
  activeProviderId: null,
  analysisEnabled: true,
  analysisThreshold: 200,
  uiLanguage: "zh",
  devModeEnabled: false,
  onboardingCompleted: false,
  sceneRoutingMode: "basic",
  editorFontSize: 14,
  editorFontFamily: "",
  companionEnabled: true,
  autoSaveInterval: 60,
  autoOpenLastProject: true,
  dataDir: null,
  autoBackup: false,
  defaultDailyGoal: 1000,
  pageProjectSwitcher: false,
};

type SettingRow = { key: string; value: string };

function parseValue(key: keyof AppSettings, raw: string): AppSettings[keyof AppSettings] {
  switch (key) {
    case "theme":
      if (raw === "light") return "light";
      if (raw === "system") return "system";
      return "dark";
    case "activeProviderId":
    case "dataDir":
      return raw ? raw : null;
    case "analysisEnabled":
    case "devModeEnabled":
    case "onboardingCompleted":
    case "companionEnabled":
    case "autoOpenLastProject":
    case "autoBackup":
    case "pageProjectSwitcher":
      return raw === "true";
    case "analysisThreshold":
    case "autoSaveInterval":
    case "defaultDailyGoal": {
      if (!/^-?\d+$/.test(raw)) return DEFAULTS[key];
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULTS[key];
    }
    case "editorFontSize": {
      if (!/^-?\d+$/.test(raw)) return DEFAULTS.editorFontSize;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return DEFAULTS.editorFontSize;
      return Math.max(8, Math.min(72, parsed));
    }
    case "uiLanguage":
      return coerceLang(raw, DEFAULTS.uiLanguage);
    case "sceneRoutingMode":
      return raw === "advanced" ? "advanced" : ("basic" as SceneRoutingMode);
    case "editorFontFamily":
      return raw;
    default:
      return raw as AppSettings[keyof AppSettings];
  }
}

function encodeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function getAppSettings(db: DB): AppSettings {
  const rows = db.prepare(`SELECT key, value FROM app_settings`).all() as SettingRow[];
  const snapshot: AppSettings = { ...DEFAULTS };
  for (const row of rows) {
    if ((row.key as keyof AppSettings) in DEFAULTS) {
      (snapshot as unknown as Record<string, unknown>)[row.key] = parseValue(
        row.key as keyof AppSettings,
        row.value,
      );
    }
  }
  return snapshot;
}

export function setAppSettings(db: DB, updates: Partial<AppSettings>): AppSettings {
  const stmt = db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  const tx = db.transaction((entries: [string, string][]) => {
    entries.forEach(([key, value]) => stmt.run({ key, value }));
  });
  const entries: [string, string][] = Object.entries(updates)
    .filter(([key]) => (key as keyof AppSettings) in DEFAULTS)
    .map(([key, value]) => [key, encodeValue(value)]);
  if (entries.length > 0) tx(entries);
  return getAppSettings(db);
}
