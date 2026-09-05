import fs from 'fs';
import path from 'path';
import { app, nativeImage, NativeImage } from 'electron';
import { APP_CONFIG } from '../shared/app-config';
import { getLogger } from '../shared/logging-config';

const logger = getLogger('app-icon');

function resolvePath(iconPath: string): string {
  if (path.isAbsolute(iconPath)) {
    return iconPath;
  }

  return path.join(app.getAppPath(), iconPath);
}

function readIcon(filePath: string): NativeImage | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    logger.warning(`アイコンを読み込めませんでした: ${filePath}`);
    return null;
  }
  return image;
}

export function getAppIconPath(): string {
  return path.join(app.getAppPath(), 'assets', 'icon.png');
}

export function loadAppIcon(): NativeImage {
  const image = readIcon(getAppIconPath());
  if (image) {
    return image;
  }
  logger.warning('アプリアイコンが見つかりません。空アイコンを使います');
  return nativeImage.createEmpty();
}

export function loadTrayIcon(): NativeImage {
  const candidates: string[] = [];

  if (APP_CONFIG.trayIconPath) {
    candidates.push(resolvePath(APP_CONFIG.trayIconPath));
  }

  candidates.push(path.join(app.getAppPath(), 'assets', 'tray-icon.png'));
  candidates.push(getAppIconPath());

  for (const candidate of candidates) {
    const image = readIcon(candidate);
    if (!image) {
      continue;
    }
    const tray = nativeImage.createEmpty();
    tray.addRepresentation({
      scaleFactor: 1,
      width: 16,
      height: 16,
      buffer: image.resize({ width: 16, height: 16 }).toPNG(),
    });
    tray.addRepresentation({
      scaleFactor: 2,
      width: 32,
      height: 32,
      buffer: image.resize({ width: 32, height: 32 }).toPNG(),
    });
    return tray;
  }

  logger.warning('トレイアイコンが見つかりません。空アイコンを使います');
  return nativeImage.createEmpty();
}
