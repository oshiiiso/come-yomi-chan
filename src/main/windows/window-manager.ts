import { BrowserWindow, Tray, Menu, app, nativeTheme, Rectangle, screen } from 'electron';
import { loadTrayIcon } from '../tray-icon';
import { APP_CONFIG } from '../../shared/app-config';
import { MSG } from '../../shared/messages';
import { COMPACT_WINDOW_LAYOUT, WINDOW_LAYOUT } from '../../shared/window-layout';
import {
  MainWindowBounds,
  normalizeMainWindowBounds,
  placeMainWindowBoundsOnDisplays,
} from '../../shared/window-bounds';
import { IpcChannels } from '../../shared/ipc-channels';
import { getFramelessWindowOptions } from './window-options';
import { applyWindowSizeLimits } from './fit-window';
import { isHelpTopicId } from '../../shared/help-topics';
import { UiTheme, windowBackgroundFor } from '../../shared/ui-theme';

const BOUNDS_SAVE_DEBOUNCE_MS = 400;

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private helpWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private uiTheme: UiTheme = 'system';
  private compact = false;
  private normalBounds: Rectangle | null = null;
  private boundsSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressBoundsSave = false;

  constructor(
    private getUiPath: (...segments: string[]) => string,
    private preloadPath: string,
    private getMinimizeToTray: () => boolean,
    private onQuit: () => void,
    private getMainWindowBounds: () => MainWindowBounds | null = () => null,
    private onMainWindowBoundsChanged: (bounds: MainWindowBounds) => void = () => {},
  ) {
    nativeTheme.on('updated', () => {
      this.applyUiTheme(this.uiTheme);
    });
  }

  private getWebPreferences(): Electron.WebPreferences {
    return {
      preload: this.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    };
  }

  applyUiTheme(theme: UiTheme): void {
    this.uiTheme = theme;
    const background = windowBackgroundFor(theme, nativeTheme.shouldUseDarkColors);
    this.mainWindow?.setBackgroundColor(background);
    this.helpWindow?.setBackgroundColor(background);
  }

  createMainWindow(): BrowserWindow {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const layout = WINDOW_LAYOUT.main;
    const restored = this.resolveRestoredBounds();
    this.mainWindow = new BrowserWindow(
      getFramelessWindowOptions({
        x: restored?.x,
        y: restored?.y,
        width: restored?.width ?? layout.width,
        height: restored?.height ?? layout.height,
        minWidth: layout.minWidth,
        minHeight: layout.minHeight,
        resizable: true,
        title: APP_CONFIG.name,
        webPreferences: this.getWebPreferences(),
      }),
    );

    this.mainWindow.loadFile(this.getUiPath('index.html'));
    this.wireMainWindowState(this.mainWindow);

    if (restored?.isMaximized) {
      this.mainWindow.maximize();
    }

    this.mainWindow.on('close', (event) => {
      this.persistMainWindowBounds(true);
      if (app.isQuitting) {
        return;
      }

      if (this.getMinimizeToTray()) {
        event.preventDefault();
        this.mainWindow?.hide();
        return;
      }

      app.isQuitting = true;
      this.onQuit();
    });

    this.mainWindow.on('closed', () => {
      this.clearBoundsSaveTimer();
      this.mainWindow = null;
      this.normalBounds = null;
      this.compact = false;
    });

    return this.mainWindow;
  }

  applyAlwaysOnTop(enabled: boolean): void {
    this.mainWindow?.setAlwaysOnTop(enabled, 'floating');
  }

  applyCompact(enabled: boolean): void {
    const window = this.mainWindow;
    if (!window || window.isDestroyed()) {
      return;
    }
    const compact = COMPACT_WINDOW_LAYOUT;
    const normal = WINDOW_LAYOUT.main;
    this.suppressBoundsSave = true;
    try {
      if (enabled) {
        if (!this.compact) {
          this.normalBounds = window.isMaximized()
            ? window.getNormalBounds()
            : window.getBounds();
        }
        applyWindowSizeLimits(window, compact);
        if (!this.compact && !window.isMaximized()) {
          window.setSize(compact.width, compact.height);
        }
        this.compact = true;
        return;
      }
      applyWindowSizeLimits(window, normal);
      if (this.compact && this.normalBounds && !window.isMaximized()) {
        window.setBounds(this.normalBounds);
      }
      this.compact = false;
    } finally {
      this.suppressBoundsSave = false;
      this.persistMainWindowBounds(false);
    }
  }

  minimizeMainWindow(): void {
    this.mainWindow?.minimize();
  }

  toggleMaximizeMainWindow(): boolean {
    const window = this.mainWindow;
    if (!window || window.isDestroyed()) {
      return false;
    }
    if (window.isMaximized()) {
      window.unmaximize();
      return false;
    }
    window.maximize();
    return true;
  }

  isMainWindowMaximized(): boolean {
    const window = this.mainWindow;
    return Boolean(window && !window.isDestroyed() && window.isMaximized());
  }

  private resolveRestoredBounds(): MainWindowBounds | null {
    const saved = normalizeMainWindowBounds(this.getMainWindowBounds());
    if (!saved) {
      return null;
    }
    const displays = screen.getAllDisplays().map((display) => ({
      x: display.workArea.x,
      y: display.workArea.y,
      width: display.workArea.width,
      height: display.workArea.height,
    }));
    return placeMainWindowBoundsOnDisplays(saved, displays);
  }

  private captureMainWindowBounds(): MainWindowBounds | null {
    const window = this.mainWindow;
    if (!window || window.isDestroyed()) {
      return null;
    }
    const isMaximized = window.isMaximized();
    const rect =
      this.compact && this.normalBounds
        ? this.normalBounds
        : isMaximized
          ? window.getNormalBounds()
          : window.getBounds();
    return normalizeMainWindowBounds({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      isMaximized,
    });
  }

  private persistMainWindowBounds(immediate: boolean): void {
    if (this.suppressBoundsSave) {
      return;
    }
    const bounds = this.captureMainWindowBounds();
    if (!bounds) {
      return;
    }
    if (immediate) {
      this.clearBoundsSaveTimer();
      this.onMainWindowBoundsChanged(bounds);
      return;
    }
    this.clearBoundsSaveTimer();
    this.boundsSaveTimer = setTimeout(() => {
      this.boundsSaveTimer = null;
      const next = this.captureMainWindowBounds();
      if (next) {
        this.onMainWindowBoundsChanged(next);
      }
    }, BOUNDS_SAVE_DEBOUNCE_MS);
  }

  private clearBoundsSaveTimer(): void {
    if (this.boundsSaveTimer) {
      clearTimeout(this.boundsSaveTimer);
      this.boundsSaveTimer = null;
    }
  }

  private wireMainWindowState(window: BrowserWindow): void {
    const emitMaximized = () => {
      if (window.isDestroyed()) {
        return;
      }
      window.webContents.send(IpcChannels.WINDOW_MAXIMIZED_CHANGED, window.isMaximized());
    };
    const scheduleSave = () => {
      this.persistMainWindowBounds(false);
    };
    window.on('maximize', () => {
      emitMaximized();
      scheduleSave();
    });
    window.on('unmaximize', () => {
      emitMaximized();
      scheduleSave();
    });
    window.on('move', scheduleSave);
    window.on('resize', scheduleSave);
  }

  applyWindowPrefs(prefs: { alwaysOnTop?: boolean; compactViewer?: boolean }): void {
    if (typeof prefs.alwaysOnTop === 'boolean') {
      this.applyAlwaysOnTop(prefs.alwaysOnTop);
    }
    if (typeof prefs.compactViewer === 'boolean') {
      this.applyCompact(prefs.compactViewer);
    }
  }

  openHelpWindow(topic?: string): BrowserWindow {
    const query = isHelpTopicId(topic) ? { topic } : undefined;
    if (this.helpWindow) {
      this.helpWindow.show();
      this.helpWindow.focus();
      void this.helpWindow.loadFile(this.getUiPath('help.html'), query ? { query } : {});
      return this.helpWindow;
    }

    const layout = WINDOW_LAYOUT.help;
    this.helpWindow = new BrowserWindow(
      getFramelessWindowOptions({
        width: layout.width,
        height: layout.height,
        minWidth: layout.minWidth,
        minHeight: layout.minHeight,
        resizable: true,
        title: `${APP_CONFIG.name} ヘルプ`,
        webPreferences: this.getWebPreferences(),
      }),
    );

    void this.helpWindow.loadFile(this.getUiPath('help.html'), query ? { query } : {});
    this.applyUiTheme(this.uiTheme);

    this.helpWindow.once('ready-to-show', () => {
      this.helpWindow?.show();
      this.helpWindow?.focus();
    });

    this.helpWindow.on('closed', () => {
      this.helpWindow = null;
    });

    return this.helpWindow;
  }

  createTray(): Tray {
    if (this.tray) {
      return this.tray;
    }

    const icon = loadTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip(APP_CONFIG.name);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: MSG.ui.trayShow,
        click: () => {
          const window = this.createMainWindow();
          window.show();
        },
      },
      {
        label: MSG.menu.help,
        click: () => this.openHelpWindow(),
      },
      { type: 'separator' },
      {
        label: MSG.ui.trayQuit,
        click: () => this.onQuit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on('double-click', () => {
      const window = this.createMainWindow();
      window.show();
    });

    return this.tray;
  }

  syncTray(enabled: boolean): void {
    if (enabled) {
      this.createTray();
      return;
    }
    this.destroyTray();
  }

  private destroyTray(): void {
    if (!this.tray) {
      return;
    }
    this.tray.destroy();
    this.tray = null;
  }

  broadcast(channel: string, payload: unknown): void {
    for (const window of BrowserWindow.getAllWindows()) {
      try {
        if (window.isDestroyed()) {
          continue;
        }
        window.webContents.send(channel, payload);
      } catch {
        // 閉じた直後の窓には送らない
      }
    }
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
