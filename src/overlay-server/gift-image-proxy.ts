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

export function isAllowedGiftImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) {
      return true;
    }
    return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch (error) {
    logger.debug(`ギフト画像URLを解釈できません: ${getErrorMessage(error)}`);
    return false;
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
  if (isAllowedGiftImageUrl(trimmed)) {
    return `/media/gift?u=${encodeURIComponent(trimmed)}`;
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

export async function fetchAllowedGiftImage(
  imageUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CachedGiftImage | null> {
  if (!isAllowedGiftImageUrl(imageUrl)) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(imageUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    });
    if (!response.ok || !isAllowedGiftImageUrl(response.url)) {
      return null;
    }

    const contentType = (response.headers.get('content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) {
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
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
