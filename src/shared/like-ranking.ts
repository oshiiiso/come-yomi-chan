/** 配信ソース用ランキング（セッション累計・いいね／ダイヤ） */
export const OVERLAY_LIKE_RANKING_MIN = 1;
export const OVERLAY_LIKE_RANKING_MAX = 10;
export const DEFAULT_OVERLAY_LIKE_RANKING_MAX = 5;
export const DEFAULT_OVERLAY_LIKE_RANKING_ENABLED = true;

export const OVERLAY_RANKING_MODES = ['likes', 'diamonds'] as const;
export type OverlayRankingMode = (typeof OVERLAY_RANKING_MODES)[number];
export const DEFAULT_OVERLAY_RANKING_MODE: OverlayRankingMode = 'likes';

/** いいねランキングの配信ソース更新方式 */
export const OVERLAY_RANKING_LIKE_SYNC_MODES = ['live', 'poll'] as const;
export type OverlayRankingLikeSyncMode = (typeof OVERLAY_RANKING_LIKE_SYNC_MODES)[number];
export const DEFAULT_OVERLAY_RANKING_LIKE_SYNC_MODE: OverlayRankingLikeSyncMode = 'live';
export const OVERLAY_RANKING_LIKE_POLL_SEC_MIN = 1;
export const OVERLAY_RANKING_LIKE_POLL_SEC_MAX = 300;
export const DEFAULT_OVERLAY_RANKING_LIKE_POLL_SEC = 30;

export interface RankEntry {
  uniqueId: string;
  nickname: string;
  count: number;
  /** いいね累計。配置ごとの集計切替用。無いときは count */
  likes?: number;
  /** ダイヤ累計。配置ごとの集計切替用。無いときは count */
  diamonds?: number;
  /** アイコンURL。無いときは空文字 */
  avatarUrl: string;
}

/** @deprecated RankEntry を使う。互換のため残す */
export type LikeRankEntry = RankEntry;

export interface OverlayRankingPayload {
  entries: RankEntry[];
  max: number;
  enabled: boolean;
  mode: OverlayRankingMode;
  /** 単独ランキングソースのいいね更新。配置側は枠ごとの設定を使う */
  likeSyncMode?: OverlayRankingLikeSyncMode;
  likePollSec?: number;
  /** 入れ替わり確認。ポーリング間隔を待たずに出す */
  previewMotion?: boolean;
}

/** @deprecated OverlayRankingPayload を使う */
export type OverlayLikeRankingPayload = OverlayRankingPayload;

export function normalizeOverlayLikeRankingMax(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return DEFAULT_OVERLAY_LIKE_RANKING_MAX;
  }
  return Math.min(
    OVERLAY_LIKE_RANKING_MAX,
    Math.max(OVERLAY_LIKE_RANKING_MIN, Math.trunc(num)),
  );
}

export function normalizeOverlayLikeRankingEnabled(value: unknown): boolean {
  return value !== false;
}

export function normalizeOverlayRankingMode(value: unknown): OverlayRankingMode {
  return value === 'diamonds' ? 'diamonds' : 'likes';
}

export function normalizeOverlayRankingLikeSyncMode(
  value: unknown,
): OverlayRankingLikeSyncMode {
  return value === 'poll' ? 'poll' : 'live';
}

export function normalizeOverlayRankingLikePollSec(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return DEFAULT_OVERLAY_RANKING_LIKE_POLL_SEC;
  }
  return Math.min(
    OVERLAY_RANKING_LIKE_POLL_SEC_MAX,
    Math.max(OVERLAY_RANKING_LIKE_POLL_SEC_MIN, Math.trunc(num)),
  );
}

export function sameRanking(
  left: readonly RankEntry[] | null | undefined,
  right: readonly RankEntry[] | null | undefined,
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every((entry, index) => {
    const other = right[index];
    return (
      entry.uniqueId === other?.uniqueId &&
      entry.nickname === other?.nickname &&
      entry.count === other?.count &&
      (entry.avatarUrl || '') === (other?.avatarUrl || '') &&
      sameOptionalCount(entry.likes, other?.likes) &&
      sameOptionalCount(entry.diamonds, other?.diamonds)
    );
  });
}

function sameOptionalCount(left: number | undefined, right: number | undefined): boolean {
  const normalize = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  return normalize(left) === normalize(right);
}

/** @deprecated sameRanking を使う */
export const sameLikeRanking = sameRanking;

/** ランキング数表示。千の位ごとにシングルクォート（例: 1'200） */
export function formatLikeCount(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return '0';
  }
  const abs = Math.max(0, Math.trunc(Math.abs(num)));
  return String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

/** 通常ギフト1件のダイヤ加算量（個数×ダイヤ） */
export function giftDiamondDelta(diamondCount: unknown, giftCount: unknown): number {
  const diamonds =
    typeof diamondCount === 'number' && Number.isFinite(diamondCount)
      ? Math.max(0, Math.trunc(diamondCount))
      : 0;
  const count =
    typeof giftCount === 'number' && Number.isFinite(giftCount)
      ? Math.max(1, Math.trunc(giftCount))
      : 1;
  return diamonds * count;
}
