import { BrowserWindow, Tray, Menu, app, nativeTheme, Rectangle } from 'electron';
import { loadTrayIcon } from '../tray-icon';
import { APP_CONFIG } from '../../shared/app-config';
import { MSG } from '../../shared/messages';
import { COMPACT_WINDOW_LAYOUT, WINDOW_LAYOUT } from '../../shared/window-layout';
import { getFramelessWindowOptions } from './window-options';
import { isHelpTopicId } from '../../shared/help-topics';
import { UiTheme, windowBackgroundFor } from '../../shared/ui-theme';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private helpWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private uiTheme: UiTheme = 'system';
  private compact = false;
  private normalBounds: Rectangle | null = null;

  constructor(
    private getUiPath: (...segments: string[]) => string,
    private preloadPath: string,
    private getMinimizeToTray: () => boolean,
    private onQuit: () => void,
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
    this.mainWindow = new BrowserWindow(
      getFramelessWindowOptions({
        width: layout.width,
        height: layout.height,
        minWidth: layout.minWidth,
        minHeight: layout.minHeight,
        maxWidth: layout.maxWidth,
        maxHeight: layout.maxHeight,
        resizable: true,
        title: APP_CONFIG.name,
        webPreferences: this.getWebPreferences(),
      }),
    );

    this.mainWindow.loadFile(this.getUiPath('index.html'));

    this.mainWindow.on('close', (event) => {
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
    if (enabled) {
      if (!this.compact) {
        this.normalBounds = window.getBounds();
      }
      window.setMinimumSize(compact.minWidth, compact.minHeight);
      window.setMaximumSize(compact.maxWidth, compact.maxHeight);
      if (!this.compact) {
        window.setSize(compact.width, compact.height);
      }
      this.compact = true;
      return;
    }
    window.setMinimumSize(normal.minWidth, normal.minHeight);
    window.setMaximumSize(normal.maxWidth, normal.maxHeight);
    if (this.compact && this.normalBounds) {
      window.setBounds(this.normalBounds);
    }
    this.compact = false;
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
