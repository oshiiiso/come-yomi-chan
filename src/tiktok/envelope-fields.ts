function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

const SUPER_FAN_BOX = 19;
const ENVELOPE_HIDE = 2;

export function isHiddenEnvelope(raw: Record<string, unknown>): boolean {
  return asNumber(raw.display) === ENVELOPE_HIDE;
}

export function isSuperFanEnvelope(raw: Record<string, unknown>): boolean {
  const info = asRecord(raw.envelopeInfo);
  return asNumber(info.businessType) === SUPER_FAN_BOX || asNumber(raw.businessType) === SUPER_FAN_BOX;
}

export function envelopeDiamondCount(raw: Record<string, unknown>): number {
  return asNumber(asRecord(raw.envelopeInfo).diamondCount);
}
