import { BrowserWindow, app } from "electron";
import { initLogger, logger } from "./services/logger";
import { getAppContext, disposeAppContext } from "./services/app-state";
import { seedBuiltinPresets } from "./services/skill-io-service";
import {
  disposeSkillTriggerService,
  initializeSkillTriggerService,
} from "./services/skill-trigger-service";
import { disposeAll as disposeTerminals } from "./services/terminal-service";
import { clearCrashMarker, initCrashMarker, recordCrashReason } from "./services/crash-marker";
import { disposeVacuumScheduler, initVacuumScheduler } from "./services/vacuum-scheduler";
import { createMainWindow } from "./window";
import { buildAppMenu } from "./menu";
import { registerIpcHandlers } from "./ipc/register";

// Windows 11 + Chromium paint regression: DWM reports occlusion wrongly,
// Chromium stops drawing until user interaction (select/hover). See Electron #25344.
// Must run before app.whenReady().
if (process.platform === "win32") {
  app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
}

let mainWindow: BrowserWindow | null = null;
let deferredInitHandle: NodeJS.Immediate | null = null;

function getWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

async function bootstrap(): Promise<void> {
  try {
    initLogger();
    const ctx = getAppContext();
    initCrashMarker(ctx.userDataDir);
    wireCrashReasonCapture();
    buildAppMenu();
    registerIpcHandlers(getWindow);
    // M9: open the window immediately, defer non-critical init (vacuum scheduler,
    // skill triggers, preset seeding) to setImmediate so the renderer paints first.
    mainWindow = createMainWindow();
    deferredInitHandle = setImmediate(() => {
      deferredInitHandle = null;
      try {
        initVacuumScheduler(ctx.db, ctx.workspaceDir);
        initializeSkillTriggerService(getWindow);
        seedBuiltinPresets();
        logger.info("InkForge deferred init complete");
      } catch (err) {
        logger.error("Deferred init failed", err);
      }
    });
    logger.info("InkForge main process ready (window shown)");
  } catch (error) {
    logger.error("Failed to bootstrap main process", error);
    throw error;
  }
}

function wireCrashReasonCapture(): void {
  const capture = (label: string, err: unknown): void => {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const stack = err instanceof Error && err.stack ? `\n${err.stack}` : "";
    recordCrashReason(`${label}: ${msg}${stack}`.slice(0, 4000));
    logger.error(`${label}`, err);
  };
  process.on("uncaughtException", (err) => capture("uncaughtException", err));
  process.on("unhandledRejection", (err) => capture("unhandledRejection", err));
}

app.whenReady().then(bootstrap).catch((err) => {
  console.error(err);
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

app.on("before-quit", () => {
  if (deferredInitHandle) {
    clearImmediate(deferredInitHandle);
    deferredInitHandle = null;
  }
  disposeSkillTriggerService();
  disposeTerminals();
  disposeVacuumScheduler();
  disposeAppContext();
  clearCrashMarker();
});
