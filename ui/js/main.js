let savedSnapshot = '';
let savedConfig = null;
let lookPresets = {};
let overlayFonts = [];
let configEchoWait = 0;
let appMode = 'viewer';
let viewerCommentStick = true;
let viewerEventStick = true;
let previewPanePx = DEFAULT_SETTINGS_PREVIEW_PX;
let viewerEventPanePx = DEFAULT_VIEWER_EVENT_PANE_PX;
let viewerLayout = DEFAULT_VIEWER_LAYOUT;
let hotkeyCapture = '';
let viewerDock = structuredClone(DEFAULT_VIEWER_DOCK);
let fanLevelLook = structuredClone(DEFAULT_FAN_LEVEL_LOOK);
const viewerStickByLog = new Map();
let dockDrag = null;
let viewerFontSize = DEFAULT_VIEWER_FONT_SIZE;
let viewerFontSaveTimer = 0;
let viewerLayoutPersistChain = Promise.resolve();
let viewerSearchQuery = '';
let viewerFocusUser = null;
let lastStatus = { state: 'disconnected' };
let pendingConnectUser = null;
let lookupBusy = false;

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason || '');
  setToast(message || '操作に失敗しました', true);
});
window.addEventListener('error', (event) => {
  if (event.message) {
    setToast(event.message, true);
  }
});

async function init() {
  if (!window.liveTts || typeof window.liveTts.onStatusChanged !== 'function') {
    setToast('アプリの接続面が読み込めませんでした。再起動してください。', true);
    return;
  }
  $('btn-close')?.addEventListener('click', () => {
    void Promise.all([flushFormSave(), flushViewerLayoutPersist()]).finally(() =>
      window.liveTts.closeWindow(),
    );
  });
  $('btn-help')?.addEventListener('click', () => {
    closeTitlebarMenus();
    window.liveTts.openHelp();
  });
  bindTitlebarMenus();
  window.liveTts.onStatusChanged(applyStatus);
  window.liveTts.onConfigChanged((next) => {
    if (configEchoWait > 0) {
      configEchoWait -= 1;
      savedConfig = next;
      return;
    }
    if (isDirty()) {
      return;
    }
    savedConfig = next;
    fillConfig(next);
    markClean();
  });
  window.liveTts.onNotice((payload) => {
    if (!payload || typeof payload !== 'object') {
      return;
    }
    const notice = payload;
    if (typeof notice.message === 'string' && notice.message) {
      setToast(notice.message, notice.ok === false);
    }
  });
  if (typeof window.liveTts.onViewerEvent === 'function') {
    window.liveTts.onViewerEvent(appendViewerEvent);
  }
  const [config, status] = await Promise.all([
    window.liveTts.getConfig(),
    window.liveTts.getStatus(),
  ]);
  savedConfig = config;
  fillConfig(config);
  applyStatus(status);
  await loadVoices();
  await loadTestGifts();
  if ($('unique-id')?.value.trim()) {
    void refreshTestGifts(false);
  }
  markClean();
  activateAppMode('viewer');
  syncViewerEmpty();
  syncViewerLatestButton();

  $('mode-viewer').addEventListener('click', () => {
    void requestAppMode('viewer');
  });
  $('mode-settings').addEventListener('click', () => {
    void requestAppMode('settings');
  });
  $('viewer-workspace')?.addEventListener('scroll', (event) => {
    if (!event.target.classList?.contains('viewer')) {
      return;
    }
    setViewerStick(event.target, isViewerNearBottom(event.target));
    syncViewerLatestButton();
    hideViewerUserMenu();
  }, true);
  $('btn-viewer-latest').addEventListener('click', () => {
    for (const log of allViewerLogs()) {
      scrollViewerLogToLatest(log);
    }
    syncViewerLatestButton();
  });
  $('btn-viewer-clear').addEventListener('click', () => {
    clearViewerLog();
    setToast(uiCopy.viewerCleared);
  });
  const showViewerSamples = async () => {
    const result = await window.liveTts.previewOverlay('viewer');
    setToast(result?.message || uiCopy.viewerPreviewSamples, !result?.ok);
  };
  $('btn-viewer-preview-samples')?.addEventListener('click', () => {
    void showViewerSamples();
  });
  $('btn-guide-samples')?.addEventListener('click', () => {
    void showViewerSamples();
  });
  $('btn-guide-clear-samples')?.addEventListener('click', () => {
    clearViewerLog();
    setToast(uiCopy.viewerCleared);
  });
  const showOverlaySamples = async () => {
    const result = await window.liveTts.previewOverlay('overlay');
    setToast(result?.message || uiCopy.overlayPreviewSamples, !result?.ok);
  };
  const clearOverlayChat = async () => {
    const result = await window.liveTts.clearOverlay();
    setToast(result?.message || uiCopy.overlayClearChat, !result?.ok);
  };
  $('btn-overlay-preview-samples')?.addEventListener('click', () => {
    void showOverlaySamples();
  });
  $('btn-look-overlay-samples')?.addEventListener('click', () => {
    void showOverlaySamples();
  });
  $('btn-overlay-clear')?.addEventListener('click', () => {
    void clearOverlayChat();
  });
  $('btn-look-overlay-clear')?.addEventListener('click', () => {
    void clearOverlayChat();
  });
  $('event-sections')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-event-section-btn]');
    if (!button) {
      return;
    }
    activateEventSection(button.dataset.eventSectionBtn);
  });
  $('btn-viewer-save-log')?.addEventListener('click', async () => {
    if (typeof window.liveTts.saveSessionLog !== 'function') {
      setToast(uiCopy.viewerLogFailed, true);
      return;
    }
    const result = await window.liveTts.saveSessionLog();
    if (result?.cancelled) {
      return;
    }
    setToast(result?.message || uiCopy.viewerLogSaved, !result?.ok);
  });
  $('viewer-search')?.addEventListener('input', () => {
    viewerSearchQuery = $('viewer-search').value || '';
    applyViewerSearch();
  });
  $('view-viewer')?.addEventListener('click', (event) => {
    if (event.target.closest('button, input, a, label, .viewer-toolbar')) {
      return;
    }
    const item = event.target.closest('.viewer__item');
    if (!item) {
      if (viewerFocusUser) {
        viewerFocusUser = null;
        applyViewerFocus();
      }
      return;
    }
    if (item.classList.contains('viewer__item--status')) {
      return;
    }
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && item.contains(selection.anchorNode)) {
      return;
    }
    toggleViewerFocus(item);
  });
  $('btn-viewer-layout-combined')?.addEventListener('click', () => {
    applyViewerLayout('combined', true);
  });
  $('btn-viewer-layout-split')?.addEventListener('click', () => {
    applyViewerLayout('split', true);
  });
  $('btn-viewer-layout-custom')?.addEventListener('click', () => {
    applyViewerLayout('custom', true);
  });
  $('speak-fan-sub-only')?.addEventListener('change', () => {
    syncSpeakFanOptions();
  });
  $('skip-repeat-speech')?.addEventListener('change', () => {
    syncRepeatSpeechOptions();
  });
  $('fan-level-look')?.addEventListener('input', (event) => {
    if (!event.target.matches('[data-fan-min], [data-fan-color]')) {
      return;
    }
    fanLevelLook = collectFanLevelLook();
    refreshViewerFanBadges();
    for (const row of document.querySelectorAll('#fan-level-look-rows .fan-level-look__row')) {
      const min = Number(row.querySelector('[data-fan-min]')?.value);
      const preview = row.querySelector('.viewer__badge');
      if (preview) {
        preview.textContent = `${uiCopy.viewerBadgeFan}${clampFanLevel(min)}`;
        applyFanBadgeColor(preview, min);
      }
    }
    noteFormChanged();
  });
  $('fan-level-look')?.addEventListener('change', () => {
    fanLevelLook = collectFanLevelLook();
    renderFanLevelLook();
    refreshViewerFanBadges();
    noteFormChanged();
  });
  $('fan-level-look')?.addEventListener('click', (event) => {
    const swatch = event.target.closest('.fan-level-swatch');
    if (!swatch) {
      return;
    }
    const picker = swatch.closest('.fan-level-look__row')?.querySelector('[data-fan-color]');
    if (picker) {
      picker.value = swatch.dataset.color;
    }
    fanLevelLook = collectFanLevelLook();
    renderFanLevelLook();
    refreshViewerFanBadges();
    noteFormChanged();
  });
  $('viewer-display')?.addEventListener('change', () => {
    void persistViewerDisplay();
  });
  $('viewer-font-size')?.addEventListener('input', () => {
    applyViewerFontSize($('viewer-font-size').value);
    patchSnapshotViewerFontSize(viewerFontSize);
    schedulePersistViewerFontSize();
  });
  $('viewer-font-size')?.addEventListener('change', () => {
    window.clearTimeout(viewerFontSaveTimer);
    applyViewerFontSize($('viewer-font-size').value);
    patchSnapshotViewerFontSize(viewerFontSize);
    void persistViewerFontSize();
  });
  $('view-viewer')?.addEventListener('contextmenu', (event) => {
    const item = event.target.closest('.viewer__item');
    if (!item || item.classList.contains('viewer__item--status')) {
      return;
    }
    event.preventDefault();
    showViewerUserMenu(event, item);
  });
  $('viewer-user-menu-copy')?.addEventListener('click', () => {
    void copyViewerMenuField('comment');
  });
  $('viewer-user-menu-copy-id')?.addEventListener('click', () => {
    void copyViewerMenuField('id');
  });
  $('viewer-user-menu-copy-nickname')?.addEventListener('click', () => {
    void copyViewerMenuField('nickname');
  });
  $('viewer-user-menu-mute')?.addEventListener('click', () => {
    void applyViewerUserAction('mute');
  });
  $('viewer-user-menu-block')?.addEventListener('click', () => {
    void applyViewerUserAction('block');
  });
  document.addEventListener('click', (event) => {
    const menu = $('viewer-user-menu');
    if (!menu || menu.hidden || menu.contains(event.target)) {
      return;
    }
    hideViewerUserMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideViewerUserMenu();
    }
  });
  $('viewer-log-comments')?.addEventListener('scroll', hideViewerUserMenu);
  $('viewer-log-events')?.addEventListener('scroll', hideViewerUserMenu);
  bindPreviewPaneResize();
  bindViewerPaneResize();

  for (const button of document.querySelectorAll('.tabs__btn')) {
    button.addEventListener('click', () => requestTab(button.dataset.tab));
  }
  document.querySelector('.tabs')?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    const buttons = [...document.querySelectorAll('.tabs__btn')];
    const index = buttons.indexOf(event.target);
    if (index < 0) {
      return;
    }
    event.preventDefault();
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % buttons.length
        : (index - 1 + buttons.length) % buttons.length;
    const nextName = buttons[next].dataset.tab;
    void requestTab(nextName).then(() => {
      const current = document.querySelector('.tabs__btn.is-active');
      current?.focus();
    });
  });

  document.querySelector('.panel')?.addEventListener('input', (event) => {
    if (event.target?.id === 'test-gift') {
      syncTestGiftIcon();
      return;
    }
    syncLookLabels();
    syncLookPresetButtons();
    syncDisplayTimeUi();
    syncUiTheme();
    syncNeonHueField();
    syncRepeatSpeechOptions();
    syncPinOptions();
    noteFormChanged();
    pushLookPreview();
  });
  document.querySelector('.panel')?.addEventListener('change', (event) => {
    if (event.target?.id === 'test-gift') {
      syncTestGiftIcon();
      return;
    }
    syncLookLabels();
    syncLookPresetButtons();
    syncDisplayTimeUi();
    syncUiTheme();
    syncNeonHueField();
    syncRepeatSpeechOptions();
    syncPinOptions();
    noteFormChanged();
    pushLookPreview();
  });

  $('overlay-preview').addEventListener('load', () => {
    pushLookPreview();
    window.setTimeout(pushLookPreview, 200);
  });
  $('preview-font-size')?.addEventListener('input', () => {
    const next = $('preview-font-size').value;
    if ($('look-font-size')) {
      $('look-font-size').value = next;
    }
    syncLookLabels();
    syncLookPresetButtons();
    noteFormChanged();
    pushLookPreview();
  });

  for (const button of document.querySelectorAll('[data-look-preset]')) {
    button.addEventListener('click', () => applyLookPreset(button.dataset.lookPreset));
  }
  $('look-motion-speed')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-motion-speed]');
    if (!button) {
      return;
    }
    syncMotionSpeedButtons(button.dataset.motionSpeed);
    noteFormChanged();
    pushLookPreview();
  });
  $('btn-look-motion-replay')?.addEventListener('click', () => {
    pushLookPreview();
    replayLookMotion();
  });

  $('btn-connect').addEventListener('click', () => {
    void connectNow();
  });
  $('btn-connect-confirm').addEventListener('click', () => {
    if (pendingConnectUser) {
      void startConfirmedConnect(pendingConnectUser);
    }
  });
  $('btn-connect-cancel').addEventListener('click', () => {
    hideConnectConfirm();
  });
  $('connect-confirm').addEventListener('click', (event) => {
    if (event.target === $('connect-confirm')) {
      hideConnectConfirm();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('connect-confirm').hidden) {
      hideConnectConfirm();
    }
  });
  $('btn-guide-action').addEventListener('click', async () => {
    const action = $('btn-guide-action').dataset.action;
    if (action === 'setup') {
      await openConnectSetup();
      return;
    }
    if (action === 'connect') {
      await connectNow();
      return;
    }
    if (action === 'copy-url') {
      const result = await window.liveTts.copyOverlayUrl();
      setToast(result.message, !result.ok);
    }
  });
  $('btn-disconnect').addEventListener('click', async () => {
    try {
      applyStatus(await window.liveTts.disconnect());
    } catch (error) {
      setToast(error instanceof Error ? error.message : '切断に失敗しました', true);
    }
  });
  const skipSpeechNow = async () => {
    const result = await window.liveTts.skipSpeech();
    setToast(result.message, !result.ok);
  };
  const clearSpeechNow = async () => {
    const result = await window.liveTts.clearSpeechQueue();
    setToast(result.message, !result.ok);
  };
  const clearPinNow = async () => {
    const result = await window.liveTts.clearOverlayPin();
    setToast(result.message, !result.ok);
  };
  $('btn-skip-speech').addEventListener('click', () => {
    void skipSpeechNow();
  });
  $('btn-clear-speech').addEventListener('click', () => {
    void clearSpeechNow();
  });
  $('btn-clear-pin')?.addEventListener('click', () => {
    void clearPinNow();
  });
  $('btn-always-on-top')?.addEventListener('click', () => {
    void persistWindowPrefs({ alwaysOnTop: !$('btn-always-on-top').classList.contains('is-active') });
  });
  $('btn-compact-viewer')?.addEventListener('click', () => {
    void persistWindowPrefs({
      compactViewer: !$('btn-compact-viewer').classList.contains('is-active'),
    });
  });
  $('hotkey-skip-speech')?.addEventListener('click', () => {
    startHotkeyCapture('hotkey-skip-speech');
  });
  $('hotkey-clear-speech')?.addEventListener('click', () => {
    startHotkeyCapture('hotkey-clear-speech');
  });
  $('hotkey-clear-pin')?.addEventListener('click', () => {
    startHotkeyCapture('hotkey-clear-pin');
  });
  $('hotkey-skip-unset')?.addEventListener('click', () => {
    unsetSpeechHotkey('hotkey-skip-speech');
  });
  $('hotkey-clear-unset')?.addEventListener('click', () => {
    unsetSpeechHotkey('hotkey-clear-speech');
  });
  $('hotkey-clear-pin-unset')?.addEventListener('click', () => {
    unsetSpeechHotkey('hotkey-clear-pin');
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !hotkeyCapture) {
      closeTitlebarMenus();
    }
    if (hotkeyCapture) {
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      const key = hotkeyFromEvent(event);
      if (!key) {
        return;
      }
      const others = [
        ['hotkey-skip-speech', DEFAULT_SKIP_SPEECH_HOTKEY],
        ['hotkey-clear-speech', DEFAULT_CLEAR_SPEECH_HOTKEY],
        ['hotkey-clear-pin', DEFAULT_CLEAR_PIN_HOTKEY],
      ].filter(([id]) => id !== hotkeyCapture);
      if (others.some(([id, fallback]) => key === speechHotkeyValue(id, fallback))) {
        setToast(uiCopy.invalidHotkeySame, true);
        return;
      }
      paintHotkeyButton(hotkeyCapture, key, false);
      hotkeyCapture = '';
      syncSpeechHotkeyUi();
      noteFormChanged();
      return;
    }
    if (event.repeat) {
      return;
    }
    const typing = event.target?.closest?.('input, textarea, select, [contenteditable="true"]');
    if (typing) {
      return;
    }
    const skip = speechHotkeyValue('hotkey-skip-speech', DEFAULT_SKIP_SPEECH_HOTKEY);
    const clear = speechHotkeyValue('hotkey-clear-speech', DEFAULT_CLEAR_SPEECH_HOTKEY);
    const pin = speechHotkeyValue('hotkey-clear-pin', DEFAULT_CLEAR_PIN_HOTKEY);
    if (isHotkeyEvent(event, skip)) {
      event.preventDefault();
      void skipSpeechNow();
      return;
    }
    if (isHotkeyEvent(event, clear)) {
      event.preventDefault();
      void clearSpeechNow();
      return;
    }
    if (isHotkeyEvent(event, pin)) {
      event.preventDefault();
      void clearPinNow();
    }
  });
  $('btn-copy-url').addEventListener('click', async () => {
    const result = await window.liveTts.copyOverlayUrl();
    setToast(result.message, !result.ok);
  });
  $('btn-copy-studio-url').addEventListener('click', async () => {
    const result = await window.liveTts.copyOverlayUrl('studio');
    setToast(result.message, !result.ok);
  });
  $('btn-copy-obs-url')?.addEventListener('click', async () => {
    const result = await window.liveTts.copyOverlayUrl('local');
    setToast(result.message, !result.ok);
  });
  async function applyReturnedConfig(result) {
    if (result.cancelled) {
      configEchoWait = Math.max(0, configEchoWait - 1);
      return;
    }
    if (result.config) {
      savedConfig = result.config;
      applyCopy(result.config);
      fillConfig(result.config);
      await loadVoices();
      markClean();
    } else {
      configEchoWait = Math.max(0, configEchoWait - 1);
    }
    if (result.message) {
      setToast(result.message, !result.ok);
    }
  }

  $('btn-reset-config')?.addEventListener('click', async () => {
    await settleFormSave();
    configEchoWait += 1;
    const result = await window.liveTts.resetConfig();
    await applyReturnedConfig(result);
  });
  $('btn-export-config')?.addEventListener('click', async () => {
    const saved = await flushFormSave();
    if (!saved?.ok) {
      return;
    }
    const result = await window.liveTts.exportConfig();
    if (result.cancelled || !result.message) {
      return;
    }
    setToast(result.message, !result.ok);
  });
  $('btn-import-config')?.addEventListener('click', async () => {
    await settleFormSave();
    configEchoWait += 1;
    const result = await window.liveTts.importConfig();
    await applyReturnedConfig(result);
  });
  $('btn-preview-tts').addEventListener('click', async () => {
    const saved = await flushFormSave();
    if (!saved.ok) {
      return;
    }
    const result = await window.liveTts.previewTts();
    setToast(result.message, !result.ok);
  });
  $('tts-engine').addEventListener('change', () => {
    $('tts-voice').dataset.selected = '';
    $('tts-voice').value = '';
    $('tts-credit-text').value = '';
    updateTtsEngineUi();
  });
  $('btn-reload-voices').addEventListener('click', async () => {
    const saved = await flushFormSave();
    if (!saved.ok) {
      return;
    }
    const ping = await window.liveTts.checkTtsEngine();
    setToast(ping.message, !ping.ok);
    await loadVoices();
    markClean();
  });
  $('btn-pick-voicevox').addEventListener('click', async () => {
    const result = await window.liveTts.pickVoicevoxExe();
    if (result.cancelled) {
      return;
    }
    if (!result.ok) {
      setToast(result.message, true);
      return;
    }
    $('voicevox-exe').value = result.path ?? '';
    noteFormChanged();
  });
  $('btn-launch-voicevox').addEventListener('click', async () => {
    const saved = await flushFormSave();
    if (!saved.ok) {
      return;
    }
    setToast(uiCopy.voicevoxLaunching);
    const result = await window.liveTts.launchVoicevox();
    setToast(result.message, !result.ok);
    if (result.ok) {
      await loadVoices();
      markClean();
    }
  });
  $('btn-copy-credit').addEventListener('click', async () => {
    const saved = await flushFormSave();
    if (!saved.ok) {
      return;
    }
    const result = await window.liveTts.copyVoicevoxCredit();
    setToast(result.message, !result.ok);
  });
  $('btn-reload-gifts').addEventListener('click', async () => {
    await refreshTestGifts(true);
  });

  for (const button of document.querySelectorAll('[data-test-event]')) {
    button.addEventListener('click', async () => {
      const saved = await flushFormSave();
      if (!saved.ok) {
        return;
      }
      const type = button.dataset.testEvent;
      const count =
        button.dataset.testCount === 'milestone'
          ? Number($('like-milestone').value)
          : Number(button.dataset.testCount || '1');
      const result = await window.liveTts.sendTestEvent(
        type,
        count,
        type === 'gift' ? selectedTestGiftId() : '',
        {
          isFanClub: button.dataset.testFan === '1',
          fanClubStatus: Number(button.dataset.testFanStatus || '0'),
          isSuperFan: button.dataset.testSuper === '1',
          fanClubLevel: Number(button.dataset.testFanLevel || '0'),
          isModerator: button.dataset.testMod === '1',
          isAnchor: button.dataset.testAnchor === '1',
          diamondCount: button.dataset.testDiamonds
            ? Number(button.dataset.testDiamonds)
            : undefined,
          superFanBox: button.dataset.testBox === '1',
          portalJoin: button.dataset.testPortalJoin === '1',
        },
      );
      setToast(result.message, !result.ok);
    });
  }
}

init().catch((error) => {
  setToast(error instanceof Error ? error.message : '初期化に失敗しました', true);
});
