import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';

const logger = getLogger('gift-image');

const ALLOWED_HOST_SUFFIXES = [
  '.tiktokcdn.com',
  '.tiktokcdn-us.com',
  '.tiktokcdn-eu.com',
  '.tiktokcdn-in.com',
  '.ibyteimg.com',
  '.byteimg.com',
  '.byteoversea.com',
  '.muscdn.com',
  '.ttwstatic.com',
  '.tiktokv.com',
  '.tiktok.com',
];

const ALLOWED_HOSTS = new Set([
  'tiktok.com',
  'tiktokcdn.com',
  'ibyteimg.com',
  'byteoversea.com',
  'muscdn.com',
]);

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export interface CachedGiftImage {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

function isAllowedHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (ALLOWED_HOSTS.has(normalized)) {
    return true;
  }
  return ALLOWED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

export function isAllowedGiftImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return isAllowedHost(parsed.hostname);
  } catch (error) {
    logger.debug(`ギフト画像URLを解釈できません: ${getErrorMessage(error)}`);
    return false;
  }
}

function httpsImageUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (!isAllowedHost(parsed.hostname)) {
      return '';
    }
    if (parsed.protocol === 'https:') {
      return value;
    }
    if (parsed.protocol === 'http:') {
      const prefix = value.match(/^http:\/\//i);
      return prefix ? `https://${value.slice(prefix[0].length)}` : '';
    }
    return '';
  } catch (error) {
    logger.debug(`ギフト画像URLを解釈できません: ${getErrorMessage(error)}`);
    return '';
  }
}

export function overlayGiftImagePath(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('/overlay/') || trimmed.startsWith('/media/')) {
    return trimmed;
  }
  const allowed = httpsImageUrl(trimmed);
  if (allowed) {
    return `/media/gift?u=${encodeURIComponent(allowed)}`;
  }
  return '';
}

const DEFAULT_MAX_CACHE_ENTRIES = 256;

export class GiftImageCache {
  private readonly entries = new Map<string, CachedGiftImage>();

  constructor(private readonly maxEntries = DEFAULT_MAX_CACHE_ENTRIES) {}

  get(url: string): CachedGiftImage | undefined {
    const entry = this.entries.get(url);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(url);
      return undefined;
    }
    return entry;
  }

  set(url: string, buffer: Buffer, contentType: string): CachedGiftImage {
    this.pruneExpired();
    const entry: CachedGiftImage = {
      buffer,
      contentType,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    this.entries.delete(url);
    this.entries.set(url, entry);
    this.evictOverflow();
    return entry;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [url, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(url);
      }
    }
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.entries.delete(oldest);
    }
  }
}

function sniffImageContentType(bytes: Buffer): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  const head = bytes.subarray(0, 256).toString('utf8').replace(/^\uFEFF/, '').trimStart();
  if (/^<svg[\s>]/i.test(head) || /^<\?xml\b[^>]*>\s*<svg[\s>]/i.test(head)) {
    return 'image/svg+xml';
  }
  return '';
}

function resolveImageContentType(headerValue: string, bytes: Buffer): string {
  const sniffed = sniffImageContentType(bytes);
  if (sniffed) {
    return sniffed;
  }
  const headerType = headerValue.split(';')[0].trim().toLowerCase();
  if (headerType === 'image/jpg') {
    return ALLOWED_TYPES.has('image/jpeg') ? 'image/jpeg' : '';
  }
  if (headerType === 'image/svg+xml' && ALLOWED_TYPES.has(headerType)) {
    return headerType;
  }
  return '';
}

export async function fetchAllowedGiftImage(
  imageUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CachedGiftImage | null> {
  const allowedUrl = httpsImageUrl(imageUrl);
  if (!allowedUrl) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(allowedUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    });
    const responseUrl = httpsImageUrl(response.url || allowedUrl);
    if (!response.ok || !responseUrl) {
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
      return null;
    }
    const contentType = resolveImageContentType(
      response.headers.get('content-type') ?? '',
      bytes,
    );
    if (!contentType) {
      return null;
    }
    return {
      buffer: bytes,
      contentType,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  } catch (error) {
    logger.warning(`ギフト画像の取得に失敗しました: ${getErrorMessage(error)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
