// NG／ブロック／ミュート／呼び方／ギフト種別の行リスト。hidden textarea や設定配列と同期する。

let nicknameMapEntries = [];
let speechReplaceEntries = [];
let giftSpeakByGiftId = {};
let giftChimeByGiftId = {};
let giftChimeVolumeByGiftId = {};
let cachedGiftCatalog = [];
let giftSpeakSearchQuery = '';

function normalizeNicknameKeyUi(uniqueId) {
  return String(uniqueId || '')
    .replace(/^@/, '')
    .trim();
}

function normalizeNicknameMapUi(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const uniqueId = normalizeNicknameKeyUi(item?.uniqueId ?? item?.id);
    const displayName = String(item?.displayName ?? item?.name ?? '')
      .trim()
      .slice(0, 80);
    if (!uniqueId || !displayName) {
      continue;
    }
    const key = uniqueId.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({ uniqueId, displayName });
    if (out.length >= 500) {
      break;
    }
  }
  return out;
}

function upsertNicknameMapUi(map, uniqueId, displayName) {
  const id = normalizeNicknameKeyUi(uniqueId);
  const name = String(displayName || '')
    .trim()
    .slice(0, 80);
  if (!id || !name) {
    return map;
  }
  const key = id.toLowerCase();
  const next = (map || []).filter((entry) => entry.uniqueId.toLowerCase() !== key);
  next.unshift({ uniqueId: id, displayName: name });
  return next.slice(0, 500);
}

function removeNicknameMapUi(map, uniqueId) {
  const key = normalizeNicknameKeyUi(uniqueId).toLowerCase();
  if (!key) {
    return map || [];
  }
  return (map || []).filter((entry) => entry.uniqueId.toLowerCase() !== key);
}

function linesFromTextarea(fieldId) {
  const el = $(fieldId);
  if (!el) {
    return [];
  }
  return String(el.value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderLineList(fieldId) {
  const list = $(`${fieldId}-list`);
  if (!list) {
    return;
  }
  const lines = linesFromTextarea(fieldId);
  list.replaceChildren();
  if (lines.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list-editor__empty';
    empty.textContent = uiCopy.listEmpty || 'まだありません';
    list.append(empty);
    return;
  }
  for (const [index, line] of lines.entries()) {
    const row = document.createElement('li');
    row.className = 'list-editor__row';
    const text = document.createElement('span');
    text.className = 'list-editor__text';
    text.textContent = line;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn--ghost list-editor__remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `${line} を削除`);
    remove.title = uiCopy.listRemoveLabel || '削除';
    remove.dataset.listRemove = fieldId;
    remove.dataset.index = String(index);
    row.append(text, remove);
    list.append(row);
  }
}

function addLineToField(fieldId, value) {
  const key = String(value || '')
    .replace(/^@/, '')
    .trim();
  if (!key) {
    return false;
  }
  const lines = linesFromTextarea(fieldId);
  const lower = key.toLowerCase();
  if (lines.some((line) => line.replace(/^@/, '').trim().toLowerCase() === lower)) {
    setToast(uiCopy.listAlreadyExists || 'すでにあります', true);
    return false;
  }
  lines.push(key);
  const el = $(fieldId);
  if (el) {
    el.value = lines.join('\n');
  }
  renderLineList(fieldId);
  noteFormChanged();
  return true;
}

function removeLineFromField(fieldId, index) {
  const lines = linesFromTextarea(fieldId);
  if (index < 0 || index >= lines.length) {
    return;
  }
  lines.splice(index, 1);
  const el = $(fieldId);
  if (el) {
    el.value = lines.join('\n');
  }
  renderLineList(fieldId);
  noteFormChanged();
}

function renderNicknameMapList() {
  const list = $('nickname-map-list');
  if (!list) {
    return;
  }
  list.replaceChildren();
  if (nicknameMapEntries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list-editor__empty';
    empty.textContent = uiCopy.listEmpty || 'まだありません';
    list.append(empty);
    return;
  }
  for (const entry of nicknameMapEntries) {
    const row = document.createElement('li');
    row.className = 'list-editor__row';
    const text = document.createElement('span');
    text.className = 'list-editor__text';
    text.textContent = `@${entry.uniqueId} → ${entry.displayName}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn--ghost list-editor__remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `@${entry.uniqueId} の呼び方を削除`);
    remove.title = uiCopy.listRemoveLabel || '削除';
    remove.dataset.nicknameRemove = entry.uniqueId;
    row.append(text, remove);
    list.append(row);
  }
}

function fillNicknameMap(config) {
  nicknameMapEntries = normalizeNicknameMapUi(config?.nicknameMap);
  renderNicknameMapList();
}

function collectNicknameMap() {
  return nicknameMapEntries.map((entry) => ({ ...entry }));
}

function setNicknameMapEntries(entries) {
  nicknameMapEntries = normalizeNicknameMapUi(entries);
  renderNicknameMapList();
}

const SPEECH_REPLACE_MAX = 2000;

function renderSpeechReplaceList() {
  const list = $('speech-replace-list');
  if (!list) {
    return;
  }
  list.replaceChildren();
  if (speechReplaceEntries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list-editor__empty';
    empty.textContent = uiCopy.listEmpty || 'まだありません';
    list.append(empty);
  } else {
    for (let i = 0; i < speechReplaceEntries.length; i += 1) {
      const entry = speechReplaceEntries[i];
      const row = document.createElement('li');
      row.className = 'list-editor__row';
      const text = document.createElement('span');
      text.className = 'list-editor__text';
      text.textContent = `${entry.from} → ${entry.to}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn--ghost list-editor__remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `「${entry.from}」の読み替えを削除`);
      remove.title = uiCopy.listRemoveLabel || '削除';
      remove.dataset.speechReplaceRemove = String(i);
      row.append(text, remove);
      list.append(row);
    }
  }
  syncSpeechReplaceUiState();
}

function syncSpeechReplaceUiState() {
  const count = speechReplaceEntries.length;
  const atLimit = count >= SPEECH_REPLACE_MAX;
  const counter = $('speech-replace-counter');
  if (counter) {
    counter.textContent = uiCopy.speechReplaceCounter
      ? uiCopy.speechReplaceCounter(count, SPEECH_REPLACE_MAX)
      : `${count}/${SPEECH_REPLACE_MAX}件`;
    counter.classList.toggle('is-error', atLimit);
  }
  const addBtn = $('speech-replace-add');
  const fromInput = $('speech-replace-from');
  const importBtn = $('speech-replace-import');
  if (addBtn) addBtn.disabled = atLimit;
  if (fromInput) fromInput.disabled = atLimit;
  if (importBtn) importBtn.disabled = atLimit;
  const overLimitMsg = $('speech-replace-over-limit');
  if (overLimitMsg) overLimitMsg.hidden = !atLimit;
}

function fillSpeechReplaceMap(raw) {
  const entries = Array.isArray(raw) ? raw : [];
  speechReplaceEntries = entries
    .filter((e) => e && typeof e.from === 'string' && e.from)
    .map((e) => ({ from: e.from, to: typeof e.to === 'string' ? e.to : '' }))
    .slice(0, SPEECH_REPLACE_MAX);
  renderSpeechReplaceList();
}

function collectSpeechReplaceMap() {
  return speechReplaceEntries.map((e) => ({ from: e.from, to: e.to }));
}

function normalizeGiftSpeakMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = String(key || '').trim();
    if (!id || value !== true) {
      continue;
    }
    out[id] = true;
  }
  return out;
}

function normalizeGiftChimeMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = String(key || '').trim();
    if (!id || !value || typeof value !== 'object') {
      continue;
    }
    const ref = normalizeGiftChimeSoundRef(value);
    if (ref) {
      out[id] = ref;
    }
  }
  return out;
}

function normalizeGiftChimeVolumeValue(raw) {
  const parsed = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? '').trim());
  if (!Number.isFinite(parsed)) {
    return 100;
  }
  return Math.max(0, Math.min(500, Math.round(parsed)));
}

function normalizeGiftChimeVolumeMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = String(key || '').trim();
    if (!id) {
      continue;
    }
    out[id] = normalizeGiftChimeVolumeValue(value);
  }
  return out;
}

function giftChimeCommonVolumeValue() {
  if (typeof giftChimeVolume !== 'undefined') {
    return normalizeGiftChimeVolumeValue(giftChimeVolume);
  }
  return 100;
}

function giftHasCustomChimeSound(id) {
  return Boolean(giftChimeByGiftId[id]?.kind === 'file');
}

function giftChimeVolumeValueForId(id) {
  if (giftHasCustomChimeSound(id)) {
    if (Object.prototype.hasOwnProperty.call(giftChimeVolumeByGiftId, id)) {
      return normalizeGiftChimeVolumeValue(giftChimeVolumeByGiftId[id]);
    }
    return giftChimeCommonVolumeValue();
  }
  return giftChimeCommonVolumeValue();
}

function syncGiftChimeVolumeInputs(rangeInput, numberInput) {
  const next = normalizeGiftChimeVolumeValue(rangeInput?.value ?? numberInput?.value);
  if (rangeInput) {
    rangeInput.value = String(next);
  }
  if (numberInput) {
    numberInput.value = String(next);
  }
  return next;
}

function bindGiftChimeVolumeControls(wrap, options = {}) {
  const range = wrap.querySelector('input[type="range"]');
  const number = wrap.querySelector('input[type="number"]');
  if (!(range instanceof HTMLInputElement) || !(number instanceof HTMLInputElement)) {
    return;
  }
  if (options.disabled) {
    return;
  }
  const commit = () => {
    const id = String(options.persistId || range.dataset.giftChimeVolume || '').trim();
    const next = syncGiftChimeVolumeInputs(range, number);
    if (id) {
      giftChimeVolumeByGiftId[id] = next;
    }
    noteFormChanged();
  };
  range.addEventListener('input', commit);
  number.addEventListener('input', () => {
    const raw = number.value.trim();
    if (raw === '' || raw === '-') {
      return;
    }
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      return;
    }
    range.value = String(Math.max(0, Math.min(500, Math.round(parsed))));
  });
  number.addEventListener('change', commit);
}

function createGiftChimeVolumeControls(options) {
  const {
    className = 'gift-chime-row__volume',
    ariaLabel,
    initialValue,
    dataset = {},
    disabled = false,
    disabledTitle = '',
  } = options;
  const wrap = document.createElement('div');
  wrap.className = className;
  if (disabled) {
    wrap.classList.add('is-disabled');
  }
  const number = document.createElement('input');
  number.type = 'number';
  number.min = '0';
  number.max = '500';
  number.step = '1';
  number.value = String(normalizeGiftChimeVolumeValue(initialValue));
  number.setAttribute('aria-label', `${ariaLabel}（数値）`);
  number.inputMode = 'numeric';
  number.disabled = Boolean(disabled);
  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '500';
  range.step = '1';
  range.value = number.value;
  range.setAttribute('aria-label', ariaLabel);
  range.disabled = Boolean(disabled);
  if (disabled && disabledTitle) {
    wrap.title = disabledTitle;
    number.title = disabledTitle;
    range.title = disabledTitle;
  }
  for (const [key, value] of Object.entries(dataset)) {
    range.dataset[key] = value;
    number.dataset[key] = value;
  }
  wrap.append(number, range);
  bindGiftChimeVolumeControls(wrap, {
    persistId: dataset.giftChimeVolume ? String(dataset.giftChimeVolume) : '',
    disabled,
  });
  return wrap;
}

function paintTemplateGiftChimeVolumes() {
  const list = $('gift-speak-list');
  if (!list) {
    return;
  }
  const common = String(giftChimeCommonVolumeValue());
  for (const wrap of list.querySelectorAll('.gift-chime-row__volume.is-disabled')) {
    const range = wrap.querySelector('input[type="range"]');
    const number = wrap.querySelector('input[type="number"]');
    if (range instanceof HTMLInputElement) {
      range.value = common;
    }
    if (number instanceof HTMLInputElement) {
      number.value = common;
    }
  }
}

function clearGiftChimeCustomSound(id) {
  const key = String(id || '').trim();
  if (!key) {
    return false;
  }
  let changed = false;
  if (giftChimeByGiftId[key]) {
    delete giftChimeByGiftId[key];
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(giftChimeVolumeByGiftId, key)) {
    delete giftChimeVolumeByGiftId[key];
    changed = true;
  }
  return changed;
}

function resolveGiftChimeSoundForId(id) {
  if (giftChimeByGiftId[id]) {
    return giftChimeByGiftId[id];
  }
  if (typeof giftChimeSoundRef !== 'undefined' && giftChimeSoundRef) {
    return giftChimeSoundRef;
  }
  return { kind: 'template', id: 'gift' };
}

function normalizeGiftChimeSoundRef(raw) {
  if (raw && raw.kind === 'file' && typeof raw.fileName === 'string') {
    const fileName = raw.fileName.trim();
    const lower = fileName.toLowerCase();
    const okExt =
      lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.ogg');
    if (
      fileName &&
      okExt &&
      !fileName.includes('..') &&
      !fileName.includes('/') &&
      !fileName.includes('\\')
    ) {
      return { kind: 'file', fileName };
    }
  }
  if (raw && (raw.kind === 'template' || raw.id === 'gift' || raw.id === 'default')) {
    return { kind: 'template', id: 'gift' };
  }
  return null;
}

function soundRefLabel(ref) {
  if (ref?.kind === 'file' && ref.fileName) {
    return ref.fileName;
  }
  return 'テンプレ音';
}

function giftSpeakSearchHaystack(gift) {
  const name = String(gift?.name || gift?.id || '');
  const diamonds = String(gift?.diamondCount ?? 0);
  return `${name} ${diamonds}`.toLowerCase();
}

function giftMatchesSpeakSearch(gift, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    return true;
  }
  return giftSpeakSearchHaystack(gift).includes(q);
}

function giftSpeakListEntryEligible(gift) {
  const id = String(gift?.id || '').trim();
  if (!id) {
    return false;
  }
  if (typeof catalogGiftHasIcon === 'function') {
    return catalogGiftHasIcon(gift);
  }
  return Boolean(gift?.imageUrl);
}

/** 今の検索結果で、有効チェックの対象になるギフトだけ。 */
function matchedGiftSpeakEntries() {
  const gifts = Array.isArray(cachedGiftCatalog) ? cachedGiftCatalog : [];
  return gifts.filter(
    (gift) => giftMatchesSpeakSearch(gift, giftSpeakSearchQuery) && giftSpeakListEntryEligible(gift),
  );
}

function setGiftSpeakEnabledForMatched(enabled) {
  const matched = matchedGiftSpeakEntries();
  if (matched.length === 0) {
    return;
  }
  for (const gift of matched) {
    const id = String(gift.id || '').trim();
    if (!id) {
      continue;
    }
    if (enabled) {
      giftSpeakByGiftId[id] = true;
    } else {
      delete giftSpeakByGiftId[id];
    }
  }
  noteFormChanged();
  renderGiftSpeakList();
}

function syncGiftSpeakBulkButtons() {
  const hasMatched = matchedGiftSpeakEntries().length > 0;
  const enableAll = $('gift-speak-enable-all');
  const enableNone = $('gift-speak-enable-none');
  if (enableAll) {
    enableAll.disabled = !hasMatched;
  }
  if (enableNone) {
    enableNone.disabled = !hasMatched;
  }
}

function syncGiftSpeakSearchCopy() {
  const input = $('gift-speak-search');
  if (input && uiCopy?.giftSpeakSearchPlaceholder) {
    input.placeholder = uiCopy.giftSpeakSearchPlaceholder;
  }
  const label = $('gift-speak-search-label');
  if (label && uiCopy?.giftSpeakSearchLabel) {
    label.textContent = uiCopy.giftSpeakSearchLabel;
  }
  const empty = $('gift-speak-search-empty');
  if (empty && uiCopy?.giftSpeakSearchEmpty) {
    empty.textContent = uiCopy.giftSpeakSearchEmpty;
  }
  const enableAll = $('gift-speak-enable-all');
  if (enableAll && uiCopy?.giftSpeakEnableAll) {
    enableAll.textContent = uiCopy.giftSpeakEnableAll;
  }
  const enableNone = $('gift-speak-enable-none');
  if (enableNone && uiCopy?.giftSpeakEnableNone) {
    enableNone.textContent = uiCopy.giftSpeakEnableNone;
  }
  const bulk = document.querySelector('.gift-speak-bulk');
  if (bulk && uiCopy?.giftSpeakBulkGroupLabel) {
    bulk.setAttribute('aria-label', uiCopy.giftSpeakBulkGroupLabel);
  }
  const colEnable = $('gift-chime-col-enable');
  if (colEnable && uiCopy?.giftChimeColEnable) {
    colEnable.textContent = uiCopy.giftChimeColEnable;
  }
  const colGift = $('gift-chime-col-gift');
  if (colGift && uiCopy?.giftChimeColGift) {
    colGift.textContent = uiCopy.giftChimeColGift;
  }
  const colSound = $('gift-chime-col-sound');
  if (colSound && uiCopy?.giftChimeColSound) {
    colSound.textContent = uiCopy.giftChimeColSound;
  }
  const colVolume = $('gift-chime-col-volume');
  if (colVolume && uiCopy?.giftChimeColVolume) {
    colVolume.textContent = uiCopy.giftChimeColVolume;
  }
}

function giftSpeakIconSrc(imageUrl) {
  if (typeof giftIconSrc === 'function') {
    return giftIconSrc(imageUrl || '');
  }
  return '';
}

function giftSpeakNameLooksJapanese(name) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(name || ''));
}

/** 有効 → カスタム音 → 安いダイヤ → 日本語50音 → 英語。 */
function compareGiftSpeakListOrder(left, right) {
  const leftId = String(left?.id || '').trim();
  const rightId = String(right?.id || '').trim();
  const leftOn = giftSpeakByGiftId[leftId] === true ? 0 : 1;
  const rightOn = giftSpeakByGiftId[rightId] === true ? 0 : 1;
  if (leftOn !== rightOn) {
    return leftOn - rightOn;
  }
  const leftCustom = giftChimeByGiftId[leftId]?.kind === 'file' ? 0 : 1;
  const rightCustom = giftChimeByGiftId[rightId]?.kind === 'file' ? 0 : 1;
  if (leftCustom !== rightCustom) {
    return leftCustom - rightCustom;
  }
  const leftDiamonds = Math.max(0, Number(left?.diamondCount) || 0);
  const rightDiamonds = Math.max(0, Number(right?.diamondCount) || 0);
  if (leftDiamonds !== rightDiamonds) {
    return leftDiamonds - rightDiamonds;
  }
  const leftName = String(left?.name || leftId);
  const rightName = String(right?.name || rightId);
  const leftJa = giftSpeakNameLooksJapanese(leftName) ? 0 : 1;
  const rightJa = giftSpeakNameLooksJapanese(rightName) ? 0 : 1;
  if (leftJa !== rightJa) {
    return leftJa - rightJa;
  }
  return leftName.localeCompare(rightName, 'ja');
}

function renderGiftSpeakList() {
  const list = $('gift-speak-list');
  const table = $('gift-speak-table');
  if (!list) {
    return;
  }
  syncGiftSpeakSearchCopy();
  list.replaceChildren();
  const gifts = Array.isArray(cachedGiftCatalog) ? cachedGiftCatalog : [];
  const emptyHint = $('gift-speak-search-empty');
  if (table) {
    table.hidden = gifts.length === 0;
  }
  if (gifts.length === 0) {
    if (emptyHint) {
      emptyHint.hidden = true;
    }
    const empty = document.createElement('li');
    empty.className = 'gift-chime-table__empty';
    empty.textContent =
      'よくあるギフトは最初から入っています。配信中に届いた分も自動で足されます。';
    list.append(empty);
    if (table) {
      table.hidden = false;
    }
    syncGiftSpeakBulkButtons();
    return;
  }
  const matched = matchedGiftSpeakEntries().slice().sort(compareGiftSpeakListOrder);
  if (emptyHint) {
    emptyHint.hidden = matched.length > 0;
  }
  if (matched.length === 0) {
    if (table) {
      table.hidden = true;
    }
    syncGiftSpeakBulkButtons();
    return;
  }
  if (table) {
    table.hidden = false;
  }
  for (const gift of matched) {
    const id = String(gift.id || '').trim();
    if (!id) {
      continue;
    }
    const giftName = gift.name || id;
    const hasCustomSound = Boolean(giftChimeByGiftId[id]?.kind === 'file');
    const row = document.createElement('li');
    row.className = 'gift-chime-row';

    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'gift-chime-row__play';
    testBtn.dataset.giftChimeTest = id;
    testBtn.dataset.giftChimeName = giftName;
    const playing =
      typeof isGiftChimePreviewPlaying === 'function' && isGiftChimePreviewPlaying(id);
    if (typeof paintGiftChimePlayButton === 'function') {
      paintGiftChimePlayButton(testBtn, giftName, playing);
    } else {
      testBtn.textContent = '';
      testBtn.setAttribute(
        'aria-label',
        `${giftName} の${uiCopy.giftChimeTestButton || '再生'}`,
      );
      testBtn.title = uiCopy.giftChimeTestButton || '再生';
    }

    const enable = document.createElement('label');
    enable.className = 'gift-chime-row__enable check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = giftSpeakByGiftId[id] === true;
    input.dataset.giftSpeakId = id;
    input.setAttribute('aria-label', `${giftName} を有効`);
    enable.append(input);

    const giftCell = document.createElement('div');
    giftCell.className = 'gift-chime-row__gift';
    const iconSrc = giftSpeakIconSrc(gift.imageUrl || '');
    if (typeof createGiftImage === 'function') {
      const icon = createGiftImage(iconSrc, 'gift-chime-row__icon');
      if (icon instanceof HTMLImageElement) {
        icon.loading = 'lazy';
      }
      giftCell.append(icon);
    } else if (iconSrc) {
      const icon = document.createElement('img');
      icon.className = 'gift-chime-row__icon';
      icon.alt = '';
      icon.src = iconSrc;
      icon.loading = 'lazy';
      icon.decoding = 'async';
      giftCell.append(icon);
    }
    const name = document.createElement('span');
    name.className = 'gift-chime-row__name';
    name.textContent = `${giftName}（${gift.diamondCount ?? 0}）`;
    giftCell.append(name);

    const soundCell = document.createElement('div');
    soundCell.className = 'gift-chime-row__sound';
    const soundBtn = document.createElement('button');
    soundBtn.type = 'button';
    soundBtn.className = 'btn btn--ghost gift-chime-row__sound-pick';
    soundBtn.dataset.giftChimePick = id;
    soundBtn.textContent = uiCopy.giftChimeSelectSound || '選択';
    soundBtn.setAttribute('aria-label', `${giftName} のサウンドを選択`);
    soundBtn.title = uiCopy.giftChimeSoundResetHint || '× でテンプレに戻す';
    const soundName = document.createElement('span');
    soundName.className = 'gift-chime-row__sound-name';
    soundName.textContent = soundRefLabel(giftChimeByGiftId[id]);
    soundName.title = soundName.textContent;
    soundCell.append(soundBtn, soundName);
    if (hasCustomSound) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn--ghost gift-chime-row__sound-reset';
      resetBtn.dataset.giftChimeReset = id;
      resetBtn.textContent = '×';
      resetBtn.setAttribute(
        'aria-label',
        uiCopy.soundResetTemplate || 'テンプレに戻す',
      );
      resetBtn.title = uiCopy.soundResetTemplate || 'テンプレに戻す';
      soundCell.append(resetBtn);
    }

    const volumeLocked = !hasCustomSound;
    const volumeWrap = createGiftChimeVolumeControls({
      ariaLabel: `${giftName} の音量`,
      initialValue: giftChimeVolumeValueForId(id),
      dataset: volumeLocked ? {} : { giftChimeVolume: id },
      disabled: volumeLocked,
      disabledTitle:
        uiCopy.giftChimeCommonVolumeHint ||
        'テンプレ音の音量は共通の音でまとめて設定します',
    });

    row.append(testBtn, enable, giftCell, soundCell, volumeWrap);
    list.append(row);
  }
  syncGiftSpeakBulkButtons();
}

function pruneGiftChimeVolumeMapToCustomSounds(map) {
  const out = {};
  for (const [id, volume] of Object.entries(map || {})) {
    if (giftChimeByGiftId[id]?.kind === 'file') {
      out[id] = normalizeGiftChimeVolumeValue(volume);
    }
  }
  return out;
}

function fillGiftSpeakMaps(config) {
  giftSpeakByGiftId = normalizeGiftSpeakMap(config?.giftSpeakByGiftId);
  giftChimeByGiftId = normalizeGiftChimeMap(config?.giftChimeByGiftId);
  giftChimeVolumeByGiftId = pruneGiftChimeVolumeMapToCustomSounds(
    normalizeGiftChimeVolumeMap(config?.giftChimeVolumeByGiftId),
  );
  renderGiftSpeakList();
}

function collectGiftSpeakByGiftId() {
  return { ...giftSpeakByGiftId };
}

function collectGiftChimeByGiftId() {
  return { ...giftChimeByGiftId };
}

function collectGiftChimeVolumeByGiftId() {
  return pruneGiftChimeVolumeMapToCustomSounds(giftChimeVolumeByGiftId);
}

async function previewGiftChimeForId(giftId) {
  const id = String(giftId || '').trim();
  if (!id) {
    return;
  }
  if (typeof toggleGiftChimePreview === 'function') {
    await toggleGiftChimePreview(
      id,
      resolveGiftChimeSoundForId(id),
      giftChimeVolumeValueForId(id),
    );
    return;
  }
  if (!window.liveTts?.previewSound) {
    return;
  }
  const result = await window.liveTts.previewSound(
    resolveGiftChimeSoundForId(id),
    giftChimeVolumeValueForId(id),
  );
  if (result && result.ok === false) {
    setToast(result.message || uiCopy.giftChimeTestFailed || '効果音のテストに失敗しました', true);
  }
}

function setGiftCatalogForSpeakList(gifts) {
  cachedGiftCatalog = Array.isArray(gifts) ? gifts : [];
  renderGiftSpeakList();
}

function addNicknameMapFromInputs() {
  const id = $('nickname-map-id')?.value;
  const name = $('nickname-map-name')?.value;
  const next = upsertNicknameMapUi(nicknameMapEntries, id, name);
  if (next === nicknameMapEntries) {
    setToast(uiCopy.nicknameAddNeedBoth || 'TikTok ID と呼び方の両方を入れてください', true);
    return;
  }
  nicknameMapEntries = next;
  renderNicknameMapList();
  if ($('nickname-map-id')) {
    $('nickname-map-id').value = '';
  }
  if ($('nickname-map-name')) {
    $('nickname-map-name').value = '';
  }
  noteFormChanged();
}

function refreshAllLineLists() {
  renderLineList('ng-words');
  renderLineList('blocked-users');
  renderLineList('muted-users');
}

const GIFT_CHIME_COL_STORAGE_KEY = 'come-yomi-chan.gift-chime-col-widths';
const GIFT_CHIME_COL_DEFAULTS = {
  gift: 14,
  sound: 16,
  volume: 16,
};
const GIFT_CHIME_COL_MIN = {
  gift: 7,
  sound: 10,
  volume: 12,
};
const GIFT_CHIME_COL_MAX = {
  gift: 36,
  sound: 40,
  volume: 32,
};

function readGiftChimeColWidths() {
  try {
    const raw = localStorage.getItem(GIFT_CHIME_COL_STORAGE_KEY);
    if (!raw) {
      return { ...GIFT_CHIME_COL_DEFAULTS };
    }
    const parsed = JSON.parse(raw);
    const out = { ...GIFT_CHIME_COL_DEFAULTS };
    for (const key of Object.keys(GIFT_CHIME_COL_DEFAULTS)) {
      const value = Number(parsed?.[key]);
      if (Number.isFinite(value)) {
        out[key] = Math.max(GIFT_CHIME_COL_MIN[key], Math.min(GIFT_CHIME_COL_MAX[key], value));
      }
    }
    return out;
  } catch {
    return { ...GIFT_CHIME_COL_DEFAULTS };
  }
}

function writeGiftChimeColWidths(widths) {
  try {
    localStorage.setItem(GIFT_CHIME_COL_STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // 保存できなくても操作は続ける
  }
}

function applyGiftChimeColWidths(table, widths) {
  if (!table) {
    return;
  }
  table.style.setProperty('--gift-chime-col-gift', `${widths.gift}rem`);
  table.style.setProperty('--gift-chime-col-sound', `${widths.sound}rem`);
  table.style.setProperty('--gift-chime-col-volume', `${widths.volume}rem`);
}

function bindGiftChimeColumnResize() {
  const table = $('gift-speak-table');
  if (!table || table.dataset.colResizeBound === '1') {
    return;
  }
  table.dataset.colResizeBound = '1';
  let widths = readGiftChimeColWidths();
  applyGiftChimeColWidths(table, widths);

  let drag = null;

  const onMove = (event) => {
    if (!drag) {
      return;
    }
    const deltaRem = (event.clientX - drag.startX) / drag.rootFontPx;
    const next = Math.max(
      GIFT_CHIME_COL_MIN[drag.key],
      Math.min(GIFT_CHIME_COL_MAX[drag.key], drag.startWidth + deltaRem),
    );
    widths = { ...widths, [drag.key]: Math.round(next * 10) / 10 };
    applyGiftChimeColWidths(table, widths);
  };

  const onUp = () => {
    if (!drag) {
      return;
    }
    drag.handle.classList.remove('is-active');
    table.classList.remove('is-resizing');
    writeGiftChimeColWidths(widths);
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };

  table.addEventListener('pointerdown', (event) => {
    const handle = event.target?.closest?.('[data-gift-chime-resize]');
    if (!handle || !(handle instanceof HTMLElement)) {
      return;
    }
    const key = String(handle.dataset.giftChimeResize || '');
    if (!Object.prototype.hasOwnProperty.call(GIFT_CHIME_COL_DEFAULTS, key)) {
      return;
    }
    event.preventDefault();
    const rootFontPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    drag = {
      key,
      handle,
      startX: event.clientX,
      startWidth: widths[key],
      rootFontPx,
    };
    handle.classList.add('is-active');
    table.classList.add('is-resizing');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });

  table.addEventListener('keydown', (event) => {
    const handle = event.target?.closest?.('[data-gift-chime-resize]');
    if (!handle || !(handle instanceof HTMLElement)) {
      return;
    }
    const key = String(handle.dataset.giftChimeResize || '');
    if (!Object.prototype.hasOwnProperty.call(GIFT_CHIME_COL_DEFAULTS, key)) {
      return;
    }
    let step = 0;
    if (event.key === 'ArrowLeft') {
      step = -0.5;
    } else if (event.key === 'ArrowRight') {
      step = 0.5;
    } else {
      return;
    }
    event.preventDefault();
    const next = Math.max(
      GIFT_CHIME_COL_MIN[key],
      Math.min(GIFT_CHIME_COL_MAX[key], widths[key] + step),
    );
    widths = { ...widths, [key]: Math.round(next * 10) / 10 };
    applyGiftChimeColWidths(table, widths);
    writeGiftChimeColWidths(widths);
  });
}

function bindListEditors() {
  bindGiftChimeColumnResize();
  for (const fieldId of ['ng-words', 'blocked-users', 'muted-users']) {
    $(`${fieldId}-add`)?.addEventListener('click', () => {
      const input = $(`${fieldId}-input`);
      if (addLineToField(fieldId, input?.value)) {
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    });
    $(`${fieldId}-input`)?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      const input = $(`${fieldId}-input`);
      if (addLineToField(fieldId, input?.value)) {
        if (input) {
          input.value = '';
        }
      }
    });
  }

  $('nickname-map-add')?.addEventListener('click', () => {
    addNicknameMapFromInputs();
  });
  $('gift-speak-search')?.addEventListener('input', () => {
    giftSpeakSearchQuery = $('gift-speak-search')?.value || '';
    renderGiftSpeakList();
  });
  $('gift-speak-enable-all')?.addEventListener('click', () => {
    setGiftSpeakEnabledForMatched(true);
  });
  $('gift-speak-enable-none')?.addEventListener('click', () => {
    setGiftSpeakEnabledForMatched(false);
  });
  for (const fieldId of ['nickname-map-id', 'nickname-map-name']) {
    $(fieldId)?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      addNicknameMapFromInputs();
    });
  }

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (target.dataset.giftSpeakId) {
      const id = target.dataset.giftSpeakId;
      if (target.checked) {
        giftSpeakByGiftId[id] = true;
      } else {
        delete giftSpeakByGiftId[id];
      }
      noteFormChanged();
      renderGiftSpeakList();
      const next = $('gift-speak-list')?.querySelector(
        `input[data-gift-speak-id="${CSS.escape(id)}"]`,
      );
      next?.focus();
      return;
    }
    if (target.dataset.giftChimeVolume && target.type === 'number') {
      const wrap = target.closest('.gift-chime-row__volume');
      const range = wrap?.querySelector('input[type="range"]');
      const number = wrap?.querySelector('input[type="number"]');
      const id = String(target.dataset.giftChimeVolume || '').trim();
      if (id && range instanceof HTMLInputElement && number instanceof HTMLInputElement) {
        giftChimeVolumeByGiftId[id] = syncGiftChimeVolumeInputs(range, number);
        noteFormChanged();
      }
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const removeLine = target.closest('[data-list-remove]');
    if (removeLine) {
      removeLineFromField(removeLine.dataset.listRemove, Number(removeLine.dataset.index));
      return;
    }
    const removeNick = target.closest('[data-nickname-remove]');
    if (removeNick) {
      nicknameMapEntries = removeNicknameMapUi(nicknameMapEntries, removeNick.dataset.nicknameRemove);
      renderNicknameMapList();
      noteFormChanged();
      return;
    }
    const removeSpeechReplace = target.closest('[data-speech-replace-remove]');
    if (removeSpeechReplace) {
      const idx = Number(removeSpeechReplace.dataset.speechReplaceRemove);
      if (!Number.isNaN(idx) && idx >= 0 && idx < speechReplaceEntries.length) {
        speechReplaceEntries.splice(idx, 1);
        renderSpeechReplaceList();
        noteFormChanged();
      }
      return;
    }
    const chimeTest = target.closest('[data-gift-chime-test]');
    if (chimeTest) {
      void previewGiftChimeForId(chimeTest.dataset.giftChimeTest);
      return;
    }
    const chimeReset = target.closest('[data-gift-chime-reset]');
    if (chimeReset) {
      const id = String(chimeReset.dataset.giftChimeReset || '').trim();
      if (id && clearGiftChimeCustomSound(id)) {
        renderGiftSpeakList();
        noteFormChanged();
      }
      return;
    }
    const chimePick = target.closest('[data-gift-chime-pick]');
    if (chimePick && typeof pickGiftChimeForId === 'function') {
      void pickGiftChimeForId(chimePick.dataset.giftChimePick);
    }
  });

  document.addEventListener('contextmenu', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const chimePick = target.closest('[data-gift-chime-pick]');
    if (!chimePick) {
      return;
    }
    const id = String(chimePick.dataset.giftChimePick || '').trim();
    if (!id || !giftChimeByGiftId[id]) {
      return;
    }
    event.preventDefault();
    if (clearGiftChimeCustomSound(id)) {
      renderGiftSpeakList();
      noteFormChanged();
    }
  });
}
