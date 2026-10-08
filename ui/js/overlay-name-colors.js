/** src/shared/overlay-name-colors.ts と揃える */

const DEFAULT_OVERLAY_NAME_COLORS = [
  '#5eead4',
  '#93c5fd',
  '#fcd34d',
  '#f9a8d4',
  '#86efac',
];

const DEFAULT_OVERLAY_NAME_COLOR_ENABLED = true;

/** @type {Record<string, string[]>} */
const OVERLAY_NAME_COLORS_BY_LOOK_PRESET = {
  dark: [...DEFAULT_OVERLAY_NAME_COLORS],
  light: ['#0f766e', '#1d4ed8', '#a16207', '#be185d', '#15803d'],
  minimal: [...DEFAULT_OVERLAY_NAME_COLORS],
  neon: ['#67e8f9', '#e879f9', '#f0abfc', '#fde047', '#86efac'],
};

const OVERLAY_NAME_PALETTE_SIZE = DEFAULT_OVERLAY_NAME_COLORS.length;

function isOverlayNameColorHex(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeOverlayNameColorEnabled(value) {
  return value !== false;
}

function normalizeOverlayNameColors(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return DEFAULT_OVERLAY_NAME_COLORS.map((def, index) => {
    const candidate = list[index];
    return isOverlayNameColorHex(candidate) ? candidate.toLowerCase() : def;
  });
}

function sameOverlayNameColors(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((color, index) => color === right[index]);
}

function isAutoOverlayNameColors(raw) {
  const colors = normalizeOverlayNameColors(raw);
  if (sameOverlayNameColors(colors, DEFAULT_OVERLAY_NAME_COLORS)) {
    return true;
  }
  return Object.values(OVERLAY_NAME_COLORS_BY_LOOK_PRESET).some((palette) =>
    sameOverlayNameColors(colors, palette),
  );
}

function nameColorsForLookPreset(presetId) {
  const palette = OVERLAY_NAME_COLORS_BY_LOOK_PRESET[presetId];
  return palette ? [...palette] : [...DEFAULT_OVERLAY_NAME_COLORS];
}

function resolveNameColorsForLookPreset(presetId, current) {
  if (!isAutoOverlayNameColors(current)) {
    return null;
  }
  return nameColorsForLookPreset(presetId);
}

function nameColorIndexForUser(uniqueId, nickname) {
  const id = String(uniqueId ?? '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
  const key = id || String(nickname ?? '').trim().toLowerCase();
  if (!key) {
    return 0;
  }
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % OVERLAY_NAME_PALETTE_SIZE;
}

function nameColorForUser(uniqueId, nickname, palette) {
  const colors = normalizeOverlayNameColors(
    Array.isArray(palette) && palette.length === OVERLAY_NAME_PALETTE_SIZE
      ? palette
      : DEFAULT_OVERLAY_NAME_COLORS,
  );
  return colors[nameColorIndexForUser(uniqueId, nickname)];
}
