import { canonicalOverlayType, type OverlayEventType } from './types';

export interface ViewerPersistBadges {
  isFanClub?: boolean;
  isSuperFan?: boolean;
  fanClubLevel?: number;
  fanClubName?: string;
  isModerator?: boolean;
  isAnchor?: boolean;
}

export interface ViewerPersistRow {
  receivedAt: string;
  type: OverlayEventType;
  uniqueId: string;
  nickname: string;
  comment: string;
  displayText: string;
  giftName: string;
  giftCount: number;
  diamondCount: number;
  avatarUrl?: string;
  giftImageUrl?: string;
  badges?: ViewerPersistBadges;
}

export const DEFAULT_VIEWER_LOG_MAX_ROWS = 1000;
export const MIN_VIEWER_LOG_MAX_ROWS = 100;
export const MAX_VIEWER_LOG_MAX_ROWS = 5000;

const OVERLAY_EVENT_TYPES = new Set<string>([
  'comment',
  'gift',
  'follow',
  'share',
  'subscribe',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
]);

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNonNegativeInt(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeBadges(raw: unknown): ViewerPersistBadges | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const badges: ViewerPersistBadges = {};
  if (typeof record.isFanClub === 'boolean') {
    badges.isFanClub = record.isFanClub;
  }
  if (typeof record.isSuperFan === 'boolean') {
    badges.isSuperFan = record.isSuperFan;
  }
  if (typeof record.isModerator === 'boolean') {
    badges.isModerator = record.isModerator;
  }
  if (typeof record.isAnchor === 'boolean') {
    badges.isAnchor = record.isAnchor;
  }
  const level = asNonNegativeInt(record.fanClubLevel);
  if (level > 0) {
    badges.fanClubLevel = level;
  }
  const fanClubName = asText(record.fanClubName);
  if (fanClubName) {
    badges.fanClubName = fanClubName;
  }
  return Object.keys(badges).length ? badges : undefined;
}

function normalizePersistRow(raw: unknown): ViewerPersistRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const typeRaw = asText(record.type);
  if (!OVERLAY_EVENT_TYPES.has(typeRaw)) {
    return null;
  }
  const receivedAt = asText(record.receivedAt);
  if (!receivedAt) {
    return null;
  }
  const row: ViewerPersistRow = {
    receivedAt,
    type: canonicalOverlayType(typeRaw as OverlayEventType),
    uniqueId: asText(record.uniqueId),
    nickname: asText(record.nickname),
    comment: asText(record.comment),
    displayText: asText(record.displayText),
    giftName: asText(record.giftName),
    giftCount: asNonNegativeInt(record.giftCount),
    diamondCount: asNonNegativeInt(record.diamondCount),
  };
  const avatarUrl = asText(record.avatarUrl);
  if (avatarUrl) {
    row.avatarUrl = avatarUrl;
  }
  const giftImageUrl = asText(record.giftImageUrl);
  if (giftImageUrl) {
    row.giftImageUrl = giftImageUrl;
  }
  const badges = normalizeBadges(record.badges);
  if (badges) {
    row.badges = badges;
  }
  return row;
}

export function clampViewerLogMaxRows(value: unknown): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_VIEWER_LOG_MAX_ROWS;
  }
  return Math.min(
    MAX_VIEWER_LOG_MAX_ROWS,
    Math.max(MIN_VIEWER_LOG_MAX_ROWS, Math.trunc(parsed)),
  );
}

export function trimViewerPersistRows(
  rows: ViewerPersistRow[],
  maxRows: number,
): ViewerPersistRow[] {
  const limit = clampViewerLogMaxRows(maxRows);
  if (rows.length <= limit) {
    return rows;
  }
  return rows.slice(rows.length - limit);
}

export function normalizeViewerPersistRows(
  raw: unknown,
  maxRows: unknown,
): ViewerPersistRow[] {
  const limit = clampViewerLogMaxRows(maxRows);
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: ViewerPersistRow[] = [];
  for (const item of raw) {
    const row = normalizePersistRow(item);
    if (row) {
      rows.push(row);
    }
  }
  return trimViewerPersistRows(rows, limit);
}
