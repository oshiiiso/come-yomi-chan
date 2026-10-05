import type { SoundRef } from './sound-ref';
import { DEFAULT_GIFT_SOUND_REF, normalizeGiftSoundRef } from './sound-ref';

export type GiftNotifyMode = 'speak' | 'chime';
export type CommentNotifyMode = 'speak' | 'sound';
export type GiftChimeMatchMode = 'gift' | 'diamond';

export function normalizeCommentNotifyMode(raw: unknown): CommentNotifyMode {
  if (raw === 'sound' || raw === 'chime') {
    return 'sound';
  }
  return 'speak';
}

export interface GiftChimeDiamondBand {
  minDiamonds: number;
  /** null は上限なし */
  maxDiamonds: number | null;
  sound: SoundRef;
  volume: number;
}

export const MAX_GIFT_CHIME_DIAMOND_BANDS = 30;
export const DEFAULT_GIFT_CHIME_VOLUME = 100;
export const MAX_GIFT_CHIME_VOLUME = 500;

export function normalizeGiftChimeVolume(raw: unknown): number {
  const parsed =
    typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? '').trim());
  if (!Number.isFinite(parsed)) {
    return DEFAULT_GIFT_CHIME_VOLUME;
  }
  return Math.max(0, Math.min(MAX_GIFT_CHIME_VOLUME, Math.round(parsed)));
}

export function normalizeGiftChimeVolumeById(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(key || '').trim();
    if (!id) {
      continue;
    }
    out[id] = normalizeGiftChimeVolume(value);
  }
  return out;
}

export function giftChimeVolumeForId(
  giftId: string | undefined,
  map: Record<string, number> | undefined,
): number {
  const id = String(giftId || '').trim();
  if (id && map && Object.prototype.hasOwnProperty.call(map, id)) {
    return normalizeGiftChimeVolume(map[id]);
  }
  return DEFAULT_GIFT_CHIME_VOLUME;
}

/** 個別ファイル音だけギフト別音量。テンプレ／共通音は commonVolume。 */
export function resolveGiftChimeVolume(params: {
  giftId?: string;
  byGiftIdSound?: Record<string, SoundRef>;
  byGiftIdVolume?: Record<string, number>;
  commonVolume?: number;
}): number {
  const id = String(params.giftId || '').trim();
  const custom = Boolean(id && params.byGiftIdSound?.[id]?.kind === 'file');
  if (custom) {
    return giftChimeVolumeForId(id, params.byGiftIdVolume);
  }
  return normalizeGiftChimeVolume(params.commonVolume);
}

/** 個別音が無いギフトの音量設定は捨てる（共通音量に寄せる）。 */
export function pruneGiftChimeVolumeById(
  byGiftIdVolume: Record<string, number> | undefined,
  byGiftIdSound: Record<string, SoundRef> | undefined,
): Record<string, number> {
  const volumes = normalizeGiftChimeVolumeById(byGiftIdVolume);
  const out: Record<string, number> = {};
  for (const [id, volume] of Object.entries(volumes)) {
    if (byGiftIdSound?.[id]?.kind === 'file') {
      out[id] = volume;
    }
  }
  return out;
}

/** 再生ゲイン。100 が等倍、500 で 5 倍。 */
export function giftChimeVolumeToGain(volume: unknown): number {
  return normalizeGiftChimeVolume(volume) / DEFAULT_GIFT_CHIME_VOLUME;
}

export function normalizeGiftNotifyMode(raw: unknown): GiftNotifyMode {
  return raw === 'chime' ? 'chime' : 'speak';
}

export function normalizeGiftChimeMatchMode(raw: unknown): GiftChimeMatchMode {
  return raw === 'diamond' ? 'diamond' : 'gift';
}

/** サウンドのときはアプリ本体だけ鳴らす（UI では選ばせない）。 */
export function normalizeGiftChimeDestinations(params: {
  mode: GiftNotifyMode;
  playApp: boolean;
  playOverlay: boolean;
}): { playApp: boolean; playOverlay: boolean } {
  if (params.mode === 'chime') {
    return { playApp: true, playOverlay: false };
  }
  return {
    playApp: Boolean(params.playApp),
    playOverlay: Boolean(params.playOverlay),
  };
}

export function normalizeGiftSpeakById(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(key || '').trim();
    // オプトイン: ON だけ残す。未登録は OFF
    if (!id || value !== true) {
      continue;
    }
    out[id] = true;
  }
  return out;
}

export function shouldSpeakGiftById(
  giftId: string | undefined,
  map: Record<string, boolean> | undefined,
): boolean {
  const id = String(giftId || '').trim();
  if (!id || !map) {
    return false;
  }
  return map[id] === true;
}

export function resolveGiftChimeSound(
  giftId: string | undefined,
  byGiftId: Record<string, SoundRef> | undefined,
  fallback: SoundRef | undefined,
): SoundRef {
  const id = String(giftId || '').trim();
  if (id && byGiftId?.[id]) {
    return normalizeGiftSoundRef(byGiftId[id]);
  }
  return normalizeGiftSoundRef(fallback ?? DEFAULT_GIFT_SOUND_REF);
}

function asBandInt(value: unknown): number | null {
  if (value === '' || value == null) {
    return null;
  }
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return Math.min(100000, parsed);
}

function asBandRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * 下限なし・上限なしの行は捨てる。
 * 下限なし・上限ありは下限 1。
 * 上限なしは maxDiamonds = null。
 * 逆転・重複は捨てる（ソート後、先に残した帯を優先）。
 */
export function normalizeGiftChimeDiamondBands(raw: unknown): GiftChimeDiamondBand[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: GiftChimeDiamondBand[] = [];
  for (const item of raw) {
    const record = asBandRecord(item);
    if (!record) {
      continue;
    }
    let min = asBandInt(record.minDiamonds ?? record.min);
    const max = asBandInt(record.maxDiamonds ?? record.max);
    if (min == null && max == null) {
      continue;
    }
    if (min == null) {
      min = 1;
    }
    if (max != null && max < min) {
      continue;
    }
    out.push({
      minDiamonds: min,
      maxDiamonds: max,
      sound: normalizeGiftSoundRef(record.sound),
      volume: normalizeGiftChimeVolume(record.volume),
    });
    if (out.length >= MAX_GIFT_CHIME_DIAMOND_BANDS) {
      break;
    }
  }

  out.sort((left, right) => {
    if (left.minDiamonds !== right.minDiamonds) {
      return left.minDiamonds - right.minDiamonds;
    }
    const leftMax = left.maxDiamonds ?? Number.POSITIVE_INFINITY;
    const rightMax = right.maxDiamonds ?? Number.POSITIVE_INFINITY;
    return leftMax - rightMax;
  });

  const cleaned: GiftChimeDiamondBand[] = [];
  for (const band of out) {
    if (cleaned.some((prev) => diamondBandsOverlap(prev, band))) {
      continue;
    }
    cleaned.push(band);
    if (cleaned.length >= MAX_GIFT_CHIME_DIAMOND_BANDS) {
      break;
    }
  }
  return cleaned;
}

export type GiftChimeBandIssue = 'overlap' | 'inverted';

export function validateGiftChimeDiamondBands(
  bands: GiftChimeDiamondBand[],
): { ok: true } | { ok: false; issue: GiftChimeBandIssue } {
  for (const band of bands) {
    if (band.maxDiamonds != null && band.maxDiamonds < band.minDiamonds) {
      return { ok: false, issue: 'inverted' };
    }
  }
  for (let i = 0; i < bands.length; i += 1) {
    for (let j = i + 1; j < bands.length; j += 1) {
      if (diamondBandsOverlap(bands[i], bands[j])) {
        return { ok: false, issue: 'overlap' };
      }
    }
  }
  return { ok: true };
}

export function diamondBandsOverlap(
  left: GiftChimeDiamondBand,
  right: GiftChimeDiamondBand,
): boolean {
  const leftMax = left.maxDiamonds ?? Number.POSITIVE_INFINITY;
  const rightMax = right.maxDiamonds ?? Number.POSITIVE_INFINITY;
  return left.minDiamonds <= rightMax && right.minDiamonds <= leftMax;
}

export function findGiftChimeDiamondBand(
  diamondCount: number,
  bands: GiftChimeDiamondBand[],
): GiftChimeDiamondBand | null {
  const count = Math.max(0, Math.floor(Number(diamondCount) || 0));
  for (const band of bands) {
    const max = band.maxDiamonds ?? Number.POSITIVE_INFINITY;
    if (count >= band.minDiamonds && count <= max) {
      return band;
    }
  }
  return null;
}

/** 帯の音がテンプレなら内蔵チャリン、ファイルなら帯の音。 */
export function resolveGiftChimeBandSound(
  band: GiftChimeDiamondBand | null | undefined,
): SoundRef | null {
  if (!band) {
    return null;
  }
  if (band.sound.kind === 'file') {
    return normalizeGiftSoundRef(band.sound);
  }
  return { ...DEFAULT_GIFT_SOUND_REF };
}

export function shouldPlayGiftChime(params: {
  playApp: boolean;
  playOverlay: boolean;
}): { playApp: boolean; playOverlay: boolean } {
  return {
    playApp: Boolean(params.playApp),
    playOverlay: Boolean(params.playOverlay),
  };
}
