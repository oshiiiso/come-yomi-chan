import { MSG } from '../shared/messages';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, depth = 0): string {
  if (depth > 4) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }
  const record = asRecord(value);
  return (
    asText(record.content, depth + 1) ||
    asText(record.comment, depth + 1) ||
    asText(record.text, depth + 1) ||
    asText(record.describe, depth + 1) ||
    asText(record.stringValue, depth + 1) ||
    asText(record.defaultPattern, depth + 1)
  );
}

function hasEmotes(raw: Record<string, unknown>): boolean {
  return [raw.emotes, raw.emoteList, raw.emoteWithIndexList, raw.emoteListList].some(
    (list) => Array.isArray(list) && list.length > 0,
  );
}

export function commentFromEvent(raw: Record<string, unknown>): string {
  const common = asRecord(raw.common);
  return (
    asText(raw.content) ||
    asText(raw.comment) ||
    asText(raw.msgContent) ||
    asText(raw.text) ||
    asText(raw.message) ||
    asText(common.describe) ||
    asText(common.content) ||
    asText(raw.describe) ||
    (hasEmotes(raw) ? MSG.ui.emoteComment : '')
  );
}
