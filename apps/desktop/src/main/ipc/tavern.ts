import { ipcMain, type BrowserWindow } from "electron";
import type {
  CompactResult,
  TavernCardAvatarGetInput,
  TavernCardAvatarGetResponse,
  TavernCardExportInput,
  TavernCardExportResponse,
  TavernCardImportResponse,
  TavernDirectorPostInput,
  TavernDirectorPostResponse,
  TavernMessageListInput,
  TavernMessageRecord,
  TavernRoundRunInput,
  TavernRoundRunResponse,
  TavernRoundStopInput,
  TavernRoundStopResponse,
  TavernSessionCreateInput,
  TavernSessionDeleteInput,
  TavernSessionGetInput,
  TavernSessionListInput,
  TavernSessionRecord,
  TavernSummaryCompactInput,
  TavernUserPostInput,
  TavernUserPostResponse,
  ipcChannels,
} from "@inkforge/shared";
import {
  createTavernSession,
  deleteTavernSessionRecord,
  getTavernSession,
  listTavernMessagesForSession,
  listTavernSessionsByProject,
  postDirectorMessage,
  postUserMessage,
} from "../services/tavern-session-service";
import {
  startTavernRound,
  stopTavernRound,
} from "../services/tavern-round-service";
import { compactTavernHistory } from "../services/tavern-summary-service";
import {
  exportTavernCardToDialog,
  getTavernCardAvatar,
  importTavernCardFromDialog,
} from "../services/tavern-card-io-service";

const TAVERN_SESSION_CREATE: typeof ipcChannels.tavernSessionCreate = "tavern-session:create";
const TAVERN_SESSION_GET: typeof ipcChannels.tavernSessionGet = "tavern-session:get";
const TAVERN_SESSION_LIST: typeof ipcChannels.tavernSessionList = "tavern-session:list";
const TAVERN_SESSION_DELETE: typeof ipcChannels.tavernSessionDelete = "tavern-session:delete";
const TAVERN_MESSAGE_LIST: typeof ipcChannels.tavernMessageList = "tavern-message:list";
const TAVERN_DIRECTOR_POST: typeof ipcChannels.tavernDirectorPost = "tavern-director:post";
const TAVERN_USER_POST: typeof ipcChannels.tavernUserPost = "tavern-user:post";
const TAVERN_ROUND_RUN: typeof ipcChannels.tavernRoundRun = "tavern-round:run";
const TAVERN_ROUND_STOP: typeof ipcChannels.tavernRoundStop = "tavern-round:stop";
const TAVERN_SUMMARY_COMPACT: typeof ipcChannels.tavernSummaryCompact = "tavern-summary:compact";
const TAVERN_CARD_IMPORT: typeof ipcChannels.tavernCardImport = "tavern-card:import";
const TAVERN_CARD_EXPORT: typeof ipcChannels.tavernCardExport = "tavern-card:export";
const TAVERN_CARD_AVATAR_GET: typeof ipcChannels.tavernCardAvatarGet = "tavern-card-avatar:get";

export function registerTavernHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(
    TAVERN_SESSION_CREATE,
    async (_event, input: TavernSessionCreateInput): Promise<TavernSessionRecord> => {
      return createTavernSession(input);
    },
  );
  ipcMain.handle(
    TAVERN_SESSION_GET,
    async (_event, input: TavernSessionGetInput): Promise<TavernSessionRecord | null> => {
      return getTavernSession(input);
    },
  );
  ipcMain.handle(
    TAVERN_SESSION_LIST,
    async (_event, input: TavernSessionListInput): Promise<TavernSessionRecord[]> => {
      return listTavernSessionsByProject(input);
    },
  );
  ipcMain.handle(
    TAVERN_SESSION_DELETE,
    async (_event, input: TavernSessionDeleteInput): Promise<{ sessionId: string }> => {
      return deleteTavernSessionRecord(input);
    },
  );
  ipcMain.handle(
    TAVERN_MESSAGE_LIST,
    async (_event, input: TavernMessageListInput): Promise<TavernMessageRecord[]> => {
      return listTavernMessagesForSession(input);
    },
  );
  ipcMain.handle(
    TAVERN_DIRECTOR_POST,
    async (_event, input: TavernDirectorPostInput): Promise<TavernDirectorPostResponse> => {
      return postDirectorMessage(input);
    },
  );
  ipcMain.handle(
    TAVERN_USER_POST,
    async (_event, input: TavernUserPostInput): Promise<TavernUserPostResponse> => {
      return postUserMessage(input);
    },
  );
  ipcMain.handle(
    TAVERN_ROUND_RUN,
    async (_event, input: TavernRoundRunInput): Promise<TavernRoundRunResponse> => {
      return startTavernRound(input, getWindow());
    },
  );
  ipcMain.handle(
    TAVERN_ROUND_STOP,
    async (_event, input: TavernRoundStopInput): Promise<TavernRoundStopResponse> => {
      return stopTavernRound(input);
    },
  );
  ipcMain.handle(
    TAVERN_SUMMARY_COMPACT,
    async (_event, input: TavernSummaryCompactInput): Promise<CompactResult> => {
      return compactTavernHistory(input);
    },
  );
  ipcMain.handle(TAVERN_CARD_IMPORT, async (): Promise<TavernCardImportResponse> => {
    return importTavernCardFromDialog(getWindow());
  });
  ipcMain.handle(
    TAVERN_CARD_EXPORT,
    async (_event, input: TavernCardExportInput): Promise<TavernCardExportResponse> => {
      return exportTavernCardToDialog(input, getWindow());
    },
  );
  ipcMain.handle(
    TAVERN_CARD_AVATAR_GET,
    async (_event, input: TavernCardAvatarGetInput): Promise<TavernCardAvatarGetResponse> => {
      return getTavernCardAvatar(input);
    },
  );
}
