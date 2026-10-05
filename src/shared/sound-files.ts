import fs from 'fs';
import path from 'path';
import { getDataDir } from './app-paths';
import type { GiftChimeDiamondBand } from './gift-notify';
import type { EventSoundMap } from './event-notify';
import {
  normalizeSoundFileName,
  SOUND_FILE_EXTENSIONS,
  type SoundRef,
} from './sound-ref';

export function getSoundsDir(): string {
  const dir = path.join(getDataDir(), 'sounds');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function soundFilePath(fileName: string): string | null {
  const safe = normalizeSoundFileName(fileName);
  if (!safe) {
    return null;
  }
  return path.join(getSoundsDir(), safe);
}

export function listSoundFiles(): string[] {
  const dir = getSoundsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => normalizeSoundFileName(name))
    .sort((a, b) => a.localeCompare(b, 'ja'));
}

function addSoundRef(keep: Set<string>, sound: SoundRef | undefined): void {
  if (sound?.kind === 'file') {
    const name = normalizeSoundFileName(sound.fileName);
    if (name) {
      keep.add(name);
    }
  }
}

/** 設定で参照中の効果音ファイル名。 */
export function collectReferencedSoundFiles(config: {
  giftChimeSound?: SoundRef;
  giftChimeByGiftId?: Record<string, SoundRef>;
  giftChimeDiamondBands?: GiftChimeDiamondBand[];
  commentSound?: SoundRef;
  eventSound?: EventSoundMap;
}): Set<string> {
  const keep = new Set<string>();
  addSoundRef(keep, config.giftChimeSound);
  addSoundRef(keep, config.commentSound);
  if (config.giftChimeByGiftId) {
    for (const sound of Object.values(config.giftChimeByGiftId)) {
      addSoundRef(keep, sound);
    }
  }
  if (Array.isArray(config.giftChimeDiamondBands)) {
    for (const band of config.giftChimeDiamondBands) {
      addSoundRef(keep, band?.sound);
    }
  }
  if (config.eventSound) {
    for (const sound of Object.values(config.eventSound)) {
      addSoundRef(keep, sound);
    }
  }
  return keep;
}

/** どの設定からも参照されていない効果音を消す。 */
export function pruneUnreferencedSoundFiles(config: {
  giftChimeSound?: SoundRef;
  giftChimeByGiftId?: Record<string, SoundRef>;
  giftChimeDiamondBands?: GiftChimeDiamondBand[];
  commentSound?: SoundRef;
  eventSound?: EventSoundMap;
}): string[] {
  const keep = collectReferencedSoundFiles(config);
  const removed: string[] = [];
  for (const name of listSoundFiles()) {
    if (keep.has(name)) {
      continue;
    }
    if (deleteSoundFile(name)) {
      removed.push(name);
    }
  }
  return removed;
}

/** 元のファイル名をそのまま使う（同名は上書き）。不正名のときだけタイムスタンプ名。 */
export function allocateSoundFileName(preferredName: string, fallbackExt: string): string {
  return (
    normalizeSoundFileName(preferredName) ||
    normalizeSoundFileName(`${Date.now().toString(36)}.${fallbackExt}`) ||
    `${Date.now().toString(36)}.${fallbackExt}`
  );
}

export function saveSoundFile(sourcePath: string, preferredName?: string): string {
  const ext = path.extname(sourcePath).toLowerCase().replace(/^\./, '');
  if (!(SOUND_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new Error('対応していない音声形式です');
  }
  const dir = getSoundsDir();
  const preferred =
    normalizeSoundFileName(preferredName) ||
    normalizeSoundFileName(path.basename(sourcePath)) ||
    `${Date.now().toString(36)}.${ext}`;
  const base = allocateSoundFileName(preferred, ext);
  const dest = path.join(dir, base);
  fs.copyFileSync(sourcePath, dest);
  return base;
}

export function deleteSoundFile(fileName: string): boolean {
  const full = soundFilePath(fileName);
  if (!full || !fs.existsSync(full)) {
    return false;
  }
  fs.unlinkSync(full);
  return true;
}
