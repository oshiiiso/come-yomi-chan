import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'fs';
import { marked } from 'marked';
import { SessionManager } from '../../app/session-manager';
import { getAppInfo, getHelpDocumentPath } from '../../shared/app-meta';
import { applyHelpHeadingIds, isHelpTopicId } from '../../shared/help-topics';
import { ConfigStore } from '../../shared/config-store';
import { getErrorMessage } from '../../shared/error-utils';
import { IpcChannels } from '../../shared/ipc-channels';
import { getLogger } from '../../shared/logging-config';
import { getRendererCopy, MSG } from '../../shared/messages';
import { sessionLogFileName, sessionLogTsv } from '../../shared/session-log';
import { buildConfigExport, configExportFileName, parseConfigExport } from '../../shared/config-transfer';
import { AppConfigSaveInput, OverlayEventType } from '../../shared/types';
import {
  isAllowedVoicevoxExecutable,
  voicevoxDialogDefaultPath,
} from '../../tts/voicevox-launcher';
import { fitWindowToContent, WindowKind } from '../windows/fit-window';
import { WindowManager } from '../windows/window-manager';

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

function overlayClientMessage(session: SessionManager): string | null {
  const down = overlayServerMessage(session);
  if (down) {
    return down;
  }
  if (session.overlayClientCount() === 0) {
    return MSG.ui.overlayNotConnected;
  }
  return null;
}

export function registerIpcHandlers(
  session: SessionManager,
  configStore: ConfigStore,
  windowManager: WindowManager,
): void {
  ipcMain.handle(IpcChannels.GET_CONFIG, () => ({
    ...configStore.toView(),
    copy: getRendererCopy(),
  }));

  const applyLiveConfig = async (previousPort: number, previousUniqueId: string) => {
    await session.refreshVoicevoxSpeakerName();
    await session.applyConfig(previousPort, previousUniqueId);
    windowManager.broadcast(IpcChannels.CONFIG_CHANGED, configStore.toView());
    windowManager.broadcast(IpcChannels.STATUS_CHANGED, session.getStatus());
    windowManager.syncTray(configStore.get().minimizeToTray);
    windowManager.applyUiTheme(configStore.get().uiTheme);
    windowManager.applyWindowPrefs(configStore.get());
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
      await applyLiveConfig(previous.overlayPort, previous.uniqueId);
      return { ok: true, config: configStore.toView(), message: MSG.ui.saveOk };
    } catch (error) {
      logger.error(`設定の保存に失敗しました: ${getErrorMessage(error)}`);
      try {
        configStore.save(previous);
        await applyLiveConfig(previous.overlayPort, previous.uniqueId);
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
      await applyLiveConfig(previous.overlayPort, previous.uniqueId);
      return { ok: true, cancelled: false, config: configStore.toView(), message: MSG.ui.resetConfigOk };
    } catch (error) {
      logger.error(`設定の初期化に失敗しました: ${getErrorMessage(error)}`);
      try {
        configStore.save(previous);
        await applyLiveConfig(previous.overlayPort, previous.uniqueId);
      } catch (restoreError) {
        logger.error(`設定の復元に失敗しました: ${getErrorMessage(restoreError)}`);
      }
      return { ok: false, cancelled: false, config: configStore.toView(), message: MSG.ui.resetConfigFailed };
    }
  });

  ipcMain.handle(IpcChannels.EXPORT_CONFIG, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const options: Electron.SaveDialogOptions = {
        title: MSG.ui.exportConfigTitle,
        defaultPath: configExportFileName(),
        filters: [{ name: MSG.ui.importConfigFilter, extensions: ['json'] }],
      };
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) {
        return { ok: true, cancelled: true, message: '' };
      }
      const payload = buildConfigExport(configStore.get());
      fs.writeFileSync(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      return { ok: true, cancelled: false, message: MSG.ui.exportConfigOk };
    } catch (error) {
      logger.error(`設定の書き出しに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, message: MSG.ui.exportConfigFailed };
    }
  });

  ipcMain.handle(IpcChannels.IMPORT_CONFIG, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const openOptions: Electron.OpenDialogOptions = {
        title: MSG.ui.importConfigTitle,
        filters: [{ name: MSG.ui.importConfigFilter, extensions: ['json'] }],
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
        return { ok: false, cancelled: false, message: MSG.ui.importConfigInvalid };
      }
      const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, cancelled: false, message: MSG.ui.importConfigInvalid };
      }
      if (!parseConfigExport(parsed)) {
        return { ok: false, cancelled: false, message: MSG.ui.importConfigInvalid };
      }
      const accepted = await confirmWarning(
        event,
        MSG.ui.importConfigConfirmTitle,
        MSG.ui.importConfigConfirm,
        MSG.ui.importConfigLabel,
      );
      if (!accepted) {
        return { ok: true, cancelled: true, message: '' };
      }
      const previous = configStore.get();
      const next = configStore.replaceFromExport(parsed);
      if (!next) {
        return { ok: false, cancelled: false, message: MSG.ui.importConfigInvalid };
      }
      await applyLiveConfig(previous.overlayPort, previous.uniqueId);
      return { ok: true, cancelled: false, config: configStore.toView(), message: MSG.ui.importConfigOk };
    } catch (error) {
      logger.error(`設定の読み込みに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, cancelled: false, message: MSG.ui.importConfigFailed };
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
      if (message === MSG.ui.giftsNeedId) {
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

  ipcMain.handle(IpcChannels.PREVIEW_OVERLAY, async (_event, target: unknown) => {
    try {
      if (target === 'overlay' || target === 'stream') {
        const down = overlayServerMessage(session);
        if (down) {
          return { ok: false, message: down };
        }
        await session.waitForOverlayClient(2000);
        const disconnected = overlayClientMessage(session);
        if (disconnected) {
          return { ok: false, message: disconnected };
        }
        session.previewStreamSamples();
        return { ok: true, message: MSG.ui.overlayPreviewShown };
      }
      session.previewOverlaySamples();
      return { ok: true, message: MSG.ui.previewShown };
    } catch (error) {
      logger.error(`プレビュー表示に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.ui.testerFailed };
    }
  });

  ipcMain.handle(IpcChannels.CLEAR_OVERLAY, async () => {
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
      session.clearOverlay();
      return { ok: true, message: MSG.ui.previewCleared };
    } catch (error) {
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
    const urlKind = kind === 'studio' ? 'studio' : kind === 'local' ? 'local' : 'default';
    const ok = session.copyOverlayUrl(urlKind);
    const message =
      !ok
        ? MSG.ui.copyFailed
        : urlKind === 'studio'
          ? MSG.ui.copiedStudio
          : urlKind === 'local'
            ? MSG.ui.copiedObs
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
}
