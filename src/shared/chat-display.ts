export function normalizeChatDisplayMs(value: unknown, fallback = 12_000): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const ms = Math.trunc(parsed);
  if (ms <= 0) {
    return 0;
  }
  return Math.min(120_000, Math.max(1_000, ms));
}
