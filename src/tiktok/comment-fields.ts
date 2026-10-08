import { CommentEmote, MAX_COMMENT_EMOTES, normalizeCommentEmotes } from '../shared/comment-emotes';
import { MSG } from '../shared/messages';
import { firstImageUrl } from './gift-fields';

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

function asIndex(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.trunc(parsed));
}

function emoteListsFromRaw(raw: Record<string, unknown>): unknown[] {
  for (const key of ['emotes', 'emoteList', 'emoteWithIndexList', 'emoteListList'] as const) {
    const list = raw[key];
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  }
  return [];
}

function hasEmotes(raw: Record<string, unknown>): boolean {
  return emoteListsFromRaw(raw).length > 0;
}

function imageUrlFromEmoteItem(item: Record<string, unknown>): string {
  const nested = asRecord(item.emote);
  const image = asRecord(nested.image ?? item.image);
  return (
    firstImageUrl(item.emoteImageUrl) ||
    firstImageUrl(nested.emoteImageUrl) ||
    firstImageUrl(image) ||
    firstImageUrl(image.imageUrl) ||
    firstImageUrl(nested.imageUrl) ||
    firstImageUrl(item.imageUrl) ||
    ''
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

/** チャット／スタンプイベントからインライン画像用の emote 一覧を取る。 */
export function commentEmotesFromEvent(raw: Record<string, unknown>): CommentEmote[] {
  const list = emoteListsFromRaw(raw);
  if (list.length === 0) {
    return [];
  }
  const collected: CommentEmote[] = [];
  for (const entry of list) {
    const item = asRecord(entry);
    const imageUrl = imageUrlFromEmoteItem(item);
    if (!imageUrl) {
      continue;
    }
    const nested = asRecord(item.emote);
    collected.push({
      // proto は index。旧コネクタ簡略形は placeInComment。
      index: asIndex(
        item.index ?? item.placeInComment ?? nested.index ?? nested.placeInComment ?? 0,
      ),
      imageUrl,
    });
    if (collected.length >= MAX_COMMENT_EMOTES) {
      break;
    }
  }
  return normalizeCommentEmotes(collected);
}
