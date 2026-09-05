function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readTimestampMs(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return num > 1e12 ? Math.trunc(num) : Math.trunc(num * 1000);
}

/** roomInfo の create_time / createTime から配信開始時刻（ms）を取る。 */
export function parseStreamStartedAtMs(raw: unknown): number | null {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  return (
    readTimestampMs(root.create_time) ??
    readTimestampMs(root.createTime) ??
    readTimestampMs(data.create_time) ??
    readTimestampMs(data.createTime)
  );
}

/** 配信開始から now までの経過時間を H:MM:SS または M:SS で返す。 */
export function formatLiveDuration(startedAtMs: number, nowMs: number): string {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) {
    return '';
  }
  const totalSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function liveDurationAtConnect(
  streamStartedAtMs: number | null | undefined,
  connectedAtMs: number,
): string {
  if (streamStartedAtMs == null || !Number.isFinite(connectedAtMs)) {
    return '';
  }
  return formatLiveDuration(streamStartedAtMs, connectedAtMs);
}
