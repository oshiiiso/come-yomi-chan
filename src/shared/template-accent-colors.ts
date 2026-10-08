import {
  DEFAULT_OVERLAY_NAME_COLORS,
  OVERLAY_NAME_COLORS_BY_LOOK_PRESET,
} from './overlay-name-colors';

/** 差し込み／任意強調の色（{user} は名前色のまま対象外）。 */
export const TEMPLATE_ACCENT_TOKEN_IDS = [
  'gift',
  'count',
  'likes',
  'comment',
  'event',
  'emphasis',
] as const;

export type TemplateAccentTokenId = (typeof TEMPLATE_ACCENT_TOKEN_IDS)[number];

export type TemplateAccentColors = Record<TemplateAccentTokenId, string>;

/** 名前色パレット（5色）から差し込み色へ割り当てる。コメントは名前色と被らない吹き出し色。 */
export const OVERLAY_COMMENT_COLOR_BY_LOOK_PRESET: Record<string, string> = {
  dark: '#f1f3f5',
  light: '#1a1b1e',
  minimal: '#ffffff',
  neon: '#f8fafc',
};

export function templateAccentColorsFromNamePalette(
  palette: readonly string[],
  presetId = 'dark',
): TemplateAccentColors {
  const colors =
    palette.length >= 5
      ? palette
      : DEFAULT_OVERLAY_NAME_COLORS;
  return {
    gift: colors[0],
    count: colors[1],
    likes: colors[1],
    comment:
      OVERLAY_COMMENT_COLOR_BY_LOOK_PRESET[presetId] ??
      OVERLAY_COMMENT_COLOR_BY_LOOK_PRESET.dark,
    event: colors[3],
    emphasis: colors[4],
  };
}

/** 初期色は名前の色パレットから割り当てる。 */
export const DEFAULT_TEMPLATE_ACCENT_COLORS: TemplateAccentColors =
  templateAccentColorsFromNamePalette(DEFAULT_OVERLAY_NAME_COLORS);

/** かんたん見た目プリセットごとの差し込み色（名前色と同じパレット由来）。 */
export const TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET: Record<string, TemplateAccentColors> =
  Object.fromEntries(
    Object.entries(OVERLAY_NAME_COLORS_BY_LOOK_PRESET).map(([id, palette]) => [
      id,
      templateAccentColorsFromNamePalette(palette, id),
    ]),
  );

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isTemplateAccentTokenId(value: string): value is TemplateAccentTokenId {
  return (TEMPLATE_ACCENT_TOKEN_IDS as readonly string[]).includes(value);
}

function legacyAccentColors(palette: readonly string[]): TemplateAccentColors {
  return {
    gift: palette[0],
    count: palette[1],
    likes: palette[1],
    comment: palette[2],
    event: palette[3],
    emphasis: palette[4],
  };
}

/** 旧初期値（コメント色＝名前色の1色）は、今のプリセット色へ寄せる。 */
function upgradeLegacyCommentAccent(colors: TemplateAccentColors): TemplateAccentColors {
  for (const [id, palette] of Object.entries(OVERLAY_NAME_COLORS_BY_LOOK_PRESET)) {
    if (sameTemplateAccentColors(colors, legacyAccentColors(palette))) {
      return templateAccentColorsFromNamePalette(palette, id);
    }
  }
  return colors;
}

export function normalizeTemplateAccentColors(raw: unknown): TemplateAccentColors {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
  for (const id of TEMPLATE_ACCENT_TOKEN_IDS) {
    const value = record[id];
    if (typeof value === 'string' && HEX.test(value)) {
      out[id] = value.toLowerCase();
    }
  }
  return upgradeLegacyCommentAccent(out);
}

export function sameTemplateAccentColors(
  left: TemplateAccentColors | undefined,
  right: TemplateAccentColors | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }
  return TEMPLATE_ACCENT_TOKEN_IDS.every((id) => left[id] === right[id]);
}

/** 初期値、またはかんたん見た目用の差し込み色のままなら自動差し替え対象。 */
export function isAutoTemplateAccentColors(raw: unknown): boolean {
  const colors = normalizeTemplateAccentColors(raw);
  if (sameTemplateAccentColors(colors, DEFAULT_TEMPLATE_ACCENT_COLORS)) {
    return true;
  }
  return Object.values(TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET).some((palette) =>
    sameTemplateAccentColors(colors, palette),
  );
}

export function templateAccentColorsForLookPreset(presetId: string): TemplateAccentColors {
  const palette = TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET[presetId];
  return palette
    ? { ...palette }
    : { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
}

/**
 * かんたん見た目適用時の差し込み色。
 * 自動差し替え対象ならプリセット色、自分で変えた色なら null（今のまま）。
 */
export function resolveTemplateAccentColorsForLookPreset(
  presetId: string,
  current: unknown,
): TemplateAccentColors | null {
  if (!isAutoTemplateAccentColors(current)) {
    return null;
  }
  return templateAccentColorsForLookPreset(presetId);
}
