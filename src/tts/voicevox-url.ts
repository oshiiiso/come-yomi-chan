import { APP_CONFIG } from '../shared/app-config';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function normalizeVoicevoxHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (LOCAL_HOSTS.has(trimmed)) {
    return trimmed === 'localhost' ? 'localhost' : '127.0.0.1';
  }
  return APP_CONFIG.voicevoxHost;
}

export function voicevoxBaseUrl(host: string, port: number): string {
  return `http://${normalizeVoicevoxHost(host)}:${port}`;
}
