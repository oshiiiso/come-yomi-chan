export const DEFAULT_REPEAT_SPEECH_SEC = 6;
export const MIN_REPEAT_SPEECH_SEC = 2;
export const MAX_REPEAT_SPEECH_SEC = 30;
export const DEFAULT_SPEAK_FAN_MIN_LEVEL = 1;

export function clampRepeatSpeechSec(value: unknown): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_REPEAT_SPEECH_SEC;
  }
  return Math.min(
    MAX_REPEAT_SPEECH_SEC,
    Math.max(MIN_REPEAT_SPEECH_SEC, Math.trunc(parsed)),
  );
}

export function clampSpeakFanMinLevel(value: unknown): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SPEAK_FAN_MIN_LEVEL;
  }
  return Math.min(99, Math.max(1, Math.trunc(parsed)));
}

export function speechUserKey(
  user: { uniqueId?: string; nickname?: string } | null | undefined,
): string {
  const uniqueId = String(user?.uniqueId || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
  if (uniqueId) {
    return `id:${uniqueId}`;
  }
  const nickname = String(user?.nickname || '')
    .trim()
    .toLowerCase();
  return nickname ? `name:${nickname}` : '';
}

export function shouldSkipRestrictedCommentSpeech(
  type: string,
  user:
    | {
        isFanClub?: boolean;
        isSuperFan?: boolean;
        fanClubLevel?: number;
      }
    | null
    | undefined,
  options: {
    enabled: boolean;
    minFanLevel: number;
    speakSubscriber: boolean;
  },
): boolean {
  if (!options.enabled || type !== 'comment') {
    return false;
  }
  const rawLevel = Number(user?.fanClubLevel);
  const fanLevel = Number.isFinite(rawLevel) && rawLevel > 0 ? rawLevel : 0;
  const fanOk = user?.isFanClub === true && fanLevel >= options.minFanLevel;
  const subOk = options.speakSubscriber && user?.isSuperFan === true;
  return !fanOk && !subOk;
}

export class RepeatSpeechGuard {
  private readonly lastSpokenAt = new Map<string, number>();

  shouldSkip(userKey: string, now: number, windowMs: number): boolean {
    if (!userKey || windowMs <= 0) {
      return false;
    }
    const previous = this.lastSpokenAt.get(userKey);
    return previous !== undefined && now - previous < windowMs;
  }

  markSpoken(userKey: string, now: number): void {
    if (!userKey) {
      return;
    }
    this.lastSpokenAt.set(userKey, now);
    if (this.lastSpokenAt.size > 2000) {
      const cutoff = now - 60_000;
      for (const [key, at] of this.lastSpokenAt) {
        if (at < cutoff) {
          this.lastSpokenAt.delete(key);
        }
      }
    }
  }

  clear(): void {
    this.lastSpokenAt.clear();
  }
}
