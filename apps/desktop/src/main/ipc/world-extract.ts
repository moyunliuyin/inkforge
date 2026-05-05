import { ipcMain } from "electron";
import type {
  WorldExtractRunInput,
  WorldExtractRunResponse,
} from "@inkforge/shared";
import { extractWorldFromBook } from "../services/world-extract-service";

const RUN = "world-extract:run";

export function registerWorldExtractHandlers(): void {
  ipcMain.handle(RUN, async (_e, input: WorldExtractRunInput): Promise<WorldExtractRunResponse> => {
    return extractWorldFromBook({ projectId: input.projectId });
  });
}
