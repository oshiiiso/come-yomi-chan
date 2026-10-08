import { MSG } from './messages';

export const MAX_COMMENT_EMOTES = 32;

/** TikTok が本文に残す `[heart]` 形式のプレースホルダ */
export const COMMENT_EMOTE_PLACEHOLDER_RE = /\[[^\[\]\s]{1,32}\]/g;

/**
 * 画像が取れないとき用の短縮名 → 絵文字。
 * 配信の `[heart]` などがそのまま出ないようにする。
 */
export const COMMENT_EMOTE_SHORTCODES: Readonly<Record<string, string>> = {
  heart: '❤️',
  love: '❤️',
  like: '👍',
  wow: '😮',
  surprised: '😮',
  smile: '😊',
  happy: '😊',
  laugh: '😂',
  lol: '😂',
  cool: '😎',
  cry: '😢',
  sad: '😢',
  angry: '😠',
  mad: '😠',
  kiss: '😘',
  cute: '🥰',
  shy: '😳',
  sleepy: '😴',
  think: '🤔',
  applaud: '👏',
  clap: '👏',
  hi: '👋',
  bye: '👋',
  wave: '👋',
  ok: '👌',
  yes: '✅',
  no: '❌',
  thankyou: '🙏',
  thanks: '🙏',
  pray: '🙏',
  fire: '🔥',
  star: '⭐',
  gift: '🎁',
  rose: '🌹',
  music: '🎵',
  dance: '💃',
};

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

function placeholderAt(text: string, index: number): string {
  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
  const sliced = text.slice(index);
  const match = sliced.match(/^\[([^\[\]\s]{1,32})\]/);
  return match ? match[0] : '';
}

function shortcodeToEmoji(token: string): string {
  const inner = token.replace(/^\[|\]$/g, '').trim().toLowerCase();
  if (!inner) {
    return '';
  }
  return COMMENT_EMOTE_SHORTCODES[inner] || '';
}

/** 読み上げ用。`[heart]` などを落として空白を整える。 */
export function stripCommentEmotePlaceholders(comment: string): string {
  const raw = String(comment || '');
  if (!raw) {
    return '';
  }
  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
  return raw
    .replace(COMMENT_EMOTE_PLACEHOLDER_RE, ' ')
    .replace(/[ \t　]+/g, ' ')
    .replace(/[ \t　]+([、。．，!！?？])/g, '$1')
    .trim();
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

function expandShortcodesInText(text: string): string {
  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
  return text.replace(COMMENT_EMOTE_PLACEHOLDER_RE, (token) => {
    return shortcodeToEmoji(token) || token;
  });
}

function textSegment(text: string): CommentSegment | null {
  if (!text) {
    return null;
  }
  const expanded = expandShortcodesInText(text);
  return expanded ? { kind: 'text', text: expanded } : null;
}

function pushText(segments: CommentSegment[], text: string): void {
  const segment = textSegment(text);
  if (segment) {
    segments.push(segment);
  }
}

/** index 位置に画像を差し込み、そこにある `[name]` は消費する。 */
function buildByIndexWithPlaceholders(
  base: string,
  emotes: readonly CommentEmote[],
): { segments: CommentSegment[]; consumedPlaceholder: boolean } {
  const ordered = emotes
    .map((item, order) => ({
      index: clampIndex(item.index, base.length),
      imageUrl: item.imageUrl,
      order,
    }))
    .sort((a, b) => a.index - b.index || a.order - b.order);

  const segments: CommentSegment[] = [];
  let cursor = 0;
  let consumedPlaceholder = false;
  for (const emote of ordered) {
    let index = emote.index;
    if (index < cursor) {
      index = cursor;
    }
    if (index > cursor) {
      pushText(segments, base.slice(cursor, index));
      cursor = index;
    }
    segments.push({ kind: 'emote', imageUrl: emote.imageUrl });
    const placeholder = placeholderAt(base, cursor);
    if (placeholder) {
      cursor += placeholder.length;
      consumedPlaceholder = true;
    }
  }
  if (cursor < base.length) {
    pushText(segments, base.slice(cursor));
  }
  return { segments, consumedPlaceholder };
}

/** 本文の `[name]` を出現順に画像へ置き換える（index が合わないときの保険）。 */
function buildByPlaceholderOrder(
  base: string,
  emotes: readonly CommentEmote[],
): CommentSegment[] {
  const ordered = [...emotes].sort(
    (a, b) => a.index - b.index || 0,
  );
  const segments: CommentSegment[] = [];
  let cursor = 0;
  let emoteOrder = 0;
  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
  for (const match of base.matchAll(COMMENT_EMOTE_PLACEHOLDER_RE)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      pushText(segments, base.slice(cursor, start));
    }
    if (emoteOrder < ordered.length) {
      segments.push({ kind: 'emote', imageUrl: ordered[emoteOrder].imageUrl });
      emoteOrder += 1;
    } else {
      const emoji = shortcodeToEmoji(match[0]);
      if (emoji) {
        pushText(segments, emoji);
      } else {
        pushText(segments, match[0]);
      }
    }
    cursor = start + match[0].length;
  }
  if (cursor < base.length) {
    pushText(segments, base.slice(cursor));
  }
  while (emoteOrder < ordered.length) {
    segments.push({ kind: 'emote', imageUrl: ordered[emoteOrder].imageUrl });
    emoteOrder += 1;
  }
  return segments;
}

/**
 * 本文とスタンプ位置から表示用セグメントを作る。
 * 代替文言「絵文字」だけのときは画像だけ出す。
 * 本文の `[heart]` は画像差し込み時に消費し、画像が無いときは絵文字に寄せる。
 */
export function buildCommentSegments(
  comment: string,
  emotes: readonly CommentEmote[],
): CommentSegment[] {
  const raw = String(comment || '');
  const base = raw.trim() === MSG.ui.emoteComment ? '' : raw;
  const list = normalizeCommentEmotes(emotes);
  if (list.length === 0) {
    if (!base) {
      return [];
    }
    const expanded = expandShortcodesInText(base);
    return expanded ? [{ kind: 'text', text: expanded }] : [];
  }

  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
  const hasPlaceholders = COMMENT_EMOTE_PLACEHOLDER_RE.test(base);
  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;

  if (hasPlaceholders) {
    const byIndex = buildByIndexWithPlaceholders(base, list);
    if (byIndex.consumedPlaceholder) {
      return byIndex.segments;
    }
    return buildByPlaceholderOrder(base, list);
  }

  return buildByIndexWithPlaceholders(base, list).segments;
}
