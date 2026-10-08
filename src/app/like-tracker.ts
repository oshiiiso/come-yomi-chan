import {
  OVERLAY_LIKE_RANKING_MAX,
  type RankEntry,
} from '../shared/like-ranking';

const DEFAULT_MAX_USERS = 4000;

interface LikeUserState {
  uniqueId: string;
  nickname: string;
  count: number;
  avatarUrl: string;
}

export class LikeTracker {
  private readonly totals = new Map<string, LikeUserState>();

  constructor(private readonly maxUsers = DEFAULT_MAX_USERS) {}

  reset(): void {
    this.totals.clear();
  }

  consume(
    userId: string,
    nickname: string,
    delta: number,
    milestone: number,
    avatarUrl = '',
  ): number | null {
    if (milestone < 1) {
      return null;
    }

    const key = userId.trim() || nickname.trim();
    if (!key) {
      return null;
    }

    const previous = this.totals.get(key);
    const previousCount = previous?.count ?? 0;
    const amount = Number.isFinite(delta) ? Math.max(0, Math.trunc(delta)) : 0;
    const next = previousCount + amount;
    const displayName = nickname.trim() || userId.trim() || key;
    const nextAvatar =
      (typeof avatarUrl === 'string' && avatarUrl.trim()) || previous?.avatarUrl || '';
    this.totals.delete(key);
    this.totals.set(key, {
      uniqueId: userId.trim(),
      nickname: displayName,
      count: next,
      avatarUrl: nextAvatar,
    });
    this.evictOldest();

    const prevLevel = Math.floor(previousCount / milestone) * milestone;
    const nextLevel = Math.floor(next / milestone) * milestone;
    if (nextLevel >= milestone && nextLevel > prevLevel) {
      return nextLevel;
    }

    return null;
  }

  top(limit = OVERLAY_LIKE_RANKING_MAX): RankEntry[] {
    const max = Math.min(
      OVERLAY_LIKE_RANKING_MAX,
      Math.max(1, Math.trunc(limit) || OVERLAY_LIKE_RANKING_MAX),
    );
    return [...this.totals.values()]
      .filter((entry) => entry.count > 0)
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        const leftKey = (left.uniqueId || left.nickname).toLowerCase();
        const rightKey = (right.uniqueId || right.nickname).toLowerCase();
        return leftKey.localeCompare(rightKey, 'ja');
      })
      .slice(0, max)
      .map((entry) => ({
        uniqueId: entry.uniqueId,
        nickname: entry.nickname,
        count: entry.count,
        avatarUrl: entry.avatarUrl || '',
      }));
  }

  private evictOldest(): void {
    while (this.totals.size > this.maxUsers) {
      const oldest = this.totals.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.totals.delete(oldest);
    }
  }
}
