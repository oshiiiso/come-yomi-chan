function syncUiTheme() {
  window.LiveTtsUiTheme.apply($('ui-theme')?.value);
}

function applyCopy(config) {
  if (config && config.copy) {
    uiCopy = { ...uiCopy, ...config.copy };
  }
  const commentsLabel = $('viewer-pane-comments-label');
  const eventsLabel = $('viewer-pane-events-label');
  const commentsEmpty = $('viewer-empty-comments');
  const eventsEmpty = $('viewer-empty-events');
  const split = $('viewer-split');
  if (commentsLabel) {
    commentsLabel.textContent = uiCopy.viewerPaneComments;
  }
  if (eventsLabel) {
    eventsLabel.textContent = uiCopy.viewerPaneEvents;
  }
  if (commentsEmpty) {
    commentsEmpty.textContent = uiCopy.viewerEmptyComments;
  }
  if (eventsEmpty) {
    eventsEmpty.textContent = uiCopy.viewerEmptyEvents;
  }
  if (split && uiCopy.viewerSplitLabel) {
    split.setAttribute('aria-label', uiCopy.viewerSplitLabel);
  }
  const layoutSwitch = document.querySelector('.viewer-layout-switch');
  if (layoutSwitch && uiCopy.viewerLayoutLabel) {
    layoutSwitch.setAttribute('aria-label', uiCopy.viewerLayoutLabel);
  }
  const combinedBtn = $('btn-viewer-layout-combined');
  const splitBtn = $('btn-viewer-layout-split');
  const customBtn = $('btn-viewer-layout-custom');
  if (combinedBtn) {
    combinedBtn.textContent = uiCopy.viewerLayoutCombined;
  }
  if (splitBtn) {
    splitBtn.textContent = uiCopy.viewerLayoutSplit;
  }
  if (customBtn) {
    customBtn.textContent = uiCopy.viewerLayoutCustom;
    customBtn.title = uiCopy.viewerLayoutCustomHint || '';
  }
  const displayGroup = $('viewer-display');
  if (displayGroup && uiCopy.viewerDisplayLabel) {
    displayGroup.setAttribute('aria-label', uiCopy.viewerDisplayLabel);
  }
  const displayShort = $('viewer-display-label');
  if (displayShort && uiCopy.viewerDisplayShort) {
    displayShort.textContent = uiCopy.viewerDisplayShort;
  }
  if (uiCopy.eventDisplayLabel) {
    for (const el of document.querySelectorAll('[data-event-display-label]')) {
      el.textContent = uiCopy.eventDisplayLabel;
    }
  }
  const fontGroup = $('viewer-font');
  if (fontGroup && uiCopy.viewerFontSizeLabel) {
    fontGroup.setAttribute('aria-label', uiCopy.viewerFontSizeLabel);
  }
  const searchLabel = $('viewer-search-label');
  if (searchLabel && uiCopy.viewerSearchLabel) {
    searchLabel.textContent = uiCopy.viewerSearchLabel;
  }
  const searchInput = $('viewer-search');
  if (searchInput && uiCopy.viewerSearchPlaceholder) {
    searchInput.placeholder = uiCopy.viewerSearchPlaceholder;
  }
  const menuViewBtn = $('menu-view-btn');
  if (menuViewBtn && uiCopy.menuView) {
    menuViewBtn.textContent = uiCopy.menuView;
  }
  const menuLogBtn = $('menu-log-btn');
  if (menuLogBtn && uiCopy.menuLog) {
    menuLogBtn.textContent = uiCopy.menuLog;
  }
  const alwaysOnTopBtn = $('btn-always-on-top');
  if (alwaysOnTopBtn && uiCopy.alwaysOnTopMenu) {
    alwaysOnTopBtn.textContent = uiCopy.alwaysOnTopMenu;
  }
  const compactBtn = $('btn-compact-viewer');
  if (compactBtn && uiCopy.compactMenu) {
    compactBtn.textContent = uiCopy.compactMenu;
  }
  const previewSamples = $('btn-viewer-preview-samples');
  if (previewSamples && uiCopy.viewerPreviewSamples) {
    previewSamples.textContent = uiCopy.viewerPreviewSamples;
  }
  const guideSamples = $('btn-guide-samples');
  if (guideSamples && uiCopy.guideSamplesButton) {
    guideSamples.textContent = uiCopy.guideSamplesButton;
  }
  const guideClearSamples = $('btn-guide-clear-samples');
  if (guideClearSamples && uiCopy.guideClearSamplesButton) {
    guideClearSamples.textContent = uiCopy.guideClearSamplesButton;
  }
  for (const id of ['btn-overlay-preview-samples', 'btn-look-overlay-samples']) {
    const overlaySamples = $(id);
    if (overlaySamples && uiCopy.overlayPreviewSamples) {
      overlaySamples.textContent = uiCopy.overlayPreviewSamples;
    }
  }
  for (const id of ['btn-overlay-clear', 'btn-look-overlay-clear']) {
    const overlayClear = $(id);
    if (overlayClear && uiCopy.overlayClearChat) {
      overlayClear.textContent = uiCopy.overlayClearChat;
    }
  }
  const saveLog = $('btn-viewer-save-log');
  if (saveLog && uiCopy.viewerSaveLog) {
    saveLog.textContent = uiCopy.viewerSaveLog;
  }
  const clearLog = $('btn-viewer-clear');
  if (clearLog && uiCopy.viewerClearLog) {
    clearLog.textContent = uiCopy.viewerClearLog;
  }
  const pairs = [
    ['speak-fan-sub-only-label', 'speakFanSubOnlyLabel'],
    ['speak-fan-sub-only-hint', 'speakFanSubOnlyHint'],
    ['speak-fan-min-level-label', 'speakFanMinLevelLabel'],
    ['speak-subscriber-comments-label', 'speakSubscriberCommentsLabel'],
    ['speak-subscriber-comments-hint', 'speakSubscriberCommentsHint'],
    ['fan-level-look-label', 'fanLevelLookLabel'],
    ['fan-level-look-hint', 'fanLevelLookHint'],
    ['skip-repeat-speech-label', 'skipRepeatSpeechLabel'],
    ['skip-repeat-speech-hint', 'skipRepeatSpeechHint'],
    ['reset-config-hint', 'resetConfigHint'],
    ['btn-reset-config', 'resetConfigLabel'],
    ['transfer-config-hint', 'transferConfigHint'],
    ['btn-export-config', 'exportConfigLabel'],
    ['btn-import-config', 'importConfigLabel'],
    ['hotkey-title', 'hotkeyTitle'],
    ['hotkey-skip-label', 'hotkeySkipLabel'],
    ['hotkey-clear-label', 'hotkeyClearLabel'],
    ['hotkey-clear-pin-label', 'hotkeyClearPinLabel'],
    ['hotkey-skip-unset', 'hotkeyUnset'],
    ['hotkey-clear-unset', 'hotkeyUnset'],
    ['hotkey-clear-pin-unset', 'hotkeyUnset'],
    ['hotkey-hint', 'hotkeyHint'],
    ['tab-look', 'settingsTabLook'],
    ['look-tab-hint', 'lookTabHint'],
    ['look-chat-title', 'lookChatTitle'],
    ['btn-copy-obs-url', 'copyObsLabel'],
    ['look-motion-label', 'overlayMotionLabel'],
    ['look-motion-speed-label', 'overlayMotionSpeedLabel'],
    ['look-motion-hint', 'overlayMotionHint'],
    ['btn-look-motion-replay', 'overlayMotionReplay'],
    ['look-pin-title', 'overlayPinTitle'],
    ['look-pin-hint', 'overlayPinHint'],
    ['look-pin-enabled-label', 'overlayPinEnabledLabel'],
    ['look-pin-enabled-hint', 'overlayPinEnabledHint'],
    ['look-pin-sec-label', 'overlayPinSecLabel'],
    ['look-pin-hold-label', 'overlayPinHoldLabel'],
    ['look-pin-hold-hint', 'overlayPinHoldHint'],
    ['look-pin-types-label', 'overlayPinTypesLabel'],
    ['look-pin-types-hint', 'overlayPinTypesHint'],
    ['look-pin-preview-label', 'overlayPinPreviewLabel'],
    ['look-pin-preview-hint', 'overlayPinPreviewHint'],
  ];
  for (const [id, key] of pairs) {
    const el = $(id);
    if (el && uiCopy[key]) {
      el.textContent = uiCopy[key];
    }
  }
  syncRepeatSpeechOptions();
  fillMotionSelect($('look-motion')?.value);
  syncMotionSpeedButtons(selectedMotionSpeed());
  fillPinTypes(collectPinTypes());
  syncPinOptions();
}

function fillConfig(config) {
  applyCopy(config);
  $('unique-id').value = config.uniqueId ?? '';
  $('overlay-port').value = String(config.overlayPort ?? 8787);
  $('overlay-url').textContent = config.overlayUrl ?? '';
  $('overlay-studio-url').textContent = config.overlayStudioUrl ?? '';
  if ($('overlay-local-url')) {
    $('overlay-local-url').textContent = config.overlayPreviewUrl ?? '';
  }
  $('chat-max-rows').value = String(config.chatMaxRows ?? 8);
  fillDisplayTime(config.chatDisplayMs);
  $('overlay-css').value = config.overlayCustomCss ?? '';
  $('max-display-chars').value = String(config.maxDisplayChars ?? 80);
  fillLook(config);
  $('hide-user-name').checked = Boolean(config.hideUserName);
  $('max-speech-chars').value = String(config.maxSpeechChars ?? 80);
  $('max-queue').value = String(config.maxQueue ?? 20);
  fillSpeechHotkeys(config);
  $('comment-display').value = config.commentDisplayTemplate ?? '';
  $('comment-speech').value = config.commentSpeechTemplate ?? '';
  $('gift-display').value = config.giftDisplayTemplate ?? '';
  $('gift-speech').value = config.giftSpeechTemplate ?? '';
  $('follow-display').value = config.followDisplayTemplate ?? '';
  $('follow-speech').value = config.followSpeechTemplate ?? '';
  $('share-display').value = config.shareDisplayTemplate ?? '';
  $('share-speech').value = config.shareSpeechTemplate ?? '';
  $('superfan-display').value = config.superFanDisplayTemplate ?? '';
  $('superfan-speech').value = config.superFanSpeechTemplate ?? '';
  if ($('superfan-box-display')) {
    $('superfan-box-display').value = config.superFanBoxDisplayTemplate ?? '';
  }
  if ($('superfan-box-speech')) {
    $('superfan-box-speech').value = config.superFanBoxSpeechTemplate ?? '';
  }
  $('envelope-display').value = config.envelopeDisplayTemplate ?? '';
  $('envelope-speech').value = config.envelopeSpeechTemplate ?? '';
  if ($('portal-display')) {
    $('portal-display').value = config.portalDisplayTemplate ?? '';
  }
  if ($('portal-speech')) {
    $('portal-speech').value = config.portalSpeechTemplate ?? '';
  }
  if ($('portal-join-display')) {
    $('portal-join-display').value = config.portalJoinDisplayTemplate ?? '';
  }
  if ($('portal-join-speech')) {
    $('portal-join-speech').value = config.portalJoinSpeechTemplate ?? '';
  }
  $('like-display').value = config.likeDisplayTemplate ?? '';
  $('like-speech').value = config.likeSpeechTemplate ?? '';
  $('member-display').value = config.memberDisplayTemplate ?? '';
  $('member-speech').value = config.memberSpeechTemplate ?? '';
  $('min-gift-diamonds').value = String(config.minGiftDiamonds ?? 0);
  $('like-milestone').value = String(config.likeMilestone ?? 10);
  $('tts-engine').value = config.ttsEngineId === 'voicevox' ? 'voicevox' : 'windows';
  $('voicevox-host').value = config.voicevoxHost ?? '127.0.0.1';
  $('voicevox-port').value = String(config.voicevoxPort ?? 50021);
  $('voicevox-exe').value = config.voicevoxExePath || config.voicevoxExeSuggested || '';
  $('voicevox-launch-on-start').checked = Boolean(config.voicevoxLaunchOnStart);
  $('tts-rate').value = String(config.ttsRate ?? 0);
  $('tts-volume').value = String(config.ttsVolume ?? 100);
  $('beat-ms').value = String(config.beatMs ?? 300);
  $('tts-test-text').value = config.ttsTestText ?? '';
  $('tts-credit-text').value = config.voicevoxCreditText ?? '';
  $('ng-words').value = (config.ngWords ?? []).join('\n');
  $('blocked-users').value = (config.blockedUsers ?? []).join('\n');
  $('muted-users').value = (config.mutedUsers ?? []).join('\n');
  $('skip-mention-speech').checked = config.skipMentionSpeech !== false;
  $('skip-url-speech').checked = config.skipUrlSpeech !== false;
  if ($('skip-anchor-speech')) {
    $('skip-anchor-speech').checked = config.skipAnchorSpeech !== false;
  }
  if ($('skip-emote-speech')) {
    $('skip-emote-speech').checked = config.skipEmoteSpeech !== false;
  }
  if ($('speak-fan-sub-only')) {
    $('speak-fan-sub-only').checked = Boolean(config.speakFanSubOnly);
  }
  if ($('speak-fan-min-level')) {
    $('speak-fan-min-level').value = String(config.speakFanMinLevel ?? 1);
  }
  if ($('speak-subscriber-comments')) {
    $('speak-subscriber-comments').checked = config.speakSubscriberComments !== false;
  }
  fanLevelLook = normalizeFanLevelLook(config.fanLevelLook);
  renderFanLevelLook();
  syncSpeakFanOptions();
  if (config.viewerDock) {
    viewerDock = cloneDock(config.viewerDock);
  }
  if ($('skip-repeat-speech')) {
    $('skip-repeat-speech').checked = config.skipRepeatSpeech !== false;
  }
  if ($('repeat-speech-sec')) {
    $('repeat-speech-sec').value = String(config.repeatSpeechSec ?? 6);
  }
  syncRepeatSpeechOptions();
  $('minimize-tray').checked = Boolean(config.minimizeToTray);
  $('auto-connect').checked = Boolean(config.autoConnectOnStart);
  applyWindowPrefUi(Boolean(config.alwaysOnTop), Boolean(config.compactViewer));
  $('ui-theme').value = window.LiveTtsUiTheme.normalize(config.uiTheme);
  syncUiTheme();
  $('tts-voice').dataset.selected = config.ttsVoice ?? '';
  $('tts-voice').dataset.speaker = config.ttsVoicevoxSpeakerName ?? '';
  if ($('tts-voice').options.length > 0) {
    $('tts-voice').value = config.ttsVoice ?? '';
  }

  const events = config.events ?? {};
  for (const key of EVENT_ORDER) {
    const toggle = events[key] ?? { display: false, speak: false };
    const display = $(`display-${key}`);
    const speak = $(`speak-${key}`);
    if (display) {
      display.checked = Boolean(toggle.display);
    }
    if (speak) {
      speak.checked = Boolean(toggle.speak);
    }
  }

  syncSettingsPreview();
  updateTtsEngineUi();
  syncViewerEmpty();
  applyPreviewPane(config.settingsPreviewPx);
  applyViewerEventPane(config.viewerEventPanePx);
  applyViewerDisplay(config.viewerDisplay);
  applyViewerLayout(config.viewerLayout, false);
  applyViewerFontSize(config.viewerFontSize);
}

function collectConfig() {
  const events = {};
  for (const key of EVENT_ORDER) {
    events[key] = {
      display: Boolean($(`display-${key}`)?.checked),
      speak: Boolean($(`speak-${key}`)?.checked),
    };
  }
  if (events.superFan) {
    events.subscribe = { ...events.superFan };
  }

  return {
    uniqueId: $('unique-id').value.trim(),
    overlayPort: Number($('overlay-port').value),
    chatMaxRows: Number($('chat-max-rows').value),
    chatDisplayMs: $('chat-display-unlimited').checked
      ? 0
      : Math.round(Number($('chat-display-sec').value) * 1000),
    overlayCustomCss: $('overlay-css').value,
    overlayTheme: $('look-theme').value || 'dark',
    overlayFontSize: Number($('look-font-size').value),
    overlayBgOpacity: Number($('look-bg-opacity').value),
    overlayShowAvatar: $('look-show-avatar').checked,
    overlayGiftIconSize: Number($('look-gift-size').value),
    overlayItemRadius: Number($('look-radius').value),
    overlayNeonHue: Number($('look-neon-hue').value),
    overlayAlign: $('look-align').value,
    overlayPreviewBackdrop: $('look-backdrop').value,
    overlayFontFamily: $('look-font').value || 'default',
    overlayMotion: normalizeOverlayMotion($('look-motion')?.value),
    overlayMotionSpeed: selectedMotionSpeed(),
    overlayPinEnabled: $('look-pin-enabled')?.checked !== false,
    overlayPinMs: Math.round(Number($('look-pin-sec')?.value) * 1000),
    overlayPinHold: Boolean($('look-pin-hold')?.checked),
    overlayPinTypes: collectPinTypes(),
    overlayPinPreview: $('look-pin-preview')?.checked !== false,
    maxDisplayChars: Number($('max-display-chars').value),
    hideUserName: $('hide-user-name').checked,
    maxSpeechChars: Number($('max-speech-chars').value),
    maxQueue: Number($('max-queue').value),
    skipSpeechHotkey: speechHotkeyValue('hotkey-skip-speech', DEFAULT_SKIP_SPEECH_HOTKEY),
    clearSpeechHotkey: speechHotkeyValue('hotkey-clear-speech', DEFAULT_CLEAR_SPEECH_HOTKEY),
    clearPinHotkey: speechHotkeyValue('hotkey-clear-pin', DEFAULT_CLEAR_PIN_HOTKEY),
    commentDisplayTemplate: $('comment-display').value,
    commentSpeechTemplate: $('comment-speech').value,
    giftDisplayTemplate: $('gift-display').value,
    giftSpeechTemplate: $('gift-speech').value,
    followDisplayTemplate: $('follow-display').value,
    followSpeechTemplate: $('follow-speech').value,
    shareDisplayTemplate: $('share-display').value,
    shareSpeechTemplate: $('share-speech').value,
    subscribeDisplayTemplate: $('superfan-display').value,
    subscribeSpeechTemplate: $('superfan-speech').value,
    superFanDisplayTemplate: $('superfan-display').value,
    superFanSpeechTemplate: $('superfan-speech').value,
    superFanBoxDisplayTemplate: $('superfan-box-display')?.value ?? '',
    superFanBoxSpeechTemplate: $('superfan-box-speech')?.value ?? '',
    envelopeDisplayTemplate: $('envelope-display').value,
    envelopeSpeechTemplate: $('envelope-speech').value,
    portalDisplayTemplate: $('portal-display')?.value ?? '',
    portalSpeechTemplate: $('portal-speech')?.value ?? '',
    portalJoinDisplayTemplate: $('portal-join-display')?.value ?? '',
    portalJoinSpeechTemplate: $('portal-join-speech')?.value ?? '',
    likeDisplayTemplate: $('like-display').value,
    likeSpeechTemplate: $('like-speech').value,
    memberDisplayTemplate: $('member-display').value,
    memberSpeechTemplate: $('member-speech').value,
    minGiftDiamonds: Number($('min-gift-diamonds').value),
    alwaysOnTop: Boolean($('always-on-top')?.checked),
    compactViewer: Boolean($('compact-viewer')?.checked),
    likeMilestone: Number($('like-milestone').value),
    ttsEngineId: $('tts-engine').value === 'voicevox' ? 'voicevox' : 'windows',
    ttsVoice: $('tts-voice').value,
    ttsTestText: $('tts-test-text').value,
    ttsVoicevoxSpeakerName: selectedVoiceSpeakerName(),
    voicevoxHost: $('voicevox-host').value.trim(),
    voicevoxPort: Number($('voicevox-port').value),
    voicevoxExePath: $('voicevox-exe').value.trim(),
    voicevoxLaunchOnStart: $('voicevox-launch-on-start').checked,
    ttsRate: Number($('tts-rate').value),
    ttsVolume: Number($('tts-volume').value),
    beatMs: Number($('beat-ms').value),
    ngWords: $('ng-words')
      .value.split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
    blockedUsers: parseUserLines($('blocked-users')?.value),
    mutedUsers: parseUserLines($('muted-users')?.value),
    skipMentionSpeech: $('skip-mention-speech').checked,
    skipUrlSpeech: $('skip-url-speech').checked,
    skipAnchorSpeech: Boolean($('skip-anchor-speech')?.checked),
    skipEmoteSpeech: Boolean($('skip-emote-speech')?.checked),
    speakFanSubOnly: Boolean($('speak-fan-sub-only')?.checked),
    speakFanMinLevel: Number($('speak-fan-min-level')?.value || 1),
    speakSubscriberComments: Boolean($('speak-subscriber-comments')?.checked),
    skipRepeatSpeech: Boolean($('skip-repeat-speech')?.checked),
    repeatSpeechSec: Number($('repeat-speech-sec')?.value || 6),
    minimizeToTray: $('minimize-tray').checked,
    autoConnectOnStart: $('auto-connect').checked,
    uiTheme: $('ui-theme').value,
    settingsPreviewPx: previewPanePx,
    viewerEventPanePx,
    viewerLayout,
    viewerDock,
    viewerFontSize,
    viewerDisplay: collectViewerDisplay(),
    fanLevelLook: collectFanLevelLook(),
    events,
  };
}

function markClean() {
  savedSnapshot = JSON.stringify(collectConfig());
  updateDirtyUi();
}

function isDirty() {
  return JSON.stringify(collectConfig()) !== savedSnapshot;
}

function isStaleFormToast() {
  const text = toastMessageText();
  if (!text) {
    return false;
  }
  const validation = [
    uiCopy.invalidPort,
    uiCopy.invalidLikeMilestone,
    uiCopy.invalidDisplaySec,
    uiCopy.invalidDisplayChars,
    uiCopy.invalidSpeechChars,
    uiCopy.invalidMaxQueue,
    uiCopy.invalidPinSec,
    uiCopy.invalidHotkeySame,
  ];
  return validation.includes(text) && !validateForm();
}

function updateDirtyUi() {
  const dirty = isDirty();
  const active = document.querySelector('.tabs__btn.is-active');
  for (const button of document.querySelectorAll('.tabs__btn')) {
    button.classList.toggle('is-dirty', dirty && button === active);
  }
  if (isStaleFormToast()) {
    setToast('');
  }
}

function validateForm() {
  const port = Number($('overlay-port').value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return uiCopy.invalidPort;
  }

  const milestone = Number($('like-milestone').value);
  if (!Number.isInteger(milestone) || milestone < 1) {
    return uiCopy.invalidLikeMilestone;
  }

  if (!$('chat-display-unlimited').checked) {
    const displaySec = Number($('chat-display-sec').value);
    if (!Number.isInteger(displaySec) || displaySec < 1 || displaySec > 120) {
      return uiCopy.invalidDisplaySec;
    }
  }

  const displayChars = Number($('max-display-chars').value);
  if (!Number.isInteger(displayChars) || displayChars < 10 || displayChars > 400) {
    return uiCopy.invalidDisplayChars;
  }

  const speechChars = Number($('max-speech-chars').value);
  if (!Number.isInteger(speechChars) || speechChars < 10 || speechChars > 400) {
    return uiCopy.invalidSpeechChars;
  }

  const maxQueue = Number($('max-queue').value);
  if (!Number.isInteger(maxQueue) || maxQueue < 1 || maxQueue > 100) {
    return uiCopy.invalidMaxQueue;
  }

  if ($('look-pin-enabled')?.checked !== false) {
    const pinSec = Number($('look-pin-sec')?.value);
    if (!Number.isInteger(pinSec) || pinSec < 1 || pinSec > 120) {
      return uiCopy.invalidPinSec;
    }
  }

  const skipHotkey = speechHotkeyValue('hotkey-skip-speech', DEFAULT_SKIP_SPEECH_HOTKEY);
  const clearHotkey = speechHotkeyValue('hotkey-clear-speech', DEFAULT_CLEAR_SPEECH_HOTKEY);
  const pinHotkey = speechHotkeyValue('hotkey-clear-pin', DEFAULT_CLEAR_PIN_HOTKEY);
  const usedHotkeys = [skipHotkey, clearHotkey, pinHotkey].filter(Boolean);
  if (new Set(usedHotkeys).size !== usedHotkeys.length) {
    return uiCopy.invalidHotkeySame;
  }

  const voicevoxPort = Number($('voicevox-port').value);
  if (!Number.isInteger(voicevoxPort) || voicevoxPort < 1024 || voicevoxPort > 65535) {
    return uiCopy.invalidPort;
  }

  return '';
}

function selectedVoiceSpeakerName() {
  const select = $('tts-voice');
  const option = select.options[select.selectedIndex];
  return option?.dataset.speaker || select.dataset.speaker || '';
}

function updateTtsEngineUi() {
  const voicevox = $('tts-engine').value === 'voicevox';
  $('voicevox-settings').classList.toggle('is-hidden', !voicevox);
  $('voicevox-credit-card').classList.toggle('is-hidden', !voicevox);
}

function fillDisplayTime(chatDisplayMs) {
  const ms = Number(chatDisplayMs);
  const unlimited = ms === 0;
  $('chat-display-unlimited').checked = unlimited;
  if (!unlimited) {
    $('chat-display-sec').value = String(Math.max(1, Math.round((ms || 12000) / 1000)));
  } else if (!$('chat-display-sec').value) {
    $('chat-display-sec').value = '12';
  }
  syncDisplayTimeUi();
}

function syncDisplayTimeUi() {
  const unlimited = $('chat-display-unlimited').checked;
  const field = $('chat-display-sec-field');
  $('chat-display-sec').disabled = unlimited;
  field?.classList.toggle('is-disabled', unlimited);
}

function syncSpeakFanOptions() {
  const box = $('speak-fan-sub-options');
  const enabled = Boolean($('speak-fan-sub-only')?.checked);
  box?.classList.toggle('is-disabled', !enabled);
  if ($('speak-fan-min-level')) {
    $('speak-fan-min-level').disabled = !enabled;
  }
  if ($('speak-subscriber-comments')) {
    $('speak-subscriber-comments').disabled = !enabled;
  }
}

function syncRepeatSpeechOptions() {
  const enabled = Boolean($('skip-repeat-speech')?.checked);
  const field = $('repeat-speech-sec-field');
  const input = $('repeat-speech-sec');
  field?.classList.toggle('is-disabled', !enabled);
  if (input) {
    input.disabled = !enabled;
  }
}
