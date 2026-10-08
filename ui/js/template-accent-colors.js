/** src/shared/template-accent-colors.ts と揃える（コメント色は名前色と被せない） */
const TEMPLATE_ACCENT_TOKEN_IDS = ['gift', 'count', 'likes', 'comment', 'event', 'emphasis'];

const OVERLAY_COMMENT_COLOR_BY_LOOK_PRESET = {
  dark: '#f1f3f5',
  light: '#1a1b1e',
  minimal: '#ffffff',
  neon: '#f8fafc',
};

function templateAccentColorsFromNamePalette(palette, presetId = 'dark') {
  const colors =
    Array.isArray(palette) && palette.length >= 5 ? palette : DEFAULT_OVERLAY_NAME_COLORS;
  return {
    gift: colors[0],
    count: colors[1],
    likes: colors[1],
    comment: OVERLAY_COMMENT_COLOR_BY_LOOK_PRESET[presetId] || OVERLAY_COMMENT_COLOR_BY_LOOK_PRESET.dark,
    event: colors[3],
    emphasis: colors[4],
  };
}

function legacyAccentColors(palette) {
  return {
    gift: palette[0],
    count: palette[1],
    likes: palette[1],
    comment: palette[2],
    event: palette[3],
    emphasis: palette[4],
  };
}

const DEFAULT_TEMPLATE_ACCENT_COLORS = templateAccentColorsFromNamePalette(
  DEFAULT_OVERLAY_NAME_COLORS,
);

/** @type {Record<string, Record<string, string>>} */
const TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET = Object.fromEntries(
  Object.entries(OVERLAY_NAME_COLORS_BY_LOOK_PRESET).map(([id, palette]) => [
    id,
    templateAccentColorsFromNamePalette(palette, id),
  ]),
);

function isTemplateAccentTokenId(value) {
  return TEMPLATE_ACCENT_TOKEN_IDS.includes(value);
}

function upgradeLegacyCommentAccent(colors) {
  for (const [id, palette] of Object.entries(OVERLAY_NAME_COLORS_BY_LOOK_PRESET)) {
    if (sameTemplateAccentColors(colors, legacyAccentColors(palette))) {
      return templateAccentColorsFromNamePalette(palette, id);
    }
  }
  return colors;
}

function normalizeTemplateAccentColors(raw) {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
  for (const id of TEMPLATE_ACCENT_TOKEN_IDS) {
    const value = record[id];
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
      out[id] = value.toLowerCase();
    }
  }
  return upgradeLegacyCommentAccent(out);
}

function sameTemplateAccentColors(left, right) {
  if (!left || !right) {
    return false;
  }
  return TEMPLATE_ACCENT_TOKEN_IDS.every((id) => left[id] === right[id]);
}

function isAutoTemplateAccentColors(raw) {
  const colors = normalizeTemplateAccentColors(raw);
  if (sameTemplateAccentColors(colors, DEFAULT_TEMPLATE_ACCENT_COLORS)) {
    return true;
  }
  return Object.values(TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET).some((palette) =>
    sameTemplateAccentColors(colors, palette),
  );
}

function templateAccentColorsForLookPreset(presetId) {
  const palette = TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET[presetId];
  return palette ? { ...palette } : { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
}

function resolveTemplateAccentColorsForLookPreset(presetId, current) {
  if (!isAutoTemplateAccentColors(current)) {
    return null;
  }
  return templateAccentColorsForLookPreset(presetId);
}

function applyTemplateAccentCssVars(colors) {
  const normalized = normalizeTemplateAccentColors(colors);
  const root = document.documentElement;
  for (const id of TEMPLATE_ACCENT_TOKEN_IDS) {
    root.style.setProperty(`--tpl-accent-${id}`, normalized[id]);
  }
  return normalized;
}
