import { CatalogGift } from './types';
import {
  catalogGiftsWithIcons,
  firstImageUrl,
  mergeCatalogGiftsFromFetch,
  normalizeCatalogGifts,
  pickCatalogGiftName,
} from '../tiktok/gift-fields';
import {
  applyKnownJapaneseGiftNames,
  compareCatalogGiftOrder,
  normalizeGiftNameKey,
  preferPermanentCatalogGifts,
} from './permanent-gift-names';
import seedFile from './permanent-gifts.seed.json';

type SeedFile = {
  gifts?: unknown;
};

function rawSeedGifts(): unknown {
  const file = seedFile as SeedFile | CatalogGift[];
  if (Array.isArray(file)) {
    return file;
  }
  return file.gifts ?? [];
}

function giftImageFingerprint(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    return '';
  }
  const match =
    trimmed.match(/webcast-va\/([a-f0-9]+)/i) ||
    trimmed.match(/gifts\/images\/([a-f0-9]+)/i) ||
    trimmed.match(/\/([a-f0-9]{32})(?:~|\.|$)/i);
  return match ? match[1].toLowerCase() : '';
}

function catalogGiftDedupeKeys(gift: CatalogGift): string[] {
  const diamonds = gift.diamondCount;
  const keys = [`n:${diamonds}:${normalizeGiftNameKey(gift.name)}`];
  const fingerprint = giftImageFingerprint(gift.imageUrl);
  if (fingerprint) {
    keys.push(`i:${diamonds}:${fingerprint}`);
  }
  return keys;
}

function preferCatalogGiftId(
  left: string,
  right: string,
  preferIds?: ReadonlySet<string>,
): string {
  const leftPreferred = preferIds?.has(left) === true;
  const rightPreferred = preferIds?.has(right) === true;
  if (leftPreferred !== rightPreferred) {
    return leftPreferred ? left : right;
  }
  const a = Number(left);
  const b = Number(right);
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return a <= b ? left : right;
  }
  return left || right;
}

function mergeDuplicateCatalogGifts(
  left: CatalogGift,
  right: CatalogGift,
  preferIds?: ReadonlySet<string>,
): CatalogGift {
  return {
    id: preferCatalogGiftId(left.id, right.id, preferIds),
    name: pickCatalogGiftName(left.name, right.name),
    imageUrl: left.imageUrl || right.imageUrl,
    diamondCount: left.diamondCount || right.diamondCount,
  };
}

/**
 * 同名・同ダイヤ、または同アイコン・同ダイヤを1件にまとめる。
 * 英名は既知辞書で日本語化してから判定する。
 * preferIds にある ID は個別設定がある想定で優先して残す。
 */
export function dedupeAndSortCatalogGifts(
  gifts: CatalogGift[],
  options: { preferIds?: Iterable<string> } = {},
): CatalogGift[] {
  const preferIds = options.preferIds
    ? new Set(
        [...options.preferIds]
          .map((id) => String(id || '').trim())
          .filter(Boolean),
      )
    : undefined;
  const prepared = applyKnownJapaneseGiftNames(
    gifts
      .map((gift) => ({
        id: String(gift.id ?? '').trim(),
        name: String(gift.name ?? '').trim(),
        imageUrl: firstImageUrl(gift.imageUrl),
        diamondCount: Math.max(0, Number(gift.diamondCount) || 0),
      }))
      .filter((gift) => gift.id && gift.name),
  );
  if (prepared.length <= 1) {
    return prepared.sort(compareCatalogGiftOrder);
  }

  const parent = prepared.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) {
      root = parent[root];
    }
    let cursor = index;
    while (parent[cursor] !== root) {
      const next = parent[cursor];
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  };
  const union = (left: number, right: number): void => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) {
      parent[rootRight] = rootLeft;
    }
  };

  const keyToIndex = new Map<string, number>();
  for (let index = 0; index < prepared.length; index += 1) {
    for (const key of catalogGiftDedupeKeys(prepared[index])) {
      const previous = keyToIndex.get(key);
      if (previous === undefined) {
        keyToIndex.set(key, index);
      } else {
        union(previous, index);
      }
    }
  }

  const groups = new Map<number, CatalogGift>();
  for (let index = 0; index < prepared.length; index += 1) {
    const root = find(index);
    const current = groups.get(root);
    groups.set(
      root,
      current
        ? mergeDuplicateCatalogGifts(current, prepared[index], preferIds)
        : prepared[index],
    );
  }

  return [...groups.values()].sort(compareCatalogGiftOrder);
}

/** 同梱シード（作成時に日本語化・アイコン確認済み）。 */
export function bundledPermanentGifts(): CatalogGift[] {
  return catalogGiftsWithIcons(
    dedupeAndSortCatalogGifts(normalizeCatalogGifts(rawSeedGifts(), { limit: 0 })),
  );
}

/** 保存済み一覧に同梱 seed を土台として足す。 */
export function resolveCachedTestGifts(cachedRaw: unknown): CatalogGift[] {
  const cached = normalizeCatalogGifts(cachedRaw);
  const seed = bundledPermanentGifts();
  if (seed.length === 0) {
    return dedupeAndSortCatalogGifts(cached);
  }
  if (cached.length === 0) {
    return seed;
  }
  return dedupeAndSortCatalogGifts(mergeCatalogGiftsFromFetch(seed, cached));
}

/**
 * API 再取得分向け。常設英名を優先して上限内に収め、分かるものだけ日本語化する。
 * 保存済み一覧の読み込みでは使わない（配信で貯めた分を削らない）。
 */
export function finalizeCatalogGifts(gifts: CatalogGift[]): CatalogGift[] {
  const normalized = normalizeCatalogGifts(gifts, { limit: 0 });
  return preferPermanentCatalogGifts(dedupeAndSortCatalogGifts(normalized));
}
