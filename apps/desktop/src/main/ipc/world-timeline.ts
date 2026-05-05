import { ipcMain } from "electron";
import {
  deleteTimelineEvent,
  listTimelineEvents,
  saveTimelineEvent,
} from "@inkforge/storage";
import type {
  WorldTimelineDeleteInput,
  WorldTimelineEventRecord,
  WorldTimelineListInput,
  WorldTimelineSaveInput,
} from "@inkforge/shared";
import { getAppContext } from "../services/app-state";

const LIST = "world-timeline:list";
const SAVE = "world-timeline:save";
const DELETE = "world-timeline:delete";

export function registerWorldTimelineHandlers(): void {
  ipcMain.handle(LIST, async (_e, input: WorldTimelineListInput): Promise<WorldTimelineEventRecord[]> => {
    const ctx = getAppContext();
    return listTimelineEvents(ctx.db, {
      projectId: input.projectId,
      entryKind: input.entryKind,
      entryId: input.entryId,
      upToChapterOrder: input.upToChapterOrder,
    });
  });

  ipcMain.handle(SAVE, async (_e, input: WorldTimelineSaveInput): Promise<WorldTimelineEventRecord> => {
    const ctx = getAppContext();
    return saveTimelineEvent(ctx.db, input);
  });

  ipcMain.handle(DELETE, async (_e, input: WorldTimelineDeleteInput): Promise<{ id: string }> => {
    const ctx = getAppContext();
    deleteTimelineEvent(ctx.db, input.id);
    return { id: input.id };
  });
}
