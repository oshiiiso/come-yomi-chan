function formatUserCopy(template, name) {
  return String(template || '').split('{user}').join(name);
}

function toastMessageText() {
  return $('toast-text')?.textContent || $('toast')?.textContent || '';
}

function helpTopicForToast(text) {
  const topics = uiCopy.helpTopics;
  if (!text || !topics || typeof topics !== 'object') {
    return '';
  }
  return typeof topics[text] === 'string' ? topics[text] : '';
}

let toastClearTimer = 0;
let toastEpoch = 0;

function clearToastTimer() {
  if (toastClearTimer) {
    window.clearTimeout(toastClearTimer);
    toastClearTimer = 0;
  }
}

function scheduleToastClear(text, delayMs) {
  clearToastTimer();
  if (!text || delayMs <= 0) {
    return;
  }
  const epoch = toastEpoch;
  toastClearTimer = window.setTimeout(() => {
    toastClearTimer = 0;
    if (epoch === toastEpoch && toastMessageText() === text) {
      setToast('');
    }
  }, delayMs);
}

/** 画面・タブ移動時。成功も失敗も残さない（フォーム検証の「出っぱなし」防止）。 */
function clearOkToast() {
  if (!toastMessageText()) {
    return;
  }
  setToast('');
}

function setToast(text, isError = false) {
  const el = $('toast');
  if (!el) {
    return;
  }
  toastEpoch += 1;
  clearToastTimer();
  el.classList.toggle('is-error', Boolean(isError && text));
  el.replaceChildren();
  if (!text) {
    return;
  }
  const message = document.createElement('span');
  message.id = 'toast-text';
  message.className = 'toast__text';
  message.textContent = text;
  el.append(message);
  const topic = isError ? helpTopicForToast(text) : '';
  if (topic && typeof window.liveTts?.openHelp === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast__help';
    button.textContent = uiCopy.helpOpenLabel || 'ヘルプ';
    button.addEventListener('click', () => {
      void window.liveTts.openHelp(topic);
    });
    el.append(button);
  }
  // ヘルプ付きは少し長く残す。それ以外（重複追加など）は短く消す。
  scheduleToastClear(text, topic ? 10000 : isError ? 4500 : 3500);
}
