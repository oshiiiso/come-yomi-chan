import { APP_CONFIG } from './app-config';

const LOOPBACK_ALIASES = new Set([
  '127.0.0.1',
  'localhost',
  'overlay.localhost',
  'lvh.me',
  'localtest.me',
]);

/** 接続タブの種類（コメント列 / イベントアラート / ランキング） */
export const OVERLAY_URL_KINDS = ['chat', 'alerts', 'ranking'] as const;
/** LIVE Studio / OBS / 別URL */
export const OVERLAY_URL_VARIANTS = ['live', 'obs', 'studio'] as const;
/** IPC `overlay:copy-url` の kind（旧 likes* も受け付ける） */
export const OVERLAY_COPY_KINDS = [
  'default',
  'local',
  'studio',
  'alerts',
  'alerts-local',
  'alerts-studio',
  'ranking',
  'ranking-local',
  'ranking-studio',
  'likes',
  'likes-local',
  'likes-studio',
] as const;

export type OverlayUrlKind = (typeof OVERLAY_URL_KINDS)[number];
export type OverlayUrlVariant = (typeof OVERLAY_URL_VARIANTS)[number];
export type OverlayCopyKind = (typeof OVERLAY_COPY_KINDS)[number];

/** 設定ビュー・接続状態で共有する URL 束 */
export interface OverlayUrlFields {
  overlayUrl: string;
  overlayStudioUrl: string;
  overlayPreviewUrl: string;
  overlayAlertsUrl: string;
  overlayAlertsStudioUrl: string;
  overlayAlertsPreviewUrl: string;
  /** ランキング配信ソース（パスは /overlay/ranking/） */
  overlayLikesUrl: string;
  overlayLikesStudioUrl: string;
  overlayLikesPreviewUrl: string;
}

export function isOverlayUrlKind(value: unknown): value is OverlayUrlKind {
  return typeof value === 'string' && (OVERLAY_URL_KINDS as readonly string[]).includes(value);
}

/** サンプル／クリア用。未知はコメント列。旧 likes は ranking へ */
export function normalizeOverlayUrlKind(value: unknown): OverlayUrlKind {
  if (value === 'likes' || value === 'ranking') {
    return 'ranking';
  }
  return isOverlayUrlKind(value) ? value : 'chat';
}

export function isOverlayUrlVariant(value: unknown): value is OverlayUrlVariant {
  return typeof value === 'string' && (OVERLAY_URL_VARIANTS as readonly string[]).includes(value);
}

export function normalizeOverlayCopyKind(value: unknown): OverlayCopyKind {
  if (typeof value !== 'string') {
    return 'default';
  }
  if (value === 'likes') {
    return 'ranking';
  }
  if (value === 'likes-local') {
    return 'ranking-local';
  }
  if (value === 'likes-studio') {
    return 'ranking-studio';
  }
  return (OVERLAY_COPY_KINDS as readonly string[]).includes(value)
    ? (value as OverlayCopyKind)
    : 'default';
}

/** UI の種類×用途 → IPC kind */
export function overlayCopyKindFrom(
  kind: unknown,
  variant: unknown,
): OverlayCopyKind {
  const safeKind = normalizeOverlayUrlKind(kind);
  const safeVariant = isOverlayUrlVariant(variant) ? variant : 'live';
  if (safeKind === 'alerts') {
    if (safeVariant === 'obs') {
      return 'alerts-local';
    }
    if (safeVariant === 'studio') {
      return 'alerts-studio';
    }
    return 'alerts';
  }
  if (safeKind === 'ranking') {
    if (safeVariant === 'obs') {
      return 'ranking-local';
    }
    if (safeVariant === 'studio') {
      return 'ranking-studio';
    }
    return 'ranking';
  }
  if (safeVariant === 'obs') {
    return 'local';
  }
  if (safeVariant === 'studio') {
    return 'studio';
  }
  return 'default';
}

export function normalizeOverlayPublicHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (LOOPBACK_ALIASES.has(trimmed) || trimmed.endsWith('.localhost')) {
    return trimmed;
  }
  return 'overlay.localhost';
}

export function overlayPathUrl(host: string, port: number): string {
  return `http://${host}:${port}/overlay/`;
}

export function overlayAlertsPathUrl(host: string, port: number): string {
  return `http://${host}:${port}/overlay/alerts/`;
}

export function overlayRankingPathUrl(host: string, port: number): string {
  return `http://${host}:${port}/overlay/ranking/`;
}

/** @deprecated overlayRankingPathUrl を使う */
export function overlayLikesPathUrl(host: string, port: number): string {
  return overlayRankingPathUrl(host, port);
}

export function overlayPublicUrl(port: number): string {
  return overlayPathUrl(normalizeOverlayPublicHost(APP_CONFIG.overlayPublicHost), port);
}

export function overlayStudioUrl(port: number): string {
  return overlayPathUrl(normalizeOverlayPublicHost(APP_CONFIG.overlayStudioHost), port);
}

export function overlayPreviewUrl(port: number): string {
  return overlayPathUrl(APP_CONFIG.overlayHost, port);
}

export function overlayAlertsPublicUrl(port: number): string {
  return overlayAlertsPathUrl(
    normalizeOverlayPublicHost(APP_CONFIG.overlayPublicHost),
    port,
  );
}

export function overlayAlertsStudioUrl(port: number): string {
  return overlayAlertsPathUrl(
    normalizeOverlayPublicHost(APP_CONFIG.overlayStudioHost),
    port,
  );
}

export function overlayAlertsPreviewUrl(port: number): string {
  return overlayAlertsPathUrl(APP_CONFIG.overlayHost, port);
}

export function overlayLikesPublicUrl(port: number): string {
  return overlayRankingPathUrl(
    normalizeOverlayPublicHost(APP_CONFIG.overlayPublicHost),
    port,
  );
}

export function overlayLikesStudioUrl(port: number): string {
  return overlayRankingPathUrl(
    normalizeOverlayPublicHost(APP_CONFIG.overlayStudioHost),
    port,
  );
}

export function overlayLikesPreviewUrl(port: number): string {
  return overlayRankingPathUrl(APP_CONFIG.overlayHost, port);
}

export function overlayUrlFieldsForPort(port: number): OverlayUrlFields {
  return {
    overlayUrl: overlayPublicUrl(port),
    overlayStudioUrl: overlayStudioUrl(port),
    overlayPreviewUrl: overlayPreviewUrl(port),
    overlayAlertsUrl: overlayAlertsPublicUrl(port),
    overlayAlertsStudioUrl: overlayAlertsStudioUrl(port),
    overlayAlertsPreviewUrl: overlayAlertsPreviewUrl(port),
    overlayLikesUrl: overlayLikesPublicUrl(port),
    overlayLikesStudioUrl: overlayLikesStudioUrl(port),
    overlayLikesPreviewUrl: overlayLikesPreviewUrl(port),
  };
}

export function overlayUrlForCopyKind(port: number, kind: unknown): string {
  const copyKind = normalizeOverlayCopyKind(kind);
  const urls = overlayUrlFieldsForPort(port);
  switch (copyKind) {
    case 'studio':
      return urls.overlayStudioUrl;
    case 'local':
      return urls.overlayPreviewUrl;
    case 'alerts':
      return urls.overlayAlertsUrl;
    case 'alerts-studio':
      return urls.overlayAlertsStudioUrl;
    case 'alerts-local':
      return urls.overlayAlertsPreviewUrl;
    case 'ranking':
    case 'likes':
      return urls.overlayLikesUrl;
    case 'ranking-studio':
    case 'likes-studio':
      return urls.overlayLikesStudioUrl;
    case 'ranking-local':
    case 'likes-local':
      return urls.overlayLikesPreviewUrl;
    default:
      return urls.overlayUrl;
  }
}
