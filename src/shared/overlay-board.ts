import { normalizeChatDisplayMs } from './chat-display';
import {
  normalizeOverlayLikeRankingEnabled,
  normalizeOverlayLikeRankingMax,
  normalizeOverlayRankingLikePollSec,
  normalizeOverlayRankingLikeSyncMode,
  normalizeOverlayRankingMode,
  type OverlayRankingLikeSyncMode,
  type OverlayRankingMode,
} from './like-ranking';
import { overlayLikesLookFromConfig } from './overlay-likes-look';
import { overlayLookFromConfig } from './overlay-look';
import {
  normalizeOverlayNameColorEnabled,
  normalizeOverlayNameColors,
} from './overlay-name-colors';
import {
  normalizeOverlayPinMs,
  normalizeOverlayPinMsByType,
  normalizeOverlayPinTypes,
} from './overlay-pin';
import {
  normalizeOverlayRankingMotion,
  normalizeOverlayRankingMotionSpeed,
} from './overlay-ranking-motion';
import { normalizeTemplateAccentColors, type TemplateAccentColors } from './template-accent-colors';
import type { AppConfig } from './types';

export const OVERLAY_BOARD_MAX = 30;
export const OVERLAY_BOARD_WIDGET_MAX = 20;
export const OVERLAY_BOARD_WIDGET_MIN_PX = 120;
export const OVERLAY_BOARD_WIDGET_VISIBLE_PX = 48;
export const OVERLAY_BOARD_LANDSCAPE_WIDTH = 1920;
export const OVERLAY_BOARD_LANDSCAPE_HEIGHT = 1080;
export const OVERLAY_BOARD_PORTRAIT_WIDTH = 1080;
export const OVERLAY_BOARD_PORTRAIT_HEIGHT = 1920;
export const OVERLAY_BOARD_NAME_MAX = 40;

export const OVERLAY_BOARD_WIDGET_KINDS = ['chat', 'ranking', 'alerts'] as const;
export type OverlayBoardWidgetKind = (typeof OVERLAY_BOARD_WIDGET_KINDS)[number];
export type OverlayBoardOrientation = 'landscape' | 'portrait';

export interface OverlayBoardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayBoardChatSettings {
  hideUserName: boolean;
  chatMaxRows: number;
  chatDisplayMs: number;
  overlayCustomCss: string;
  overlayTheme: string;
  overlayFontFamily: string;
  overlayFontSize: number;
  overlayBgOpacity: number;
  overlayShowAvatar: boolean;
  overlayGiftIconSize: number;
  overlayItemRadius: number;
  overlayNeonHue: number;
  overlayAlign: string;
  overlayMotion: string;
  overlayMotionSpeed: number;
  overlayPinEnabled: boolean;
  overlayPinMs: number;
  overlayPinMsByType: Record<string, number>;
  overlayPinHold: boolean;
  overlayPinTypes: Record<string, boolean>;
  overlayPinPreview: boolean;
  overlayNameColorEnabled: boolean;
  overlayNameColors: string[];
  templateAccentColors: TemplateAccentColors;
}

export interface OverlayBoardRankingSettings {
  enabled: boolean;
  max: number;
  mode: OverlayRankingMode;
  likeSyncMode: OverlayRankingLikeSyncMode;
  likePollSec: number;
  motion: string;
  motionSpeed: number;
  theme: string;
  fontFamily: string;
  fontSize: number;
  bgOpacity: number;
  showAvatar: boolean;
  avatarSize: number;
  itemRadius: number;
  rowGap: number;
  panelWidth: number;
  showUnit: boolean;
  neonHue: number;
  nameColorEnabled: boolean;
  nameColors: string[];
}

export interface OverlayBoardAlertSettings {
  nameColorEnabled: boolean;
  nameColors: string[];
  templateAccentColors: TemplateAccentColors;
}

export type OverlayBoardWidgetSettings =
  | OverlayBoardChatSettings
  | OverlayBoardRankingSettings
  | OverlayBoardAlertSettings;

export interface OverlayBoardWidget extends OverlayBoardRect {
  id: string;
  kind: OverlayBoardWidgetKind;
  name: string;
  visible: boolean;
  /** 枠の左上から見た中身の位置。負の値は左上を切っている */
  contentX: number;
  contentY: number;
  /** 中身の大きさ。Alt で枠を切っても変えない */
  contentWidth: number;
  contentHeight: number;
  /** 中身を描く基準サイズ。通常のリサイズでは変えず、枠に合わせて拡大縮小する */
  layoutWidth: number;
  layoutHeight: number;
  settings: OverlayBoardWidgetSettings;
}

export interface OverlayBoard {
  id: string;
  name: string;
  orientation: OverlayBoardOrientation;
  showGuide: boolean;
  widgets: OverlayBoardWidget[];
}

export interface OverlayBoardSize {
  width: number;
  height: number;
}

const KIND_LABEL: Record<OverlayBoardWidgetKind, string> = {
  chat: 'コメント',
  ranking: 'ランキング',
  alerts: 'アラート',
};

const LANDSCAPE_SLOTS: Record<OverlayBoardWidgetKind, OverlayBoardRect> = {
  chat: { x: 40, y: 520, width: 560, height: 520 },
  ranking: { x: 1400, y: 40, width: 480, height: 720 },
  alerts: { x: 640, y: 280, width: 640, height: 420 },
};

const PORTRAIT_SLOTS: Record<OverlayBoardWidgetKind, OverlayBoardRect> = {
  ranking: { x: 48, y: 180, width: 984, height: 460 },
  alerts: { x: 80, y: 700, width: 920, height: 420 },
  chat: { x: 48, y: 1200, width: 984, height: 560 },
};

export function overlayBoardSize(orientation: OverlayBoardOrientation): OverlayBoardSize {
  if (orientation === 'portrait') {
    return { width: OVERLAY_BOARD_PORTRAIT_WIDTH, height: OVERLAY_BOARD_PORTRAIT_HEIGHT };
  }
  return { width: OVERLAY_BOARD_LANDSCAPE_WIDTH, height: OVERLAY_BOARD_LANDSCAPE_HEIGHT };
}

export function overlayBoardWidgetLabel(kind: OverlayBoardWidgetKind): string {
  return KIND_LABEL[kind];
}

export function createOverlayBoardId(now = Date.now(), rand = Math.random()): string {
  return `b_${Math.trunc(now).toString(36)}_${rand.toString(36).slice(2, 8)}`;
}

export function createOverlayBoardWidgetId(now = Date.now(), rand = Math.random()): string {
  return `w_${Math.trunc(now).toString(36)}_${rand.toString(36).slice(2, 8)}`;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function cleanName(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, OVERLAY_BOARD_NAME_MAX);
}

function uniqueName(base: string, used: Set<string>): string {
  const first = cleanName(base, base);
  if (!used.has(first)) {
    used.add(first);
    return first;
  }
  for (let index = 2; index < 1000; index += 1) {
    const next = cleanName(`${first} ${index}`, `${base} ${index}`);
    if (!used.has(next)) {
      used.add(next);
      return next;
    }
  }
  const last = cleanName(`${first} ${used.size + 1}`, base);
  used.add(last);
  return last;
}

export function clampOverlayBoardRect(
  rect: Partial<OverlayBoardRect> | null | undefined,
  orientation: OverlayBoardOrientation,
  fallback: OverlayBoardRect,
): OverlayBoardRect {
  const canvas = overlayBoardSize(orientation);
  const width = clampInt(
    rect?.width,
    fallback.width,
    OVERLAY_BOARD_WIDGET_MIN_PX,
    canvas.width,
  );
  const height = clampInt(
    rect?.height,
    fallback.height,
    OVERLAY_BOARD_WIDGET_MIN_PX,
    canvas.height,
  );
  const minX = OVERLAY_BOARD_WIDGET_VISIBLE_PX - width;
  const maxX = canvas.width - OVERLAY_BOARD_WIDGET_VISIBLE_PX;
  const minY = OVERLAY_BOARD_WIDGET_VISIBLE_PX - height;
  const maxY = canvas.height - OVERLAY_BOARD_WIDGET_VISIBLE_PX;
  return {
    x: clampInt(rect?.x, fallback.x, minX, maxX),
    y: clampInt(rect?.y, fallback.y, minY, maxY),
    width,
    height,
  };
}

export interface OverlayBoardContent {
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
}

export interface OverlayBoardFrame extends OverlayBoardRect, OverlayBoardContent {}

/** 中身は枠を覆う。はみ出した分は切り抜き */
export function normalizeOverlayBoardContent(
  raw: Partial<OverlayBoardContent> | null | undefined,
  frame: OverlayBoardRect,
  orientation: OverlayBoardOrientation,
): OverlayBoardContent {
  const canvas = overlayBoardSize(orientation);
  let contentWidth = clampInt(raw?.contentWidth, frame.width, frame.width, canvas.width);
  let contentHeight = clampInt(raw?.contentHeight, frame.height, frame.height, canvas.height);
  if (contentWidth < frame.width) {
    contentWidth = frame.width;
  }
  if (contentHeight < frame.height) {
    contentHeight = frame.height;
  }
  return {
    contentX: clampInt(raw?.contentX, 0, frame.width - contentWidth, 0),
    contentY: clampInt(raw?.contentY, 0, frame.height - contentHeight, 0),
    contentWidth,
    contentHeight,
  };
}

function clampSpan(
  start: number,
  end: number,
  contentStart: number,
  contentEnd: number,
  moveStart: boolean,
): [number, number] {
  const min = OVERLAY_BOARD_WIDGET_MIN_PX;
  let from = start;
  let to = end;
  if (to - from < min) {
    if (moveStart) {
      from = to - min;
    } else {
      to = from + min;
    }
  }
  if (from < contentStart) {
    from = contentStart;
  }
  if (to > contentEnd) {
    to = contentEnd;
  }
  if (to - from < min) {
    if (moveStart) {
      from = Math.max(contentStart, Math.min(from, contentEnd - min));
      to = from + min;
      if (to > contentEnd) {
        to = contentEnd;
        from = to - min;
      }
    } else {
      to = Math.min(contentEnd, Math.max(to, contentStart + min));
      from = to - min;
      if (from < contentStart) {
        from = contentStart;
        to = from + min;
      }
    }
  }
  return [from, to];
}

function layoutSize(origin: {
  layoutWidth?: number;
  layoutHeight?: number;
  contentWidth: number;
  contentHeight: number;
}): { layoutWidth: number; layoutHeight: number } {
  return {
    layoutWidth: clampInt(origin.layoutWidth, origin.contentWidth, 1, 10000),
    layoutHeight: clampInt(origin.layoutHeight, origin.contentHeight, 1, 10000),
  };
}

/** 通常リサイズは基準の縦横比のまま、反対側を固定して拡大縮小する */
function lockAspectFrame(
  handle: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  origin: OverlayBoardRect,
  aspect: number,
  orientation: OverlayBoardOrientation,
): OverlayBoardRect {
  const ratio = aspect > 0 ? aspect : origin.width / origin.height;
  const horizontal = handle.includes('e') || handle.includes('w');
  const vertical = handle.includes('n') || handle.includes('s');
  const anchorX = handle.includes('w') ? origin.x + origin.width : origin.x;
  const anchorY = handle.includes('n') ? origin.y + origin.height : origin.y;
  let growX = (handle.includes('w') ? -1 : 1) * ((handle.includes('w') ? left : right) - anchorX);
  let growY = (handle.includes('n') ? -1 : 1) * ((handle.includes('n') ? top : bottom) - anchorY);
  if (horizontal && vertical) {
    const vx = ratio;
    const vy = 1;
    const denom = vx * vx + vy * vy;
    const t = denom > 0 ? (growX * vx + growY * vy) / denom : 0;
    growX = t * ratio;
    growY = t;
  } else if (horizontal) {
    growY = growX / ratio;
  } else {
    growX = growY * ratio;
  }
  const min = OVERLAY_BOARD_WIDGET_MIN_PX;
  const minW = Math.max(min, Math.ceil(min * ratio));
  const minH = Math.max(min, Math.ceil(min / ratio));
  if (growX < minW || growY < minH) {
    growX = Math.max(growX, minW);
    growY = growX / ratio;
    if (growY < minH) {
      growY = minH;
      growX = growY * ratio;
    }
  }
  const width = Math.max(minW, Math.round(growX));
  const height = Math.max(minH, Math.round(width / ratio));
  let x = origin.x + (origin.width - width) / 2;
  let y = origin.y + (origin.height - height) / 2;
  if (handle.includes('e')) {
    x = origin.x;
  } else if (handle.includes('w')) {
    x = origin.x + origin.width - width;
  }
  if (handle.includes('s')) {
    y = origin.y;
  } else if (handle.includes('n')) {
    y = origin.y + origin.height - height;
  }
  return clampOverlayBoardRect({ x, y, width, height }, orientation, { x, y, width, height });
}

/** 切り抜きの割合を保ったまま、枠の拡大縮小に中身を合わせる */
function scaleCropToFrame(
  origin: OverlayBoardFrame,
  frame: OverlayBoardRect,
  orientation: OverlayBoardOrientation,
): OverlayBoardContent {
  const scale = origin.width > 0 ? frame.width / origin.width : 1;
  return normalizeOverlayBoardContent(
    {
      contentX: Math.round(origin.contentX * scale),
      contentY: Math.round(origin.contentY * scale),
      contentWidth: Math.round(origin.contentWidth * scale),
      contentHeight: Math.round(origin.contentHeight * scale),
    },
    frame,
    orientation,
  );
}

/**
 * 枠の移動とサイズ変更。
 * 通常は基準の縦横比を保って拡大縮小する。切り抜きは割合のまま残す。
 * alt のときは中身の大きさとキャンバス上の位置を保ち、枠だけを中身の内側で動かす。
 */
export function resizeOverlayBoardWidget(input: {
  orientation: OverlayBoardOrientation;
  handle: string;
  alt: boolean;
  origin: OverlayBoardFrame & { layoutWidth?: number; layoutHeight?: number };
  dx: number;
  dy: number;
}): OverlayBoardFrame & { layoutWidth: number; layoutHeight: number } {
  const originContent = normalizeOverlayBoardContent(input.origin, input.origin, input.orientation);
  const origin: OverlayBoardFrame = { ...input.origin, ...originContent };
  if (!input.handle) {
    const frame = clampOverlayBoardRect(
      {
        x: origin.x + input.dx,
        y: origin.y + input.dy,
        width: origin.width,
        height: origin.height,
      },
      input.orientation,
      origin,
    );
    return {
      ...frame,
      contentX: origin.contentX,
      contentY: origin.contentY,
      contentWidth: origin.contentWidth,
      contentHeight: origin.contentHeight,
      ...layoutSize(origin),
    };
  }

  let left = origin.x;
  let top = origin.y;
  let right = origin.x + origin.width;
  let bottom = origin.y + origin.height;
  if (input.handle.includes('e')) {
    right += input.dx;
  }
  if (input.handle.includes('s')) {
    bottom += input.dy;
  }
  if (input.handle.includes('w')) {
    left += input.dx;
  }
  if (input.handle.includes('n')) {
    top += input.dy;
  }

  if (!input.alt) {
    const layout = layoutSize(origin);
    const frame = lockAspectFrame(
      input.handle,
      left,
      top,
      right,
      bottom,
      origin,
      layout.layoutWidth / layout.layoutHeight,
      input.orientation,
    );
    return {
      ...frame,
      ...scaleCropToFrame(origin, frame, input.orientation),
      ...layout,
    };
  }

  const contentLeft = origin.x + origin.contentX;
  const contentTop = origin.y + origin.contentY;
  const contentRight = contentLeft + origin.contentWidth;
  const contentBottom = contentTop + origin.contentHeight;
  if (input.handle.includes('e') || input.handle.includes('w')) {
    [left, right] = clampSpan(left, right, contentLeft, contentRight, input.handle.includes('w'));
  }
  if (input.handle.includes('n') || input.handle.includes('s')) {
    [top, bottom] = clampSpan(top, bottom, contentTop, contentBottom, input.handle.includes('n'));
  }
  const frame = clampOverlayBoardRect(
    {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    },
    input.orientation,
    origin,
  );
  return {
    ...frame,
    ...normalizeOverlayBoardContent(
      {
        contentX: contentLeft - frame.x,
        contentY: contentTop - frame.y,
        contentWidth: origin.contentWidth,
        contentHeight: origin.contentHeight,
      },
      frame,
      input.orientation,
    ),
    ...layoutSize(origin),
  };
}

function slotFor(kind: OverlayBoardWidgetKind, orientation: OverlayBoardOrientation): OverlayBoardRect {
  const table = orientation === 'portrait' ? PORTRAIT_SLOTS : LANDSCAPE_SLOTS;
  return { ...table[kind] };
}

export function overlayBoardTemplateRect(
  kind: OverlayBoardWidgetKind,
  orientation: OverlayBoardOrientation,
): OverlayBoardRect {
  return slotFor(kind, orientation);
}

export interface OverlayRankingBroadcastPlan {
  /** いいねを届いた直後に配信する */
  likesImmediate: boolean;
  /** ダイヤをギフトの直後に配信する */
  diamondsImmediate: boolean;
  /** いいねのポーリング秒。不要なら null。複数あるときは最短 */
  likePollSec: number | null;
}

export function overlayRankingBroadcastPlan(config: {
  overlayLikeRankingEnabled?: unknown;
  overlayRankingMode?: unknown;
  overlayRankingLikeSyncMode?: unknown;
  overlayRankingLikePollSec?: unknown;
  overlayBoards?: readonly OverlayBoard[] | null;
}): OverlayRankingBroadcastPlan {
  let likesImmediate = false;
  let diamondsImmediate = false;
  let likePollSec: number | null = null;
  const consider = (
    enabled: boolean,
    mode: OverlayRankingMode,
    sync: OverlayRankingLikeSyncMode,
    pollSec: number,
  ) => {
    if (!enabled) {
      return;
    }
    if (mode === 'diamonds') {
      diamondsImmediate = true;
      return;
    }
    if (sync === 'poll') {
      likePollSec = likePollSec == null ? pollSec : Math.min(likePollSec, pollSec);
      return;
    }
    likesImmediate = true;
  };
  consider(
    normalizeOverlayLikeRankingEnabled(config.overlayLikeRankingEnabled),
    normalizeOverlayRankingMode(config.overlayRankingMode),
    normalizeOverlayRankingLikeSyncMode(config.overlayRankingLikeSyncMode),
    normalizeOverlayRankingLikePollSec(config.overlayRankingLikePollSec),
  );
  for (const board of config.overlayBoards ?? []) {
    for (const widget of board.widgets) {
      if (widget.kind !== 'ranking' || widget.visible === false) {
        continue;
      }
      const settings = widget.settings as OverlayBoardRankingSettings;
      consider(
        normalizeOverlayLikeRankingEnabled(settings.enabled),
        normalizeOverlayRankingMode(settings.mode),
        normalizeOverlayRankingLikeSyncMode(settings.likeSyncMode),
        normalizeOverlayRankingLikePollSec(settings.likePollSec),
      );
    }
  }
  return { likesImmediate, diamondsImmediate, likePollSec };
}

export function chatSettingsFromConfig(config: AppConfig): OverlayBoardChatSettings {
  const look = overlayLookFromConfig(config);
  return {
    hideUserName: config.hideUserName === true,
    chatMaxRows: clampInt(config.chatMaxRows, 8, 1, 50),
    chatDisplayMs: normalizeChatDisplayMs(config.chatDisplayMs, 12_000),
    overlayCustomCss: typeof config.overlayCustomCss === 'string' ? config.overlayCustomCss.slice(0, 80_000) : '',
    overlayTheme: look.theme,
    overlayFontFamily: look.fontFamily,
    overlayFontSize: look.fontSize,
    overlayBgOpacity: look.bgOpacity,
    overlayShowAvatar: look.showAvatar,
    overlayGiftIconSize: look.giftIconSize,
    overlayItemRadius: look.itemRadius,
    overlayNeonHue: look.neonHue,
    overlayAlign: look.align,
    overlayMotion: look.motion,
    overlayMotionSpeed: look.motionSpeed,
    overlayPinEnabled: config.overlayPinEnabled !== false,
    overlayPinMs: normalizeOverlayPinMs(config.overlayPinMs),
    overlayPinMsByType: normalizeOverlayPinMsByType(config.overlayPinMsByType),
    overlayPinHold: config.overlayPinHold === true,
    overlayPinTypes: normalizeOverlayPinTypes(config.overlayPinTypes),
    overlayPinPreview: config.overlayPinPreview !== false,
    overlayNameColorEnabled: normalizeOverlayNameColorEnabled(config.overlayNameColorEnabled),
    overlayNameColors: normalizeOverlayNameColors(config.overlayNameColors),
    templateAccentColors: normalizeTemplateAccentColors(config.templateAccentColors),
  };
}

export function rankingSettingsFromConfig(config: AppConfig): OverlayBoardRankingSettings {
  const look = overlayLikesLookFromConfig(config);
  return {
    enabled: normalizeOverlayLikeRankingEnabled(config.overlayLikeRankingEnabled),
    max: normalizeOverlayLikeRankingMax(config.overlayLikeRankingMax),
    mode: normalizeOverlayRankingMode(config.overlayRankingMode),
    likeSyncMode: normalizeOverlayRankingLikeSyncMode(config.overlayRankingLikeSyncMode),
    likePollSec: normalizeOverlayRankingLikePollSec(config.overlayRankingLikePollSec),
    motion: normalizeOverlayRankingMotion(config.overlayRankingMotion),
    motionSpeed: normalizeOverlayRankingMotionSpeed(config.overlayRankingMotionSpeed),
    theme: look.theme,
    fontFamily: look.fontFamily,
    fontSize: look.fontSize,
    bgOpacity: look.bgOpacity,
    showAvatar: look.showAvatar,
    avatarSize: look.avatarSize,
    itemRadius: look.itemRadius,
    rowGap: look.rowGap,
    panelWidth: look.panelWidth,
    showUnit: look.showUnit,
    neonHue: look.neonHue,
    nameColorEnabled: normalizeOverlayNameColorEnabled(config.overlayNameColorEnabled),
    nameColors: normalizeOverlayNameColors(config.overlayNameColors),
  };
}

export function alertSettingsFromConfig(config: AppConfig): OverlayBoardAlertSettings {
  return {
    nameColorEnabled: normalizeOverlayNameColorEnabled(config.overlayNameColorEnabled),
    nameColors: normalizeOverlayNameColors(config.overlayNameColors),
    templateAccentColors: normalizeTemplateAccentColors(config.templateAccentColors),
  };
}

export function widgetSettingsFromConfig(
  kind: OverlayBoardWidgetKind,
  config: AppConfig,
): OverlayBoardWidgetSettings {
  if (kind === 'ranking') {
    return rankingSettingsFromConfig(config);
  }
  if (kind === 'alerts') {
    return alertSettingsFromConfig(config);
  }
  return chatSettingsFromConfig(config);
}

function normalizeRankingSettings(
  raw: unknown,
  fallback: OverlayBoardRankingSettings,
): OverlayBoardRankingSettings {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const look = overlayLikesLookFromConfig({
    overlayLikesTheme: record.theme ?? fallback.theme,
    overlayLikesFontFamily: record.fontFamily ?? fallback.fontFamily,
    overlayLikesFontSize: record.fontSize ?? fallback.fontSize,
    overlayLikesBgOpacity: record.bgOpacity ?? fallback.bgOpacity,
    overlayLikesShowAvatar: record.showAvatar ?? fallback.showAvatar,
    overlayLikesAvatarSize: record.avatarSize ?? fallback.avatarSize,
    overlayLikesItemRadius: record.itemRadius ?? fallback.itemRadius,
    overlayLikesRowGap: record.rowGap ?? fallback.rowGap,
    overlayLikesPanelWidth: record.panelWidth ?? fallback.panelWidth,
    overlayLikesShowUnit: record.showUnit ?? fallback.showUnit,
    overlayLikesNeonHue: record.neonHue ?? fallback.neonHue,
  });
  return {
    enabled: normalizeOverlayLikeRankingEnabled(record.enabled ?? fallback.enabled),
    max: normalizeOverlayLikeRankingMax(record.max ?? fallback.max),
    mode: normalizeOverlayRankingMode(record.mode ?? fallback.mode),
    likeSyncMode: normalizeOverlayRankingLikeSyncMode(record.likeSyncMode ?? fallback.likeSyncMode),
    likePollSec: normalizeOverlayRankingLikePollSec(record.likePollSec ?? fallback.likePollSec),
    motion: normalizeOverlayRankingMotion(record.motion ?? fallback.motion),
    motionSpeed: normalizeOverlayRankingMotionSpeed(record.motionSpeed ?? fallback.motionSpeed),
    theme: look.theme,
    fontFamily: look.fontFamily,
    fontSize: look.fontSize,
    bgOpacity: look.bgOpacity,
    showAvatar: look.showAvatar,
    avatarSize: look.avatarSize,
    itemRadius: look.itemRadius,
    rowGap: look.rowGap,
    panelWidth: look.panelWidth,
    showUnit: look.showUnit,
    neonHue: look.neonHue,
    nameColorEnabled: normalizeOverlayNameColorEnabled(record.nameColorEnabled ?? fallback.nameColorEnabled),
    nameColors: normalizeOverlayNameColors(record.nameColors ?? fallback.nameColors),
  };
}

function normalizeAlertSettings(
  raw: unknown,
  fallback: OverlayBoardAlertSettings,
): OverlayBoardAlertSettings {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    nameColorEnabled: normalizeOverlayNameColorEnabled(record.nameColorEnabled ?? fallback.nameColorEnabled),
    nameColors: normalizeOverlayNameColors(record.nameColors ?? fallback.nameColors),
    templateAccentColors: normalizeTemplateAccentColors(record.templateAccentColors ?? fallback.templateAccentColors),
  };
}

function normalizeChatSettings(
  raw: unknown,
  fallback: OverlayBoardChatSettings,
): OverlayBoardChatSettings {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const merged = { ...fallback, ...record };
  return chatSettingsFromConfig(merged as unknown as AppConfig);
}

function normalizeWidgetSettings(
  kind: OverlayBoardWidgetKind,
  raw: unknown,
  fallback: OverlayBoardWidgetSettings,
): OverlayBoardWidgetSettings {
  if (kind === 'ranking') {
    return normalizeRankingSettings(raw, fallback as OverlayBoardRankingSettings);
  }
  if (kind === 'alerts') {
    return normalizeAlertSettings(raw, fallback as OverlayBoardAlertSettings);
  }
  return normalizeChatSettings(raw, fallback as OverlayBoardChatSettings);
}

function asKind(value: unknown): OverlayBoardWidgetKind | null {
  return value === 'chat' || value === 'ranking' || value === 'alerts' ? value : null;
}

export function createOverlayBoardWidget(options: {
  kind: OverlayBoardWidgetKind;
  orientation: OverlayBoardOrientation;
  config: AppConfig;
  usedNames?: Set<string>;
  rect?: Partial<OverlayBoardRect>;
  id?: string;
  name?: string;
  visible?: boolean;
  now?: number;
  rand?: number;
}): OverlayBoardWidget {
  const used = options.usedNames ?? new Set<string>();
  const fallback = slotFor(options.kind, options.orientation);
  const rect = clampOverlayBoardRect(options.rect ?? fallback, options.orientation, fallback);
  return {
    id: options.id || createOverlayBoardWidgetId(options.now, options.rand),
    kind: options.kind,
    name: uniqueName(options.name || overlayBoardWidgetLabel(options.kind), used),
    visible: options.visible !== false,
    ...rect,
    contentX: 0,
    contentY: 0,
    contentWidth: rect.width,
    contentHeight: rect.height,
    layoutWidth: rect.width,
    layoutHeight: rect.height,
    settings: widgetSettingsFromConfig(options.kind, options.config),
  };
}

export function createOverlayBoard(options: {
  orientation: OverlayBoardOrientation;
  template: boolean;
  config: AppConfig;
  usedNames?: Set<string>;
  id?: string;
  name?: string;
  now?: number;
  rand?: number;
}): OverlayBoard {
  const usedBoards = options.usedNames ?? new Set<string>();
  const base = options.orientation === 'portrait' ? '縦' : '横';
  const usedWidgets = new Set<string>();
  const widgets = options.template
    ? (['chat', 'ranking', 'alerts'] as const).map((kind, index) =>
        createOverlayBoardWidget({
          kind,
          orientation: options.orientation,
          config: options.config,
          usedNames: usedWidgets,
          now: (options.now ?? Date.now()) + index,
          rand: (options.rand ?? Math.random()) + index / 10,
        }),
      )
    : [];
  return {
    id: options.id || createOverlayBoardId(options.now, options.rand),
    name: uniqueName(options.name || base, usedBoards),
    orientation: options.orientation,
    showGuide: true,
    widgets,
  };
}

export function defaultOverlayBoards(config: AppConfig): OverlayBoard[] {
  const used = new Set<string>();
  return [
    createOverlayBoard({
      orientation: 'landscape',
      template: true,
      config,
      usedNames: used,
      now: 1,
      rand: 0.11,
    }),
    createOverlayBoard({
      orientation: 'portrait',
      template: true,
      config,
      usedNames: used,
      now: 2,
      rand: 0.22,
    }),
  ];
}

function normalizeWidget(
  raw: unknown,
  orientation: OverlayBoardOrientation,
  config: AppConfig,
  usedIds: Set<string>,
  usedNames: Set<string>,
): OverlayBoardWidget | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const kind = asKind(record.kind);
  if (!kind) {
    return null;
  }
  let id = typeof record.id === 'string' ? record.id.trim() : '';
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id) || usedIds.has(id)) {
    id = createOverlayBoardWidgetId();
  }
  usedIds.add(id);
  const fallback = slotFor(kind, orientation);
  const settings = normalizeWidgetSettings(kind, record.settings, widgetSettingsFromConfig(kind, config));
  const rect = clampOverlayBoardRect(record, orientation, fallback);
  const content = normalizeOverlayBoardContent(record, rect, orientation);
  const canvas = overlayBoardSize(orientation);
  return {
    id,
    kind,
    name: uniqueName(
      typeof record.name === 'string' && record.name.trim()
        ? record.name
        : overlayBoardWidgetLabel(kind),
      usedNames,
    ),
    visible: asBoolean(record.visible, true),
    ...rect,
    ...content,
    layoutWidth: clampInt(record.layoutWidth, content.contentWidth, 1, canvas.width),
    layoutHeight: clampInt(record.layoutHeight, content.contentHeight, 1, canvas.height),
    settings,
  };
}

export function normalizeOverlayBoards(raw: unknown, config: AppConfig): OverlayBoard[] {
  if (!Array.isArray(raw)) {
    return defaultOverlayBoards(config);
  }
  const boards: OverlayBoard[] = [];
  const usedBoardIds = new Set<string>();
  const usedBoardNames = new Set<string>();
  for (const item of raw) {
    if (boards.length >= OVERLAY_BOARD_MAX) {
      break;
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const orientation: OverlayBoardOrientation =
      record.orientation === 'portrait' ? 'portrait' : 'landscape';
    let id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id) || usedBoardIds.has(id)) {
      id = createOverlayBoardId();
    }
    usedBoardIds.add(id);
    const usedWidgetIds = new Set<string>();
    const usedWidgetNames = new Set<string>();
    const widgets: OverlayBoardWidget[] = [];
    if (Array.isArray(record.widgets)) {
      for (const widget of record.widgets) {
        if (widgets.length >= OVERLAY_BOARD_WIDGET_MAX) {
          break;
        }
        const next = normalizeWidget(widget, orientation, config, usedWidgetIds, usedWidgetNames);
        if (next) {
          widgets.push(next);
        }
      }
    }
    boards.push({
      id,
      name: uniqueName(
        typeof record.name === 'string' && record.name.trim()
          ? record.name
          : orientation === 'portrait'
            ? '縦'
            : '横',
        usedBoardNames,
      ),
      orientation,
      showGuide: asBoolean(record.showGuide, true),
      widgets,
    });
  }
  return boards;
}
