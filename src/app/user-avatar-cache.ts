const DEFAULT_MAX_USERS = 4000;

/** 同じ配信中に一度見たアイコンを、後から届いた宝箱などに使い回す。 */
export class UserAvatarCache {
  private readonly urls = new Map<string, string>();

  constructor(private readonly maxUsers = DEFAULT_MAX_USERS) {}

  reset(): void {
    this.urls.clear();
  }

  remember(userId: string, avatarUrl: string): void {
    const key = userId.trim();
    const url = avatarUrl.trim();
    if (!key || !url) {
      return;
    }
    this.urls.delete(key);
    this.urls.set(key, url);
    this.evictOldest();
  }

  lookup(userId: string): string {
    return this.urls.get(userId.trim()) || '';
  }

  fill<T extends { uniqueId: string; avatarUrl: string }>(user: T): T {
    const current = user.avatarUrl.trim();
    if (current) {
      this.remember(user.uniqueId, current);
      return current === user.avatarUrl ? user : { ...user, avatarUrl: current };
    }
    const cached = this.lookup(user.uniqueId);
    if (!cached) {
      return user;
    }
    return { ...user, avatarUrl: cached };
  }

  private evictOldest(): void {
    while (this.urls.size > this.maxUsers) {
      const oldest = this.urls.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.urls.delete(oldest);
    }
  }
}
