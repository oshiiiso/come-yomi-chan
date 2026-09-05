export const OVERLAY_MOTIONS = [
  'fuwatto',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom',
  'bounce',
  'blur',
  'flip',
  'none',
] as const;

export type OverlayMotion = (typeof OVERLAY_MOTIONS)[number];

export const OVERLAY_MOTION_SPEEDS = [1, 2, 3, 4, 5] as const;
export type OverlayMotionSpeed = (typeof OVERLAY_MOTION_SPEEDS)[number];

export const DEFAULT_OVERLAY_MOTION: OverlayMotion = 'fuwatto';
export const DEFAULT_OVERLAY_MOTION_SPEED: OverlayMotionSpeed = 3;

export const OVERLAY_MOTION_MS: Record<OverlayMotionSpeed, number> = {
  1: 1080,
  2: 720,
  3: 480,
  4: 320,
  5: 180,
};

export function isOverlayMotion(value: unknown): value is OverlayMotion {
  return typeof value === 'string' && (OVERLAY_MOTIONS as readonly string[]).includes(value);
}

export function normalizeOverlayMotion(value: unknown): OverlayMotion {
  return isOverlayMotion(value) ? value : DEFAULT_OVERLAY_MOTION;
}

export function normalizeOverlayMotionSpeed(value: unknown): OverlayMotionSpeed {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (OVERLAY_MOTION_SPEEDS.includes(parsed as OverlayMotionSpeed)) {
    return parsed as OverlayMotionSpeed;
  }
  return DEFAULT_OVERLAY_MOTION_SPEED;
}

export function overlayMotionMs(speed: unknown): number {
  return OVERLAY_MOTION_MS[normalizeOverlayMotionSpeed(speed)];
}
