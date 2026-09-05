import { CatalogGift } from '../shared/types';
import { MSG } from '../shared/messages';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function firstImageUrl(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('//') && /^\/\/[A-Za-z0-9.-]+\//.test(trimmed)) {
      return `https:${trimmed}`;
    }
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/') ? trimmed : '';
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
  return [];
}

export function catalogGiftsFromList(raw: unknown): CatalogGift[] {
  const seen = new Set<string>();
  const gifts: CatalogGift[] = [];

  for (const item of unwrapGiftList(raw)) {
    const record = asRecord(item);
    const name =
      asString(record.name) ||
      asString(record.giftName) ||
      asString(record.describe);
    if (!name) {
      continue;
    }
    const id = String(record.id ?? record.gift_id ?? record.giftId ?? name);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    gifts.push({
      id,
      name,
      imageUrl: giftImageUrlFromEvent({ gift: record }),
      diamondCount: Math.max(
        0,
        asNumber(record.diamond_count) || asNumber(record.diamondCount),
      ),
    });
  }

  gifts.sort((left, right) => {
    if (left.diamondCount !== right.diamondCount) {
      return left.diamondCount - right.diamondCount;
    }
    return left.name.localeCompare(right.name, 'ja');
  });
  return gifts;
}

const MAX_CATALOG_GIFTS = 500;

export function normalizeCatalogGifts(raw: unknown): CatalogGift[] {
  if (!Array.isArray(raw)) {
    return [];
  }

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
  return gifts.slice(0, MAX_CATALOG_GIFTS);
}
