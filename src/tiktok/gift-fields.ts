import { CatalogGift } from '../shared/types';
import { MSG } from '../shared/messages';
import {
  compareCatalogGiftOrder,
  japaneseNameForGift,
} from '../shared/permanent-gift-names';

/** @deprecated 名前互換。compareCatalogGiftOrder と同じ。 */
export const compareCatalogGiftsByDisplay = compareCatalogGiftOrder;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function firstImageUrl(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('//') && /^\/\/[A-Za-z0-9.-]+\//.test(trimmed)) {
      return rewriteGiftImageUrl(`https:${trimmed}`);
    }
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
      return rewriteGiftImageUrl(trimmed);
    }
    return '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstImageUrl(item);
      if (found) {
        return found;
      }
    }
    return '';
  }

  const record = asRecord(value);
  const list = record.urlList ?? record.url_list;
  if (Array.isArray(list)) {
    return firstImageUrl(list);
  }
  if (record.url !== undefined) {
    return firstImageUrl(record.url);
  }
  if (record.uri !== undefined) {
    return firstImageUrl(record.uri);
  }
  return '';
}

/** Euler カタログの画像は署名付きで切れやすいので TikTok CDN へ寄せる。 */
export function rewriteGiftImageUrl(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    return '';
  }
  const match = trimmed.match(
    /assets\.cdn\.eulerstream\.com\/gifts\/images\/([a-f0-9]+)/i,
  );
  if (match) {
    return `https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/${match[1]}~tplv-obj.png`;
  }
  return trimmed;
}

export function giftImageUrlFromEvent(raw: Record<string, unknown>): string {
  const gift = asRecord(raw.giftDetails ?? raw.gift);
  const extra = asRecord(raw.extendedGiftInfo);
  return (
    firstImageUrl(raw.giftPictureUrl) ||
    firstImageUrl(gift.image) ||
    firstImageUrl(gift.icon) ||
    firstImageUrl(gift.previewImage) ||
    firstImageUrl(gift.giftImage) ||
    firstImageUrl(extra.image) ||
    firstImageUrl(extra.icon) ||
    firstImageUrl(extra.giftImage) ||
    ''
  );
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function giftIdFromEvent(raw: Record<string, unknown>): string {
  const gift = asRecord(raw.giftDetails ?? raw.gift);
  const extra = asRecord(raw.extendedGiftInfo);
  return (
    asString(raw.giftId) ||
    asString(raw.gift_id) ||
    asString(gift.id) ||
    asString(gift.gift_id) ||
    asString(gift.giftId) ||
    asString(extra.id) ||
    asString(extra.gift_id) ||
    asString(extra.giftId) ||
    ''
  );
}

export function giftNameFromEvent(raw: Record<string, unknown>): string {
  const gift = asRecord(raw.giftDetails ?? raw.gift);
  const extra = asRecord(raw.extendedGiftInfo);
  const named =
    asString(raw.giftName) ||
    asString(gift.giftName) ||
    asString(gift.name) ||
    asString(extra.name) ||
    asString(extra.giftName);
  if (named) {
    return named;
  }
  if (gift.isRandomGift === true || extra.isRandomGift === true) {
    return MSG.ui.mysteryGift;
  }
  if (gift.isBoxGift === true || extra.isBoxGift === true) {
    return MSG.ui.giftBox;
  }
  return MSG.ui.genericGift;
}

export function catalogGiftNameById(catalog: CatalogGift[] | undefined, giftId: string): string {
  const id = String(giftId || '').trim();
  if (!id || !Array.isArray(catalog) || catalog.length === 0) {
    return '';
  }
  const hit = catalog.find((gift) => gift.id === id);
  return String(hit?.name ?? '').trim();
}

export function resolveGiftNameWithCatalog(
  raw: Record<string, unknown>,
  catalog: CatalogGift[] | undefined,
): string {
  const fromEvent = giftNameFromEvent(raw);
  const fromCatalog = catalogGiftNameById(catalog, giftIdFromEvent(raw));
  const gift = asRecord(raw.giftDetails ?? raw.gift);
  const diamondCount =
    asNumber(raw.diamondCount) ||
    asNumber(raw.diamond_count) ||
    asNumber(gift.diamondCount) ||
    asNumber(gift.diamond_count);
  let resolved = fromEvent;
  if (fromCatalog && fromEvent) {
    resolved = pickCatalogGiftName(fromCatalog, fromEvent);
  } else if (fromCatalog) {
    resolved = fromCatalog;
  }
  // 常設英→日は一覧に日本語が無くてもイベント英名から直す
  return japaneseNameForGift(resolved, diamondCount || undefined);
}

function unwrapGiftList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  const record = asRecord(raw);
  if (Array.isArray(record.gifts)) {
    return record.gifts;
  }
  const data = asRecord(record.data);
  if (Array.isArray(data.gifts)) {
    return data.gifts;
  }
  // Euler カタログや一部レスポンスは data が配列そのもの
  if (Array.isArray(record.data)) {
    return record.data;
  }
  return [];
}

const MAX_CATALOG_GIFTS = 500;

export function catalogGiftsFromList(
  raw: unknown,
  options: { limit?: number } = {},
): CatalogGift[] {
  const seen = new Set<string>();
  const gifts: CatalogGift[] = [];
  const limit =
    typeof options.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(0, Math.trunc(options.limit))
      : MAX_CATALOG_GIFTS;

  for (const item of unwrapGiftList(raw)) {
    const record = asRecord(item);
    const name =
      asString(record.name) ||
      asString(record.giftName) ||
      asString(record.gift_name) ||
      asString(record.describe);
    if (!name) {
      continue;
    }
    const id = String(
      record.id ?? record.gift_id ?? record.giftId ?? record.giftID ?? name,
    );
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    gifts.push({
      id,
      name,
      imageUrl:
        giftImageUrlFromEvent({ gift: record }) ||
        firstImageUrl(record.imageUri) ||
        firstImageUrl(record.image_uri),
      diamondCount: Math.max(
        0,
        asNumber(record.diamond_count) || asNumber(record.diamondCount),
      ),
    });
  }

  gifts.sort(compareCatalogGiftsByDisplay);
  return limit > 0 ? gifts.slice(0, limit) : gifts;
}

export function looksJapaneseGiftName(name: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(name);
}

/** 共有の catalogGiftHasIcon と同じ判定（ui/js/catalog-gift-icon.js と揃える）。 */
export function catalogGiftHasIcon(gift: { imageUrl?: string }): boolean {
  const url = firstImageUrl(gift.imageUrl);
  if (!url || !/^https?:\/\//i.test(url)) {
    return false;
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    // 下書きで使われていたドメインだけのプレースホルダ
    if (host === 'tiktokcdn.com' || host === 'www.tiktokcdn.com') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function catalogGiftsWithIcons(gifts: CatalogGift[]): CatalogGift[] {
  return gifts.filter(catalogGiftHasIcon);
}

/** 日本語名を英語名で潰さない。再取得時は preferIncoming で上書き可。 */
export function pickCatalogGiftName(
  prev: string,
  next: string,
  preferIncoming = false,
): string {
  const left = String(prev || '').trim();
  const right = String(next || '').trim();
  if (preferIncoming) {
    return right || left;
  }
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  if (looksJapaneseGiftName(right) && !looksJapaneseGiftName(left)) {
    return right;
  }
  if (looksJapaneseGiftName(left) && !looksJapaneseGiftName(right)) {
    return left;
  }
  return left;
}

/** 配信中に届いたギフトを一覧へ足す。新規なら true。 */
export function mergeCatalogGift(
  list: CatalogGift[],
  gift: CatalogGift,
  options: { preferIncomingName?: boolean } = {},
): CatalogGift[] {
  const id = String(gift.id ?? '').trim();
  const name = String(gift.name ?? '').trim();
  if (!id || !name) {
    return list;
  }

  const next: CatalogGift = {
    id,
    name,
    imageUrl: firstImageUrl(gift.imageUrl),
    diamondCount: Math.max(0, Number(gift.diamondCount) || 0),
  };
  const index = list.findIndex((item) => item.id === id);
  let merged: CatalogGift[];
  if (index < 0) {
    merged = [...list, next];
  } else {
    const prev = list[index];
    const updated: CatalogGift = {
      id,
      name: pickCatalogGiftName(prev.name, next.name, options.preferIncomingName === true),
      imageUrl: next.imageUrl || prev.imageUrl,
      diamondCount: next.diamondCount || prev.diamondCount,
    };
    if (
      updated.name === prev.name &&
      updated.imageUrl === prev.imageUrl &&
      updated.diamondCount === prev.diamondCount
    ) {
      return list;
    }
    merged = list.slice();
    merged[index] = updated;
  }
  merged.sort(compareCatalogGiftsByDisplay);
  return merged.slice(0, MAX_CATALOG_GIFTS);
}

/** API 再取得分を既存一覧へ足す。取得名が日本語なら優先し、英語で日本語を潰さない。 */
export function mergeCatalogGiftsFromFetch(
  list: CatalogGift[],
  fetched: CatalogGift[],
): CatalogGift[] {
  let merged = list;
  for (const gift of fetched) {
    merged = mergeCatalogGift(merged, gift, {
      preferIncomingName: looksJapaneseGiftName(String(gift.name ?? '')),
    });
  }
  return merged;
}

export function normalizeCatalogGifts(
  raw: unknown,
  options: { limit?: number } = {},
): CatalogGift[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const limit =
    typeof options.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(0, Math.trunc(options.limit))
      : MAX_CATALOG_GIFTS;
  const seen = new Set<string>();
  const gifts: CatalogGift[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    const id = String(record.id ?? '').trim();
    const name = asString(record.name).trim();
    if (!id || !name || seen.has(id)) {
      continue;
    }
    seen.add(id);
    gifts.push({
      id,
      name,
      imageUrl: firstImageUrl(record.imageUrl),
      diamondCount: Math.max(0, asNumber(record.diamondCount)),
    });
  }
  return limit > 0 ? gifts.slice(0, limit) : gifts;
}
