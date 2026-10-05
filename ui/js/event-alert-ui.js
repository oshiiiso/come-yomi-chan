const EVENT_ALERT_TYPES_UI = [
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];

const DEFAULT_EVENT_ALERT_SEC = 4;

/** @type {Record<string, { kind: string, fileName?: string, id?: string }>} */
const eventAlertMediaRefs = {};

function defaultAlertMediaRef(type) {
  return { kind: 'template', id: type };
}

function normalizeAlertMediaRefUi(raw, type) {
  if (!raw || typeof raw !== 'object') {
    return defaultAlertMediaRef(type);
  }
  if (raw.kind === 'file' && typeof raw.fileName === 'string' && raw.fileName) {
    return { kind: 'file', fileName: raw.fileName };
  }
  if (raw.kind === 'template') {
    const id =
      typeof raw.id === 'string' && EVENT_ALERT_TYPES_UI.includes(raw.id) ? raw.id : type;
    return { kind: 'template', id };
  }
  if (raw.kind === 'auto' || raw.kind === 'none') {
    return { kind: raw.kind };
  }
  return defaultAlertMediaRef(type);
}

function alertMediaLabel(ref, type) {
  if (ref?.kind === 'file' && ref.fileName) {
    return ref.fileName;
  }
  if (ref?.kind === 'none') {
    return uiCopy.eventAlertMediaNone || 'なし';
  }
  if (ref?.kind === 'auto') {
    return uiCopy.eventAlertMediaAuto || '自動';
  }
  const id = ref?.id || type;
  const names = uiCopy.eventAlertTemplateNames || {};
  return names[id] || uiCopy.eventAlertMediaTemplate || 'テンプレ';
}

function paintAlertMediaLabel(type) {
  const el = $(`${type}-alert-media-label`);
  if (!el) {
    return;
  }
  const ref = eventAlertMediaRefs[type] || defaultAlertMediaRef(type);
  const label = alertMediaLabel(ref, type);
  el.textContent = label;
  el.title = label;
}

function syncEventAlertResetButton(type) {
  const reset = document.querySelector(`[data-event-alert-reset="${type}"]`);
  if (!(reset instanceof HTMLElement)) {
    return;
  }
  const ref = eventAlertMediaRefs[type] || defaultAlertMediaRef(type);
  const isTemplate = ref.kind === 'template';
  reset.hidden = isTemplate;
  if ('disabled' in reset) {
    reset.disabled = isTemplate;
  }
}

function syncEventAlertBlockVisibility(type) {
  const enabled = Boolean($(`alert-${type}`)?.checked);
  const block = document.querySelector(`[data-event-alert="${type}"]`);
  if (block instanceof HTMLElement) {
    block.hidden = !enabled;
  }
}

function syncEventAlertMediaUi(type) {
  paintAlertMediaLabel(type);
  syncEventAlertResetButton(type);
  syncEventAlertBlockVisibility(type);
}

function eventAlertSecInput(type) {
  return document.querySelector(`[data-event-alert-sec="${type}"]`);
}

function clampEventAlertSecUi(ms) {
  const n = typeof ms === 'number' ? ms : Number(ms);
  if (!Number.isFinite(n)) {
    return DEFAULT_EVENT_ALERT_SEC;
  }
  const sec = Math.round(n / 1000);
  return Math.min(120, Math.max(1, sec));
}

function fillEventAlertSecUi(config) {
  const byType =
    config?.eventAlertDisplayMsByType && typeof config.eventAlertDisplayMsByType === 'object'
      ? config.eventAlertDisplayMsByType
      : {};
  const commonMs =
    typeof config?.eventAlertDisplayMs === 'number' && Number.isFinite(config.eventAlertDisplayMs)
      ? config.eventAlertDisplayMs
      : DEFAULT_EVENT_ALERT_SEC * 1000;
  // shared の normalizeEventAlertDisplayMsMap と同じ：キー有無で移行判定
  const hasTyped = EVENT_ALERT_TYPES_UI.some((type) =>
    Object.prototype.hasOwnProperty.call(byType, type),
  );
  const hasSubscribeOnly =
    Object.prototype.hasOwnProperty.call(byType, 'subscribe') &&
    !Object.prototype.hasOwnProperty.call(byType, 'superFan');
  const hasAny = hasTyped || hasSubscribeOnly;
  for (const type of EVENT_ALERT_TYPES_UI) {
    const input = eventAlertSecInput(type);
    if (!(input instanceof HTMLInputElement)) {
      continue;
    }
    let ms = commonMs;
    if (hasAny) {
      ms = Object.prototype.hasOwnProperty.call(byType, type)
        ? byType[type]
        : DEFAULT_EVENT_ALERT_SEC * 1000;
    }
    if (type === 'superFan' && hasSubscribeOnly) {
      ms = byType.subscribe;
    }
    input.value = String(clampEventAlertSecUi(ms));
  }
}

function fillEventAlertUi(config) {
  const enabled = config?.eventAlertEnabled || {};
  const mediaMap = config?.eventAlertMedia || {};
  for (const type of EVENT_ALERT_TYPES_UI) {
    const checkbox = $(`alert-${type}`);
    if (checkbox) {
      const speakFallback = Boolean(config?.events?.[type]?.speak);
      checkbox.checked =
        typeof enabled[type] === 'boolean' ? enabled[type] === true : speakFallback;
    }
    eventAlertMediaRefs[type] = normalizeAlertMediaRefUi(mediaMap[type], type);
    syncEventAlertMediaUi(type);
  }
  fillEventAlertSecUi(config);
  if (uiCopy) {
    for (const el of document.querySelectorAll('[data-event-alert-label]')) {
      el.textContent = uiCopy.eventAlertLabel || 'イベントアラート';
    }
    for (const el of document.querySelectorAll('[data-event-alert-hint]')) {
      el.textContent =
        uiCopy.eventAlertHint ||
        '別の配信ソース（イベントアラート用URL）に出します。初期は種類ごとの簡易テンプレです。画像を選ぶと差し替えできます。';
    }
    for (const button of document.querySelectorAll('[data-event-alert-pick]')) {
      button.textContent = uiCopy.eventAlertPickMedia || '画像を選ぶ';
    }
    const resetLabel = uiCopy.eventAlertResetTemplate || 'テンプレに戻す';
    for (const button of document.querySelectorAll('[data-event-alert-reset]')) {
      button.textContent = '×';
      button.setAttribute('aria-label', resetLabel);
      button.title = resetLabel;
    }
    const secLabel = uiCopy.eventAlertSecLabel || '表示時間';
    for (const el of document.querySelectorAll('[data-event-alert-sec-label]')) {
      el.textContent = secLabel;
    }
    for (const input of document.querySelectorAll('[data-event-alert-sec]')) {
      if (input instanceof HTMLInputElement) {
        input.setAttribute('aria-label', `${secLabel}（秒）`);
      }
    }
    const chatTitle = $('overlay-chat-url-title');
    if (chatTitle && uiCopy.eventAlertChatUrlTitle) {
      chatTitle.textContent = uiCopy.eventAlertChatUrlTitle;
    }
    const alertsTitle = $('overlay-alerts-url-title');
    if (alertsTitle && uiCopy.eventAlertAlertsUrlTitle) {
      alertsTitle.textContent = uiCopy.eventAlertAlertsUrlTitle;
    }
    const alertsHint = $('overlay-alerts-url-hint');
    if (alertsHint && uiCopy.eventAlertAlertsUrlHint) {
      alertsHint.textContent = uiCopy.eventAlertAlertsUrlHint;
    }
  }
}

function collectEventAlertUi() {
  const eventAlertEnabled = {};
  const eventAlertMedia = {};
  const eventAlertDisplayMsByType = {};
  for (const type of EVENT_ALERT_TYPES_UI) {
    eventAlertEnabled[type] = Boolean($(`alert-${type}`)?.checked);
    const ref = eventAlertMediaRefs[type] || defaultAlertMediaRef(type);
    if (ref.kind === 'file' && ref.fileName) {
      eventAlertMedia[type] = { kind: 'file', fileName: ref.fileName };
    } else if (ref.kind === 'auto' || ref.kind === 'none') {
      eventAlertMedia[type] = { kind: ref.kind };
    } else {
      eventAlertMedia[type] = { kind: 'template', id: type };
    }
    const secRaw = Number(eventAlertSecInput(type)?.value);
    const sec = Number.isFinite(secRaw) ? Math.trunc(secRaw) : DEFAULT_EVENT_ALERT_SEC;
    eventAlertDisplayMsByType[type] = Math.min(120, Math.max(1, sec)) * 1000;
  }
  // eventAlertDisplayMs は移行用の旧共通値。種類別を送るときは触らない
  return {
    eventAlertEnabled,
    eventAlertMedia,
    eventAlertDisplayMsByType,
  };
}

function validateEventAlertForm() {
  for (const type of EVENT_ALERT_TYPES_UI) {
    const sec = Number(eventAlertSecInput(type)?.value);
    if (!Number.isFinite(sec) || !Number.isInteger(sec) || sec < 1 || sec > 120) {
      return (
        uiCopy.invalidEventAlertSec ||
        'イベントアラートの表示時間は 1〜120 秒で指定してください'
      );
    }
  }
  return '';
}

async function pickEventAlertMedia(type) {
  if (!window.liveTts?.pickAlertMediaFile) {
    return;
  }
  const result = await window.liveTts.pickAlertMediaFile();
  if (!result || result.cancelled) {
    return;
  }
  if (!result.ok || !result.fileName) {
    setToast(
      result.message || uiCopy.pickAlertMediaFailed || 'アラート画像の取り込みに失敗しました',
      true,
    );
    return;
  }
  eventAlertMediaRefs[type] = { kind: 'file', fileName: result.fileName };
  syncEventAlertMediaUi(type);
  noteFormChanged();
}

function resetEventAlertMedia(type) {
  eventAlertMediaRefs[type] = defaultAlertMediaRef(type);
  syncEventAlertMediaUi(type);
  noteFormChanged();
}

function bindEventAlertUi() {
  for (const type of EVENT_ALERT_TYPES_UI) {
    $(`alert-${type}`)?.addEventListener('change', () => {
      syncEventAlertBlockVisibility(type);
      noteFormChanged();
    });
    document.querySelector(`[data-event-alert-pick="${type}"]`)?.addEventListener('click', () => {
      void pickEventAlertMedia(type);
    });
    document.querySelector(`[data-event-alert-reset="${type}"]`)?.addEventListener('click', () => {
      resetEventAlertMedia(type);
    });
    eventAlertSecInput(type)?.addEventListener('input', () => noteFormChanged());
  }
}
