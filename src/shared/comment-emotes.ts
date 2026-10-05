import { MSG } from './messages';

export const MAX_COMMENT_EMOTES = 32;

export interface CommentEmote {
  index: number;
  imageUrl: string;
}

export type CommentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'emote'; imageUrl: string };

function asNonNegativeIndex(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.trunc(parsed));
}

function clampIndex(index: number, max: number): number {
  if (index < 0) {
    return 0;
  }
  if (index > max) {
    return max;
  }
  return index;
}

/** 空 URL を落とし、件数上限で切る。index は 0 以上に揃えるだけ。 */
export function normalizeCommentEmotes(emotes: readonly CommentEmote[]): CommentEmote[] {
  if (!Array.isArray(emotes) || emotes.length === 0) {
    return [];
  }
  const next: CommentEmote[] = [];
  for (const item of emotes) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const imageUrl = String(item.imageUrl || '').trim();
    if (!imageUrl) {
      continue;
    }
    next.push({
      index: asNonNegativeIndex(item.index),
      imageUrl,
    });
    if (next.length >= MAX_COMMENT_EMOTES) {
      break;
    }
  }
  return next;
}

/**
 * 本文とスタンプ位置から表示用セグメントを作る。
 * 代替文言「絵文字」だけのときは画像だけ出す。
 */
export function buildCommentSegments(
  comment: string,
  emotes: readonly CommentEmote[],
): CommentSegment[] {
  const raw = String(comment || '');
  const base = raw.trim() === MSG.ui.emoteComment ? '' : raw;
  const list = normalizeCommentEmotes(emotes);
  if (list.length === 0) {
    return base ? [{ kind: 'text', text: base }] : [];
  }

  const ordered = list
    .map((item, order) => ({
      index: clampIndex(item.index, base.length),
      imageUrl: item.imageUrl,
      order,
    }))
    .sort((a, b) => a.index - b.index || a.order - b.order);

  const segments: CommentSegment[] = [];
  let cursor = 0;
  for (const emote of ordered) {
    if (emote.index > cursor) {
      segments.push({ kind: 'text', text: base.slice(cursor, emote.index) });
      cursor = emote.index;
    }
    segments.push({ kind: 'emote', imageUrl: emote.imageUrl });
  }
  if (cursor < base.length) {
    segments.push({ kind: 'text', text: base.slice(cursor) });
  }
  return segments;
}
