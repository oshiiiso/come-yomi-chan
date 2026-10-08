/** src/shared/overlay-likes-look.ts と揃える */

const OVERLAY_LIKES_THEMES = ['standard', 'luxury', 'compact', 'neon', 'minimal'];
const DEFAULT_OVERLAY_LIKES_LOOK = {
  theme: 'standard',
  fontFamily: 'default',
  fontSize: 22,
  bgOpacity: 48,
  showAvatar: true,
  avatarSize: 36,
  itemRadius: 14,
  rowGap: 6,
  panelWidth: 420,
  showUnit: true,
  neonHue: 280,
};

const OVERLAY_LIKES_LOOK_PRESETS = {
  standard: { ...DEFAULT_OVERLAY_LIKES_LOOK },
  luxury: {
    ...DEFAULT_OVERLAY_LIKES_LOOK,
    theme: 'luxury',
    fontSize: 26,
    bgOpacity: 64,
    avatarSize: 44,
    itemRadius: 18,
    rowGap: 8,
    panelWidth: 480,
  },
  compact: {
    ...DEFAULT_OVERLAY_LIKES_LOOK,
    theme: 'compact',
    fontSize: 16,
    bgOpacity: 40,
    avatarSize: 28,
    itemRadius: 8,
    rowGap: 2,
    panelWidth: 340,
  },
  neon: {
    ...DEFAULT_OVERLAY_LIKES_LOOK,
    theme: 'neon',
    fontSize: 22,
    bgOpacity: 56,
    avatarSize: 36,
    itemRadius: 16,
    rowGap: 6,
    panelWidth: 440,
    neonHue: 280,
  },
  minimal: {
    ...DEFAULT_OVERLAY_LIKES_LOOK,
    theme: 'minimal',
    fontSize: 20,
    bgOpacity: 0,
    showAvatar: true,
    avatarSize: 32,
    itemRadius: 0,
    rowGap: 4,
    panelWidth: 400,
    showUnit: true,
  },
};

function clampLikesLookInt(value, fallback, min, max) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function normalizeOverlayLikesLook(raw) {
  const merged = { ...DEFAULT_OVERLAY_LIKES_LOOK, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    theme: OVERLAY_LIKES_THEMES.includes(merged.theme) ? merged.theme : DEFAULT_OVERLAY_LIKES_LOOK.theme,
    fontFamily: typeof merged.fontFamily === 'string' ? merged.fontFamily : DEFAULT_OVERLAY_LIKES_LOOK.fontFamily,
    fontSize: clampLikesLookInt(merged.fontSize, DEFAULT_OVERLAY_LIKES_LOOK.fontSize, 10, 60),
    bgOpacity: clampLikesLookInt(merged.bgOpacity, DEFAULT_OVERLAY_LIKES_LOOK.bgOpacity, 0, 100),
    showAvatar: merged.showAvatar !== false,
    avatarSize: clampLikesLookInt(merged.avatarSize, DEFAULT_OVERLAY_LIKES_LOOK.avatarSize, 16, 80),
    itemRadius: clampLikesLookInt(merged.itemRadius, DEFAULT_OVERLAY_LIKES_LOOK.itemRadius, 0, 28),
    rowGap: clampLikesLookInt(merged.rowGap, DEFAULT_OVERLAY_LIKES_LOOK.rowGap, 0, 20),
    panelWidth: clampLikesLookInt(merged.panelWidth, DEFAULT_OVERLAY_LIKES_LOOK.panelWidth, 240, 720),
    showUnit: merged.showUnit !== false,
    neonHue: clampLikesLookInt(merged.neonHue, DEFAULT_OVERLAY_LIKES_LOOK.neonHue, 0, 360),
  };
}
