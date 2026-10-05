// src/shared/comment-emotes.ts と同じ判定。bundler が無いので UI 側にも置く。
const MAX_COMMENT_EMOTES = 32;
const EMOTE_ONLY_COMMENT = '絵文字';

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

function buildCommentSegments(comment, emotes) {
  const raw = String(comment || '');
  const base = raw.trim() === EMOTE_ONLY_COMMENT ? '' : raw;
  const list = normalizeCommentEmotes(emotes);
  if (list.length === 0) {
    return base ? [{ kind: 'text', text: base }] : [];
  }

  const ordered = list
    .map((item, order) => ({
      index: clampEmoteIndex(item.index, base.length),
      imageUrl: item.imageUrl,
      order,
    }))
    .sort((a, b) => a.index - b.index || a.order - b.order);

  const segments = [];
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
