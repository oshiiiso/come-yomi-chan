import { isPortalJoinEvent } from './portal-event';
import { isSuperFanBoxEvent } from './super-fan-event';
import type { EventToggleMap, OverlayEventType } from './types';

export const EVENT_ALERT_TYPES = [
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
] as const;

export type EventAlertType = (typeof EVENT_ALERT_TYPES)[number];
export type EventAlertEnabledMap = Record<EventAlertType, boolean>;

/** 同梱テンプレの論理 ID（イベント種別と同じ）。実ファイル名は EVENT_ALERT_TEMPLATE_FILES。 */
export const EVENT_ALERT_TEMPLATE_IDS = EVENT_ALERT_TYPES;
export type EventAlertTemplateId = (typeof EVENT_ALERT_TEMPLATE_IDS)[number];

/** 種類ごとの既定同梱 GIF（subtype は resolveEventAlertTemplateFileName）。 */
export const EVENT_ALERT_TEMPLATE_FILES: Record<EventAlertType, string> = {
  gift: 'gift.gif',
  follow: 'follow.gif',
  share: 'share.gif',
  superFan: 'superfan.gif',
  envelope: 'chest.gif',
  portal: 'portal.gif',
  like: 'heart.gif',
  member: 'door.gif',
};

export type AlertMediaRef =
  | { kind: 'auto' }
  | { kind: 'none' }
  | { kind: 'file'; fileName: string }
  | { kind: 'template'; id: EventAlertTemplateId };

export type EventAlertMediaMap = Record<EventAlertType, AlertMediaRef>;
export type EventAlertDisplayMsMap = Record<EventAlertType, number>;

export const DEFAULT_EVENT_ALERT_MS = 4_000;
export const MIN_EVENT_ALERT_MS = 1_000;
export const MAX_EVENT_ALERT_MS = 120_000;
export const EVENT_ALERT_QUEUE_MAX = 40;

export const ALERT_MEDIA_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'] as const;

export function isEventAlertType(value: unknown): value is EventAlertType {
  return typeof value === 'string' && (EVENT_ALERT_TYPES as readonly string[]).includes(value);
}

export function isEventAlertTemplateId(value: unknown): value is EventAlertTemplateId {
  return isEventAlertType(value);
}

export function eventAlertTemplateFileName(id: EventAlertTemplateId): string {
  return EVENT_ALERT_TEMPLATE_FILES[id];
}

/** 同梱 GIF のファイル名。スパファンボックス・ポータル入室は giftName で分ける。 */
export function resolveEventAlertTemplateFileName(params: {
  type: EventAlertType;
  giftName?: string | null;
}): string {
  const giftName = typeof params.giftName === 'string' ? params.giftName : '';
  if (isSuperFanBoxEvent({ type: params.type, giftName })) {
    return 'superfan_box.gif';
  }
  if (isPortalJoinEvent({ type: params.type, giftName })) {
    return 'portal_door.gif';
  }
  return EVENT_ALERT_TEMPLATE_FILES[params.type];
}

export function eventAlertTemplatePath(id: EventAlertTemplateId): string {
  return `/overlay/alert-templates/${encodeURIComponent(eventAlertTemplateFileName(id))}`;
}

export function eventAlertTemplatePathForEvent(params: {
  type: EventAlertType;
  giftName?: string | null;
}): string {
  return `/overlay/alert-templates/${encodeURIComponent(resolveEventAlertTemplateFileName(params))}`;
}

export function defaultAlertMediaFor(type?: EventAlertType): AlertMediaRef {
  if (type === 'gift') {
    return { kind: 'auto' };
  }
  if (type && isEventAlertTemplateId(type)) {
    return { kind: 'template', id: type };
  }
  return { kind: 'auto' };
}

export function canonicalEventAlertType(type: unknown): EventAlertType | null {
  if (type === 'subscribe') {
    return 'superFan';
  }
  if (type === 'comment') {
    return null;
  }
  return isEventAlertType(type) ? type : null;
}

export function normalizeAlertMediaFileName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return '';
  }
  const lower = name.toLowerCase();
  const ok = ALERT_MEDIA_FILE_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`));
  return ok ? name : '';
}

export function normalizeAlertMediaRef(
  raw: unknown,
  fallbackTemplateId?: EventAlertType,
): AlertMediaRef {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaultAlertMediaFor(fallbackTemplateId);
  }
  const record = raw as { kind?: unknown; fileName?: unknown; id?: unknown };
  if (record.kind === 'none') {
    return { kind: 'none' };
  }
  if (record.kind === 'file') {
    const fileName = normalizeAlertMediaFileName(record.fileName);
    if (fileName) {
      return { kind: 'file', fileName };
    }
    return defaultAlertMediaFor(fallbackTemplateId);
  }
  if (record.kind === 'template') {
    if (isEventAlertTemplateId(record.id)) {
      return { kind: 'template', id: record.id };
    }
    return defaultAlertMediaFor(fallbackTemplateId);
  }
  if (record.kind === 'auto') {
    return { kind: 'auto' };
  }
  return defaultAlertMediaFor(fallbackTemplateId);
}

export function defaultEventAlertEnabledFromSpeak(
  events: EventToggleMap | undefined,
): EventAlertEnabledMap {
  const out = {} as EventAlertEnabledMap;
  for (const type of EVENT_ALERT_TYPES) {
    const speak = events?.[type]?.speak;
    out[type] = typeof speak === 'boolean' ? speak : type !== 'like' && type !== 'member';
  }
  return out;
}

export function defaultEventAlertMediaMap(): EventAlertMediaMap {
  const out = {} as EventAlertMediaMap;
  for (const type of EVENT_ALERT_TYPES) {
    out[type] = defaultAlertMediaFor(type);
  }
  return out;
}

export function normalizeEventAlertEnabledMap(
  raw: unknown,
  events: EventToggleMap,
): EventAlertEnabledMap {
  const fallback = defaultEventAlertEnabledFromSpeak(events);
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = { ...fallback };
  for (const type of EVENT_ALERT_TYPES) {
    if (Object.prototype.hasOwnProperty.call(record, type)) {
      out[type] = record[type] === true;
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(record, 'subscribe') &&
    !Object.prototype.hasOwnProperty.call(record, 'superFan')
  ) {
    out.superFan = record.subscribe === true;
  }
  return out;
}

export function normalizeEventAlertMediaMap(raw: unknown): EventAlertMediaMap {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = defaultEventAlertMediaMap();
  for (const type of EVENT_ALERT_TYPES) {
    if (Object.prototype.hasOwnProperty.call(record, type)) {
      out[type] = normalizeAlertMediaRef(record[type], type);
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(record, 'subscribe') &&
    !Object.prototype.hasOwnProperty.call(record, 'superFan')
  ) {
    out.superFan = normalizeAlertMediaRef(record.subscribe, 'superFan');
  }
  return out;
}

export function normalizeEventAlertDisplayMs(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_EVENT_ALERT_MS;
  }
  const ms = Math.trunc(parsed);
  return Math.min(MAX_EVENT_ALERT_MS, Math.max(MIN_EVENT_ALERT_MS, ms));
}

export function defaultEventAlertDisplayMsMap(
  commonMs: number = DEFAULT_EVENT_ALERT_MS,
): EventAlertDisplayMsMap {
  const ms = normalizeEventAlertDisplayMs(commonMs);
  const out = {} as EventAlertDisplayMsMap;
  for (const type of EVENT_ALERT_TYPES) {
    out[type] = ms;
  }
  return out;
}

/**
 * 種類ごとの表示時間。マップ自体が無い／空のときは旧共通値（または初期4秒）で全部埋める。
 * 一部だけあるときは欠けを初期4秒にする。
 */
export function normalizeEventAlertDisplayMsMap(
  raw: unknown,
  fallbackCommon?: unknown,
): EventAlertDisplayMsMap {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  const hasTyped =
    !!record &&
    EVENT_ALERT_TYPES.some((type) => Object.prototype.hasOwnProperty.call(record, type));
  const hasSubscribeOnly =
    !!record &&
    Object.prototype.hasOwnProperty.call(record, 'subscribe') &&
    !Object.prototype.hasOwnProperty.call(record, 'superFan');
  if (!hasTyped && !hasSubscribeOnly) {
    return defaultEventAlertDisplayMsMap(normalizeEventAlertDisplayMs(fallbackCommon));
  }
  const out = defaultEventAlertDisplayMsMap(DEFAULT_EVENT_ALERT_MS);
  for (const type of EVENT_ALERT_TYPES) {
    if (Object.prototype.hasOwnProperty.call(record, type)) {
      out[type] = normalizeEventAlertDisplayMs(record![type]);
    }
  }
  if (hasSubscribeOnly) {
    out.superFan = normalizeEventAlertDisplayMs(record!.subscribe);
  }
  return out;
}

export function resolveEventAlertDisplayMs(
  type: unknown,
  byType: EventAlertDisplayMsMap | undefined,
  fallbackCommon?: unknown,
): number {
  const common = normalizeEventAlertDisplayMs(fallbackCommon);
  const key = canonicalEventAlertType(type);
  if (!key) {
    return common;
  }
  const typed = byType?.[key];
  if (typeof typed === 'number' && Number.isFinite(typed)) {
    return normalizeEventAlertDisplayMs(typed);
  }
  return common;
}

export function shouldShowEventAlert(
  type: OverlayEventType | string,
  enabled: EventAlertEnabledMap | undefined,
): boolean {
  const key = canonicalEventAlertType(type);
  if (!key) {
    return false;
  }
  return enabled?.[key] === true;
}

/** アラートに出す画像。file / template はルート相対パス、auto は giftImageUrl（無ければギフト同梱GIF）。 */
export function resolveEventAlertImageUrl(params: {
  type: OverlayEventType | string;
  media: AlertMediaRef | undefined;
  giftImageUrl?: string | null;
  giftName?: string | null;
}): string | null {
  const alertType = canonicalEventAlertType(params.type);
  if (!alertType) {
    return null;
  }
  const media = normalizeAlertMediaRef(params.media, alertType);
  if (media.kind === 'none') {
    return null;
  }
  if (media.kind === 'file') {
    return `/media/alerts/${encodeURIComponent(media.fileName)}`;
  }
  if (media.kind === 'template') {
    // 設定のテンプレは種類単位。中身（ボックス／ポータル入室）で同梱GIFを分ける
    return eventAlertTemplatePathForEvent({
      type: alertType,
      giftName: params.giftName,
    });
  }
  const url = typeof params.giftImageUrl === 'string' ? params.giftImageUrl.trim() : '';
  if (url) {
    return url;
  }
  // ギフトの自動は画像が取れないとき同梱 GIF へ
  return alertType === 'gift'
    ? eventAlertTemplatePathForEvent({ type: 'gift', giftName: params.giftName })
    : null;
}

/** ON かつ画像が解決できるときだけアラートソースへ出す。画像なしは文言も出さない。 */
export function shouldEmitEventAlert(params: {
  type: OverlayEventType | string;
  enabled: EventAlertEnabledMap | undefined;
  media: EventAlertMediaMap | undefined;
  giftImageUrl?: string | null;
  giftName?: string | null;
}): boolean {
  if (!shouldShowEventAlert(params.type, params.enabled)) {
    return false;
  }
  const key = canonicalEventAlertType(params.type);
  if (!key) {
    return false;
  }
  return (
    resolveEventAlertImageUrl({
      type: params.type,
      media: params.media?.[key],
      giftImageUrl: params.giftImageUrl,
      giftName: params.giftName,
    }) != null
  );
}

export type AlertDisplayPart =
  | { kind: 'text'; value: string }
  | { kind: 'name'; value: string; color: string }
  | { kind: 'accent'; value: string; color: string; token?: string };

const NAME_COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

/** 表示文言からユーザー名部分を切り出し、名前色付きパーツにする。 */
export function buildAlertDisplayParts(
  displayText: string,
  nickname: string | undefined,
  nameColor: string | null | undefined,
): AlertDisplayPart[] {
  const text = typeof displayText === 'string' ? displayText : '';
  if (!text) {
    return [];
  }
  const name = typeof nickname === 'string' ? nickname : '';
  const color =
    typeof nameColor === 'string' && NAME_COLOR_HEX.test(nameColor)
      ? nameColor.toLowerCase()
      : '';
  if (!name || !color) {
    return [{ kind: 'text', value: text }];
  }
  const idx = text.indexOf(name);
  if (idx < 0) {
    return [{ kind: 'text', value: text }];
  }
  const parts: AlertDisplayPart[] = [];
  if (idx > 0) {
    parts.push({ kind: 'text', value: text.slice(0, idx) });
  }
  parts.push({ kind: 'name', value: name, color });
  const after = text.slice(idx + name.length);
  if (after) {
    parts.push({ kind: 'text', value: after });
  }
  return parts;
}
