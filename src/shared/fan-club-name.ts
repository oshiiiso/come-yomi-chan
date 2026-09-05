export const FAN_CLUB_NAME_MAX = 4;

export function normalizeFanClubName(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, FAN_CLUB_NAME_MAX);
}

export function rememberStreamerFanClubName(current: string, incoming: unknown): string {
  return normalizeFanClubName(incoming) || normalizeFanClubName(current);
}

export function resolveFanClubName(userName: unknown, streamerName: unknown): string {
  return normalizeFanClubName(userName) || normalizeFanClubName(streamerName);
}

export function fanClubNameForBadge(
  isFanClub: boolean,
  userName: unknown,
  streamerName: unknown,
): string {
  if (!isFanClub) {
    return normalizeFanClubName(userName);
  }
  return resolveFanClubName(userName, streamerName);
}

const FAN_CLUB_NAME_KEY = /^club[_-]?name$|^fans[_-]?club[_-]?name$|^fan[_-]?club[_-]?name$/i;

export function scanFanClubNameDeep(value: unknown, depth = 0, maxDepth = 7): string {
  if (depth > maxDepth || value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = scanFanClubNameDeep(item, depth + 1, maxDepth);
      if (found) {
        return found;
      }
    }
    return '';
  }
  if (typeof value !== 'object') {
    return '';
  }
  const record = value as Record<string, unknown>;
  for (const [key, raw] of Object.entries(record)) {
    if (FAN_CLUB_NAME_KEY.test(key.replace(/[_-]/g, ''))) {
      const name = normalizeFanClubName(raw);
      if (name) {
        return name;
      }
    }
  }
  for (const raw of Object.values(record)) {
    const found = scanFanClubNameDeep(raw, depth + 1, maxDepth);
    if (found) {
      return found;
    }
  }
  return '';
}
