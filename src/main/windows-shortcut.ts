import fs from 'fs';
import path from 'path';
import { app, shell } from 'electron';
import { APP_CONFIG, APP_USER_MODEL_ID } from '../shared/app-config';
import { getLogger } from '../shared/logging-config';

const logger = getLogger('windows-shortcut');

function writeAppShortcut(shortcutPath: string): void {
  const exe = process.execPath;
  const existed = fs.existsSync(shortcutPath);
  const ok = shell.writeShortcutLink(shortcutPath, existed ? 'replace' : 'create', {
    target: exe,
    cwd: path.dirname(exe),
    description: APP_CONFIG.name,
    icon: exe,
    iconIndex: 0,
    appUserModelId: APP_USER_MODEL_ID,
  });
  if (!ok) {
    logger.warning(`ショートカットを書けませんでした: ${shortcutPath}`);
  }
}

function desktopShortcutNames(): string[] {
  const exeName = path.basename(process.execPath);
  return [
    `${APP_CONFIG.name}.lnk`,
    `${exeName} - ショートカット.lnk`,
    `${exeName} - Shortcut.lnk`,
  ];
}

export function registerWindowsAppShortcuts(): void {
  if (!app.isPackaged || process.platform !== 'win32') {
    return;
  }

  const programs = path.join(
    app.getPath('appData'),
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
  );
  fs.mkdirSync(programs, { recursive: true });
  writeAppShortcut(path.join(programs, `${APP_CONFIG.name}.lnk`));

  const desktop = app.getPath('desktop');
  for (const name of desktopShortcutNames()) {
    const shortcutPath = path.join(desktop, name);
    if (fs.existsSync(shortcutPath)) {
      writeAppShortcut(shortcutPath);
    }
  }
}
