let namePromptResolve = null;

function hideNamePrompt(value) {
  const modal = $('name-prompt');
  if (modal) {
    modal.hidden = true;
  }
  const resolve = namePromptResolve;
  namePromptResolve = null;
  if (typeof resolve === 'function') {
    resolve(value);
  }
}

function openNamePrompt(options) {
  const title = String(options?.title || '').trim();
  const value = String(options?.value || '');
  return new Promise((resolve) => {
    const modal = $('name-prompt');
    const input = $('name-prompt-input');
    const titleEl = $('name-prompt-title');
    const okBtn = $('name-prompt-ok');
    const cancelBtn = $('name-prompt-cancel');
    if (!modal || !input) {
      resolve(null);
      return;
    }
    if (typeof namePromptResolve === 'function') {
      namePromptResolve(null);
    }
    namePromptResolve = resolve;
    if (titleEl) {
      titleEl.textContent = title || uiCopy.giftCatalogRename || '名前を変える';
    }
    if (okBtn) {
      okBtn.textContent = uiCopy.namePromptOk || '変える';
    }
    if (cancelBtn) {
      cancelBtn.textContent = uiCopy.namePromptCancel || 'やめる';
    }
    input.value = value;
    modal.hidden = false;
    input.focus();
    input.select();
  });
}

function bindNamePrompt() {
  const modal = $('name-prompt');
  const input = $('name-prompt-input');
  if (!modal || !input) {
    return;
  }
  $('name-prompt-ok')?.addEventListener('click', () => {
    hideNamePrompt(input.value);
  });
  $('name-prompt-cancel')?.addEventListener('click', () => {
    hideNamePrompt(null);
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      hideNamePrompt(null);
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) {
      return;
    }
    event.preventDefault();
    hideNamePrompt(input.value);
  });
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || modal.hidden) {
        return;
      }
      event.preventDefault();
      hideNamePrompt(null);
    },
    true,
  );
}

bindNamePrompt();
