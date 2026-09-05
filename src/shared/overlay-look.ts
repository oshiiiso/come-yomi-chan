import {
  DEFAULT_OVERLAY_MOTION,
  DEFAULT_OVERLAY_MOTION_SPEED,
  normalizeOverlayMotion,
  normalizeOverlayMotionSpeed,
  type OverlayMotion,
  type OverlayMotionSpeed,
} from './overlay-motion';

export const OVERLAY_THEMES = ['dark', 'light', 'minimal', 'neon'] as const;
export type OverlayTheme = (typeof OVERLAY_THEMES)[number];

export const OVERLAY_ALIGNS = ['full', 'left', 'right'] as const;
export type OverlayAlign = (typeof OVERLAY_ALIGNS)[number];

export const OVERLAY_BACKDROPS = ['checker', 'green', 'magenta', 'dark'] as const;
export type OverlayPreviewBackdrop = (typeof OVERLAY_BACKDROPS)[number];

export const OVERLAY_FONTS = [
  { id: 'default', label: '標準', css: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif' },
  { id: 'yu-gothic', label: '游ゴシック', css: '"Yu Gothic UI", "Yu Gothic", sans-serif' },
  { id: 'meiryo', label: 'メイリオ', css: '"Meiryo UI", Meiryo, sans-serif' },
  { id: 'gothic', label: 'ＭＳ ゴシック', css: '"MS Gothic", "MS PGothic", sans-serif' },
  { id: 'mincho', label: 'ＭＳ 明朝', css: '"MS Mincho", "MS PMincho", serif' },
  { id: 'segoe', label: 'Segoe UI', css: '"Segoe UI", sans-serif' },
] as const;

export type OverlayFontId = (typeof OVERLAY_FONTS)[number]['id'];

export interface OverlayLook {
  theme: OverlayTheme;
  fontFamily: OverlayFontId;
  fontSize: number;
  bgOpacity: number;
  showAvatar: boolean;
  giftIconSize: number;
  itemRadius: number;
  neonHue: number;
  align: OverlayAlign;
  previewBackdrop: OverlayPreviewBackdrop;
  motion: OverlayMotion;
  motionSpeed: OverlayMotionSpeed;
}

export const DEFAULT_NEON_HUE = 280;
export const MIN_OVERLAY_FONT_SIZE = 10;
export const MAX_OVERLAY_FONT_SIZE = 30;

export const DEFAULT_OVERLAY_LOOK: OverlayLook = {
  theme: 'dark',
  fontFamily: 'default',
  fontSize: 20,
  bgOpacity: 72,
  showAvatar: true,
  giftIconSize: 40,
  itemRadius: 12,
  neonHue: DEFAULT_NEON_HUE,
  align: 'full',
  previewBackdrop: 'checker',
  motion: DEFAULT_OVERLAY_MOTION,
  motionSpeed: DEFAULT_OVERLAY_MOTION_SPEED,
};

export function overlayFontCss(id: string): string {
  return OVERLAY_FONTS.find((font) => font.id === id)?.css ?? OVERLAY_FONTS[0].css;
}

export const OVERLAY_LOOK_PRESETS: Record<string, OverlayLook> = {
  dark: {
    ...DEFAULT_OVERLAY_LOOK,
  },
  light: {
    ...DEFAULT_OVERLAY_LOOK,
    theme: 'light',
    bgOpacity: 88,
  },
  minimal: {
    ...DEFAULT_OVERLAY_LOOK,
    theme: 'minimal',
    bgOpacity: 0,
    showAvatar: false,
    giftIconSize: 36,
    itemRadius: 0,
    align: 'left',
  },
  neon: {
    ...DEFAULT_OVERLAY_LOOK,
    theme: 'neon',
    bgOpacity: 78,
    itemRadius: 16,
    neonHue: DEFAULT_NEON_HUE,
  },
};

function asTheme(value: unknown): OverlayTheme {
  return OVERLAY_THEMES.includes(value as OverlayTheme)
    ? (value as OverlayTheme)
    : DEFAULT_OVERLAY_LOOK.theme;
}

function asAlign(value: unknown): OverlayAlign {
  return OVERLAY_ALIGNS.includes(value as OverlayAlign)
    ? (value as OverlayAlign)
    : DEFAULT_OVERLAY_LOOK.align;
}

function asBackdrop(value: unknown): OverlayPreviewBackdrop {
  return OVERLAY_BACKDROPS.includes(value as OverlayPreviewBackdrop)
    ? (value as OverlayPreviewBackdrop)
    : DEFAULT_OVERLAY_LOOK.previewBackdrop;
}

function asFont(value: unknown): OverlayFontId {
  return OVERLAY_FONTS.some((font) => font.id === value)
    ? (value as OverlayFontId)
    : DEFAULT_OVERLAY_LOOK.fontFamily;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function normalizeOverlayLook(raw: Partial<OverlayLook> | undefined): OverlayLook {
  const merged = {
    ...DEFAULT_OVERLAY_LOOK,
    ...raw,
  };
  return {
    theme: asTheme(merged.theme),
    fontFamily: asFont(merged.fontFamily),
    fontSize: clampInt(
      merged.fontSize,
      DEFAULT_OVERLAY_LOOK.fontSize,
      MIN_OVERLAY_FONT_SIZE,
      MAX_OVERLAY_FONT_SIZE,
    ),
    bgOpacity: clampInt(merged.bgOpacity, DEFAULT_OVERLAY_LOOK.bgOpacity, 0, 100),
    showAvatar: merged.showAvatar !== false,
    giftIconSize: clampInt(
      merged.giftIconSize,
      DEFAULT_OVERLAY_LOOK.giftIconSize,
      16,
      80,
    ),
    itemRadius: clampInt(merged.itemRadius, DEFAULT_OVERLAY_LOOK.itemRadius, 0, 28),
    neonHue: clampInt(merged.neonHue, DEFAULT_OVERLAY_LOOK.neonHue, 0, 360),
    align: asAlign(merged.align),
    previewBackdrop: asBackdrop(merged.previewBackdrop),
    motion: normalizeOverlayMotion(merged.motion),
    motionSpeed: normalizeOverlayMotionSpeed(merged.motionSpeed),
  };
}

export function overlayLookFromConfig(config: {
  overlayTheme?: unknown;
  overlayFontFamily?: unknown;
  overlayFontSize?: unknown;
  overlayBgOpacity?: unknown;
  overlayShowAvatar?: unknown;
  overlayGiftIconSize?: unknown;
  overlayItemRadius?: unknown;
  overlayNeonHue?: unknown;
  overlayAlign?: unknown;
  overlayPreviewBackdrop?: unknown;
  overlayMotion?: unknown;
  overlayMotionSpeed?: unknown;
}): OverlayLook {
  return normalizeOverlayLook({
    theme: config.overlayTheme as OverlayTheme,
    fontFamily: config.overlayFontFamily as OverlayFontId,
    fontSize: config.overlayFontSize as number,
    bgOpacity: config.overlayBgOpacity as number,
    showAvatar: config.overlayShowAvatar as boolean,
    giftIconSize: config.overlayGiftIconSize as number,
    itemRadius: config.overlayItemRadius as number,
    neonHue: config.overlayNeonHue as number,
    align: config.overlayAlign as OverlayAlign,
    previewBackdrop: config.overlayPreviewBackdrop as OverlayPreviewBackdrop,
    motion: config.overlayMotion as OverlayMotion,
    motionSpeed: config.overlayMotionSpeed as OverlayMotionSpeed,
  });
}
