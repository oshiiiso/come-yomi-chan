function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function socialEventType(raw: Record<string, unknown>): 'follow' | 'share' | null {
  const common = asRecord(raw.common);
  const displayText = asRecord(common.displayText);
  const blob = [
    asText(raw.displayType),
    asText(displayText.key),
    asText(displayText.defaultPattern),
    asText(common.describe),
    asText(raw.action),
    asText(raw.scene),
  ]
    .join(' ')
    .toLowerCase();

  if (blob.includes('share')) {
    return 'share';
  }
  if (blob.includes('follow')) {
    return 'follow';
  }
  if (asText(raw.shareType) || asNumber(raw.shareCount) > 0) {
    return 'share';
  }
  if (asNumber(raw.followType) > 0) {
    return 'follow';
  }
  return null;
}
