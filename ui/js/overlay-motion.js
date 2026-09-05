const OVERLAY_MOTIONS = [
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
];

const OVERLAY_MOTION_SPEEDS = [1, 2, 3, 4, 5];
const DEFAULT_OVERLAY_MOTION = 'fuwatto';
const DEFAULT_OVERLAY_MOTION_SPEED = 3;
const OVERLAY_MOTION_MS = {
  1: 1080,
  2: 720,
  3: 480,
  4: 320,
  5: 180,
};

const OVERLAY_MOTION_COPY_KEYS = {
  fuwatto: 'overlayMotionFuwatto',
  fade: 'overlayMotionFade',
  'slide-up': 'overlayMotionSlideUp',
  'slide-down': 'overlayMotionSlideDown',
  'slide-left': 'overlayMotionSlideLeft',
  'slide-right': 'overlayMotionSlideRight',
  zoom: 'overlayMotionZoom',
  bounce: 'overlayMotionBounce',
  blur: 'overlayMotionBlur',
  flip: 'overlayMotionFlip',
  none: 'overlayMotionNone',
};

function normalizeOverlayMotion(value) {
  return OVERLAY_MOTIONS.includes(value) ? value : DEFAULT_OVERLAY_MOTION;
}

function normalizeOverlayMotionSpeed(value) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return OVERLAY_MOTION_SPEEDS.includes(parsed) ? parsed : DEFAULT_OVERLAY_MOTION_SPEED;
}

function overlayMotionMs(speed) {
  return OVERLAY_MOTION_MS[normalizeOverlayMotionSpeed(speed)];
}

function overlayMotionCopyKey(id) {
  return OVERLAY_MOTION_COPY_KEYS[id] || '';
}
