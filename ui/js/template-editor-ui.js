/** 表示・読み上げテンプレの差し込み・色分け・色ピッカー */

function paintTemplateEditorBackdrop(textarea) {
  const frame = textarea.closest('.template-editor__frame');
  const backdrop = frame?.querySelector('.template-editor__backdrop');
  if (!(backdrop instanceof HTMLElement)) {
    return;
  }
  const raw = textarea.value;
  const html = highlightTemplatePlaceholdersHtml(raw.endsWith('\n') ? `${raw}\n` : raw);
  backdrop.textContent = '';
  backdrop.innerHTML = html || ' ';
  // 文字幅を textarea と一致させる
  const cs = window.getComputedStyle(textarea);
  backdrop.style.font = cs.font;
  backdrop.style.fontFamily = cs.fontFamily;
  backdrop.style.fontSize = cs.fontSize;
  backdrop.style.fontWeight = cs.fontWeight;
  backdrop.style.fontStyle = cs.fontStyle;
  backdrop.style.letterSpacing = cs.letterSpacing;
  backdrop.style.lineHeight = cs.lineHeight;
  backdrop.style.padding = cs.padding;
  backdrop.style.borderWidth = cs.borderWidth;
  backdrop.style.boxSizing = cs.boxSizing;
  backdrop.style.width = `${textarea.offsetWidth}px`;
  backdrop.style.height = `${textarea.offsetHeight}px`;
  backdrop.scrollTop = textarea.scrollTop;
  backdrop.scrollLeft = textarea.scrollLeft;
}

function syncTemplateEditorScroll(textarea) {
  const frame = textarea.closest('.template-editor__frame');
  const backdrop = frame?.querySelector('.template-editor__backdrop');
  if (!(backdrop instanceof HTMLElement)) {
    return;
  }
  backdrop.scrollTop = textarea.scrollTop;
  backdrop.scrollLeft = textarea.scrollLeft;
}

function insertTemplateToken(textarea, token) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const insert = `{${token}}`;
  textarea.value = `${before}${insert}${after}`;
  const caret = start + insert.length;
  textarea.setSelectionRange(caret, caret);
  textarea.focus();
  paintTemplateEditorBackdrop(textarea);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  if (typeof noteFormChanged === 'function') {
    noteFormChanged();
  }
}

function insertTemplateEmphasis(textarea) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const selected = textarea.value.slice(start, end);
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const insert = selected ? `**${selected}**` : '****';
  textarea.value = `${before}${insert}${after}`;
  const caret = selected ? start + insert.length : start + 2;
  textarea.setSelectionRange(caret, caret);
  textarea.focus();
  paintTemplateEditorBackdrop(textarea);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  if (typeof noteFormChanged === 'function') {
    noteFormChanged();
  }
}

function currentTemplateAccentColorsFromDom() {
  const colors = { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
  for (const id of TEMPLATE_ACCENT_TOKEN_IDS) {
    const el = document.querySelector(`[data-template-accent="${id}"]`);
    if (el instanceof HTMLInputElement && /^#[0-9a-fA-F]{6}$/.test(el.value)) {
      colors[id] = el.value.toLowerCase();
    }
  }
  return normalizeTemplateAccentColors(colors);
}

function syncTemplateAccentResetButtons(colors) {
  const normalized = normalizeTemplateAccentColors(colors);
  for (const id of TEMPLATE_ACCENT_TOKEN_IDS) {
    for (const reset of document.querySelectorAll(`[data-template-accent-reset="${id}"]`)) {
      syncColorPickerResetButton(reset, normalized[id], DEFAULT_TEMPLATE_ACCENT_COLORS[id]);
    }
  }
}

function syncTemplateAccentColorInputs(colors) {
  const normalized = applyTemplateAccentCssVars(colors);
  for (const id of TEMPLATE_ACCENT_TOKEN_IDS) {
    for (const el of document.querySelectorAll(`[data-template-accent="${id}"]`)) {
      if (el instanceof HTMLInputElement) {
        el.value = normalized[id];
      }
    }
  }
  syncTemplateAccentResetButtons(normalized);
  return normalized;
}

function onTemplateAccentColorInput(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const id = input.getAttribute('data-template-accent') || '';
  if (!isTemplateAccentTokenId(id)) {
    return;
  }
  const colors = currentTemplateAccentColorsFromDom();
  colors[id] = input.value.toLowerCase();
  syncTemplateAccentColorInputs(colors);
  syncAllTemplateEditors();
  if (typeof noteFormChanged === 'function') {
    noteFormChanged();
  }
}

function onTemplateAccentColorReset(event) {
  const reset = event.currentTarget;
  if (!(reset instanceof HTMLButtonElement)) {
    return;
  }
  const id = reset.getAttribute('data-template-accent-reset') || '';
  if (!isTemplateAccentTokenId(id)) {
    return;
  }
  const colors = currentTemplateAccentColorsFromDom();
  colors[id] = DEFAULT_TEMPLATE_ACCENT_COLORS[id];
  syncTemplateAccentColorInputs(colors);
  syncAllTemplateEditors();
  if (typeof noteFormChanged === 'function') {
    noteFormChanged();
  }
}

function accentColorAriaLabel(token) {
  if (token === 'emphasis') {
    return '強調（**…**）の色';
  }
  return `{${token}} の色`;
}

function createAccentColorInput(token) {
  const wrap = document.createElement('div');
  wrap.className = 'color-picker-wrap';
  const color = document.createElement('input');
  color.type = 'color';
  color.className = 'color-picker template-editor__color';
  color.dataset.templateAccent = token;
  color.value = DEFAULT_TEMPLATE_ACCENT_COLORS[token] || '#ffffff';
  color.title = accentColorAriaLabel(token);
  color.setAttribute('aria-label', accentColorAriaLabel(token));
  color.addEventListener('input', onTemplateAccentColorInput);
  color.addEventListener('change', onTemplateAccentColorInput);
  const reset = createColorPickerResetButton({
    datasetKey: 'templateAccentReset',
    datasetValue: token,
    onClick: onTemplateAccentColorReset,
  });
  wrap.append(color, reset);
  return wrap;
}

function bindChipKeepFocus(chip) {
  // クリックで textarea の選択が消えないようにする
  chip.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
}

function createTokenChipGroup(textarea, token, withColor) {
  const group = document.createElement('div');
  group.className = 'template-editor__chip-group';
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = `template-editor__chip tpl-token tpl-token--${token}`;
  chip.textContent = `{${token}}`;
  chip.setAttribute('aria-label', `{${token}} を挿入`);
  chip.title = `{${token}} を挿入`;
  bindChipKeepFocus(chip);
  chip.addEventListener('click', () => insertTemplateToken(textarea, token));
  group.appendChild(chip);
  if (withColor && isTemplateAccentTokenId(token)) {
    group.appendChild(createAccentColorInput(token));
  }
  return group;
}

function createEmphasisChipGroup(textarea, withColor) {
  const group = document.createElement('div');
  group.className = 'template-editor__chip-group';
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'template-editor__chip tpl-token tpl-token--emphasis';
  chip.textContent = '**強調**';
  const label =
    typeof uiCopy === 'object' && uiCopy?.templateEmphasisInsertLabel
      ? uiCopy.templateEmphasisInsertLabel
      : '**強調** を挿入';
  chip.setAttribute('aria-label', label);
  chip.title = label;
  bindChipKeepFocus(chip);
  chip.addEventListener('click', () => insertTemplateEmphasis(textarea));
  group.appendChild(chip);
  if (withColor) {
    group.appendChild(createAccentColorInput('emphasis'));
  }
  return group;
}

/** label 内のボタンをクリックすると先頭の {user} が押されるのを防ぐ */
function unwrapFieldLabel(textarea) {
  const field = textarea.closest('label.field');
  if (!(field instanceof HTMLLabelElement)) {
    return;
  }
  const div = document.createElement('div');
  div.className = field.className;
  for (const attr of Array.from(field.attributes)) {
    if (attr.name === 'class') {
      continue;
    }
    div.setAttribute(attr.name, attr.value);
  }
  while (field.firstChild) {
    div.appendChild(field.firstChild);
  }
  field.replaceWith(div);
}

function enhanceTemplateEditor(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement) || !textarea.id) {
    return;
  }
  if (textarea.closest('.template-editor')) {
    return;
  }
  const tokens = templateEditorTokensForField(textarea.id);
  if (!tokens.length) {
    return;
  }

  unwrapFieldLabel(textarea);

  const isDisplayField = textarea.id.endsWith('-display');
  const editor = document.createElement('div');
  editor.className = 'template-editor';
  editor.dataset.templateField = textarea.id;

  const chips = document.createElement('div');
  chips.className = 'template-editor__chips';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', '差し込み');
  for (const token of tokens) {
    chips.appendChild(
      createTokenChipGroup(textarea, token, isDisplayField && token !== 'user'),
    );
  }
  chips.appendChild(createEmphasisChipGroup(textarea, isDisplayField));

  const frame = document.createElement('div');
  frame.className = 'template-editor__frame';
  const backdrop = document.createElement('div');
  backdrop.className = 'template-editor__backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const parent = textarea.parentNode;
  if (!parent) {
    return;
  }
  parent.insertBefore(editor, textarea);
  editor.appendChild(chips);
  editor.appendChild(frame);
  frame.appendChild(backdrop);
  frame.appendChild(textarea);
  textarea.classList.add('template-editor__input');
  textarea.setAttribute('spellcheck', 'false');
  textarea.setAttribute('autocomplete', 'off');

  textarea.addEventListener('input', () => paintTemplateEditorBackdrop(textarea));
  textarea.addEventListener('scroll', () => syncTemplateEditorScroll(textarea));
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => paintTemplateEditorBackdrop(textarea));
    ro.observe(textarea);
  }
  paintTemplateEditorBackdrop(textarea);
}

function bindTemplateEditors() {
  for (const fieldId of Object.keys(TEMPLATE_EDITOR_TOKENS_BY_FIELD)) {
    const el = document.getElementById(fieldId);
    if (el instanceof HTMLTextAreaElement) {
      enhanceTemplateEditor(el);
    }
  }
  syncTemplateAccentColorInputs(DEFAULT_TEMPLATE_ACCENT_COLORS);
  syncAllTemplateEditors();
}

function syncAllTemplateEditors() {
  for (const fieldId of Object.keys(TEMPLATE_EDITOR_TOKENS_BY_FIELD)) {
    const el = document.getElementById(fieldId);
    if (el instanceof HTMLTextAreaElement) {
      paintTemplateEditorBackdrop(el);
    }
  }
}

function fillTemplateAccentColors(config) {
  const colors = normalizeTemplateAccentColors(config?.templateAccentColors);
  syncTemplateAccentColorInputs(colors);
  syncAllTemplateEditors();
}

function collectTemplateAccentColors() {
  return currentTemplateAccentColorsFromDom();
}
