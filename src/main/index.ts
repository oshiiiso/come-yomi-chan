import fs from 'fs';
import path from 'path';
import { app, BrowserWindow } from 'electron';
import dotenv from 'dotenv';
import { SessionManager } from '../app/session-manager';
import { ConfigStore } from '../shared/config-store';
import {
  getEnvPath,
  getLogDir,
  initializeAppPaths,
} from '../shared/app-paths';
import { IpcChannels } from '../shared/ipc-channels';
import { closeLogging, getLogger, setupLogging } from '../shared/logging-config';
import { MSG } from '../shared/messages';
import { getErrorMessage } from '../shared/error-utils';
import { registerIpcHandlers } from './ipc/register-handlers';
import { WindowManager } from './windows/window-manager';
import { registerWindowsAppShortcuts } from './windows-shortcut';
import { APP_USER_MODEL_ID } from '../shared/app-config';

function loadEnv(): void {
  if (!app.isPackaged) {
    const distEnvPath = path.join(process.cwd(), '.env.dist');
    if (fs.existsSync(distEnvPath)) {
      dotenv.config({ path: distEnvPath });
    }
  }

  dotenv.config({ path: getEnvPath() });
}

initializeAppPaths();
loadEnv();
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
setupLogging({ logDir: getLogDir() });

const logger = getLogger('main');

process.on('uncaughtException', (error) => {
  logger.error(`未処理の例外: ${getErrorMessage(error)}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`未処理のPromise失敗: ${getErrorMessage(reason)}`);
});

const getUiPath = (...segments: string[]) =>
  path.join(app.getAppPath(), 'ui', ...segments);

const preloadPath = path.join(__dirname, 'preload.js');

let session: SessionManager;
let configStore: ConfigStore;
let windowManager: WindowManager;
let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info(MSG.app.quitting);
  await session?.dispose();
}

async function setupApp(): Promise<void> {
  configStore = new ConfigStore();
  const overlayDir = path.join(app.getAppPath(), 'ui', 'overlay');
  session = new SessionManager(configStore, overlayDir);
  logger.info(app.isPackaged ? MSG.app.startingPackaged : MSG.app.startingDev);
  registerWindowsAppShortcuts();

  windowManager = new WindowManager(
    getUiPath,
    preloadPath,
    () => configStore.get().minimizeToTray,
    () => {
      app.isQuitting = true;
      void shutdown().finally(() => app.quit());
    },
  );

  registerIpcHandlers(session, configStore, windowManager);

  session.on('status', (status) => {
    windowManager.broadcast(IpcChannels.STATUS_CHANGED, status);
  });
  session.on('notice', (payload) => {
    windowManager.broadcast(IpcChannels.APP_NOTICE, payload);
  });
  session.on('viewer', (payload) => {
    windowManager.broadcast(IpcChannels.VIEWER_EVENT, payload);
  });

  try {
    await session.startOverlay();
  } catch (error: unknown) {
    logger.error(`オーバーレイ起動失敗: ${getErrorMessage(error)}`);
  }

  const mainWindow = windowManager.createMainWindow();
  windowManager.syncTray(configStore.get().minimizeToTray);
  windowManager.applyUiTheme(configStore.get().uiTheme);
  windowManager.applyWindowPrefs(configStore.get());

  mainWindow.webContents.once('did-finish-load', () => {
    void session.launchVoicevoxOnStart()
      .then(async (result) => {
        if (result) {
          windowManager.broadcast(IpcChannels.APP_NOTICE, result);
        }
        const connected = await session.connectOnStart();
        if (connected) {
          windowManager.broadcast(IpcChannels.APP_NOTICE, connected);
        }
      })
      .catch((error) => {
        logger.error(`起動時の初期化に失敗しました: ${getErrorMessage(error)}`);
      });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('preload-error', (_event, preloadFile, error) => {
    logger.error(`preload読み込み失敗: ${preloadFile} (${error.message})`);
  });
}

app.setAppUserModelId(APP_USER_MODEL_ID);

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = windowManager?.getMainWindow();
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.show();
      window.focus();
    }
  });

  app.whenReady().then(() => {
    void setupApp().catch((error) => {
      logger.error(`起動に失敗しました: ${getErrorMessage(error)}`);
    });
  });

  app.on('window-all-closed', () => {
    if (configStore?.get().minimizeToTray) {
      return;
    }
    app.isQuitting = true;
    void shutdown().finally(() => app.quit());
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });

  app.on('will-quit', () => {
    logger.info(MSG.app.quitting);
    closeLogging();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = windowManager.createMainWindow();
      window.once('ready-to-show', () => {
        window.show();
        window.focus();
      });
    }
  });
}

declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}
