/** src/shared/overlay-ranking-motion.ts と揃える */
const OVERLAY_RANKING_MOTIONS = ['slide', 'soft', 'emphasis'];
const OVERLAY_RANKING_MOTION_SPEEDS = [1, 2, 3];
const DEFAULT_OVERLAY_RANKING_MOTION = 'slide';
const DEFAULT_OVERLAY_RANKING_MOTION_SPEED = 2;
const OVERLAY_RANKING_MOTION_MS = {
  1: 720,
  2: 480,
  3: 320,
};

const OVERLAY_RANKING_MOTION_COPY_KEYS = {
  slide: 'overlayRankingMotionSlide',
  soft: 'overlayRankingMotionSoft',
  emphasis: 'overlayRankingMotionEmphasis',
};

function isOverlayRankingMotion(value) {
  return typeof value === 'string' && OVERLAY_RANKING_MOTIONS.includes(value);
}

function normalizeOverlayRankingMotion(value) {
  return isOverlayRankingMotion(value) ? value : DEFAULT_OVERLAY_RANKING_MOTION;
}

function normalizeOverlayRankingMotionSpeed(value) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (OVERLAY_RANKING_MOTION_SPEEDS.includes(parsed)) {
    return parsed;
  }
  return DEFAULT_OVERLAY_RANKING_MOTION_SPEED;
}

function overlayRankingMotionMs(speed) {
  return OVERLAY_RANKING_MOTION_MS[normalizeOverlayRankingMotionSpeed(speed)];
}

function overlayRankingMotionCopyKey(id) {
  return OVERLAY_RANKING_MOTION_COPY_KEYS[id] || '';
}
