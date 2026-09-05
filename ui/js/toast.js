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

function clearOkToast() {
  const el = $('toast');
  if (!el || el.classList.contains('is-error') || !toastMessageText()) {
    return;
  }
  setToast('');
}

function setToast(text, isError = false) {
  const el = $('toast');
  if (!el) {
    return;
  }
  el.classList.toggle('is-error', Boolean(isError));
  el.replaceChildren();
  const message = document.createElement('span');
  message.id = 'toast-text';
  message.className = 'toast__text';
  message.textContent = text;
  el.append(message);
  const topic = isError ? helpTopicForToast(text) : '';
  if (!topic || typeof window.liveTts?.openHelp !== 'function') {
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toast__help';
  button.textContent = uiCopy.helpOpenLabel || 'ヘルプ';
  button.addEventListener('click', () => {
    void window.liveTts.openHelp(topic);
  });
  el.append(button);
}
