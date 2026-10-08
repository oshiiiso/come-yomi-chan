import {
  OVERLAY_LIKE_RANKING_MAX,
  type RankEntry,
} from '../shared/like-ranking';

const DEFAULT_MAX_USERS = 4000;

interface DiamondUserState {
  uniqueId: string;
  nickname: string;
  count: number;
  avatarUrl: string;
}

/** 配信接続中のギフトダイヤ累計（通常ギフトのみ） */
export class DiamondTracker {
  private readonly totals = new Map<string, DiamondUserState>();

  constructor(private readonly maxUsers = DEFAULT_MAX_USERS) {}

  reset(): void {
    this.totals.clear();
  }

  consume(userId: string, nickname: string, delta: number, avatarUrl = ''): void {
    const key = userId.trim() || nickname.trim();
    if (!key) {
      return;
    }
    const amount = Number.isFinite(delta) ? Math.max(0, Math.trunc(delta)) : 0;
    if (amount <= 0) {
      return;
    }

    const previous = this.totals.get(key);
    const previousCount = previous?.count ?? 0;
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
