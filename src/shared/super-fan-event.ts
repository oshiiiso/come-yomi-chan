import { speechUserKey } from './speech-filters';

export const SUPER_FAN_JOIN_DEDUPE_MS = 8000;

export function isSuperFanBoxEvent(event: {
  type?: string;
  giftName?: string;
}): boolean {
  return event.type === 'superFan' && Boolean(String(event.giftName || '').trim());
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
