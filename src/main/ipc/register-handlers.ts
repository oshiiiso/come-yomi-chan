import { BrowserWindow, dialog, ipcMain, shell, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { SessionManager } from '../../app/session-manager';
import { getAppInfo, getHelpDocumentPath } from '../../shared/app-meta';
import { applyHelpHeadingIds, isHelpTopicId } from '../../shared/help-topics';
import { ConfigStore } from '../../shared/config-store';
import { getErrorMessage } from '../../shared/error-utils';
import { IpcChannels } from '../../shared/ipc-channels';
import { getLogger } from '../../shared/logging-config';
import { getRendererCopy, MSG } from '../../shared/messages';
import { isSettingsTabId } from '../../shared/settings-tab-reset';
import { normalizeOverlayCopyKind, normalizeOverlayUrlKind } from '../../shared/overlay-url';
import { sessionLogFileName, sessionLogTsv } from '../../shared/session-log';
import {
  applyProfileToConfig,
  buildProfileExport,
  createProfile,
  profileExportFileName,
  profileFromImportPayload,
  profilePatchFromConfig,
} from '../../shared/config-profiles';
import { listSoundFiles, saveSoundFile } from '../../shared/sound-files';
import { SOUND_FILE_EXTENSIONS } from '../../shared/sound-ref';
import { saveAlertMediaFile } from '../../shared/alert-media-files';
import { ALERT_MEDIA_FILE_EXTENSIONS } from '../../shared/event-alert';
import { AppConfig, AppConfigSaveInput, OverlayEventType } from '../../shared/types';
import {
  isAllowedVoicevoxExecutable,
  voicevoxDialogDefaultPath,
} from '../../tts/voicevox-launcher';
import { fitWindowToContent, WindowKind } from '../windows/fit-window';
import { WindowManager } from '../windows/window-manager';
import { ViewerEvent } from '../../shared/viewer-event';
import {
  DEFAULT_VIEWER_LOG_MAX_ROWS,
  normalizeViewerPersistRows,
  trimViewerPersistRows,
  type ViewerPersistRow,
} from '../../shared/viewer-log-persist';
import {
  formatSpeechReplaceText,
  parseSpeechReplaceText,
  formatSkipLineSummary,
} from '../../shared/speech-replace-map';

const logger = getLogger('ipc');

const EVENT_TYPES: OverlayEventType[] = [
  'comment',
  'gift',
  'follow',
  'share',
  'subscribe',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];

function isEventType(value: unknown): value is OverlayEventType {
  return typeof value === 'string' && EVENT_TYPES.includes(value as OverlayEventType);
}

function overlayServerMessage(session: SessionManager): string | null {
  if (session.overlayListeningPort() == null) {
    return MSG.ui.overlayServerDown;
  }
  return null;
}

function overlayClientMessage(
  session: SessionManager,
  kind: 'chat' | 'alerts' | 'ranking' | 'all' = 'all',
): string | null {
  const down = overlayServerMessage(session);
  if (down) {
    return down;
  }
  if (kind === 'all') {
    if (!session.hasAnyOverlayClient()) {
      return MSG.ui.overlayNotConnected;
    }
    return null;
  }
  if (session.overlayRoleClientCount(kind) === 0) {
    return MSG.ui.overlayNotConnected;
  }
  return null;
}

export function registerIpcHandlers(
  session: SessionManager,
  configStore: ConfigStore,
  windowManager: WindowManager,
): void {
  // --- ビューアーログの永続化 ---
  const viewerLogFilePath = path.join(app.getPath('userData'), 'viewer-log.json');
  let viewerLog: ViewerPersistRow[] = [];
  let viewerLogSaveTimer: ReturnType<typeof setTimeout> | null = null;

  try {
    const raw = JSON.parse(fs.readFileSync(viewerLogFilePath, 'utf8'));
    viewerLog = normalizeViewerPersistRows(raw, configStore.get().viewerLogMaxRows ?? DEFAULT_VIEWER_LOG_MAX_ROWS);
  } catch {
    viewerLog = [];
  }

  const scheduleViewerLogSave = () => {
    if (viewerLogSaveTimer) {
      clearTimeout(viewerLogSaveTimer);
    }
    viewerLogSaveTimer = setTimeout(() => {
      viewerLogSaveTimer = null;
      try {
        fs.writeFileSync(viewerLogFilePath, JSON.stringify(viewerLog), 'utf8');
      } catch (error) {
        logger.warning(`ビューアーログの保存に失敗しました: ${getErrorMessage(error)}`);
      }
    }, 1500);
  };

  session.on('viewer', (event: ViewerEvent) => {
    if (event.sample || event.statusKind) {
      return;
    }
    const maxRows = configStore.get().viewerLogMaxRows ?? DEFAULT_VIEWER_LOG_MAX_ROWS;
    const row: ViewerPersistRow = {
      receivedAt: event.receivedAt,
      type: event.type,
      uniqueId: event.user?.uniqueId ?? '',
      nickname: event.user?.nickname ?? '',
      comment: event.comment ?? '',
      displayText: event.displayText ?? '',
      giftName: event.giftName ?? '',
      giftCount: event.giftCount ?? 0,
      diamondCount: event.diamondCount ?? 0,
      avatarUrl: event.user?.avatarUrl || undefined,
      giftImageUrl: event.giftImageUrl || undefined,
      badges: (() => {
        const u = event.user;
        if (!u) return undefined;
        const b: ViewerPersistRow['badges'] = {};
        if (u.isFanClub) b.isFanClub = true;
        if (u.isSuperFan) b.isSuperFan = true;
        if (u.isModerator) b.isModerator = true;
        if (u.isAnchor) b.isAnchor = true;
        if (u.fanClubLevel > 0) b.fanClubLevel = u.fanClubLevel;
        if (u.fanClubName) b.fanClubName = u.fanClubName;
        return Object.keys(b).length ? b : undefined;
      })(),
    };
    viewerLog = trimViewerPersistRows([...viewerLog, row], maxRows);
    scheduleViewerLogSave();
  });

  ipcMain.handle(IpcChannels.GET_VIEWER_LOG, () => viewerLog);

  ipcMain.handle(IpcChannels.SAVE_VIEWER_LOG, (_event, rows: unknown) => {
    const maxRows = configStore.get().viewerLogMaxRows ?? DEFAULT_VIEWER_LOG_MAX_ROWS;
    viewerLog = normalizeViewerPersistRows(rows, maxRows);
    scheduleViewerLogSave();
  });

  ipcMain.handle(IpcChannels.CLEAR_VIEWER_LOG, () => {
    viewerLog = [];
    if (viewerLogSaveTimer) {
      clearTimeout(viewerLogSaveTimer);
      viewerLogSaveTimer = null;
    }
    try {
      if (fs.existsSync(viewerLogFilePath)) {
        fs.unlinkSync(viewerLogFilePath);
      }
    } catch (error) {
      logger.warning(`ビューアーログの削除に失敗しました: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IpcChannels.CLEAR_VIEWER_LOG_TYPES, (_event, types: unknown) => {
    const list = Array.isArray(types)
      ? types.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    if (!list.length) {
      return;
    }
    const drop = new Set(list);
    viewerLog = viewerLog.filter((row) => !drop.has(row.type));
    scheduleViewerLogSave();
  });

  // --- 読み替え辞書のエクスポート ---
  ipcMain.handle(IpcChannels.EXPORT_SPEECH_REPLACE, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(window ?? BrowserWindow.getAllWindows()[0], {
      title: MSG.ui.speechReplaceExportTitle,
      defaultPath: '読み替え辞書.txt',
      filters: [{ name: MSG.ui.speechReplaceExportFilter, extensions: ['txt'] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }
    try {
      const entries = configStore.get().speechReplaceMap ?? [];
      fs.writeFileSync(result.filePath, formatSpeechReplaceText(entries), 'utf8');
      return { ok: true };
    } catch (error) {
      logger.warning(`読み替え辞書の書き出しに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, canceled: false };
    }
  });

  // --- 読み替え辞書のインポート ---
  ipcMain.handle(IpcChannels.IMPORT_SPEECH_REPLACE, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window ?? BrowserWindow.getAllWindows()[0], {
      title: MSG.ui.speechReplaceImportTitle,
      properties: ['openFile'],
      filters: [{ name: MSG.ui.speechReplaceImportFilter, extensions: ['txt'] }],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, canceled: true };
    }
    try {
      const text = fs.readFileSync(result.filePaths[0], 'utf8');
      const parsed = parseSpeechReplaceText(text);
      if (parsed.overLimit) {
        return { ok: false, canceled: false, overLimit: true };
      }
      const skipped = formatSkipLineSummary(parsed.skippedLineNumbers);
      return { ok: true, entries: parsed.entries, skipped };
    } catch (error) {
      logger.warning(`読み替え辞書の読み込みに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, canceled: false };
    }
  });

  ipcMain.handle(IpcChannels.GET_CONFIG, () => ({
    ...configStore.toView(),
    copy: getRendererCopy(),
  }));

  const applyLiveConfig = async (
    previous: AppConfig,
  ): Promise<{ idChangeDisconnected: boolean }> => {
    await session.refreshVoicevoxSpeakerName();
    const applied = await session.applyConfig(previous.overlayPort, previous.uniqueId, previous);
    windowManager.broadcast(IpcChannels.CONFIG_CHANGED, configStore.toView());
    windowManager.broadcast(IpcChannels.STATUS_CHANGED, session.getStatus());
    windowManager.syncTray(configStore.get().minimizeToTray);
    windowManager.applyUiTheme(configStore.get().uiTheme);
    windowManager.applyWindowPrefs(configStore.get());
    return applied;
  };

  const confirmWarning = async (
    event: Electron.IpcMainInvokeEvent,
    title: string,
    detail: string,
    okLabel: string,
  ): Promise<boolean> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.MessageBoxOptions = {
      type: 'warning',
      buttons: [okLabel, MSG.ui.resetConfigCancel],
      defaultId: 1,
      cancelId: 1,
      title,
      message: title,
      detail,
    };
    const choice = window
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options);
    return choice.response === 0;
  };

  ipcMain.handle(IpcChannels.SAVE_CONFIG, async (_event, partial: unknown) => {
    const previous = configStore.get();
    try {
      configStore.save((partial ?? {}) as AppConfigSaveInput);
      await applyLiveConfig(previous);
      return { ok: true, config: configStore.toView(), message: MSG.ui.saveOk };
    } catch (error) {
      logger.error(`設定の保存に失敗しました: ${getErrorMessage(error)}`);
      try {
        configStore.save(previous);
        await applyLiveConfig(previous);
      } catch (restoreError) {
        logger.error(`設定の復元に失敗しました: ${getErrorMessage(restoreError)}`);
      }
      return { ok: false, config: configStore.toView(), message: MSG.ui.saveFailed };
    }
  });

  ipcMain.handle(IpcChannels.RESET_CONFIG, async (event) => {
    const accepted = await confirmWarning(
      event,
      MSG.ui.resetConfigTitle,
      MSG.ui.resetConfigHint,
      MSG.ui.resetConfigConfirm,
    );
    if (!accepted) {
      return { ok: true, cancelled: true, message: '' };
    }
    const previous = configStore.get();
    try {
      configStore.reset();
      await applyLiveConfig(previous);
      return { ok: true, cancelled: false, config: configStore.toView(), message: MSG.ui.resetConfigOk };
    } catch (error) {
      logger.error(`設定の初期化に失敗しました: ${getErrorMessage(error)}`);
      try {
        configStore.save(previous);
        await applyLiveConfig(previous);
      } catch (restoreError) {
        logger.error(`設定の復元に失敗しました: ${getErrorMessage(restoreError)}`);
      }
      return { ok: false, cancelled: false, config: configStore.toView(), message: MSG.ui.resetConfigFailed };
    }
  });

  ipcMain.handle(IpcChannels.RESET_CONFIG_TAB, async (event, tab: unknown) => {
    if (!isSettingsTabId(tab)) {
      return {
        ok: false,
        cancelled: false,
        config: configStore.toView(),
        message: MSG.ui.resetTabFailed,
      };
    }
    const accepted = await confirmWarning(
      event,
      MSG.ui.resetTabTitle,
      MSG.ui.resetTabHints[tab],
      MSG.ui.resetTabConfirm,
    );
    if (!accepted) {
      return { ok: true, cancelled: true, message: '' };
    }
    const previous = configStore.get();
    try {
      configStore.resetTab(tab);
      const applied = await applyLiveConfig(previous);
      return {
        ok: true,
        cancelled: false,
        config: configStore.toView(),
        message: applied.idChangeDisconnected
          ? MSG.connection.idChangedNeedConfirm
          : MSG.ui.resetTabOk,
      };
    } catch (error) {
      logger.error(`タブの初期化に失敗しました: ${getErrorMessage(error)}`);
      try {
        configStore.save(previous);
        await applyLiveConfig(previous);
      } catch (restoreError) {
        logger.error(`設定の復元に失敗しました: ${getErrorMessage(restoreError)}`);
      }
      return {
        ok: false,
        cancelled: false,
        config: configStore.toView(),
        message: MSG.ui.resetTabFailed,
      };
    }
  });

  ipcMain.handle(IpcChannels.EXPORT_CONFIG, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const config = configStore.get();
      const active = config.activeConfigProfileId
        ? config.configProfiles.find((item) => item.id === config.activeConfigProfileId)
        : undefined;
      const profile = active
        ? {
            ...active,
            updatedAt: new Date().toISOString(),
            config: profilePatchFromConfig(config),
          }
        : createProfile('プロファイル', config);
      const options: Electron.SaveDialogOptions = {
        title: MSG.ui.exportProfileTitle,
        defaultPath: profileExportFileName(profile.name),
        filters: [{ name: MSG.ui.importProfileFilter, extensions: ['json'] }],
      };
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) {
        return { ok: true, cancelled: true, message: '' };
      }
      const payload = buildProfileExport(profile);
      fs.writeFileSync(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      return { ok: true, cancelled: false, message: MSG.ui.exportProfileOk };
    } catch (error) {
      logger.error(`プロファイルの書き出しに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, message: MSG.ui.exportProfileFailed };
    }
  });

  ipcMain.handle(IpcChannels.IMPORT_CONFIG, async (event) => {
    try {
      const state = session.getStatus().state;
      if (state === 'live' || state === 'waiting_live' || state === 'connecting') {
        return { ok: false, cancelled: false, message: MSG.ui.profileNeedDisconnect };
      }
      const window = BrowserWindow.fromWebContents(event.sender);
      const openOptions: Electron.OpenDialogOptions = {
        title: MSG.ui.importProfileTitle,
        filters: [{ name: MSG.ui.importProfileFilter, extensions: ['json'] }],
        properties: ['openFile'],
      };
      const picked = window
        ? await dialog.showOpenDialog(window, openOptions)
        : await dialog.showOpenDialog(openOptions);
      if (picked.canceled || !picked.filePaths[0]) {
        return { ok: true, cancelled: true, message: '' };
      }
      const filePath = picked.filePaths[0];
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size > 1_000_000) {
        return { ok: false, cancelled: false, message: MSG.ui.importProfileInvalid };
      }
      const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, cancelled: false, message: MSG.ui.importProfileInvalid };
      }
      const profile = profileFromImportPayload(parsed, configStore.get());
      if (!profile) {
        return { ok: false, cancelled: false, message: MSG.ui.importProfileInvalid };
      }
      const accepted = await confirmWarning(
        event,
        MSG.ui.importProfileConfirmTitle,
        MSG.ui.importProfileConfirm,
        MSG.ui.importProfileLabel,
      );
      if (!accepted) {
        return { ok: true, cancelled: true, message: '' };
      }
      const previous = configStore.get();
      const merged = applyProfileToConfig(previous, profile.config);
      const profiles = [...previous.configProfiles.filter((item) => item.id !== profile.id), profile];
      configStore.save({
        ...merged,
        configProfiles: profiles,
        activeConfigProfileId: profile.id,
      });
      await applyLiveConfig(previous);
      return { ok: true, cancelled: false, config: configStore.toView(), message: MSG.ui.importProfileOk };
    } catch (error) {
      logger.error(`プロファイルの読み込みに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, message: MSG.ui.importProfileFailed };
    }
  });

  ipcMain.handle(IpcChannels.GET_STATUS, () => session.getStatus());

  ipcMain.handle(IpcChannels.CONNECT, async () => {
    try {
      await session.connect();
    } catch (error) {
      logger.error(`接続に失敗しました: ${getErrorMessage(error)}`);
    }
    return session.getStatus();
  });

  ipcMain.handle(IpcChannels.DISCONNECT, async () => {
    try {
      await session.disconnect();
    } catch (error) {
      logger.error(`切断に失敗しました: ${getErrorMessage(error)}`);
    }
    return session.getStatus();
  });

  ipcMain.handle(IpcChannels.LOOKUP_USER, async (_event, uniqueId: unknown) => {
    const requested = typeof uniqueId === 'string' ? uniqueId : '';
    try {
      return await session.lookupUser(requested);
    } catch (error) {
      logger.error(`アカウント確認に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.connection.lookupFailed };
    }
  });

  ipcMain.handle(IpcChannels.GET_TTS_VOICES, async () => session.listVoices());

  ipcMain.handle(IpcChannels.CHECK_TTS_ENGINE, async () => {
    try {
      return await session.pingTtsEngine();
    } catch (error) {
      logger.error(`読み上げエンジンの確認に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.tts.engineMissing };
    }
  });

  ipcMain.handle(IpcChannels.COPY_VOICEVOX_CREDIT, () => session.copyVoicevoxCredit());

  ipcMain.handle(IpcChannels.PICK_VOICEVOX_EXE, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const options: Electron.OpenDialogOptions = {
        title: MSG.tts.voicevoxPickTitle,
        defaultPath: voicevoxDialogDefaultPath(configStore.get().voicevoxExePath),
        properties: ['openFile'],
        filters: [{ name: 'VOICEVOX', extensions: ['exe'] }],
      };
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true, cancelled: true, path: '' };
      }

      const filePath = result.filePaths[0];
      if (!isAllowedVoicevoxExecutable(filePath) || !fs.existsSync(filePath)) {
        return { ok: false, cancelled: false, path: '', message: MSG.tts.voicevoxExeInvalid };
      }
      return { ok: true, cancelled: false, path: filePath };
    } catch (error) {
      logger.error(`VOICEVOXの場所選択に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, path: '', message: MSG.tts.voicevoxLaunchFailed };
    }
  });

  ipcMain.handle(IpcChannels.LAUNCH_VOICEVOX, async () => {
    try {
      return await session.launchVoicevox();
    } catch (error) {
      logger.error(`VOICEVOX起動に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.tts.voicevoxLaunchFailed, alreadyRunning: false };
    }
  });

  ipcMain.handle(IpcChannels.PREVIEW_TTS, async () => {
    try {
      const down = overlayServerMessage(session);
      if (down) {
        return { ok: false, message: down };
      }
      await session.waitForOverlayClient(2000);
      await session.previewSpeech();
      const disconnected = overlayClientMessage(session);
      if (disconnected) {
        return { ok: false, message: disconnected };
      }
      return { ok: true, message: MSG.ui.ttsTestSent };
    } catch (error) {
      const message = getErrorMessage(error);
      if (message === MSG.ui.speechQueueFull) {
        return { ok: false, message };
      }
      logger.error(`読み上げテストに失敗しました: ${message}`);
      return { ok: false, message: MSG.tts.previewFailed };
    }
  });

  ipcMain.handle(IpcChannels.SKIP_SPEECH, () => {
    session.skipSpeech();
    return { ok: true, message: MSG.ui.speechSkipped };
  });

  ipcMain.handle(IpcChannels.CLEAR_SPEECH_QUEUE, () => {
    session.clearSpeechQueue();
    return { ok: true, message: MSG.ui.speechQueueCleared };
  });

  ipcMain.handle(IpcChannels.TOGGLE_SPEECH_PAUSE, () => {
    const paused = session.toggleSpeechPaused();
    return {
      ok: true,
      paused,
      message: paused ? MSG.ui.speechPaused : MSG.ui.speechResumed,
    };
  });

  ipcMain.handle(IpcChannels.TOGGLE_COMMENT_SOUND_MUTE, () => {
    const muted = session.toggleCommentSoundMuted();
    return {
      ok: true,
      muted,
      message: muted ? MSG.ui.commentSoundMuted : MSG.ui.commentSoundUnmuted,
    };
  });

  ipcMain.handle(IpcChannels.PREVIEW_SOUND, async (_event, sound: unknown, volume: unknown) => {
    try {
      const result = await session.previewSound(sound, volume);
      return { ok: true, soundUrl: result.soundUrl, volume: result.volume };
    } catch (error) {
      logger.error(`効果音のテストに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, soundUrl: null, volume: 100, message: MSG.ui.giftChimeTestFailed };
    }
  });

  ipcMain.handle(IpcChannels.LIST_SOUND_FILES, () => ({
    ok: true,
    files: listSoundFiles(),
  }));

  ipcMain.handle(IpcChannels.PICK_SOUND_FILE, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const options: Electron.OpenDialogOptions = {
        title: MSG.ui.pickSoundTitle,
        properties: ['openFile'],
        filters: [
          {
            name: MSG.ui.pickSoundFilter,
            extensions: [...SOUND_FILE_EXTENSIONS],
          },
        ],
      };
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true, cancelled: true, fileName: '' };
      }
      const fileName = saveSoundFile(result.filePaths[0]);
      return { ok: true, cancelled: false, fileName };
    } catch (error) {
      logger.error(`音声ファイルの取り込みに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, fileName: '', message: MSG.ui.pickSoundFailed };
    }
  });

  ipcMain.handle(IpcChannels.PICK_ALERT_MEDIA_FILE, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const options: Electron.OpenDialogOptions = {
        title: MSG.ui.pickAlertMediaTitle,
        properties: ['openFile'],
        filters: [
          {
            name: MSG.ui.pickAlertMediaFilter,
            extensions: [...ALERT_MEDIA_FILE_EXTENSIONS],
          },
        ],
      };
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true, cancelled: true, fileName: '' };
      }
      const fileName = saveAlertMediaFile(result.filePaths[0]);
      return { ok: true, cancelled: false, fileName };
    } catch (error) {
      logger.error(`アラート画像の取り込みに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, fileName: '', message: MSG.ui.pickAlertMediaFailed };
    }
  });

  ipcMain.handle(
    IpcChannels.SEND_TEST_EVENT,
    async (_event, type: unknown, giftCount: unknown, giftId: unknown, badges: unknown) => {
      try {
        const eventType = isEventType(type) ? type : 'comment';
        const count = typeof giftCount === 'number' ? giftCount : 1;
        const selectedGiftId = typeof giftId === 'string' ? giftId : '';
        const badge = badges && typeof badges === 'object' ? (badges as Record<string, unknown>) : {};
        const down = overlayServerMessage(session);
        if (down) {
          return { ok: false, message: down };
        }
        await session.waitForOverlayClient(2000);
        await session.sendTestEvent(eventType, count, {
          giftId: selectedGiftId,
          isFanClub: badge.isFanClub === true,
          fanClubStatus: typeof badge.fanClubStatus === 'number' ? badge.fanClubStatus : 0,
          isSuperFan: badge.isSuperFan === true,
          fanClubLevel: typeof badge.fanClubLevel === 'number' ? badge.fanClubLevel : 0,
          isModerator: badge.isModerator === true,
          isAnchor: badge.isAnchor === true,
          diamondCount: typeof badge.diamondCount === 'number' ? badge.diamondCount : undefined,
          superFanBox: badge.superFanBox === true,
          portalJoin: badge.portalJoin === true,
        });
        const disconnected = overlayClientMessage(session);
        if (disconnected) {
          return { ok: false, message: disconnected };
        }
        return { ok: true, message: MSG.ui.testerSent };
      } catch (error) {
        logger.error(`テスト送信に失敗しました: ${getErrorMessage(error)}`);
        return { ok: false, message: MSG.ui.testerFailed };
      }
    },
  );

  ipcMain.handle(IpcChannels.SAVE_SESSION_LOG, async (event) => {
    try {
      const rows = session.getSessionLog();
      if (rows.length === 0) {
        return { ok: false, cancelled: false, message: MSG.ui.viewerLogEmpty };
      }
      const window = BrowserWindow.fromWebContents(event.sender);
      const options: Electron.SaveDialogOptions = {
        title: MSG.ui.viewerSaveLogTitle,
        defaultPath: sessionLogFileName(),
        filters: [
          { name: 'テキスト', extensions: ['txt'] },
          { name: 'TSV', extensions: ['tsv'] },
        ],
      };
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) {
        return { ok: true, cancelled: true, message: '' };
      }
      const typeLabels: Record<string, string> = {
        comment: MSG.ui.viewerTypeComment,
        gift: MSG.ui.viewerTypeGift,
        follow: MSG.ui.viewerTypeFollow,
        share: MSG.ui.viewerTypeShare,
        subscribe: MSG.ui.viewerTypeSubscribe,
        superFan: MSG.ui.viewerTypeSuperFan,
        envelope: MSG.ui.viewerTypeEnvelope,
        portal: MSG.ui.viewerTypePortal,
        like: MSG.ui.viewerTypeLike,
        member: MSG.ui.viewerTypeMember,
      };
      fs.writeFileSync(result.filePath, `\uFEFF${sessionLogTsv(rows, typeLabels)}`, 'utf8');
      return { ok: true, cancelled: false, message: MSG.ui.viewerLogSaved };
    } catch (error) {
      logger.error(`コメントログの保存に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, message: MSG.ui.viewerLogFailed };
    }
  });

  ipcMain.handle(IpcChannels.GET_TEST_GIFTS, () => session.listTestGifts());

  ipcMain.handle(IpcChannels.REFRESH_TEST_GIFTS, async (_event, uniqueId: unknown) => {
    const requested = typeof uniqueId === 'string' ? uniqueId : '';
    try {
      const gifts = await session.refreshTestGifts(requested);
      if (gifts.length === 0) {
        return { ok: false, gifts, message: MSG.ui.giftsEmpty };
      }
      return { ok: true, gifts, message: MSG.ui.giftsLoaded(gifts.length) };
    } catch (error) {
      const cached = session.listTestGifts();
      const message = getErrorMessage(error);
      if (
        message === MSG.ui.giftsNeedId ||
        message === MSG.ui.giftsNeedApiKey ||
        message === MSG.ui.giftsNeedBusinessPlan ||
        message === MSG.ui.giftsNeedLive ||
        message === MSG.ui.giftsEmpty ||
        message === MSG.ui.giftsCached
      ) {
        return { ok: false, gifts: cached, message };
      }
      logger.error(`ギフト一覧の取得に失敗しました: ${message}`);
      return {
        ok: false,
        gifts: cached,
        message: cached.length > 0 ? MSG.ui.giftsCached : MSG.ui.giftsFailed,
      };
    }
  });

  ipcMain.handle(IpcChannels.GET_OVERLAY_SAMPLE_PLAN, (_event, streamSettings: unknown) => {
    try {
      const snapshot =
        streamSettings && typeof streamSettings === 'object' && !Array.isArray(streamSettings)
          ? (streamSettings as AppConfigSaveInput)
          : undefined;
      return { ok: true, plan: session.buildOverlaySamplePlan(snapshot) };
    } catch (error) {
      logger.error(`配信ソースサンプル計画の取得に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, plan: null };
    }
  });

  ipcMain.handle(
    IpcChannels.PREVIEW_OVERLAY,
    async (_event, target: unknown, streamSettings: unknown, kind: unknown) => {
      try {
        if (target === 'overlay' || target === 'stream') {
          const overlayKind = normalizeOverlayUrlKind(kind);
          const down = overlayServerMessage(session);
          if (down) {
            return { ok: false, message: down };
          }
          await session.waitForOverlayClient(2000, overlayKind);
          const disconnected = overlayClientMessage(session, overlayKind);
          if (disconnected) {
            return { ok: false, message: disconnected };
          }
          const snapshot =
            streamSettings && typeof streamSettings === 'object' && !Array.isArray(streamSettings)
              ? (streamSettings as Record<string, unknown>)
              : undefined;
          session.previewStreamSamples(snapshot, overlayKind);
          return { ok: true, message: MSG.ui.overlayPreviewShown };
        }
        session.previewOverlaySamples();
        return { ok: true, message: MSG.ui.previewShown };
      } catch (error) {
        logger.error(`プレビュー表示に失敗しました: ${getErrorMessage(error)}`);
        return { ok: false, message: MSG.ui.testerFailed };
      }
    },
  );

  ipcMain.handle(IpcChannels.PUSH_OVERLAY_RANKING_MOTION, (_event, streamSettings: unknown) => {
    try {
      const snapshot =
        streamSettings && typeof streamSettings === 'object' && !Array.isArray(streamSettings)
          ? (streamSettings as AppConfigSaveInput)
          : undefined;
      session.pushOverlayRankingMotion(snapshot);
      return { ok: true };
    } catch (error) {
      logger.error(`ランキング動きの反映に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false };
    }
  });

  ipcMain.handle(IpcChannels.PUSH_OVERLAY_LOOK, (_event, streamSettings: unknown) => {
    try {
      const snapshot =
        streamSettings && typeof streamSettings === 'object' && !Array.isArray(streamSettings)
          ? (streamSettings as AppConfigSaveInput)
          : undefined;
      session.pushOverlayLook(snapshot);
      return { ok: true };
    } catch (error) {
      logger.error(`配信ソースの見た目反映に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false };
    }
  });

  ipcMain.handle(IpcChannels.CLEAR_OVERLAY, async (_event, kind: unknown) => {
    const clearKind =
      kind === 'all' || kind === undefined || kind === null
        ? 'all'
        : normalizeOverlayUrlKind(kind);
    // 未接続で clearOverlay に届かなくても、入れ替わり2通目は止める
    if (clearKind === 'all' || clearKind === 'ranking') {
      session.cancelRankingSamplePreview();
    }
    try {
      const down = overlayServerMessage(session);
      if (down) {
        return { ok: false, message: down };
      }
      await session.waitForOverlayClient(2000, clearKind);
      const disconnected = overlayClientMessage(session, clearKind);
      if (disconnected) {
        return { ok: false, message: disconnected };
      }
      session.clearOverlay(clearKind);
      return { ok: true, message: MSG.ui.previewCleared };
    } catch (error) {
      if (clearKind === 'all' || clearKind === 'ranking') {
        session.cancelRankingSamplePreview();
      }
      logger.error(`プレビューのクリアに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.ui.testerFailed };
    }
  });

  ipcMain.handle(IpcChannels.CLEAR_OVERLAY_PIN, async () => {
    try {
      const down = overlayServerMessage(session);
      if (down) {
        return { ok: false, message: down };
      }
      await session.waitForOverlayClient(2000);
      const disconnected = overlayClientMessage(session);
      if (disconnected) {
        return { ok: false, message: disconnected };
      }
      session.clearOverlayPin();
      return { ok: true, message: MSG.ui.pinQueueCleared };
    } catch (error) {
      logger.error(`固定枠のクリアに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.ui.testerFailed };
    }
  });

  ipcMain.handle(IpcChannels.COPY_OVERLAY_URL, (_event, kind: unknown) => {
    const urlKind = normalizeOverlayCopyKind(kind);
    const ok = session.copyOverlayUrl(urlKind);
    const message =
      !ok
        ? MSG.ui.copyFailed
        : urlKind === 'studio' ||
            urlKind === 'alerts-studio' ||
            urlKind === 'ranking-studio' ||
            urlKind === 'likes-studio'
          ? MSG.ui.copiedStudio
          : urlKind === 'local' ||
              urlKind === 'alerts-local' ||
              urlKind === 'ranking-local' ||
              urlKind === 'likes-local'
            ? MSG.ui.copiedObs
            : urlKind === 'alerts'
              ? MSG.ui.copiedAlerts
              : urlKind === 'ranking' || urlKind === 'likes'
                ? MSG.ui.copiedLikes
                : MSG.ui.copied;
    return { ok, message };
  });

  ipcMain.handle(IpcChannels.GET_APP_INFO, () => getAppInfo());

  ipcMain.handle(IpcChannels.GET_HELP_CONTENT, async () => {
    try {
      const filePath = getHelpDocumentPath();
      const markdown = fs.readFileSync(filePath, 'utf8');
      const html = applyHelpHeadingIds(await marked.parse(markdown));
      return { title: MSG.menu.help, html };
    } catch (error) {
      logger.error(`ヘルプの読み込みに失敗しました: ${getErrorMessage(error)}`);
      return {
        title: MSG.menu.help,
        html: `<p>${MSG.errors.helpNotFound}</p>`,
      };
    }
  });

  ipcMain.handle(IpcChannels.OPEN_HELP, (_event, topic: unknown) => {
    windowManager.openHelpWindow(isHelpTopicId(topic) ? topic : undefined);
  });

  ipcMain.handle(IpcChannels.OPEN_EXTERNAL, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return;
    }
    try {
      await shell.openExternal(url);
    } catch (error) {
      logger.error(`外部リンクを開けませんでした: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(
    IpcChannels.WINDOW_FIT_CONTENT,
    (event, width: unknown, height: unknown, kind: unknown) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { width: 0, height: 0, capped: false };
      }
      const windowKind: WindowKind = kind === 'help' ? 'help' : 'main';
      return fitWindowToContent(
        window,
        Number(width),
        Number(height),
        windowKind,
      );
    },
  );

  ipcMain.handle(IpcChannels.WINDOW_CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle(IpcChannels.WINDOW_MINIMIZE, () => {
    windowManager.minimizeMainWindow();
  });

  ipcMain.handle(IpcChannels.WINDOW_TOGGLE_MAXIMIZE, () => {
    return { maximized: windowManager.toggleMaximizeMainWindow() };
  });

  ipcMain.handle(IpcChannels.WINDOW_IS_MAXIMIZED, () => {
    return { maximized: windowManager.isMainWindowMaximized() };
  });
}
