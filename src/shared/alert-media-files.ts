import fs from 'fs';
import path from 'path';
import { getDataDir } from './app-paths';
import {
  ALERT_MEDIA_FILE_EXTENSIONS,
  EVENT_ALERT_TYPES,
  normalizeAlertMediaFileName,
  type EventAlertMediaMap,
} from './event-alert';

export function getAlertMediaDir(): string {
  const dir = path.join(getDataDir(), 'alert-media');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function alertMediaFilePath(fileName: string): string | null {
  const safe = normalizeAlertMediaFileName(fileName);
  if (!safe) {
    return null;
  }
  return path.join(getAlertMediaDir(), safe);
}

export function listAlertMediaFiles(): string[] {
  const dir = getAlertMediaDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => normalizeAlertMediaFileName(name))
    .sort((a, b) => a.localeCompare(b, 'ja'));
}

export function deleteAlertMediaFile(fileName: string): boolean {
  const full = alertMediaFilePath(fileName);
  if (!full || !fs.existsSync(full)) {
    return false;
  }
  fs.unlinkSync(full);
  return true;
}

/** 設定で参照中のアラート画像名。 */
export function collectReferencedAlertMediaFiles(media: EventAlertMediaMap | undefined): Set<string> {
  const keep = new Set<string>();
  if (!media) {
    return keep;
  }
  for (const type of EVENT_ALERT_TYPES) {
    const ref = media[type];
    if (ref?.kind === 'file') {
      const name = normalizeAlertMediaFileName(ref.fileName);
      if (name) {
        keep.add(name);
      }
    }
  }
  return keep;
}

/** どのイベントからも参照されていないアラート画像を消す。 */
export function pruneUnreferencedAlertMediaFiles(media: EventAlertMediaMap | undefined): string[] {
  const keep = collectReferencedAlertMediaFiles(media);
  const removed: string[] = [];
  for (const name of listAlertMediaFiles()) {
    if (keep.has(name)) {
      continue;
    }
    if (deleteAlertMediaFile(name)) {
      removed.push(name);
    }
  }
  return removed;
}

/** 元のファイル名をそのまま使う（同名は上書き）。不正名のときだけタイムスタンプ名。 */
export function allocateAlertMediaFileName(preferredName: string, fallbackExt: string): string {
  return (
    normalizeAlertMediaFileName(preferredName) ||
    normalizeAlertMediaFileName(`${Date.now().toString(36)}.${fallbackExt}`) ||
    `${Date.now().toString(36)}.${fallbackExt}`
  );
}

export function saveAlertMediaFile(sourcePath: string, preferredName?: string): string {
  const ext = path.extname(sourcePath).toLowerCase().replace(/^\./, '');
  if (!(ALERT_MEDIA_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new Error('対応していない画像形式です');
  }
  const dir = getAlertMediaDir();
  const preferred =
    normalizeAlertMediaFileName(preferredName) ||
    normalizeAlertMediaFileName(path.basename(sourcePath)) ||
    `${Date.now().toString(36)}.${ext}`;
  const base = allocateAlertMediaFileName(preferred, ext);
  const dest = path.join(dir, base);
  fs.copyFileSync(sourcePath, dest);
  return base;
}
