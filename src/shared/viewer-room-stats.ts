export interface ViewerRoomTopGifter {
  uniqueId: string;
  nickname: string;
  coinCount: number;
}

export interface ViewerRoomStats {
  viewerCount: number;
  topGifters: ViewerRoomTopGifter[];
}

export const MAX_VIEWER_ROOM_TOP_GIFTERS = 5;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asTextLike(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return '';
}

export function normalizeViewerCount(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return Math.trunc(num);
}

function rankUserRecord(entry: Record<string, unknown>): Record<string, unknown> {
  return asRecord(entry.user ?? entry.rankUser ?? entry.contributor ?? entry.topUser ?? entry);
}

function pickRankUser(entry: Record<string, unknown>): { uniqueId: string; nickname: string } {
  const user = rankUserRecord(entry);
  const uniqueId = (
    asTextLike(user.uniqueId) ||
    asTextLike(user.unique_id) ||
    asTextLike(user.displayId) ||
    asTextLike(user.display_id) ||
    asTextLike(user.userId) ||
    asTextLike(user.userIdStr) ||
    asTextLike(user.idStr) ||
    asTextLike(user.id)
  ).replace(/^@/, '');
  const nickname =
    asTextLike(user.nickname) ||
    asTextLike(user.nick_name) ||
    asTextLike(user.nickName) ||
    asTextLike(user.displayName) ||
    uniqueId;
  return { uniqueId, nickname };
}

function normalizeCoinCount(value: unknown): number {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      return 0;
    }
    return Math.trunc(num);
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return Math.trunc(num);
}

function collectRankLists(record: Record<string, unknown>): unknown[] {
  const lists: unknown[] = [];
  for (const key of ['ranks', 'ranksList', 'ranks_list', 'topViewers', 'top_viewers', 'seats']) {
    const value = record[key];
    if (Array.isArray(value)) {
      lists.push(...value);
    }
  }
  return lists;
}

export function normalizeTopGifters(
  raw: unknown,
  limit = MAX_VIEWER_ROOM_TOP_GIFTERS,
): ViewerRoomTopGifter[] {
  const items = Array.isArray(raw) ? raw : collectRankLists(asRecord(raw));
  const out: ViewerRoomTopGifter[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const entry = asRecord(item);
    const user = pickRankUser(entry);
    const key = (user.uniqueId || user.nickname).toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({
      uniqueId: user.uniqueId,
      nickname: user.nickname,
      coinCount: normalizeCoinCount(
        entry.coinCount ??
          entry.coin_count ??
          entry.score ??
          entry.diamondCount ??
          entry.diamond_count,
      ),
    });
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

export function parseConcurrentViewerCount(record: Record<string, unknown>): number {
  return normalizeViewerCount(
    record.viewerCount ??
      record.viewer_count ??
      record.total ??
      record.popularity,
  );
}

export function parseViewerRoomStats(raw: unknown): ViewerRoomStats | null {
  const record = asRecord(raw);
  const viewerCount = parseConcurrentViewerCount(record);
  const topGifters = normalizeTopGifters(collectRankLists(record));
  if (viewerCount <= 0 && topGifters.length === 0) {
    return null;
  }
  return { viewerCount, topGifters };
}

export function sameViewerRoomStats(
  left: ViewerRoomStats | null | undefined,
  right: ViewerRoomStats | null | undefined,
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.viewerCount !== right.viewerCount || left.topGifters.length !== right.topGifters.length) {
    return false;
  }
  return left.topGifters.every(
    (entry, index) =>
      entry.uniqueId === right.topGifters[index]?.uniqueId &&
      entry.nickname === right.topGifters[index]?.nickname &&
      entry.coinCount === right.topGifters[index]?.coinCount,
  );
}

export function formatViewerCountJa(value: number): string {
  return new Intl.NumberFormat('ja-JP').format(Math.max(0, value));
}
