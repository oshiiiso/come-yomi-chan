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
  resetConfigTab: (tab: string) => ipcRenderer.invoke('config:reset-tab', tab),
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
  toggleSpeechPause: () => ipcRenderer.invoke('tts:toggle-pause'),
  toggleCommentSoundMute: () => ipcRenderer.invoke('sound:toggle-comment-mute'),
  listSoundFiles: () => ipcRenderer.invoke('sound:list'),
  pickSoundFile: () => ipcRenderer.invoke('sound:pick'),
  pickAlertMediaFile: () => ipcRenderer.invoke('alert-media:pick'),
  previewSound: (sound: Record<string, unknown>, volume?: number) =>
    ipcRenderer.invoke('sound:preview', sound, volume),
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
  previewOverlay: (
    target?: string,
    streamSettings?: Record<string, unknown>,
    kind?: string,
  ) => ipcRenderer.invoke('overlay:preview', target, streamSettings, kind),
  pushOverlayRankingMotion: (streamSettings?: Record<string, unknown>) =>
    ipcRenderer.invoke('overlay:push-ranking-motion', streamSettings),
  pushOverlayLook: (streamSettings?: Record<string, unknown>) =>
    ipcRenderer.invoke('overlay:push-look', streamSettings),
  getOverlaySamplePlan: (streamSettings?: Record<string, unknown>) =>
    ipcRenderer.invoke('overlay:sample-plan', streamSettings),
  clearOverlay: (kind?: string) => ipcRenderer.invoke('overlay:clear', kind),
  clearOverlayPin: () => ipcRenderer.invoke('overlay:clear-pin'),
  copyOverlayUrl: (kind?: string) => ipcRenderer.invoke('overlay:copy-url', kind),
  copyVoicevoxCredit: () => ipcRenderer.invoke('tts:copy-credit'),
  pickVoicevoxExe: () => ipcRenderer.invoke('tts:pick-voicevox'),
  launchVoicevox: () => ipcRenderer.invoke('tts:launch-voicevox'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getViewerLog: () => ipcRenderer.invoke('viewer-log:get'),
  saveViewerLog: (rows: unknown[]) => ipcRenderer.invoke('viewer-log:save', rows),
  clearViewerLog: () => ipcRenderer.invoke('viewer-log:clear'),
  clearViewerLogTypes: (types: string[]) => ipcRenderer.invoke('viewer-log:clear-types', types),
  exportSpeechReplace: () => ipcRenderer.invoke('speech-replace:export'),
  importSpeechReplace: () => ipcRenderer.invoke('speech-replace:import'),
  getHelpContent: () => ipcRenderer.invoke('help:content'),
  openHelp: (topic?: string) => ipcRenderer.invoke('help:open', topic),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
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
  onPlaySound: (callback: (payload: unknown) => void) =>
    onChannel('sound:play', callback),
  onSpeechAudioControl: (callback: (payload: unknown) => void) =>
    onChannel('tts:audio-control', callback),
  onWindowMaximizedChanged: (callback: (payload: unknown) => void) =>
    onChannel('window:maximized-changed', callback),
};

contextBridge.exposeInMainWorld('liveTts', api);

export type LiveTtsApi = typeof api;
