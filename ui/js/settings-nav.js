let formSaveTimer = 0;
let formSaveChain = Promise.resolve();

function activateAppMode(mode) {
  hideViewerUserMenu();
  clearOkToast();
  appMode = mode === 'settings' ? 'settings' : 'viewer';
  const isViewer = appMode === 'viewer';
  document.body.dataset.mode = appMode;
  $('view-viewer').hidden = !isViewer;
  $('view-settings').hidden = isViewer;
  $('mode-viewer').classList.toggle('is-active', isViewer);
  $('mode-settings').classList.toggle('is-active', !isViewer);
  $('mode-viewer').setAttribute('aria-selected', isViewer ? 'true' : 'false');
  $('mode-settings').setAttribute('aria-selected', isViewer ? 'false' : 'true');
  if (isViewer) {
    unloadPreviewFrame();
    document.querySelector('.view-settings .workspace')?.classList.add('is-preview-hidden');
    syncViewerEmpty();
    if (viewerCommentStick) {
      scrollViewerLogToLatest($('viewer-log-comments'));
    }
    if (viewerEventStick) {
      scrollViewerLogToLatest($('viewer-log-events'));
    }
    return;
  }
  syncSettingsPreview();
}

async function requestAppMode(mode) {
  if (appMode === mode) {
    return;
  }
  if (appMode === 'settings' && mode === 'viewer') {
    const saved = await flushFormSave();
    if (!saved?.ok) {
      return;
    }
  }
  activateAppMode(mode);
}

function activeTabName() {
  return document.querySelector('.tabs__btn.is-active')?.dataset.tab || '';
}

function activateTab(name) {
  clearOkToast();
  for (const button of document.querySelectorAll('.tabs__btn')) {
    const on = button.dataset.tab === name;
    button.classList.toggle('is-active', on);
    button.setAttribute('aria-selected', on ? 'true' : 'false');
    button.tabIndex = on ? 0 : -1;
  }
  for (const panel of document.querySelectorAll('[data-tab-panel]')) {
    const on = panel.dataset.tabPanel === name;
    panel.classList.toggle('is-active', on);
    panel.hidden = !on;
  }
  const scroller = document.querySelector('.panel');
  if (scroller) {
    scroller.scrollTop = 0;
  }
  updateDirtyUi();
  syncSettingsPreview();
}

function activateEventSection(name) {
  clearOkToast();
  const allowed = ['follow', 'share', 'superFan', 'envelope', 'portal', 'like', 'member'];
  const current = allowed.includes(name) ? name : 'follow';
  for (const button of document.querySelectorAll('[data-event-section-btn]')) {
    const on = button.dataset.eventSectionBtn === current;
    button.classList.toggle('is-active', on);
    button.setAttribute('aria-selected', on ? 'true' : 'false');
  }
  for (const card of document.querySelectorAll('[data-event-section]')) {
    card.hidden = card.dataset.eventSection !== current;
  }
}

function noteFormChanged() {
  updateDirtyUi();
  scheduleFormSave();
}

function scheduleFormSave() {
  window.clearTimeout(formSaveTimer);
  formSaveTimer = window.setTimeout(() => {
    formSaveTimer = 0;
    void enqueueFormSave();
  }, 400);
}

function enqueueFormSave() {
  formSaveChain = formSaveChain.catch(() => undefined).then(() => saveFormNow());
  return formSaveChain;
}

async function flushFormSave() {
  window.clearTimeout(formSaveTimer);
  formSaveTimer = 0;
  return enqueueFormSave();
}

async function settleFormSave() {
  window.clearTimeout(formSaveTimer);
  formSaveTimer = 0;
  await formSaveChain.catch(() => undefined);
}

async function saveFormNow() {
  if (!isDirty()) {
    return { ok: true };
  }
  const error = validateForm();
  if (error) {
    setToast(error, true);
    return { ok: false, message: error };
  }
  const wasCompact = Boolean(savedConfig?.compactViewer);
  const payload = collectConfig();
  configEchoWait += 1;
  const result = await window.liveTts.saveConfig(payload);
  if (result.ok && result.config) {
    savedConfig = result.config;
    if (result.config.overlayUrl) {
      $('overlay-url').textContent = result.config.overlayUrl;
    }
    if (result.config.overlayStudioUrl) {
      $('overlay-studio-url').textContent = result.config.overlayStudioUrl;
    }
    if (result.config.overlayPreviewUrl && $('overlay-local-url')) {
      $('overlay-local-url').textContent = result.config.overlayPreviewUrl;
    }
    applyWindowPrefUi(Boolean(result.config.alwaysOnTop), Boolean(result.config.compactViewer));
    if (JSON.stringify(collectConfig()) === JSON.stringify(payload)) {
      markClean();
    } else {
      scheduleFormSave();
    }
    if (result.config.compactViewer && !wasCompact) {
      activateAppMode('viewer');
    }
    return { ok: true, config: result.config };
  }
  if (!result.config) {
    configEchoWait = Math.max(0, configEchoWait - 1);
  }
  const message = result.message || '保存に失敗しました';
  setToast(message, true);
  return { ok: false, message };
}

async function requestTab(name) {
  const current = document.querySelector('.tabs__btn.is-active');
  if (current && current.dataset.tab === name) {
    return;
  }
  const saved = await flushFormSave();
  if (!saved?.ok) {
    return;
  }
  activateTab(name);
}

async function loadVoices() {
  const voices = await window.liveTts.getTtsVoices();
  const select = $('tts-voice');
  const selected = select.dataset.selected || '';
  const engine = $('tts-engine').value;
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = engine === 'voicevox' ? '声を選択' : '既定の声';
  select.append(empty);
  for (const voice of voices) {
    const option = document.createElement('option');
    option.value = voice.id;
    option.textContent = voice.name;
    if (voice.speakerName) {
      option.dataset.speaker = voice.speakerName;
    }
    select.append(option);
  }
  if (selected) {
    select.value = selected;
    if (select.value !== selected) {
      const option = document.createElement('option');
      option.value = selected;
      option.textContent = selected;
      option.dataset.speaker = select.dataset.speaker || '';
      select.append(option);
      select.value = selected;
    }
  }
}

