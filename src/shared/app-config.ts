function readInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const APP_USER_MODEL_ID = 'com.oshiiiso.come-yomi-chan';

export const APP_CONFIG = {
  name: process.env.APP_NAME?.trim() || 'コメ読みちゃん',
  overlayHost: process.env.OVERLAY_HOST?.trim() || '127.0.0.1',
  overlayPublicHost: process.env.OVERLAY_PUBLIC_HOST?.trim() || 'lvh.me',
  overlayStudioHost: process.env.OVERLAY_STUDIO_HOST?.trim() || 'overlay.localhost',
  overlayPort: readInt('OVERLAY_PORT', 8787),
  beatMs: readInt('BEAT_MS', 300),
  ttsAudioTtlMs: readInt('TTS_AUDIO_TTL_MS', 30_000),
  voicevoxHost: process.env.VOICEVOX_HOST?.trim() || '127.0.0.1',
  voicevoxPort: readInt('VOICEVOX_PORT', 50021),
  windowBackground: process.env.WINDOW_BACKGROUND?.trim() || '#141517',
  trayIconPath: process.env.TRAY_ICON_PATH?.trim() || '',
  reconnectInitialMs: readInt('RECONNECT_INITIAL_MS', 5_000),
  reconnectMaxMs: readInt('RECONNECT_MAX_MS', 60_000),
  connectTimeoutMs: readInt('TIKTOK_CONNECT_TIMEOUT_MS', 30_000),
  overlayCloseTimeoutMs: readInt('OVERLAY_CLOSE_TIMEOUT_MS', 3_000),
  noticeIntervalMs: readInt('NOTICE_INTERVAL_MS', 15_000),
} as const;
