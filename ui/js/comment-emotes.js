// src/shared/comment-emotes.ts と同じ判定。bundler が無いので UI 側にも置く。
const MAX_COMMENT_EMOTES = 32;
const EMOTE_ONLY_COMMENT = '絵文字';
const COMMENT_EMOTE_PLACEHOLDER_RE = /\[[^\[\]\s]{1,32}\]/g;
const COMMENT_EMOTE_SHORTCODES = {
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

function asNonNegativeEmoteIndex(value) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.trunc(parsed));
}

function clampEmoteIndex(index, max) {
  if (index < 0) {
    return 0;
  }
  if (index > max) {
    return max;
  }
  return index;
}

function placeholderAtComment(text, index) {
  const sliced = text.slice(index);
  const match = sliced.match(/^\[([^\[\]\s]{1,32})\]/);
  return match ? match[0] : '';
}

function shortcodeToEmoji(token) {
  const inner = String(token || '')
    .replace(/^\[|\]$/g, '')
    .trim()
    .toLowerCase();
  if (!inner) {
    return '';
  }
  return COMMENT_EMOTE_SHORTCODES[inner] || '';
}

function expandShortcodesInText(text) {
  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
  return text.replace(COMMENT_EMOTE_PLACEHOLDER_RE, (token) => {
    return shortcodeToEmoji(token) || token;
  });
}

function normalizeCommentEmotes(emotes) {
  if (!Array.isArray(emotes) || emotes.length === 0) {
    return [];
  }
  const next = [];
  for (const item of emotes) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const imageUrl = String(item.imageUrl || '').trim();
    if (!imageUrl) {
      continue;
    }
    next.push({
      index: asNonNegativeEmoteIndex(item.index),
      imageUrl,
    });
    if (next.length >= MAX_COMMENT_EMOTES) {
      break;
    }
  }
  return next;
}

function pushCommentTextSegment(segments, text) {
  if (!text) {
    return;
  }
  const expanded = expandShortcodesInText(text);
  if (expanded) {
    segments.push({ kind: 'text', text: expanded });
  }
}

function buildByIndexWithPlaceholders(base, emotes) {
  const ordered = emotes
    .map((item, order) => ({
      index: clampEmoteIndex(item.index, base.length),
      imageUrl: item.imageUrl,
      order,
    }))
    .sort((a, b) => a.index - b.index || a.order - b.order);

  const segments = [];
  let cursor = 0;
  let consumedPlaceholder = false;
  for (const emote of ordered) {
    let index = emote.index;
    if (index < cursor) {
      index = cursor;
    }
    if (index > cursor) {
      pushCommentTextSegment(segments, base.slice(cursor, index));
      cursor = index;
    }
    segments.push({ kind: 'emote', imageUrl: emote.imageUrl });
    const placeholder = placeholderAtComment(base, cursor);
    if (placeholder) {
      cursor += placeholder.length;
      consumedPlaceholder = true;
    }
  }
  if (cursor < base.length) {
    pushCommentTextSegment(segments, base.slice(cursor));
  }
  return { segments, consumedPlaceholder };
}

function buildByPlaceholderOrder(base, emotes) {
  const ordered = [...emotes].sort((a, b) => a.index - b.index || 0);
  const segments = [];
  let cursor = 0;
  let emoteOrder = 0;
  COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
  for (const match of base.matchAll(COMMENT_EMOTE_PLACEHOLDER_RE)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      pushCommentTextSegment(segments, base.slice(cursor, start));
    }
    if (emoteOrder < ordered.length) {
      segments.push({ kind: 'emote', imageUrl: ordered[emoteOrder].imageUrl });
      emoteOrder += 1;
    } else {
      const emoji = shortcodeToEmoji(match[0]);
      pushCommentTextSegment(segments, emoji || match[0]);
    }
    cursor = start + match[0].length;
  }
  if (cursor < base.length) {
    pushCommentTextSegment(segments, base.slice(cursor));
  }
  while (emoteOrder < ordered.length) {
    segments.push({ kind: 'emote', imageUrl: ordered[emoteOrder].imageUrl });
    emoteOrder += 1;
  }
  return segments;
}

function buildCommentSegments(comment, emotes) {
  const raw = String(comment || '');
  const base = raw.trim() === EMOTE_ONLY_COMMENT ? '' : raw;
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

function appendCommentEmoteImage(host, imageUrl, className, resolveSrc) {
  if (!(host instanceof HTMLElement) || !imageUrl) {
    return;
  }
  const src =
    typeof resolveSrc === 'function' ? resolveSrc(imageUrl) : imageUrl;
  if (!src) {
    return;
  }
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'async';
  img.addEventListener('error', () => img.remove());
  img.src = src;
  host.appendChild(img);
}

function appendCommentSegments(host, segments, className, resolveSrc) {
  if (!(host instanceof HTMLElement)) {
    return;
  }
  host.textContent = '';
  for (const segment of segments || []) {
    if (!segment || typeof segment !== 'object') {
      continue;
    }
    if (segment.kind === 'text') {
      if (segment.text) {
        host.appendChild(document.createTextNode(segment.text));
      }
      continue;
    }
    if (segment.kind === 'emote') {
      appendCommentEmoteImage(host, segment.imageUrl, className, resolveSrc);
    }
  }
}
