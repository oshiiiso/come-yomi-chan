/** 表示・読み上げテンプレで置換されるプレースホルダ。 */
export const TEMPLATE_PLACEHOLDER_IDS = [
  'user',
  'comment',
  'gift',
  'count',
  'likes',
  'event',
] as const;

export type TemplatePlaceholderId = (typeof TEMPLATE_PLACEHOLDER_IDS)[number];

/** 設定画面のテンプレ欄 ID → 差し込めるプレースホルダ。 */
export const TEMPLATE_EDITOR_TOKENS_BY_FIELD: Record<string, readonly TemplatePlaceholderId[]> = {
  'comment-display': ['user', 'comment'],
  'comment-speech': ['user', 'comment'],
  'gift-display': ['user', 'gift', 'count'],
  'gift-speech': ['user', 'gift', 'count'],
  'follow-display': ['user', 'event'],
  'follow-speech': ['user', 'event'],
  'share-display': ['user', 'event'],
  'share-speech': ['user', 'event'],
  'superfan-display': ['user', 'event'],
  'superfan-speech': ['user', 'event'],
  'superfan-box-display': ['user', 'gift', 'event'],
  'superfan-box-speech': ['user', 'gift', 'event'],
  'envelope-display': ['user', 'event'],
  'envelope-speech': ['user', 'event'],
  'portal-display': ['user', 'event'],
  'portal-speech': ['user', 'event'],
  'like-display': ['user', 'likes', 'event'],
  'like-speech': ['user', 'likes', 'event'],
  'member-display': ['user', 'event'],
  'member-speech': ['user', 'event'],
  'portal-join-display': ['user', 'event'],
  'portal-join-speech': ['user', 'event'],
};

export function isKnownTemplatePlaceholder(name: string): name is TemplatePlaceholderId {
  return (TEMPLATE_PLACEHOLDER_IDS as readonly string[]).includes(name);
}

export function templateEditorTokensForField(
  fieldId: string,
): readonly TemplatePlaceholderId[] {
  return TEMPLATE_EDITOR_TOKENS_BY_FIELD[fieldId] ?? [];
}

export function escapeHtmlForTemplateHighlight(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type HighlightSegment =
  | { type: 'text'; value: string }
  | { type: 'token'; name: string; raw: string }
  | { type: 'emphasis'; inner: string; raw: string };

function splitTemplateForHighlight(text: string): HighlightSegment[] {
  const result: HighlightSegment[] = [];
  let buffer = '';
  let index = 0;

  const flush = (): void => {
    if (buffer) {
      result.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (index < text.length) {
    if (text.startsWith('**', index)) {
      const close = text.indexOf('**', index + 2);
      if (close === -1) {
        buffer += '**';
        index += 2;
        continue;
      }
      flush();
      const inner = text.slice(index + 2, close);
      result.push({ type: 'emphasis', inner, raw: text.slice(index, close + 2) });
      index = close + 2;
      continue;
    }

    if (text[index] === '{') {
      const close = text.indexOf('}', index + 1);
      if (close !== -1) {
        const name = text.slice(index + 1, close);
        if (/^[a-zA-Z]+$/.test(name)) {
          flush();
          result.push({ type: 'token', name, raw: text.slice(index, close + 1) });
          index = close + 1;
          continue;
        }
      }
    }

    buffer += text[index];
    index += 1;
  }

  flush();
  return result;
}

function highlightInnerPlaceholders(inner: string): string {
  const escaped = escapeHtmlForTemplateHighlight(inner);
  return escaped.replace(/\{([a-zA-Z]+)\}/g, (full, name: string) => {
    const cls = isKnownTemplatePlaceholder(name)
      ? `tpl-token tpl-token--${name}`
      : 'tpl-token tpl-token--unknown';
    return `<span class="${cls}">${full}</span>`;
  });
}

/** テンプレ文字列をハイライト用 HTML にする（backdrop 向け）。 */
export function highlightTemplatePlaceholdersHtml(text: string): string {
  const source = typeof text === 'string' ? text : '';
  return splitTemplateForHighlight(source)
    .map((segment) => {
      if (segment.type === 'text') {
        return escapeHtmlForTemplateHighlight(segment.value);
      }
      if (segment.type === 'token') {
        const cls = isKnownTemplatePlaceholder(segment.name)
          ? `tpl-token tpl-token--${segment.name}`
          : 'tpl-token tpl-token--unknown';
        return `<span class="${cls}">${escapeHtmlForTemplateHighlight(segment.raw)}</span>`;
      }
      return `<span class="tpl-token tpl-token--emphasis">${escapeHtmlForTemplateHighlight('**')}${highlightInnerPlaceholders(segment.inner)}${escapeHtmlForTemplateHighlight('**')}</span>`;
    })
    .join('');
}

/** 読み上げ用に `**強調**` の記号だけ外す。 */
export function stripTemplateEmphasisMarkers(text: string): string {
  return String(text ?? '').replace(/\*\*([\s\S]*?)\*\*/g, '$1');
}
