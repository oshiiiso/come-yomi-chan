import {
  DEFAULT_TEMPLATE_ACCENT_COLORS,
  isTemplateAccentTokenId,
  type TemplateAccentColors,
  type TemplateAccentTokenId,
} from '../shared/template-accent-colors';
import { stripTemplateEmphasisMarkers } from '../shared/template-placeholders';
import { templateEventLabel } from '../shared/template-event-label';
import { OverlayDisplayPart, OverlayEventType } from '../shared/types';

export interface TemplateVars {
  user: string;
  comment: string;
  gift: string;
  count: number;
  likes: string;
  event: string;
}

export type SpeechPart =
  | { kind: 'text'; value: string }
  | { kind: 'beat'; count: number };

export type TemplateDisplayPart =
  | { kind: 'text'; value: string }
  | { kind: 'name'; value: string; color: string }
  | { kind: 'accent'; value: string; color: string; token: TemplateAccentTokenId };

type Segment =
  | { type: 'text'; value: string }
  | { type: 'beats'; count: number };

type TemplateSegment =
  | { type: 'text'; value: string }
  | { type: 'token'; name: string }
  | { type: 'emphasis'; inner: string };

function splitByBeat(template: string): Segment[] {
  const result: Segment[] = [];
  let buffer = '';
  let beatCount = 0;
  let index = 0;

  const flushText = (): void => {
    if (buffer) {
      result.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  const flushBeats = (): void => {
    if (beatCount > 0) {
      result.push({ type: 'beats', count: beatCount });
      beatCount = 0;
    }
  };

  while (index < template.length) {
    const char = template[index];
    if (char === '{') {
      flushBeats();
      const end = template.indexOf('}', index);
      if (end === -1) {
        buffer += template.slice(index);
        break;
      }
      buffer += template.slice(index, end + 1);
      index = end + 1;
      continue;
    }

    if (char === '.') {
      flushText();
      beatCount += 1;
      index += 1;
      continue;
    }

    flushBeats();
    buffer += char;
    index += 1;
  }

  flushText();
  flushBeats();
  return result;
}

function formatCount(count: number, mode: 'display' | 'speech'): string {
  if (count <= 1) {
    return '';
  }

  return mode === 'display' ? `×${count}` : ` ${count}こ`;
}

function resolveTokenValue(
  name: string,
  vars: TemplateVars,
  mode: 'display' | 'speech',
): string | null {
  switch (name) {
    case 'user':
      return vars.user;
    case 'comment':
      return vars.comment;
    case 'gift':
      return vars.gift;
    case 'count':
      return formatCount(vars.count, mode);
    case 'likes':
      return vars.likes;
    case 'event':
      return vars.event;
    default:
      return null;
  }
}

export function applyTemplateVars(
  template: string,
  vars: TemplateVars,
  mode: 'display' | 'speech',
): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (matched, name: string) => {
    const value = resolveTokenValue(name, vars, mode);
    return value === null ? matched : value;
  });
}

const USER_HIDE_MARK = '\u0001';
const PART_MARK_START = '\u0002';
const PART_MARK_END = '\u0003';

export interface DisplayRenderOptions {
  hideUserName?: boolean;
  maxChars?: number;
  nameColor?: string | null;
  accentColors?: TemplateAccentColors;
}

function splitTemplateSegments(template: string): TemplateSegment[] {
  const result: TemplateSegment[] = [];
  let buffer = '';
  let index = 0;

  const flush = (): void => {
    if (buffer) {
      result.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (index < template.length) {
    if (template.startsWith('**', index)) {
      const close = template.indexOf('**', index + 2);
      if (close === -1) {
        buffer += '**';
        index += 2;
        continue;
      }
      flush();
      result.push({ type: 'emphasis', inner: template.slice(index + 2, close) });
      index = close + 2;
      continue;
    }

    if (template[index] === '{') {
      const close = template.indexOf('}', index + 1);
      if (close !== -1) {
        const name = template.slice(index + 1, close);
        if (/^[a-zA-Z]+$/.test(name)) {
          flush();
          result.push({ type: 'token', name });
          index = close + 1;
          continue;
        }
      }
    }

    buffer += template[index];
    index += 1;
  }

  flush();
  return result;
}

function accentColorFor(
  token: TemplateAccentTokenId,
  colors: TemplateAccentColors,
): string {
  return colors[token] || DEFAULT_TEMPLATE_ACCENT_COLORS[token];
}

function resolvePlainInner(
  inner: string,
  vars: TemplateVars,
  mode: 'display' | 'speech',
): string {
  return applyTemplateVars(inner, vars, mode);
}

function pushPart(parts: TemplateDisplayPart[], part: TemplateDisplayPart | null): void {
  if (!part || !part.value) {
    return;
  }
  const last = parts[parts.length - 1];
  if (
    last &&
    last.kind === 'text' &&
    part.kind === 'text'
  ) {
    last.value += part.value;
    return;
  }
  parts.push(part);
}

function buildRawDisplayParts(
  template: string,
  vars: TemplateVars,
  options: DisplayRenderOptions,
): TemplateDisplayPart[] {
  const accentColors = options.accentColors ?? DEFAULT_TEMPLATE_ACCENT_COLORS;
  const nameColor =
    typeof options.nameColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(options.nameColor)
      ? options.nameColor.toLowerCase()
      : '';
  const resolvedVars = options.hideUserName ? { ...vars, user: USER_HIDE_MARK } : vars;
  const parts: TemplateDisplayPart[] = [];

  for (const segment of splitTemplateSegments(template)) {
    if (segment.type === 'text') {
      pushPart(parts, { kind: 'text', value: segment.value });
      continue;
    }

    if (segment.type === 'emphasis') {
      const value = resolvePlainInner(segment.inner, resolvedVars, 'display');
      if (!value) {
        continue;
      }
      pushPart(parts, {
        kind: 'accent',
        value,
        color: accentColorFor('emphasis', accentColors),
        token: 'emphasis',
      });
      continue;
    }

    const value = resolveTokenValue(segment.name, resolvedVars, 'display');
    if (value === null) {
      pushPart(parts, { kind: 'text', value: `{${segment.name}}` });
      continue;
    }
    if (!value) {
      continue;
    }

    if (segment.name === 'user') {
      if (nameColor && !options.hideUserName) {
        pushPart(parts, { kind: 'name', value, color: nameColor });
      } else {
        pushPart(parts, { kind: 'text', value });
      }
      continue;
    }

    if (isTemplateAccentTokenId(segment.name)) {
      pushPart(parts, {
        kind: 'accent',
        value,
        color: accentColorFor(segment.name, accentColors),
        token: segment.name,
      });
      continue;
    }

    pushPart(parts, { kind: 'text', value });
  }

  return parts;
}

function stripHiddenUser(text: string): string {
  return text
    .replaceAll(`${USER_HIDE_MARK}さんから`, '')
    .replaceAll(`${USER_HIDE_MARK}さんが`, '')
    .replaceAll(`${USER_HIDE_MARK}さん`, '')
    .replaceAll(USER_HIDE_MARK, '')
    .replace(/^\s*[:：]\s*/, '')
    .replace(/\s*[:：]\s*$/, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function serializePartsForHide(parts: TemplateDisplayPart[]): {
  text: string;
  tokens: TemplateDisplayPart[];
} {
  const tokens: TemplateDisplayPart[] = [];
  let text = '';
  for (const part of parts) {
    if (part.kind === 'text') {
      text += part.value;
      continue;
    }
    if (part.kind === 'name' && part.value === USER_HIDE_MARK) {
      text += USER_HIDE_MARK;
      continue;
    }
    if (part.value.includes(USER_HIDE_MARK)) {
      text += part.value;
      continue;
    }
    const id = tokens.length;
    tokens.push(part);
    text += `${PART_MARK_START}${id}${PART_MARK_END}`;
  }
  return { text, tokens };
}

function parsePartsAfterHide(
  text: string,
  tokens: TemplateDisplayPart[],
): TemplateDisplayPart[] {
  const parts: TemplateDisplayPart[] = [];
  const re = new RegExp(`${PART_MARK_START}(\\d+)${PART_MARK_END}`, 'g');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      pushPart(parts, { kind: 'text', value: text.slice(last, match.index) });
    }
    const token = tokens[Number(match[1])];
    if (token) {
      pushPart(parts, token);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    pushPart(parts, { kind: 'text', value: text.slice(last) });
  }
  return parts;
}

function applyHideUserNameToParts(parts: TemplateDisplayPart[]): TemplateDisplayPart[] {
  const { text, tokens } = serializePartsForHide(parts);
  return parsePartsAfterHide(stripHiddenUser(text), tokens);
}

export function clipText(text: string, maxChars: number): string {
  const limit = Math.min(400, Math.max(1, Math.trunc(maxChars)));
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}…`;
}

function clipParts(parts: TemplateDisplayPart[], maxChars: number): TemplateDisplayPart[] {
  const limit = Math.min(400, Math.max(1, Math.trunc(maxChars)));
  let used = 0;
  const out: TemplateDisplayPart[] = [];
  for (const part of parts) {
    if (used >= limit) {
      break;
    }
    if (used + part.value.length <= limit) {
      out.push(part);
      used += part.value.length;
      continue;
    }
    const remain = limit - used;
    out.push({ ...part, value: `${part.value.slice(0, remain)}…` });
    break;
  }
  return out;
}

export function displayPartsToText(parts: TemplateDisplayPart[]): string {
  return parts.map((part) => part.value).join('');
}

export function renderDisplayParts(
  template: string,
  vars: TemplateVars,
  options: DisplayRenderOptions = {},
): TemplateDisplayPart[] {
  let parts = buildRawDisplayParts(typeof template === 'string' ? template : '', vars, options);
  if (options.hideUserName) {
    parts = applyHideUserNameToParts(parts);
  }
  if (typeof options.maxChars === 'number') {
    parts = clipParts(parts, options.maxChars);
  }
  return parts.filter((part) => Boolean(part.value));
}

export function renderDisplayTemplate(
  template: string,
  vars: TemplateVars,
  options: DisplayRenderOptions = {},
): string {
  return displayPartsToText(renderDisplayParts(template, vars, options));
}

/** 配信ソース送信用にテンプレ表示パーツを落とす */
export function serializeOverlayDisplayParts(
  parts: TemplateDisplayPart[],
): OverlayDisplayPart[] {
  return parts.map((part) => {
    if (part.kind === 'accent') {
      return {
        kind: 'accent',
        value: part.value,
        color: part.color,
        token: part.token,
      };
    }
    if (part.kind === 'name') {
      return { kind: 'name', value: part.value, color: part.color };
    }
    return { kind: 'text', value: part.value };
  });
}

export function renderOverlayDisplay(
  template: string,
  vars: TemplateVars,
  options: DisplayRenderOptions = {},
): { displayText: string; displayParts: OverlayDisplayPart[] } {
  const parts = renderDisplayParts(template, vars, options);
  return {
    displayText: displayPartsToText(parts),
    displayParts: serializeOverlayDisplayParts(parts),
  };
}

export function renderSpeechParts(
  template: string,
  vars: TemplateVars,
  maxChars: number,
): SpeechPart[] {
  const parts: SpeechPart[] = [];

  for (const segment of splitByBeat(template)) {
    if (segment.type === 'beats') {
      parts.push({ kind: 'beat', count: segment.count });
      continue;
    }

    const text = stripTemplateEmphasisMarkers(
      applyTemplateVars(segment.value, vars, 'speech'),
    ).trim();
    if (!text) {
      continue;
    }

    const clipped = text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
    parts.push({ kind: 'text', value: clipped });
  }

  return parts;
}

export function varsFromEvent(
  type: OverlayEventType,
  nickname: string,
  comment: string,
  giftName: string,
  giftCount: number,
): TemplateVars {
  return {
    user: nickname,
    comment: type === 'comment' ? comment : '',
    gift: giftName,
    count: giftCount,
    likes: String(Math.max(0, giftCount)),
    event: templateEventLabel({ type, giftName }),
  };
}
