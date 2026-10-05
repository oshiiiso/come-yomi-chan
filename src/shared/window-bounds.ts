import { WINDOW_LAYOUT } from './window-layout';

export interface MainWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_VISIBLE = 48;

function asFiniteInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed);
}

export function normalizeMainWindowBounds(raw: unknown): MainWindowBounds | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const x = asFiniteInt(record.x);
  const y = asFiniteInt(record.y);
  const width = asFiniteInt(record.width);
  const height = asFiniteInt(record.height);
  if (x == null || y == null || width == null || height == null) {
    return null;
  }
  const layout = WINDOW_LAYOUT.main;
  return {
    x,
    y,
    width: Math.max(layout.minWidth, width),
    height: Math.max(layout.minHeight, height),
    isMaximized: record.isMaximized === true,
  };
}

function overlapsWorkArea(bounds: MainWindowBounds, area: DisplayWorkArea): boolean {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  const areaRight = area.x + area.width;
  const areaBottom = area.y + area.height;
  const overlapX = Math.min(right, areaRight) - Math.max(bounds.x, area.x);
  const overlapY = Math.min(bottom, areaBottom) - Math.max(bounds.y, area.y);
  return overlapX >= MIN_VISIBLE && overlapY >= MIN_VISIBLE;
}

/** どれかの作業領域に少しでも載るように位置を直す。完全に外れていれば先頭モニタの中央。 */
export function placeMainWindowBoundsOnDisplays(
  bounds: MainWindowBounds,
  displays: DisplayWorkArea[],
): MainWindowBounds {
  const normalized = normalizeMainWindowBounds(bounds);
  if (!normalized) {
    const layout = WINDOW_LAYOUT.main;
    return {
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
      isMaximized: false,
    };
  }
  if (displays.length === 0) {
    return normalized;
  }
  if (displays.some((area) => overlapsWorkArea(normalized, area))) {
    return normalized;
  }
  const primary = displays[0];
  return {
    ...normalized,
    x: Math.round(primary.x + (primary.width - normalized.width) / 2),
    y: Math.round(primary.y + (primary.height - normalized.height) / 2),
  };
}
