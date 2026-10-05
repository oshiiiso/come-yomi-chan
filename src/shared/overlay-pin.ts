import { canonicalOverlayType, type OverlayEventType } from './types';
import { VIEWER_DISPLAY_TOGGLE_TYPES } from './viewer-event';

export const OVERLAY_PIN_TYPES = VIEWER_DISPLAY_TOGGLE_TYPES;
export type OverlayPinType = (typeof OVERLAY_PIN_TYPES)[number];

export const DEFAULT_OVERLAY_PIN_MS = 4_000;
export const MIN_OVERLAY_PIN_MS = 1_000;
export const MAX_OVERLAY_PIN_MS = 120_000;
export const OVERLAY_PIN_QUEUE_MAX = 80;

export type OverlayPinTypeMap = Record<OverlayPinType, boolean>;

export type OverlayPinMsByType = Partial<Record<OverlayPinType, number>>;

export interface OverlayPinOptions {
  enabled: boolean;
  displayMs: number;
  displayMsByType: OverlayPinMsByType;
  hold: boolean;
  types: OverlayPinTypeMap;
  previewPinned: boolean;
}

export const DEFAULT_OVERLAY_PIN_TYPES: OverlayPinTypeMap = {
  gift: true,
  follow: true,
  share: true,
  superFan: true,
  envelope: true,
  portal: true,
  like: true,
  member: true,
};

export const DEFAULT_OVERLAY_PIN: OverlayPinOptions = {
  enabled: true,
  displayMs: DEFAULT_OVERLAY_PIN_MS,
  displayMsByType: {},
  hold: false,
  types: { ...DEFAULT_OVERLAY_PIN_TYPES },
  previewPinned: true,
};

export function normalizeOverlayPinMs(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_OVERLAY_PIN_MS;
  }
  const ms = Math.trunc(parsed);
  return Math.min(MAX_OVERLAY_PIN_MS, Math.max(MIN_OVERLAY_PIN_MS, ms));
}

export function normalizeOverlayPinMsByType(raw: unknown): OverlayPinMsByType {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const next: OverlayPinMsByType = {};
  for (const type of OVERLAY_PIN_TYPES) {
    if (!(type in record)) {
      continue;
    }
    const parsed =
      typeof record[type] === 'number'
        ? record[type]
        : Number.parseInt(String(record[type] ?? ''), 10);
    if (!Number.isFinite(parsed)) {
      continue;
    }
    const ms = Math.trunc(parsed as number);
    if (ms < MIN_OVERLAY_PIN_MS || ms > MAX_OVERLAY_PIN_MS) {
      continue;
    }
    next[type] = ms;
  }
  return next;
}

export function resolveOverlayPinDisplayMs(
  type: unknown,
  commonMs: number,
  byType: OverlayPinMsByType = {},
  hold = false,
): number {
  const baseMs = normalizeOverlayPinMs(commonMs);
  if (hold === true) {
    return baseMs;
  }
  if (typeof type !== 'string') {
    return baseMs;
  }
  const key = canonicalOverlayType(type as OverlayEventType);
  if (!(OVERLAY_PIN_TYPES as readonly string[]).includes(key)) {
    return baseMs;
  }
  const typed = byType[key as OverlayPinType];
  return typeof typed === 'number' ? typed : baseMs;
}

export function normalizeOverlayPinTypes(raw: unknown): OverlayPinTypeMap {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const next = { ...DEFAULT_OVERLAY_PIN_TYPES };
  for (const type of OVERLAY_PIN_TYPES) {
    if (typeof record[type] === 'boolean') {
      next[type] = record[type];
    }
  }
  return next;
}

export function normalizeOverlayPin(raw: Partial<OverlayPinOptions> | undefined): OverlayPinOptions {
  const merged = {
    ...DEFAULT_OVERLAY_PIN,
    ...raw,
  };
  return {
    enabled: merged.enabled !== false,
    displayMs: normalizeOverlayPinMs(merged.displayMs),
    displayMsByType: normalizeOverlayPinMsByType(merged.displayMsByType),
    hold: merged.hold === true,
    types: normalizeOverlayPinTypes(merged.types),
    previewPinned: merged.previewPinned !== false,
  };
}

export function overlayPinFromConfig(config: {
  overlayPinEnabled?: unknown;
  overlayPinMs?: unknown;
  overlayPinMsByType?: unknown;
  overlayPinHold?: unknown;
  overlayPinTypes?: unknown;
  overlayPinPreview?: unknown;
}): OverlayPinOptions {
  return normalizeOverlayPin({
    enabled: config.overlayPinEnabled as boolean,
    displayMs: config.overlayPinMs as number,
    displayMsByType: config.overlayPinMsByType as OverlayPinMsByType,
    hold: config.overlayPinHold as boolean,
    types: config.overlayPinTypes as OverlayPinTypeMap,
    previewPinned: config.overlayPinPreview as boolean,
  });
}

export function shouldPinOverlayType(
  type: unknown,
  types: OverlayPinTypeMap = DEFAULT_OVERLAY_PIN_TYPES,
  options?: { enabled?: boolean; preview?: boolean; previewPinned?: boolean },
): boolean {
  if (options?.enabled === false) {
    return false;
  }
  if (options?.preview && options.previewPinned === false) {
    return false;
  }
  if (typeof type !== 'string' || type === 'comment') {
    return false;
  }
  const key = canonicalOverlayType(type as OverlayEventType);
  if (!(OVERLAY_PIN_TYPES as readonly string[]).includes(key)) {
    return false;
  }
  return types[key as OverlayPinType] === true;
}

export function canHoldOverlayPin(
  hold: boolean,
  types: OverlayPinTypeMap = DEFAULT_OVERLAY_PIN_TYPES,
  options?: { enabled?: boolean; preview?: boolean; previewPinned?: boolean },
): boolean {
  if (hold !== true) {
    return false;
  }
  return OVERLAY_PIN_TYPES.some((type) => shouldPinOverlayType(type, types, options));
}

export function takeOverlayPinQueue<T>(queue: T[], incoming: T): T[] {
  const next = [...queue, incoming];
  if (next.length <= OVERLAY_PIN_QUEUE_MAX) {
    return next;
  }
  return next.slice(next.length - OVERLAY_PIN_QUEUE_MAX);
}

export function splitOverlayPinQueue<T extends { type?: unknown }>(
  queue: T[],
  types: OverlayPinTypeMap = DEFAULT_OVERLAY_PIN_TYPES,
  options?: { enabled?: boolean; preview?: boolean; previewPinned?: boolean },
): { pinned: T[]; rest: T[] } {
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of queue) {
    if (shouldPinOverlayType(item.type, types, options)) {
      pinned.push(item);
    } else {
      rest.push(item);
    }
  }
  return { pinned, rest };
}
