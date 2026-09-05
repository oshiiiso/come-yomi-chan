import { APP_CONFIG } from './app-config';

const LOOPBACK_ALIASES = new Set([
  '127.0.0.1',
  'localhost',
  'overlay.localhost',
  'lvh.me',
  'localtest.me',
]);

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

export function overlayPublicUrl(port: number): string {
  return overlayPathUrl(normalizeOverlayPublicHost(APP_CONFIG.overlayPublicHost), port);
}

export function overlayStudioUrl(port: number): string {
  return overlayPathUrl(normalizeOverlayPublicHost(APP_CONFIG.overlayStudioHost), port);
}

export function overlayPreviewUrl(port: number): string {
  return overlayPathUrl(APP_CONFIG.overlayHost, port);
}
