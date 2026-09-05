import { OverlayEventType } from '../shared/types';

export interface TemplateVars {
  user: string;
  comment: string;
  gift: string;
  count: number;
  likes: string;
}

export type SpeechPart =
  | { kind: 'text'; value: string }
  | { kind: 'beat'; count: number };

type Segment =
  | { type: 'text'; value: string }
  | { type: 'beats'; count: number };

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

export function applyTemplateVars(
  template: string,
  vars: TemplateVars,
  mode: 'display' | 'speech',
): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (matched, name: string) => {
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
      default:
        return matched;
    }
  });
}

const USER_HIDE_MARK = '\u0001';

export interface DisplayRenderOptions {
  hideUserName?: boolean;
  maxChars?: number;
}

export function clipText(text: string, maxChars: number): string {
  const limit = Math.min(400, Math.max(1, Math.trunc(maxChars)));
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}…`;
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

export function renderDisplayTemplate(
  template: string,
  vars: TemplateVars,
  options: DisplayRenderOptions = {},
): string {
  const resolved = options.hideUserName ? { ...vars, user: USER_HIDE_MARK } : vars;
  let text = applyTemplateVars(template, resolved, 'display');
  if (options.hideUserName) {
    text = stripHiddenUser(text);
  }
  if (typeof options.maxChars === 'number') {
    text = clipText(text, options.maxChars);
  }
  return text;
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

    const text = applyTemplateVars(segment.value, vars, 'speech').trim();
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
  };
}
