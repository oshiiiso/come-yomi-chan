import { contextBridge, ipcRenderer } from 'electron';

function onChannel(
  channel: string,
  callback: (payload: unknown) => void,
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: unknown) =>
    callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (partial: Record<string, unknown>) =>
    ipcRenderer.invoke('config:save', partial),
  resetConfig: () => ipcRenderer.invoke('config:reset'),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),
  getStatus: () => ipcRenderer.invoke('live:status'),
  connect: () => ipcRenderer.invoke('live:connect'),
  disconnect: () => ipcRenderer.invoke('live:disconnect'),
  lookupUser: (uniqueId?: string) => ipcRenderer.invoke('live:lookup-user', uniqueId),
  getTtsVoices: () => ipcRenderer.invoke('tts:voices'),
  checkTtsEngine: () => ipcRenderer.invoke('tts:check'),
  previewTts: () => ipcRenderer.invoke('tts:preview'),
  skipSpeech: () => ipcRenderer.invoke('tts:skip'),
  clearSpeechQueue: () => ipcRenderer.invoke('tts:clear-queue'),
  sendTestEvent: (
    type: string,
    giftCount: number,
    giftId?: string,
    badges?: {
      isFanClub?: boolean;
      fanClubStatus?: number;
      isSuperFan?: boolean;
      fanClubLevel?: number;
      isModerator?: boolean;
      isAnchor?: boolean;
      diamondCount?: number;
      superFanBox?: boolean;
      portalJoin?: boolean;
    },
  ) => ipcRenderer.invoke('tester:send', type, giftCount, giftId, badges),
  saveSessionLog: () => ipcRenderer.invoke('log:save'),
  getTestGifts: () => ipcRenderer.invoke('tester:gifts'),
  refreshTestGifts: (uniqueId?: string) =>
    ipcRenderer.invoke('tester:gifts-refresh', uniqueId),
  previewOverlay: (target?: string) => ipcRenderer.invoke('overlay:preview', target),
  clearOverlay: () => ipcRenderer.invoke('overlay:clear'),
  clearOverlayPin: () => ipcRenderer.invoke('overlay:clear-pin'),
  copyOverlayUrl: (kind?: string) => ipcRenderer.invoke('overlay:copy-url', kind),
  copyVoicevoxCredit: () => ipcRenderer.invoke('tts:copy-credit'),
  pickVoicevoxExe: () => ipcRenderer.invoke('tts:pick-voicevox'),
  launchVoicevox: () => ipcRenderer.invoke('tts:launch-voicevox'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getHelpContent: () => ipcRenderer.invoke('help:content'),
  openHelp: (topic?: string) => ipcRenderer.invoke('help:open', topic),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  fitWindow: (width: number, height: number, kind: 'main' | 'help') =>
    ipcRenderer.invoke('window:fit-content', width, height, kind),
  onStatusChanged: (callback: (payload: unknown) => void) =>
    onChannel('live:status-changed', callback),
  onConfigChanged: (callback: (payload: unknown) => void) =>
    onChannel('config:changed', callback),
  onNotice: (callback: (payload: unknown) => void) =>
    onChannel('app:notice', callback),
  onViewerEvent: (callback: (payload: unknown) => void) =>
    onChannel('viewer:event', callback),
};

contextBridge.exposeInMainWorld('liveTts', api);

export type LiveTtsApi = typeof api;
