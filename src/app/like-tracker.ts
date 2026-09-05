const DEFAULT_MAX_USERS = 4000;

export class LikeTracker {
  private readonly totals = new Map<string, number>();

  constructor(private readonly maxUsers = DEFAULT_MAX_USERS) {}

  reset(): void {
    this.totals.clear();
  }

  consume(userId: string, delta: number, milestone: number): number | null {
    if (milestone < 1) {
      return null;
    }

    const key = userId.trim();
    const previous = this.totals.get(key) ?? 0;
    const amount = Number.isFinite(delta) ? Math.max(0, Math.trunc(delta)) : 0;
    const next = previous + amount;
    this.totals.delete(key);
    this.totals.set(key, next);
    this.evictOldest();

    const prevLevel = Math.floor(previous / milestone) * milestone;
    const nextLevel = Math.floor(next / milestone) * milestone;
    if (nextLevel >= milestone && nextLevel > prevLevel) {
      return nextLevel;
    }

    return null;
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
