import { OVERLAY_FONTS, overlayFontCss, type OverlayFontId } from './overlay-look';

export const OVERLAY_LIKES_THEMES = [
  'standard',
  'luxury',
  'compact',
  'neon',
  'minimal',
] as const;
export type OverlayLikesTheme = (typeof OVERLAY_LIKES_THEMES)[number];

export const MIN_OVERLAY_LIKES_FONT_SIZE = 10;
export const MAX_OVERLAY_LIKES_FONT_SIZE = 60;
export const MIN_OVERLAY_LIKES_AVATAR_SIZE = 16;
export const MAX_OVERLAY_LIKES_AVATAR_SIZE = 80;
export const MIN_OVERLAY_LIKES_PANEL_WIDTH = 240;
export const MAX_OVERLAY_LIKES_PANEL_WIDTH = 720;
export const DEFAULT_OVERLAY_LIKES_NEON_HUE = 280;

export interface OverlayLikesLook {
  theme: OverlayLikesTheme;
  fontFamily: OverlayFontId;
  fontSize: number;
  bgOpacity: number;
  showAvatar: boolean;
  avatarSize: number;
  itemRadius: number;
  rowGap: number;
  panelWidth: number;
  showUnit: boolean;
  neonHue: number;
}

export const DEFAULT_OVERLAY_LIKES_LOOK: OverlayLikesLook = {
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
  neonHue: DEFAULT_OVERLAY_LIKES_NEON_HUE,
};

export const OVERLAY_LIKES_LOOK_PRESETS: Record<string, OverlayLikesLook> = {
  standard: {
    ...DEFAULT_OVERLAY_LIKES_LOOK,
  },
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
    neonHue: DEFAULT_OVERLAY_LIKES_NEON_HUE,
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

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function asTheme(value: unknown): OverlayLikesTheme {
  return OVERLAY_LIKES_THEMES.includes(value as OverlayLikesTheme)
    ? (value as OverlayLikesTheme)
    : DEFAULT_OVERLAY_LIKES_LOOK.theme;
}

function asFont(value: unknown): OverlayFontId {
  return OVERLAY_FONTS.some((font) => font.id === value)
    ? (value as OverlayFontId)
    : DEFAULT_OVERLAY_LIKES_LOOK.fontFamily;
}

export function normalizeOverlayLikesLook(
  raw: Partial<OverlayLikesLook> | undefined,
): OverlayLikesLook {
  const merged = {
    ...DEFAULT_OVERLAY_LIKES_LOOK,
    ...raw,
  };
  return {
    theme: asTheme(merged.theme),
    fontFamily: asFont(merged.fontFamily),
    fontSize: clampInt(
      merged.fontSize,
      DEFAULT_OVERLAY_LIKES_LOOK.fontSize,
      MIN_OVERLAY_LIKES_FONT_SIZE,
      MAX_OVERLAY_LIKES_FONT_SIZE,
    ),
    bgOpacity: clampInt(merged.bgOpacity, DEFAULT_OVERLAY_LIKES_LOOK.bgOpacity, 0, 100),
    showAvatar: merged.showAvatar !== false,
    avatarSize: clampInt(
      merged.avatarSize,
      DEFAULT_OVERLAY_LIKES_LOOK.avatarSize,
      MIN_OVERLAY_LIKES_AVATAR_SIZE,
      MAX_OVERLAY_LIKES_AVATAR_SIZE,
    ),
    itemRadius: clampInt(merged.itemRadius, DEFAULT_OVERLAY_LIKES_LOOK.itemRadius, 0, 28),
    rowGap: clampInt(merged.rowGap, DEFAULT_OVERLAY_LIKES_LOOK.rowGap, 0, 20),
    panelWidth: clampInt(
      merged.panelWidth,
      DEFAULT_OVERLAY_LIKES_LOOK.panelWidth,
      MIN_OVERLAY_LIKES_PANEL_WIDTH,
      MAX_OVERLAY_LIKES_PANEL_WIDTH,
    ),
    showUnit: merged.showUnit !== false,
    neonHue: clampInt(merged.neonHue, DEFAULT_OVERLAY_LIKES_LOOK.neonHue, 0, 360),
  };
}

export function overlayLikesLookFromConfig(config: {
  overlayLikesTheme?: unknown;
  overlayLikesFontFamily?: unknown;
  overlayLikesFontSize?: unknown;
  overlayLikesBgOpacity?: unknown;
  overlayLikesShowAvatar?: unknown;
  overlayLikesAvatarSize?: unknown;
  overlayLikesItemRadius?: unknown;
  overlayLikesRowGap?: unknown;
  overlayLikesPanelWidth?: unknown;
  overlayLikesShowUnit?: unknown;
  overlayLikesNeonHue?: unknown;
}): OverlayLikesLook {
  return normalizeOverlayLikesLook({
    theme: config.overlayLikesTheme as OverlayLikesTheme,
    fontFamily: config.overlayLikesFontFamily as OverlayFontId,
    fontSize: config.overlayLikesFontSize as number,
    bgOpacity: config.overlayLikesBgOpacity as number,
    showAvatar: config.overlayLikesShowAvatar as boolean,
    avatarSize: config.overlayLikesAvatarSize as number,
    itemRadius: config.overlayLikesItemRadius as number,
    rowGap: config.overlayLikesRowGap as number,
    panelWidth: config.overlayLikesPanelWidth as number,
    showUnit: config.overlayLikesShowUnit as boolean,
    neonHue: config.overlayLikesNeonHue as number,
  });
}

export function overlayLikesFontCss(id: string): string {
  return overlayFontCss(id);
}
