// ギフト通知モード・効果音・プロファイル・アプリ内再生。

let giftChimeSoundRef = { kind: 'template', id: 'gift' };
let giftChimeVolume = 100;
let commentSoundRef = { kind: 'template', id: 'default' };
let commentSoundVolume = 100;
const EVENT_SOUND_TYPES = [
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];
const eventSoundRefs = {
  follow: { kind: 'template', id: 'default' },
  share: { kind: 'template', id: 'default' },
  superFan: { kind: 'template', id: 'default' },
  envelope: { kind: 'template', id: 'default' },
  portal: { kind: 'template', id: 'default' },
  like: { kind: 'template', id: 'default' },
  member: { kind: 'template', id: 'default' },
};
/** @type {Record<string, number>} */
const eventSoundVolumes = {
  follow: 100,
  share: 100,
  superFan: 100,
  envelope: 100,
  portal: 100,
  like: 100,
  member: 100,
};
let giftChimeDiamondBandsState = [];
let configProfilesState = [];
let activeConfigProfileIdState = '';
let speechPausedUi = false;
let commentSoundMutedUi = false;
let appChimeContext = null;

const GIFT_CHIME_BAND_MAX = 30;

function normalizeGiftChimeVolumeUi(raw) {
  const parsed = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? '').trim());
  if (!Number.isFinite(parsed)) {
    return 100;
  }
  return Math.max(0, Math.min(500, Math.round(parsed)));
}

function normalizeSoundTemplateIdUi(raw, fallbackId) {
  if (raw === 'gift' || raw === 'default') {
    return raw;
  }
  return fallbackId === 'gift' ? 'gift' : 'default';
}

function normalizeSoundRefUi(raw, fallbackId = 'default') {
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
  const templateFallback = normalizeSoundTemplateIdUi(fallbackId, fallbackId);
  if (raw && (raw.kind === 'template' || raw.id === 'gift' || raw.id === 'default')) {
    // ギフト用途の旧テンプレ default はチャリンへ寄せる
    if (templateFallback === 'gift') {
      return { kind: 'template', id: 'gift' };
    }
    return {
      kind: 'template',
      id: normalizeSoundTemplateIdUi(raw.id, templateFallback),
    };
  }
  return { kind: 'template', id: templateFallback };
}

function paintSoundLabel(id, ref) {
  const el = $(id);
  if (!el) {
    return;
  }
  el.textContent = soundRefLabel(ref);
}

function syncSoundTemplateResetButton(button, ref) {
  if (!(button instanceof HTMLElement)) {
    return;
  }
  const isTemplate = !ref || ref.kind !== 'file';
  button.hidden = isTemplate;
  if ('disabled' in button) {
    button.disabled = isTemplate;
  }
  button.textContent = '×';
  const label = uiCopy.soundResetTemplate || 'テンプレに戻す';
  button.setAttribute('aria-label', label);
  button.title = label;
}

function syncAllSoundTemplateResetButtons() {
  syncSoundTemplateResetButton($('gift-chime-sound-reset'), giftChimeSoundRef);
  syncSoundTemplateResetButton($('comment-sound-reset'), commentSoundRef);
  for (const type of EVENT_SOUND_TYPES) {
    syncSoundTemplateResetButton(
      document.querySelector(`[data-event-sound-reset="${type}"]`),
      eventSoundRefs[type],
    );
  }
}

function giftChimeMatchModeValue() {
  return document.querySelector('input[name="gift-chime-match-mode"]:checked')?.value === 'diamond'
    ? 'diamond'
    : 'gift';
}

function syncCommentNotifyModeUi() {
  const speakOn = Boolean($('speak-comment')?.checked);
  const mode =
    document.querySelector('input[name="comment-notify-mode"]:checked')?.value === 'sound'
      ? 'sound'
      : 'speak';
  const whenSpeak = $('comment-notify-when-speak');
  if (whenSpeak) {
    whenSpeak.hidden = !speakOn;
  }
  const speakSettings = $('comment-speak-settings');
  if (speakSettings) {
    speakSettings.hidden = !speakOn || mode !== 'speak';
  }
  const soundSettings = $('comment-sound-settings');
  if (soundSettings) {
    soundSettings.hidden = !speakOn || mode !== 'sound';
  }
  const conditions = $('comment-speech-conditions');
  if (conditions) {
    conditions.hidden = !speakOn || mode !== 'speak';
  }
}

function eventNotifyModeValue(type) {
  return document.querySelector(`input[name="${type}-notify-mode"]:checked`)?.value === 'sound'
    ? 'sound'
    : 'speak';
}

function eventSoundVolumeInputs(type) {
  return {
    number: document.querySelector(`[data-event-sound-volume-number="${type}"]`),
    range: document.querySelector(`[data-event-sound-volume-range="${type}"]`),
  };
}

function paintEventSoundVolume(type) {
  const { number, range } = eventSoundVolumeInputs(type);
  const value = String(normalizeGiftChimeVolumeUi(eventSoundVolumes[type]));
  if (number instanceof HTMLInputElement) {
    number.value = value;
  }
  if (range instanceof HTMLInputElement) {
    range.value = value;
  }
}

function syncEventNotifyModeUi(type) {
  const speakOn = Boolean($(`speak-${type}`)?.checked);
  const mode = eventNotifyModeValue(type);
  const whenSpeak = $(`${type}-notify-when-speak`);
  if (whenSpeak) {
    whenSpeak.hidden = !speakOn;
  }
  const speakSettings = $(`${type}-speak-settings`);
  if (speakSettings) {
    speakSettings.hidden = !speakOn || mode !== 'speak';
  }
  const soundSettings = $(`${type}-sound-settings`);
  if (soundSettings) {
    soundSettings.hidden = !speakOn || mode !== 'sound';
  }
}

function syncAllEventNotifyModeUi() {
  for (const type of EVENT_SOUND_TYPES) {
    syncEventNotifyModeUi(type);
  }
}

function syncGiftNotifyModeUi() {
  const speakOn = Boolean($('speak-gift')?.checked);
  const mode = document.querySelector('input[name="gift-notify-mode"]:checked')?.value || 'speak';
  const matchMode = giftChimeMatchModeValue();
  const whenSpeak = $('gift-notify-when-speak');
  if (whenSpeak) {
    whenSpeak.hidden = !speakOn;
  }
  const speakSettings = $('gift-speak-settings');
  if (speakSettings) {
    speakSettings.hidden = !speakOn || mode !== 'speak';
  }
  const box = $('gift-chime-settings');
  if (box) {
    box.hidden = !speakOn || mode !== 'chime';
  }
  const commonBlock = $('gift-chime-common-block');
  if (commonBlock) {
    commonBlock.hidden = !speakOn || mode !== 'chime' || matchMode === 'diamond';
  }
  const bandsBox = $('gift-chime-diamond-bands');
  if (bandsBox) {
    bandsBox.hidden = !speakOn || mode !== 'chime' || matchMode !== 'diamond';
  }
  const speakList = $('gift-speak-list');
  const speakCard = $('gift-speak-card');
  if (speakCard) {
    const showSpeak = speakOn && mode === 'chime' && matchMode === 'gift';
    speakCard.hidden = !showSpeak;
    for (const input of speakCard.querySelectorAll('[data-gift-speak-id]')) {
      input.disabled = !showSpeak;
    }
    if (!showSpeak && typeof stopGiftChimePreview === 'function') {
      stopGiftChimePreview();
    }
  }
  if (typeof renderGiftSpeakList === 'function') {
    renderGiftSpeakList();
  }
}

function parseBandField(raw) {
  const text = String(raw ?? '').trim();
  if (!text) {
    return null;
  }
  const value = Number.parseInt(text, 10);
  if (!Number.isInteger(value) || value < 0) {
    return Number.NaN;
  }
  return Math.min(100000, value);
}

function normalizeDiamondBandsFromUi(rows) {
  const out = [];
  for (const row of rows) {
    let min = parseBandField(row.min);
    const max = parseBandField(row.max);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      continue;
    }
    if (min == null && max == null) {
      continue;
    }
    if (min == null) {
      min = 1;
    }
    out.push({
      minDiamonds: min,
      maxDiamonds: max,
      sound: normalizeSoundRefUi(row.sound, 'gift'),
      volume: normalizeGiftChimeVolumeUi(row.volume),
    });
  }
  out.sort((left, right) => {
    if (left.minDiamonds !== right.minDiamonds) {
      return left.minDiamonds - right.minDiamonds;
    }
    const leftMax = left.maxDiamonds == null ? Number.POSITIVE_INFINITY : left.maxDiamonds;
    const rightMax = right.maxDiamonds == null ? Number.POSITIVE_INFINITY : right.maxDiamonds;
    return leftMax - rightMax;
  });
  return out.slice(0, GIFT_CHIME_BAND_MAX);
}

function validateDiamondBandsUi(bands) {
  for (const band of bands) {
    if (band.maxDiamonds != null && band.maxDiamonds < band.minDiamonds) {
      return 'inverted';
    }
  }
  for (let i = 0; i < bands.length; i += 1) {
    for (let j = i + 1; j < bands.length; j += 1) {
      const leftMax =
        bands[i].maxDiamonds == null ? Number.POSITIVE_INFINITY : bands[i].maxDiamonds;
      const rightMax =
        bands[j].maxDiamonds == null ? Number.POSITIVE_INFINITY : bands[j].maxDiamonds;
      if (bands[i].minDiamonds <= rightMax && bands[j].minDiamonds <= leftMax) {
        return 'overlap';
      }
    }
  }
  return '';
}

function readDiamondBandDraftRows() {
  const list = $('gift-chime-band-list');
  if (!list) {
    return [];
  }
  return [...list.querySelectorAll('.gift-chime-band')].map((row) => ({
    min: row.querySelector('[data-band-min]')?.value ?? '',
    max: row.querySelector('[data-band-max]')?.value ?? '',
    volume: row.querySelector('[data-band-volume]')?.value ?? '100',
    sound: normalizeSoundRefUi(
      {
        kind: row.dataset.soundKind || 'template',
        fileName: row.dataset.soundFile || '',
        id: row.dataset.soundTemplate || 'gift',
      },
      'gift',
    ),
  }));
}

function collectGiftChimeDiamondBandsUi() {
  return normalizeDiamondBandsFromUi(readDiamondBandDraftRows());
}

function validateGiftChimeDiamondBandsForm() {
  const speakOn = Boolean($('speak-gift')?.checked);
  const mode = document.querySelector('input[name="gift-notify-mode"]:checked')?.value || 'speak';
  if (!speakOn || mode !== 'chime' || giftChimeMatchModeValue() !== 'diamond') {
    return '';
  }
  const drafts = readDiamondBandDraftRows();
  for (const row of drafts) {
    if (Number.isNaN(parseBandField(row.min)) || Number.isNaN(parseBandField(row.max))) {
      return (
        uiCopy.invalidGiftChimeBandValue || 'ダイヤ数の帯は 0 以上の整数にしてください'
      );
    }
  }
  const bands = normalizeDiamondBandsFromUi(drafts);
  const issue = validateDiamondBandsUi(bands);
  if (issue === 'overlap') {
    return uiCopy.invalidGiftChimeBandOverlap || 'ダイヤ数の帯が重なっています。範囲を直してください';
  }
  if (issue === 'inverted') {
    return uiCopy.invalidGiftChimeBandRange || 'ダイヤ数の帯は下限≦上限にしてください';
  }
  return '';
}

function soundFromBandRow(row) {
  if (!(row instanceof HTMLElement)) {
    return { kind: 'template', id: 'gift' };
  }
  if (row.dataset.soundKind === 'file') {
    const fileName = String(row.dataset.soundFile || '').trim();
    if (fileName) {
      return { kind: 'file', fileName };
    }
  }
  return { kind: 'template', id: row.dataset.soundTemplate || 'gift' };
}

function volumeFromBandRow(row) {
  const range = row?.querySelector?.('input[type="range"][data-band-volume]');
  return normalizeGiftChimeVolumeUi(
    range instanceof HTMLInputElement ? range.value : 100,
  );
}

function renderGiftChimeBandList(bands) {
  const list = $('gift-chime-band-list');
  if (!list) {
    return;
  }
  const rows =
    Array.isArray(bands) && bands.length > 0
      ? bands
      : [{ minDiamonds: '', maxDiamonds: '', volume: 100, sound: { kind: 'template', id: 'gift' } }];
  list.replaceChildren();
  const minPh = uiCopy.giftChimeDiamondMinPlaceholder || '例: 1';
  const maxPh = uiCopy.giftChimeDiamondMaxPlaceholder || '例: 10（空＝上限なし）';
  const volumeLabel = uiCopy.giftChimeVolumeLabel || '音量';
  const removeLabel = uiCopy.giftChimeDiamondBandRemove || '削除';
  for (const [bandIndex, band] of rows.entries()) {
    const li = document.createElement('li');
    li.className = 'gift-chime-band';
    const sound = normalizeSoundRefUi(band.sound, 'gift');
    li.dataset.soundKind = sound.kind;
    li.dataset.soundFile = sound.kind === 'file' ? sound.fileName : '';
    li.dataset.soundTemplate = sound.kind === 'template' ? sound.id : 'gift';

    const range = document.createElement('div');
    range.className = 'gift-chime-band__range';

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.min = '0';
    minInput.dataset.bandMin = '1';
    minInput.setAttribute('aria-label', '下限ダイヤ');
    minInput.placeholder = minPh;
    minInput.value =
      band.minDiamonds === '' || band.minDiamonds == null ? '' : String(band.minDiamonds);

    const sep = document.createElement('span');
    sep.className = 'gift-chime-band__sep';
    sep.textContent = '〜';
    sep.setAttribute('aria-hidden', 'true');

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.min = '0';
    maxInput.dataset.bandMax = '1';
    maxInput.setAttribute('aria-label', '上限ダイヤ');
    maxInput.placeholder = maxPh;
    maxInput.value =
      band.maxDiamonds === '' || band.maxDiamonds == null ? '' : String(band.maxDiamonds);

    range.append(minInput, sep, maxInput);

    const soundCell = document.createElement('div');
    soundCell.className = 'gift-chime-band__sound';
    const hasCustomSound = sound.kind === 'file';
    const soundBtn = document.createElement('button');
    soundBtn.type = 'button';
    soundBtn.className = 'btn btn--ghost gift-chime-band__sound-pick';
    soundBtn.textContent = uiCopy.giftChimeSelectSound || '選択';
    soundBtn.setAttribute('aria-label', 'この帯のサウンドを選択');
    soundBtn.title = uiCopy.giftChimeSoundResetHint || '× でテンプレに戻す';
    const soundName = document.createElement('span');
    soundName.className = 'gift-chime-band__sound-name';
    soundName.textContent = soundRefLabel(sound);
    soundName.title = soundName.textContent;
    soundCell.append(soundBtn, soundName);
    const syncBandSoundReset = () => {
      const existing = soundCell.querySelector('.gift-chime-band__sound-reset');
      const custom = li.dataset.soundKind === 'file';
      if (!custom) {
        existing?.remove();
        return;
      }
      if (existing) {
        return;
      }
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn--ghost gift-chime-band__sound-reset';
      resetBtn.textContent = '×';
      resetBtn.setAttribute('aria-label', uiCopy.soundResetTemplate || 'テンプレに戻す');
      resetBtn.title = uiCopy.soundResetTemplate || 'テンプレに戻す';
      resetBtn.addEventListener('click', () => {
        resetBandSound(li, soundName, syncBandSoundReset);
      });
      soundCell.append(resetBtn);
    };
    if (hasCustomSound) {
      syncBandSoundReset();
    }
    soundBtn.addEventListener('click', () => {
      void pickBandSound(li, soundName, syncBandSoundReset);
    });
    soundBtn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      resetBandSound(li, soundName, syncBandSoundReset);
    });

    const volumeWrap = document.createElement('div');
    volumeWrap.className = 'gift-chime-band__volume';
    const volumeText = document.createElement('span');
    volumeText.className = 'gift-chime-band__volume-label';
    volumeText.textContent = volumeLabel;
    const volumeControls = createGiftChimeVolumeControls({
      className: 'gift-chime-band__volume-controls',
      ariaLabel: 'この帯の音量',
      initialValue: normalizeGiftChimeVolumeUi(band.volume),
      dataset: { bandVolume: '1' },
    });
    volumeWrap.append(volumeText, volumeControls);

    const actions = document.createElement('div');
    actions.className = 'gift-chime-band__actions';

    const previewId = `band:${bandIndex}`;
    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'gift-chime-row__play gift-chime-band__play';
    testBtn.dataset.soundPreview = previewId;
    if (typeof paintGiftChimePlayButton === 'function') {
      paintGiftChimePlayButton(testBtn, '', isGiftChimePreviewPlaying(previewId));
    } else {
      testBtn.setAttribute('aria-label', uiCopy.giftChimeTestButton || '再生');
      testBtn.title = uiCopy.giftChimeTestButton || '再生';
    }
    testBtn.addEventListener('click', () => {
      void toggleGiftChimePreview(previewId, soundFromBandRow(li), volumeFromBandRow(li));
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn--ghost gift-chime-band__remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', removeLabel);
    removeBtn.title = removeLabel;
    removeBtn.addEventListener('click', () => {
      const index = [...list.children].indexOf(li);
      removeGiftChimeBandAt(index);
    });

    actions.append(testBtn, removeBtn);

    minInput.addEventListener('input', () => noteFormChanged());
    maxInput.addEventListener('input', () => noteFormChanged());

    li.append(range, soundCell, volumeWrap, actions);
    list.append(li);
  }
}

function resetBandSound(row, soundName, syncReset) {
  row.dataset.soundKind = 'template';
  row.dataset.soundFile = '';
  row.dataset.soundTemplate = 'gift';
  if (soundName instanceof HTMLElement) {
    const label = soundRefLabel({ kind: 'template', id: 'gift' });
    soundName.textContent = label;
    soundName.title = label;
  }
  if (typeof syncReset === 'function') {
    syncReset();
  }
  noteFormChanged();
}

async function pickBandSound(row, soundName, syncReset) {
  if (!window.liveTts?.pickSoundFile) {
    return;
  }
  const result = await window.liveTts.pickSoundFile();
  if (!result || result.cancelled) {
    return;
  }
  if (!result.ok || !result.fileName) {
    setToast(result.message || uiCopy.pickSoundFailed || '効果音の取り込みに失敗しました', true);
    return;
  }
  row.dataset.soundKind = 'file';
  row.dataset.soundFile = result.fileName;
  if (soundName instanceof HTMLElement) {
    const label = soundRefLabel({ kind: 'file', fileName: result.fileName });
    soundName.textContent = label;
    soundName.title = label;
  }
  if (typeof syncReset === 'function') {
    syncReset();
  }
  noteFormChanged();
}

function addGiftChimeBandRow() {
  const drafts = readDiamondBandDraftRows();
  if (drafts.length >= GIFT_CHIME_BAND_MAX) {
    setToast(
      uiCopy.giftChimeDiamondBandMaxReached ||
        `ダイヤ数の帯は ${GIFT_CHIME_BAND_MAX} 個までです`,
      true,
    );
    return;
  }
  drafts.push({ min: '', max: '', volume: '100', sound: { kind: 'template', id: 'gift' } });
  const list = $('gift-chime-band-list');
  if (!list) {
    return;
  }
  list.replaceChildren();
  renderGiftChimeBandList(
    drafts.map((row) => ({
      minDiamonds: row.min,
      maxDiamonds: row.max,
      volume: row.volume,
      sound: row.sound,
    })),
  );
  noteFormChanged();
}

function removeGiftChimeBandAt(index) {
  const drafts = readDiamondBandDraftRows();
  if (index < 0 || index >= drafts.length) {
    return;
  }
  drafts.splice(index, 1);
  renderGiftChimeBandList(
    drafts.map((row) => ({
      minDiamonds: row.min,
      maxDiamonds: row.max,
      volume: row.volume,
      sound: row.sound,
    })),
  );
  noteFormChanged();
}

function fillGiftNotifyUi(config) {
  const mode = config?.giftNotifyMode === 'chime' ? 'chime' : 'speak';
  for (const input of document.querySelectorAll('input[name="gift-notify-mode"]')) {
    input.checked = input.value === mode;
  }
  const matchMode = config?.giftChimeMatchMode === 'diamond' ? 'diamond' : 'gift';
  for (const input of document.querySelectorAll('input[name="gift-chime-match-mode"]')) {
    input.checked = input.value === matchMode;
  }
  giftChimeSoundRef = normalizeSoundRefUi(config?.giftChimeSound, 'gift');
  paintSoundLabel('gift-chime-sound-label', giftChimeSoundRef);
  giftChimeVolume = normalizeGiftChimeVolumeUi(config?.giftChimeVolume);
  paintGiftChimeCommonVolume();
  giftChimeDiamondBandsState = Array.isArray(config?.giftChimeDiamondBands)
    ? structuredClone(config.giftChimeDiamondBands)
    : [];
  renderGiftChimeBandList(giftChimeDiamondBandsState);
  const commentMode = config?.commentNotifyMode === 'sound' ? 'sound' : 'speak';
  for (const input of document.querySelectorAll('input[name="comment-notify-mode"]')) {
    input.checked = input.value === commentMode;
  }
  commentSoundRef = normalizeSoundRefUi(config?.commentSound, 'default');
  paintSoundLabel('comment-sound-label', commentSoundRef);
  commentSoundVolume = normalizeGiftChimeVolumeUi(config?.commentSoundVolume);
  paintCommentSoundVolume();
  const modeMap = config?.eventNotifyMode || {};
  const soundMap = config?.eventSound || {};
  const volumeMap = config?.eventSoundVolume || {};
  for (const type of EVENT_SOUND_TYPES) {
    const mode = modeMap[type] === 'sound' ? 'sound' : 'speak';
    for (const input of document.querySelectorAll(`input[name="${type}-notify-mode"]`)) {
      input.checked = input.value === mode;
    }
    eventSoundRefs[type] = normalizeSoundRefUi(soundMap[type], 'default');
    paintSoundLabel(`${type}-sound-label`, eventSoundRefs[type]);
    eventSoundVolumes[type] = normalizeGiftChimeVolumeUi(volumeMap[type]);
    paintEventSoundVolume(type);
  }
  if (uiCopy) {
    const bandsHint = $('gift-chime-diamond-bands-hint');
    if (bandsHint && uiCopy.giftChimeDiamondBandsHint) {
      bandsHint.textContent = uiCopy.giftChimeDiamondBandsHint;
    }
    const addBtn = $('gift-chime-band-add');
    if (addBtn && uiCopy.giftChimeDiamondBandAdd) {
      addBtn.textContent = uiCopy.giftChimeDiamondBandAdd;
    }
    const speakLabel = uiCopy.eventNotifySpeak || '読み上げ';
    const soundLabel = uiCopy.eventNotifySound || 'サウンド';
    const soundHint =
      uiCopy.eventSoundHint ||
      '読み上げの代わりにアプリ本体で鳴らします（配信ソースには鳴りません）。';
    const volumeLabel = uiCopy.giftChimeVolumeLabel || '音量';
    const pickLabel = uiCopy.giftChimeSelectSound || '選択';
    for (const id of ['comment-sound-pick', 'gift-chime-sound-pick']) {
      const pick = $(id);
      if (pick) {
        pick.textContent = pickLabel;
      }
    }
    for (const el of document.querySelectorAll('[data-event-sound-pick]')) {
      el.textContent = pickLabel;
    }
    const commentVolumeLabel = $('comment-sound-volume-label');
    if (commentVolumeLabel) {
      commentVolumeLabel.textContent = volumeLabel;
    }
    const commentVolumeNumber = $('comment-sound-volume-number');
    if (commentVolumeNumber instanceof HTMLInputElement) {
      commentVolumeNumber.setAttribute('aria-label', `${volumeLabel}（数値）`);
    }
    const commentVolumeRange = $('comment-sound-volume-range');
    if (commentVolumeRange instanceof HTMLInputElement) {
      commentVolumeRange.setAttribute('aria-label', volumeLabel);
    }
    for (const el of document.querySelectorAll('[data-event-notify-speak-label]')) {
      el.textContent = speakLabel;
    }
    for (const el of document.querySelectorAll('[data-event-notify-sound-label]')) {
      el.textContent = soundLabel;
    }
    for (const el of document.querySelectorAll('[data-event-sound-hint]')) {
      if (!el.dataset.eventSoundHintLocked) {
        el.textContent = soundHint;
      }
    }
    for (const el of document.querySelectorAll('[data-event-sound-volume-label]')) {
      el.textContent = volumeLabel;
    }
    for (const type of EVENT_SOUND_TYPES) {
      const { number, range } = eventSoundVolumeInputs(type);
      if (number instanceof HTMLInputElement) {
        number.setAttribute('aria-label', `${volumeLabel}（数値）`);
      }
      if (range instanceof HTMLInputElement) {
        range.setAttribute('aria-label', volumeLabel);
      }
    }
  }
  syncAllSoundTemplateResetButtons();
  syncGiftNotifyModeUi();
  syncCommentNotifyModeUi();
  syncAllEventNotifyModeUi();
}

function collectGiftNotifyUi() {
  const commentNotifyMode =
    document.querySelector('input[name="comment-notify-mode"]:checked')?.value === 'sound'
      ? 'sound'
      : 'speak';
  const eventNotifyMode = {};
  const eventSound = {};
  const eventSoundVolume = {};
  for (const type of EVENT_SOUND_TYPES) {
    eventNotifyMode[type] = eventNotifyModeValue(type);
    eventSound[type] = { ...eventSoundRefs[type] };
    eventSoundVolume[type] = normalizeGiftChimeVolumeUi(eventSoundVolumes[type]);
  }
  return {
    giftNotifyMode:
      document.querySelector('input[name="gift-notify-mode"]:checked')?.value === 'chime'
        ? 'chime'
        : 'speak',
    giftChimePlayApp: true,
    giftChimePlayOverlay: false,
    giftChimeMatchMode: giftChimeMatchModeValue(),
    giftChimeSound: { ...giftChimeSoundRef },
    giftChimeVolume,
    giftChimeDiamondBands: collectGiftChimeDiamondBandsUi(),
    commentNotifyMode,
    commentSoundEnabled: commentNotifyMode === 'sound',
    commentSound: { ...commentSoundRef },
    commentSoundVolume: normalizeGiftChimeVolumeUi(commentSoundVolume),
    eventNotifyMode,
    eventSound,
    eventSoundVolume,
    ...(typeof collectEventAlertUi === 'function' ? collectEventAlertUi() : {}),
  };
}

async function pickSoundInto(setter, labelId) {
  if (!window.liveTts?.pickSoundFile) {
    return;
  }
  const result = await window.liveTts.pickSoundFile();
  if (!result || result.cancelled) {
    return;
  }
  if (!result.ok || !result.fileName) {
    setToast(result.message || uiCopy.pickSoundFailed || '効果音の取り込みに失敗しました', true);
    return;
  }
  setter({ kind: 'file', fileName: result.fileName });
  paintSoundLabel(labelId, { kind: 'file', fileName: result.fileName });
  syncAllSoundTemplateResetButtons();
  noteFormChanged();
}

function paintGiftChimeCommonVolume() {
  const next = normalizeGiftChimeVolumeUi(giftChimeVolume);
  giftChimeVolume = next;
  const range = $('gift-chime-common-volume-range');
  const number = $('gift-chime-common-volume-number');
  if (range instanceof HTMLInputElement) {
    range.value = String(next);
  }
  if (number instanceof HTMLInputElement) {
    number.value = String(next);
  }
  if (typeof paintTemplateGiftChimeVolumes === 'function') {
    paintTemplateGiftChimeVolumes();
  }
}

function bindGiftChimeCommonVolumeControls() {
  const range = $('gift-chime-common-volume-range');
  const number = $('gift-chime-common-volume-number');
  if (!(range instanceof HTMLInputElement) || !(number instanceof HTMLInputElement)) {
    return;
  }
  const commit = () => {
    giftChimeVolume = normalizeGiftChimeVolumeUi(range.value ?? number.value);
    paintGiftChimeCommonVolume();
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

function paintCommentSoundVolume() {
  const range = $('comment-sound-volume-range');
  const number = $('comment-sound-volume-number');
  const value = String(normalizeGiftChimeVolumeUi(commentSoundVolume));
  if (range instanceof HTMLInputElement) {
    range.value = value;
  }
  if (number instanceof HTMLInputElement) {
    number.value = value;
  }
}

function bindCommentSoundVolumeControls() {
  const range = $('comment-sound-volume-range');
  const number = $('comment-sound-volume-number');
  if (!(range instanceof HTMLInputElement) || !(number instanceof HTMLInputElement)) {
    return;
  }
  const commit = () => {
    commentSoundVolume = normalizeGiftChimeVolumeUi(range.value ?? number.value);
    paintCommentSoundVolume();
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

async function pickGiftChimeForId(giftId) {
  const id = String(giftId || '').trim();
  if (!id || !window.liveTts?.pickSoundFile) {
    return;
  }
  const result = await window.liveTts.pickSoundFile();
  if (!result || result.cancelled) {
    return;
  }
  if (!result.ok || !result.fileName) {
    setToast(result.message || uiCopy.pickSoundFailed || '効果音の取り込みに失敗しました', true);
    return;
  }
  giftChimeByGiftId[id] = { kind: 'file', fileName: result.fileName };
  if (!Object.prototype.hasOwnProperty.call(giftChimeVolumeByGiftId, id)) {
    giftChimeVolumeByGiftId[id] = normalizeGiftChimeVolumeUi(giftChimeVolume);
  }
  renderGiftSpeakList();
  noteFormChanged();
}

function syncProfileNameField(profileId) {
  const input = $('config-profile-name');
  if (!input) {
    return;
  }
  const id = String(profileId || '');
  const selected = configProfilesState.find((item) => item.id === id);
  if (selected) {
    input.value = selected.name;
    return;
  }
  if (!input.value.trim()) {
    input.value = '';
  }
}

function renderProfileSelect() {
  const select = $('config-profile-select');
  if (!select) {
    return;
  }
  const previous = select.value || activeConfigProfileIdState;
  select.replaceChildren();
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = configProfilesState.length ? '選ぶ' : 'まだありません';
  select.append(empty);
  for (const profile of configProfilesState) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.name;
    select.append(option);
  }
  const nextValue = configProfilesState.some((item) => item.id === previous) ? previous : '';
  select.value = nextValue;
  syncProfileNameField(nextValue);
}

function fillProfilesUi(config) {
  configProfilesState = Array.isArray(config?.configProfiles)
    ? structuredClone(config.configProfiles)
    : [];
  activeConfigProfileIdState = String(config?.activeConfigProfileId || '');
  renderProfileSelect();
  if (activeConfigProfileIdState) {
    const select = $('config-profile-select');
    if (select) {
      select.value = activeConfigProfileIdState;
    }
    syncProfileNameField(activeConfigProfileIdState);
  }
}

function collectProfilesUi() {
  return {
    configProfiles: structuredClone(configProfilesState),
    activeConfigProfileId: activeConfigProfileIdState,
  };
}

function stripProfileIdentityUi(config) {
  const next = { ...config };
  delete next.uniqueId;
  delete next.confirmedUniqueId;
  delete next.overlayPort;
  delete next.configProfiles;
  delete next.activeConfigProfileId;
  delete next.overlayUrl;
  delete next.overlayStudioUrl;
  delete next.overlayPreviewUrl;
  delete next.overlayAlertsUrl;
  delete next.overlayAlertsStudioUrl;
  delete next.overlayAlertsPreviewUrl;
  delete next.copy;
  return next;
}

function createProfileUi(name, config) {
  const trimmed = String(name || '')
    .trim()
    .slice(0, 40) || 'プロファイル';
  const now = new Date();
  return {
    id: `p_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    updatedAt: now.toISOString(),
    config: stripProfileIdentityUi(config),
  };
}

function isLiveConnectedForProfile() {
  const state = lastStatus?.state || 'disconnected';
  return state === 'live' || state === 'waiting_live' || state === 'connecting';
}

function profileNameFromField() {
  return String($('config-profile-name')?.value || '')
    .trim()
    .slice(0, 40);
}

async function saveCurrentAsProfile() {
  const name = profileNameFromField();
  if (!name) {
    setToast(uiCopy.profileNameRequired || 'プロファイル名を入力してください', true);
    $('config-profile-name')?.focus();
    return;
  }
  const selectedId = $('config-profile-select')?.value || '';
  const selected = configProfilesState.find((item) => item.id === selectedId);
  const snapshot = stripProfileIdentityUi(collectConfig());
  let profile;
  if (selected) {
    profile = {
      ...selected,
      name,
      updatedAt: new Date().toISOString(),
      config: snapshot,
    };
    configProfilesState = configProfilesState.map((item) =>
      item.id === profile.id ? profile : item,
    );
  } else {
    profile = createProfileUi(name, { ...snapshot });
    configProfilesState = [...configProfilesState, profile];
  }
  if (configProfilesState.length > 30) {
    configProfilesState = configProfilesState.slice(-30);
  }
  activeConfigProfileIdState = profile.id;
  renderProfileSelect();
  const select = $('config-profile-select');
  if (select) {
    select.value = profile.id;
  }
  syncProfileNameField(profile.id);
  const result = await persistConfigPartial({
    configProfiles: configProfilesState,
    activeConfigProfileId: activeConfigProfileIdState,
  });
  if (!result?.ok) {
    setToast(result?.message || uiCopy.saveFailed || '保存に失敗しました', true);
    return;
  }
  fillProfilesUi(result.config || {});
  setToast(uiCopy.profileSaveOk || 'プロファイルを保存しました');
}

async function applySelectedProfile() {
  if (isLiveConnectedForProfile()) {
    setToast(uiCopy.profileNeedDisconnect || '配信に接続中はプロファイルを切り替えられません。切断してください', true);
    return;
  }
  const id = $('config-profile-select')?.value || '';
  const profile = configProfilesState.find((item) => item.id === id);
  if (!profile) {
    return;
  }
  if (isDirty() && !window.confirm('未保存の変更があります。破棄してプロファイルを適用しますか？')) {
    return;
  }
  const before = {
    ...collectConfig(),
    copy: uiCopy,
  };
  const current = collectConfig();
  const merged = {
    ...current,
    ...stripProfileIdentityUi(profile.config || {}),
    uniqueId: current.uniqueId,
    overlayPort: current.overlayPort,
    configProfiles: configProfilesState,
    activeConfigProfileId: profile.id,
  };
  fillConfig({ ...merged, copy: uiCopy });
  activeConfigProfileIdState = profile.id;
  const error = validateForm();
  if (error) {
    fillConfig(before);
    setToast(error, true);
    return;
  }
  configEchoWait += 1;
  const result = await window.liveTts.saveConfig(collectConfig());
  if (result?.config) {
    savedConfig = result.config;
    fillConfig(result.config);
    markClean();
  } else {
    configEchoWait = Math.max(0, configEchoWait - 1);
    fillConfig(before);
  }
  if (result?.message) {
    setToast(result.message, !result.ok);
  } else if (result?.ok) {
    setToast(uiCopy.saveOk || '設定を保存しました');
  }
}

async function deleteSelectedProfile() {
  const id = $('config-profile-select')?.value || '';
  if (!id) {
    return;
  }
  if (!window.confirm('このプロファイルを削除しますか？')) {
    return;
  }
  configProfilesState = configProfilesState.filter((item) => item.id !== id);
  if (activeConfigProfileIdState === id) {
    activeConfigProfileIdState = '';
  }
  renderProfileSelect();
  const result = await persistConfigPartial({
    configProfiles: configProfilesState,
    activeConfigProfileId: activeConfigProfileIdState,
  });
  if (!result?.ok) {
    setToast(result?.message || uiCopy.saveFailed || '保存に失敗しました', true);
    return;
  }
  fillProfilesUi(result.config || {});
}

function syncPauseMuteButtons() {
  const pauseBtn = $('btn-pause-speech');
  const muteBtn = $('btn-mute-comment-sound');
  const pauseKey = speechHotkeyValue('hotkey-pause-speech', DEFAULT_PAUSE_SPEECH_HOTKEY);
  const muteKey = speechHotkeyValue(
    'hotkey-mute-comment-sound',
    DEFAULT_MUTE_COMMENT_SOUND_HOTKEY,
  );
  if (pauseBtn) {
    const label = speechPausedUi
      ? uiCopy.resumeSpeechButton || '読み上げを再開'
      : uiCopy.pauseSpeechButton || '読み上げを一時停止';
    pauseBtn.setAttribute('role', 'menuitemcheckbox');
    pauseBtn.setAttribute('aria-checked', speechPausedUi ? 'true' : 'false');
    paintSpeechActionButton(pauseBtn, label, pauseKey);
  }
  if (muteBtn) {
    const label = commentSoundMutedUi
      ? uiCopy.unmuteCommentSoundButton || 'サウンドミュート解除'
      : uiCopy.muteCommentSoundButton || 'サウンドをミュート';
    muteBtn.setAttribute('role', 'menuitemcheckbox');
    muteBtn.setAttribute('aria-checked', commentSoundMutedUi ? 'true' : 'false');
    paintSpeechActionButton(muteBtn, label, muteKey);
  }
}

function resolveBuiltinTemplateId(payload) {
  const sound = payload?.sound;
  if (sound && sound.kind === 'template') {
    if (sound.id === 'gift') {
      return 'gift';
    }
    if (sound.id === 'default') {
      return payload?.kind === 'gift-chime' ? 'gift' : 'default';
    }
  }
  return payload?.kind === 'gift-chime' ? 'gift' : 'default';
}

function playBuiltinAppChime(gainScale, onEnded, templateId = 'default') {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    if (typeof onEnded === 'function') {
      onEnded();
    }
    return () => undefined;
  }
  if (!appChimeContext) {
    appChimeContext = new AudioCtx();
  }
  const ctx = appChimeContext;
  const scale =
    typeof gainScale === 'number' && Number.isFinite(gainScale)
      ? Math.max(0, Math.min(5, gainScale))
      : 1;
  const oscillators = [];
  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    if (typeof onEnded === 'function') {
      onEnded();
    }
  };
  const startCommentBeep = () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = Math.max(0.0001, 0.08 * scale);
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.onended = finish;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.stop(now + 0.2);
    oscillators.push(osc);
  };
  const startGiftCoin = () => {
    const now = ctx.currentTime;
    const makeDing = (freq, startAt, dur, peak) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + startAt);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, peak * scale),
        now + startAt + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startAt + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startAt);
      osc.stop(now + startAt + dur + 0.02);
      oscillators.push(osc);
      return osc;
    };
    makeDing(1568, 0, 0.11, 0.14);
    const second = makeDing(2093, 0.045, 0.16, 0.11);
    second.onended = finish;
  };
  const start = templateId === 'gift' ? startGiftCoin : startCommentBeep;
  if (ctx.state === 'suspended') {
    void ctx.resume().then(start).catch(finish);
  } else {
    start();
  }
  return () => {
    for (const osc of oscillators) {
      try {
        osc.stop();
      } catch {
        // すでに止まっている
      }
    }
    finish();
  };
}

function playUrlWithGain(url, gain, onFail, onEnded) {
  const safeGain = Math.max(0, Math.min(5, Number(gain) || 0));
  const fail = typeof onFail === 'function' ? onFail : () => undefined;
  const ended = typeof onEnded === 'function' ? onEnded : () => undefined;
  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    ended();
  };
  const stopAudio = (audio) => {
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch {
      // ignore
    }
  };

  if (safeGain <= 1) {
    const audio = new Audio(url);
    audio.volume = safeGain;
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', () => {
      fail();
      finish();
    });
    void audio.play().catch(() => {
      fail();
      finish();
    });
    return () => {
      stopAudio(audio);
      finish();
    };
  }

  // 100超は decodeAudioData + GainNode（CORS 付き /sounds 前提）
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    fail();
    finish();
    return () => undefined;
  }
  if (!appChimeContext) {
    appChimeContext = new AudioCtx();
  }
  const ctx = appChimeContext;
  const abort = new AbortController();
  let bufferSource = null;
  let cancelled = false;

  const startBoost = async () => {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const response = await fetch(url, {
        mode: 'cors',
        cache: 'no-store',
        signal: abort.signal,
      });
      if (!response.ok) {
        throw new Error(`sound fetch ${response.status}`);
      }
      const bytes = await response.arrayBuffer();
      if (cancelled || finished) {
        return;
      }
      const audioBuffer = await ctx.decodeAudioData(bytes.slice(0));
      if (cancelled || finished) {
        return;
      }
      bufferSource = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      gainNode.gain.value = safeGain;
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(gainNode);
      gainNode.connect(ctx.destination);
      bufferSource.onended = finish;
      bufferSource.start();
    } catch {
      if (cancelled || finished) {
        return;
      }
      fail();
      finish();
    }
  };
  void startBoost();

  return () => {
    cancelled = true;
    abort.abort();
    if (bufferSource) {
      try {
        bufferSource.stop();
      } catch {
        // ignore
      }
    }
    finish();
  };
}

let currentAppChimeStop = null;

function stopCurrentAppChime() {
  if (typeof currentAppChimeStop === 'function') {
    const stop = currentAppChimeStop;
    currentAppChimeStop = null;
    stop();
  }
}

function playAppSound(payload) {
  stopCurrentAppChime();
  const url = typeof payload?.soundUrl === 'string' ? payload.soundUrl.trim() : '';
  const volumeRaw =
    typeof payload?.volume === 'number' && Number.isFinite(payload.volume)
      ? payload.volume
      : 100;
  const gain = Math.max(0, Math.min(5, volumeRaw / 100));
  let stop = () => undefined;
  const clear = () => {
    if (currentAppChimeStop === stop) {
      currentAppChimeStop = null;
    }
  };
  if (url) {
    stop = playUrlWithGain(url, gain, () => undefined, clear);
  } else {
    stop = playBuiltinAppChime(gain, clear, resolveBuiltinTemplateId(payload));
  }
  currentAppChimeStop = stop;
}

/** 読み上げは効果音と別に順番再生する（飛ばす／待ち捨て対応）。 */
const appTtsQueue = [];
let appTtsPlaying = false;
let appTtsEpoch = 0;
let appTtsFinishCurrent = null;
let currentAppTtsAudio = null;

function revokeAppTtsBlob(src) {
  if (typeof src === 'string' && src.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(src);
    } catch {
      // ignore
    }
  }
}

function stopCurrentAppTtsAudio() {
  const audio = currentAppTtsAudio;
  currentAppTtsAudio = null;
  if (!audio) {
    return;
  }
  try {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  } catch {
    // ignore
  }
}

function skipAppTtsPlayback() {
  const finish = appTtsFinishCurrent;
  appTtsFinishCurrent = null;
  stopCurrentAppTtsAudio();
  if (typeof finish === 'function') {
    finish();
  }
}

function clearPendingAppTts() {
  appTtsEpoch += 1;
  const pending = appTtsQueue.splice(0, appTtsQueue.length);
  for (const item of pending) {
    void Promise.resolve(item)
      .then(revokeAppTtsBlob)
      .catch(() => undefined);
  }
}

function handleAppSpeechAudioControl(payload) {
  const action = payload && typeof payload === 'object' ? payload.action : '';
  if (action === 'skip') {
    skipAppTtsPlayback();
    return;
  }
  if (action === 'clear-pending') {
    clearPendingAppTts();
  }
}

async function fetchAppTtsObjectUrl(src) {
  const response = await fetch(src, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`音声の取得に失敗しました (${response.status})`);
  }
  const blob = await response.blob();
  if (blob.size < 44) {
    throw new Error('音声データが空です');
  }
  return URL.createObjectURL(blob);
}

function enqueueAppTts(url) {
  const src = typeof url === 'string' ? url.trim() : '';
  if (!src) {
    return;
  }
  appTtsQueue.push(fetchAppTtsObjectUrl(src));
  void pumpAppTts();
}

function playAppTtsAudio(src) {
  return new Promise((resolve) => {
    let done = false;
    const audio = new Audio(src);
    currentAppTtsAudio = audio;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      if (appTtsFinishCurrent === finish) {
        appTtsFinishCurrent = null;
      }
      if (currentAppTtsAudio === audio) {
        currentAppTtsAudio = null;
      }
      resolve();
    };
    appTtsFinishCurrent = finish;
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener(
      'error',
      () => {
        finish();
      },
      { once: true },
    );
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        finish();
      });
    }
  });
}

async function pumpAppTts() {
  if (appTtsPlaying) {
    return;
  }
  appTtsPlaying = true;
  const epoch = appTtsEpoch;
  try {
    while (appTtsQueue.length > 0) {
      if (epoch !== appTtsEpoch) {
        break;
      }
      const item = appTtsQueue.shift();
      let src = '';
      try {
        src = await item;
      } catch {
        continue;
      }
      if (epoch !== appTtsEpoch) {
        revokeAppTtsBlob(src);
        continue;
      }
      try {
        await playAppTtsAudio(src);
      } finally {
        revokeAppTtsBlob(src);
      }
    }
  } finally {
    appTtsPlaying = false;
    if (appTtsQueue.length > 0) {
      void pumpAppTts();
    }
  }
}

function handleAppPlaySound(payload) {
  if (payload && typeof payload === 'object' && payload.kind === 'tts') {
    enqueueAppTts(payload.soundUrl);
    return;
  }
  playAppSound(payload);
}

let giftChimePreviewToken = 0;
let giftChimePreviewSession = null;

function isGiftChimePreviewPlaying(giftId) {
  const id = String(giftId || '').trim();
  return Boolean(id && giftChimePreviewSession && giftChimePreviewSession.id === id);
}

function paintGiftChimePlayButton(button, giftName, playing) {
  if (!(button instanceof HTMLElement)) {
    return;
  }
  const name = giftName || button.dataset.giftChimeName || button.dataset.giftChimeTest || '';
  const label = playing
    ? uiCopy.giftChimeStopButton || '停止'
    : uiCopy.giftChimeTestButton || '再生';
  button.textContent = '';
  button.classList.toggle('is-playing', playing);
  button.setAttribute('aria-pressed', playing ? 'true' : 'false');
  button.setAttribute('aria-label', name ? `${name} の${label}` : label);
  button.title = label;
}

function syncGiftChimePreviewButtons() {
  for (const button of document.querySelectorAll('[data-gift-chime-test]')) {
    if (!(button instanceof HTMLElement)) {
      continue;
    }
    const id = button.dataset.giftChimeTest;
    paintGiftChimePlayButton(button, button.dataset.giftChimeName || '', isGiftChimePreviewPlaying(id));
  }
  for (const button of document.querySelectorAll('[data-sound-preview]')) {
    if (!(button instanceof HTMLElement)) {
      continue;
    }
    if (button.dataset.giftChimeTest) {
      continue;
    }
    const id = button.dataset.soundPreview;
    paintGiftChimePlayButton(button, '', isGiftChimePreviewPlaying(id));
  }
}

function stopGiftChimePreview() {
  giftChimePreviewToken += 1;
  const session = giftChimePreviewSession;
  giftChimePreviewSession = null;
  if (session && typeof session.stop === 'function') {
    session.stop();
  }
  syncGiftChimePreviewButtons();
}

async function toggleGiftChimePreview(giftId, sound, volume) {
  const id = String(giftId || '').trim();
  if (!id || !window.liveTts?.previewSound) {
    return;
  }
  if (isGiftChimePreviewPlaying(id)) {
    stopGiftChimePreview();
    return;
  }
  stopGiftChimePreview();
  const token = giftChimePreviewToken;
  const result = await window.liveTts.previewSound(sound, volume);
  if (token !== giftChimePreviewToken) {
    return;
  }
  if (!result || result.ok === false) {
    setToast(result?.message || uiCopy.giftChimeTestFailed || '効果音のテストに失敗しました', true);
    return;
  }
  const gain = Math.max(0, Math.min(5, Number(result.volume ?? volume ?? 100) / 100));
  const onEnded = () => {
    if (giftChimePreviewSession?.id === id) {
      giftChimePreviewSession = null;
      syncGiftChimePreviewButtons();
    }
  };
  const url = typeof result.soundUrl === 'string' ? result.soundUrl.trim() : '';
  const templateId =
    sound && sound.kind === 'template' && (sound.id === 'gift' || sound.id === 'default')
      ? sound.id
      : 'gift';
  const stop = url
    ? playUrlWithGain(url, gain, () => undefined, onEnded)
    : playBuiltinAppChime(gain, onEnded, templateId);
  giftChimePreviewSession = { id, stop };
  syncGiftChimePreviewButtons();
}

function bindGiftNotifyAndProfiles() {
  $('speak-gift')?.addEventListener('change', () => {
    syncGiftNotifyModeUi();
    noteFormChanged();
  });
  $('speak-comment')?.addEventListener('change', () => {
    syncCommentNotifyModeUi();
    noteFormChanged();
  });
  for (const type of EVENT_SOUND_TYPES) {
    $(`speak-${type}`)?.addEventListener('change', () => {
      syncEventNotifyModeUi(type);
      noteFormChanged();
    });
    for (const input of document.querySelectorAll(`input[name="${type}-notify-mode"]`)) {
      input.addEventListener('change', () => {
        syncEventNotifyModeUi(type);
        noteFormChanged();
      });
    }
  }
  for (const input of document.querySelectorAll('input[name="gift-notify-mode"]')) {
    input.addEventListener('change', () => {
      syncGiftNotifyModeUi();
      noteFormChanged();
    });
  }
  for (const input of document.querySelectorAll('input[name="comment-notify-mode"]')) {
    input.addEventListener('change', () => {
      syncCommentNotifyModeUi();
      noteFormChanged();
    });
  }
  for (const input of document.querySelectorAll('input[name="gift-chime-match-mode"]')) {
    input.addEventListener('change', () => {
      syncGiftNotifyModeUi();
      noteFormChanged();
    });
  }
  $('gift-chime-band-add')?.addEventListener('click', () => {
    addGiftChimeBandRow();
  });
  $('gift-chime-sound-play')?.addEventListener('click', () => {
    void toggleGiftChimePreview('gift-common', giftChimeSoundRef, giftChimeVolume);
  });
  $('gift-chime-sound-pick')?.addEventListener('click', () => {
    void pickSoundInto((ref) => {
      giftChimeSoundRef = ref;
    }, 'gift-chime-sound-label');
  });
  $('gift-chime-sound-reset')?.addEventListener('click', () => {
    giftChimeSoundRef = { kind: 'template', id: 'gift' };
    paintSoundLabel('gift-chime-sound-label', giftChimeSoundRef);
    syncAllSoundTemplateResetButtons();
    noteFormChanged();
  });
  bindGiftChimeCommonVolumeControls();
  bindCommentSoundVolumeControls();
  $('comment-sound-play')?.addEventListener('click', () => {
    void toggleGiftChimePreview('comment', commentSoundRef, commentSoundVolume);
  });
  $('comment-sound-pick')?.addEventListener('click', () => {
    void pickSoundInto((ref) => {
      commentSoundRef = ref;
    }, 'comment-sound-label');
  });
  $('comment-sound-reset')?.addEventListener('click', () => {
    commentSoundRef = { kind: 'template', id: 'default' };
    paintSoundLabel('comment-sound-label', commentSoundRef);
    syncAllSoundTemplateResetButtons();
    noteFormChanged();
  });
  for (const button of document.querySelectorAll('[data-event-sound-play]')) {
    button.addEventListener('click', () => {
      const type = button.dataset.eventSoundPlay;
      if (!EVENT_SOUND_TYPES.includes(type)) {
        return;
      }
      void toggleGiftChimePreview(
        `event:${type}`,
        eventSoundRefs[type],
        eventSoundVolumes[type],
      );
    });
  }
  for (const button of document.querySelectorAll('[data-event-sound-pick]')) {
    button.addEventListener('click', () => {
      const type = button.dataset.eventSoundPick;
      if (!EVENT_SOUND_TYPES.includes(type)) {
        return;
      }
      void pickSoundInto((ref) => {
        eventSoundRefs[type] = ref;
      }, `${type}-sound-label`);
    });
  }
  for (const button of document.querySelectorAll('[data-event-sound-reset]')) {
    button.addEventListener('click', () => {
      const type = button.dataset.eventSoundReset;
      if (!EVENT_SOUND_TYPES.includes(type)) {
        return;
      }
      eventSoundRefs[type] = { kind: 'template', id: 'default' };
      paintSoundLabel(`${type}-sound-label`, eventSoundRefs[type]);
      syncAllSoundTemplateResetButtons();
      noteFormChanged();
    });
  }
  for (const type of EVENT_SOUND_TYPES) {
    const { number, range } = eventSoundVolumeInputs(type);
    if (!(number instanceof HTMLInputElement) || !(range instanceof HTMLInputElement)) {
      continue;
    }
    const commit = () => {
      eventSoundVolumes[type] = syncGiftChimeVolumeInputs(range, number);
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
  $('btn-profile-save')?.addEventListener('click', () => {
    void saveCurrentAsProfile();
  });
  $('btn-profile-apply')?.addEventListener('click', () => {
    void applySelectedProfile();
  });
  $('btn-profile-delete')?.addEventListener('click', () => {
    void deleteSelectedProfile();
  });
  $('config-profile-select')?.addEventListener('change', () => {
    syncProfileNameField($('config-profile-select')?.value || '');
  });
}
