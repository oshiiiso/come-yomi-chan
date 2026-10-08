/** ランキング入れ替わりの動き（Aスライド／Bふわっと／C強調） */
export const OVERLAY_RANKING_MOTIONS = ['slide', 'soft', 'emphasis'] as const;
export type OverlayRankingMotion = (typeof OVERLAY_RANKING_MOTIONS)[number];

/** 速さ 1遅い / 2ふつう / 3速い */
export const OVERLAY_RANKING_MOTION_SPEEDS = [1, 2, 3] as const;
export type OverlayRankingMotionSpeed = (typeof OVERLAY_RANKING_MOTION_SPEEDS)[number];

export const DEFAULT_OVERLAY_RANKING_MOTION: OverlayRankingMotion = 'slide';
export const DEFAULT_OVERLAY_RANKING_MOTION_SPEED: OverlayRankingMotionSpeed = 2;

/** コメント列の速さ 2/3/4 に相当 */
export const OVERLAY_RANKING_MOTION_MS: Record<OverlayRankingMotionSpeed, number> = {
  1: 720,
  2: 480,
  3: 320,
};

export function isOverlayRankingMotion(value: unknown): value is OverlayRankingMotion {
  return typeof value === 'string' && (OVERLAY_RANKING_MOTIONS as readonly string[]).includes(value);
}

export function normalizeOverlayRankingMotion(value: unknown): OverlayRankingMotion {
  return isOverlayRankingMotion(value) ? value : DEFAULT_OVERLAY_RANKING_MOTION;
}

export function normalizeOverlayRankingMotionSpeed(value: unknown): OverlayRankingMotionSpeed {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (OVERLAY_RANKING_MOTION_SPEEDS.includes(parsed as OverlayRankingMotionSpeed)) {
    return parsed as OverlayRankingMotionSpeed;
  }
  return DEFAULT_OVERLAY_RANKING_MOTION_SPEED;
}

export function overlayRankingMotionMs(speed: unknown): number {
  return OVERLAY_RANKING_MOTION_MS[normalizeOverlayRankingMotionSpeed(speed)];
}
