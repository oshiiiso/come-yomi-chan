function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function looksLikePortal(text: string): boolean {
  const value = text.trim();
  if (!value) {
    return false;
  }
  return /ポータル|portal/i.test(value);
}

export function isPortalGiftEvent(raw: Record<string, unknown>): boolean {
  const gift = asRecord(raw.giftDetails ?? raw.gift);
  const extra = asRecord(raw.extendedGiftInfo);
  const names = [
    asText(raw.giftName),
    asText(gift.giftName),
    asText(gift.name),
    asText(extra.name),
    asText(extra.giftName),
    asText(gift.describe),
  ];
  return names.some((name) => looksLikePortal(name));
}

export function isPortalMemberJoin(raw: Record<string, unknown>): boolean {
  const common = asRecord(raw.common);
  const displayText = asRecord(common.displayText ?? raw.displayText);
  const texts = [
    asText(raw.displayType),
    asText(displayText.key),
    asText(displayText.defaultPattern),
    asText(common.describe),
    asText(raw.describe),
    asText(raw.action),
    asText(raw.entrySource),
    asText(raw.enterFrom),
    asText(raw.enterMethod),
    asText(raw.enterType),
    asText(raw.memberSource),
    asText(raw.scene),
  ];
  return texts.some((text) => looksLikePortal(text));
}
