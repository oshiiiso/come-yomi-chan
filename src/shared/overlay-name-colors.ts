/** ダーク／ライトのオーバーレイで名前として読める色 */
export const DEFAULT_OVERLAY_NAME_COLORS = [
  '#5eead4',
  '#93c5fd',
  '#fcd34d',
  '#f9a8d4',
  '#86efac',
] as const;

export type OverlayNameColorPalette = [
  string,
  string,
  string,
  string,
  string,
];

export const DEFAULT_OVERLAY_NAME_COLOR_ENABLED = true;

/** かんたん見た目プリセットごとの名前色。dark は初期値と同じ。 */
export const OVERLAY_NAME_COLORS_BY_LOOK_PRESET: Record<string, OverlayNameColorPalette> = {
  dark: [...DEFAULT_OVERLAY_NAME_COLORS],
  light: ['#0f766e', '#1d4ed8', '#a16207', '#be185d', '#15803d'],
  minimal: [...DEFAULT_OVERLAY_NAME_COLORS],
  neon: ['#67e8f9', '#e879f9', '#f0abfc', '#fde047', '#86efac'],
};

const PALETTE_SIZE = DEFAULT_OVERLAY_NAME_COLORS.length;

function isNameColorHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeOverlayNameColorEnabled(value: unknown): boolean {
  return value !== false;
}

export function normalizeOverlayNameColors(raw: unknown): OverlayNameColorPalette {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (let index = 0; index < PALETTE_SIZE; index += 1) {
    const candidate = list[index];
    out.push(
      isNameColorHex(candidate)
        ? candidate.toLowerCase()
        : DEFAULT_OVERLAY_NAME_COLORS[index],
    );
  }
  return out as OverlayNameColorPalette;
}

export function sameOverlayNameColors(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((color, index) => color === right[index]);
}

/** 初期値、またはかんたん見た目用のパレットのままなら自動差し替え対象。 */
export function isAutoOverlayNameColors(raw: unknown): boolean {
  const colors = normalizeOverlayNameColors(raw);
  if (sameOverlayNameColors(colors, DEFAULT_OVERLAY_NAME_COLORS)) {
    return true;
  }
  return Object.values(OVERLAY_NAME_COLORS_BY_LOOK_PRESET).some((palette) =>
    sameOverlayNameColors(colors, palette),
  );
}

export function nameColorsForLookPreset(presetId: string): OverlayNameColorPalette {
  const palette = OVERLAY_NAME_COLORS_BY_LOOK_PRESET[presetId];
  return palette ? [...palette] : [...DEFAULT_OVERLAY_NAME_COLORS];
}

/**
 * かんたん見た目適用時の名前色。
 * 自動差し替え対象ならプリセット色、自分で変えた色なら null（今のまま）。
 */
export function resolveNameColorsForLookPreset(
  presetId: string,
  current: unknown,
): OverlayNameColorPalette | null {
  if (!isAutoOverlayNameColors(current)) {
    return null;
  }
  return nameColorsForLookPreset(presetId);
}

function hashKeyForUser(uniqueId: unknown, nickname: unknown): string {
  const id = String(uniqueId ?? '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
  if (id) {
    return id;
  }
  return String(nickname ?? '').trim().toLowerCase();
}

function hashToIndex(key: string): number {
  if (!key) {
    return 0;
  }
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % PALETTE_SIZE;
}

export function nameColorIndexForUser(uniqueId: unknown, nickname: unknown): number {
  return hashToIndex(hashKeyForUser(uniqueId, nickname));
}

export function nameColorForUser(
  uniqueId: unknown,
  nickname: unknown,
  palette: OverlayNameColorPalette = [...DEFAULT_OVERLAY_NAME_COLORS],
): string {
  const colors =
    palette.length === PALETTE_SIZE ? palette : normalizeOverlayNameColors(palette);
  return colors[nameColorIndexForUser(uniqueId, nickname)];
}
