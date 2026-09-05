import { isPortalSendEvent } from './portal-event';
import { speechUserKey } from './speech-filters';

export const SUPER_FAN_JOIN_DEDUPE_MS = 8000;

export function isSuperFanBoxEvent(event: {
  type?: string;
  giftName?: string;
}): boolean {
  return event.type === 'superFan' && Boolean(String(event.giftName || '').trim());
}

export function shouldPlayGiftChime(
  event: { type?: string; giftName?: string; diamondCount?: number },
  threshold: number,
): boolean {
  const limit = Math.max(0, Math.trunc(threshold));
  if (limit <= 0) {
    return false;
  }
  const diamonds = Math.max(0, Math.trunc(Number(event.diamondCount) || 0));
  if (diamonds < limit) {
    return false;
  }
  return (
    event.type === 'gift' ||
    event.type === 'envelope' ||
    isSuperFanBoxEvent(event) ||
    isPortalSendEvent(event)
  );
}

export class SuperFanJoinDedupe {
  private readonly lastAt = new Map<string, number>();

  shouldSkip(user: { uniqueId?: string; nickname?: string } | null | undefined, now: number): boolean {
    const key = speechUserKey(user);
    if (!key) {
      return false;
    }
    const previous = this.lastAt.get(key);
    if (previous !== undefined && now - previous < SUPER_FAN_JOIN_DEDUPE_MS) {
      return true;
    }
    this.lastAt.set(key, now);
    if (this.lastAt.size > 2000) {
      const cutoff = now - SUPER_FAN_JOIN_DEDUPE_MS * 4;
      for (const [item, at] of this.lastAt) {
        if (at < cutoff) {
          this.lastAt.delete(item);
        }
      }
    }
    return false;
  }

  clear(): void {
    this.lastAt.clear();
  }
}
