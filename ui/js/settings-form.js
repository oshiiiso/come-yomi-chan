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
  if (uiCopy.eventSpeakLabel) {
    for (const el of document.querySelectorAll('[data-event-speak-label]')) {
      el.textContent = uiCopy.eventSpeakLabel;
    }
  }
  const giftSpeakListHint = $('gift-speak-list-hint');
  if (giftSpeakListHint && uiCopy.giftSpeakListHint) {
    giftSpeakListHint.textContent = uiCopy.giftSpeakListHint;
  }
  const templateEditorHint = $('template-editor-hint');
  if (templateEditorHint && uiCopy.templateEditorHint) {
    templateEditorHint.textContent = uiCopy.templateEditorHint;
  }
  if (uiCopy.colorPickerResetLabel) {
    for (const el of document.querySelectorAll('.color-picker-reset')) {
      el.setAttribute('aria-label', uiCopy.colorPickerResetLabel);
      el.title = uiCopy.colorPickerResetLabel;
    }
  }
  if (typeof syncNameColorResetButtons === 'function') {
    syncNameColorResetButtons();
  }
  if (typeof syncTemplateAccentResetButtons === 'function') {
    syncTemplateAccentResetButtons(
      typeof collectTemplateAccentColors === 'function'
        ? collectTemplateAccentColors()
        : undefined,
    );
  }
  const previewFont = $('preview-font');
  if (previewFont && uiCopy.previewZoomLabel) {
    previewFont.setAttribute('aria-label', uiCopy.previewZoomLabel);
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
    alwaysOnTopBtn.title = uiCopy.alwaysOnTopMenu;
    alwaysOnTopBtn.setAttribute('aria-label', uiCopy.alwaysOnTopMenu);
  }
  const compactBtn = $('btn-compact-viewer');
  if (compactBtn && uiCopy.compactMenu) {
    compactBtn.title = uiCopy.compactMenu;
    compactBtn.setAttribute('aria-label', uiCopy.compactMenu);
  }
  if (typeof syncMaximizeChrome === 'function') {
    const maximized = $('btn-maximize')?.getAttribute('aria-pressed') === 'true';
    syncMaximizeChrome(maximized);
  }
  const minimizeBtn = $('btn-minimize');
  if (minimizeBtn && uiCopy.minimizeWindow) {
    minimizeBtn.title = uiCopy.minimizeWindow;
    minimizeBtn.setAttribute('aria-label', uiCopy.minimizeWindow);
  }
  const closeBtn = $('btn-close');
  if (closeBtn && uiCopy.closeWindow) {
    closeBtn.title = uiCopy.closeWindow;
    closeBtn.setAttribute('aria-label', uiCopy.closeWindow);
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
  const overlaySamplesAll = $('btn-overlay-samples-all');
  if (overlaySamplesAll) {
    if (uiCopy.overlayConnectSample) {
      overlaySamplesAll.textContent = uiCopy.overlayConnectSample;
    }
    if (uiCopy.overlayConnectSampleHint) {
      overlaySamplesAll.title = uiCopy.overlayConnectSampleHint;
    }
  }
  const overlaySamplesClear = $('btn-overlay-samples-clear');
  if (overlaySamplesClear) {
    if (uiCopy.overlayConnectClear) {
      overlaySamplesClear.textContent = uiCopy.overlayConnectClear;
    }
    if (uiCopy.overlayConnectClearHint) {
      overlaySamplesClear.title = uiCopy.overlayConnectClearHint;
    }
  }
  const overlaySampleActions = $('overlay-sample-actions');
  if (overlaySampleActions instanceof HTMLElement && uiCopy.overlayConnectSampleGroupLabel) {
    overlaySampleActions.setAttribute('aria-label', uiCopy.overlayConnectSampleGroupLabel);
  }
  const saveLog = $('btn-viewer-save-log');
  if (saveLog && uiCopy.viewerSaveLog) {
    saveLog.textContent = uiCopy.viewerSaveLog;
  }
  const clearLog = $('btn-viewer-clear');
  if (clearLog && uiCopy.viewerClearLog) {
    clearLog.textContent = uiCopy.viewerClearLog;
  }
  for (const button of document.querySelectorAll('[data-viewer-pane-clear]')) {
    const label = uiCopy.viewerPaneClearLabel || 'この窓を消す';
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  const speechFormat = $('speech-replace-format-hint');
  if (speechFormat && uiCopy.speechReplaceFormatHint) {
    speechFormat.textContent = uiCopy.speechReplaceFormatHint;
  }
  const pairs = [
    ['speak-fan-sub-only-label', 'speakFanSubOnlyLabel'],
    ['speak-fan-sub-only-hint', 'speakFanSubOnlyHint'],
    ['speak-fan-min-level-label', 'speakFanMinLevelLabel'],
    ['speak-fan-club-comments-label', 'speakFanClubCommentsLabel'],
    ['speak-fan-club-comments-hint', 'speakFanClubCommentsHint'],
    ['speak-subscriber-comments-label', 'speakSubscriberCommentsLabel'],
    ['speak-subscriber-comments-hint', 'speakSubscriberCommentsHint'],
    ['fan-level-look-label', 'fanLevelLookLabel'],
    ['fan-level-look-hint', 'fanLevelLookHint'],
    ['comment-badge-title', 'commentBadgeTitle'],
    ['comment-sound-hint', 'commentSoundHint'],
    ['comment-notify-speak-label', 'commentNotifySpeak'],
    ['comment-notify-sound-label', 'commentNotifySound'],
    ['skip-repeat-speech-label', 'skipRepeatSpeechLabel'],
    ['skip-repeat-speech-hint', 'skipRepeatSpeechHint'],
    ['reset-config-hint', 'resetConfigHint'],
    ['btn-reset-config', 'resetConfigLabel'],
    ['transfer-config-hint', 'transferConfigHint'],
    ['btn-export-config', 'exportConfigLabel'],
    ['btn-import-config', 'importConfigLabel'],
    ['config-profile-hint', 'profileHint'],
    ['config-profile-name-label', 'profileNameLabel'],
    ['config-profile-select-label', 'profileSelectLabel'],
    ['btn-profile-save', 'profileSaveButton'],
    ['btn-profile-apply', 'profileApplyButton'],
    ['btn-profile-delete', 'profileDeleteButton'],
    ['hotkey-title', 'hotkeyTitle'],
    ['hotkey-skip-label', 'hotkeySkipLabel'],
    ['hotkey-clear-label', 'hotkeyClearLabel'],
    ['hotkey-clear-pin-label', 'hotkeyClearPinLabel'],
    ['hotkey-pause-label', 'hotkeyPauseLabel'],
    ['hotkey-mute-comment-sound-label', 'hotkeyMuteCommentSoundLabel'],
    ['hotkey-skip-unset', 'hotkeyUnset'],
    ['hotkey-clear-unset', 'hotkeyUnset'],
    ['hotkey-clear-pin-unset', 'hotkeyUnset'],
    ['hotkey-pause-unset', 'hotkeyUnset'],
    ['hotkey-mute-comment-sound-unset', 'hotkeyUnset'],
    ['hotkey-hint', 'hotkeyHint'],
    ['menu-ops-btn', 'operationsMenu'],
    ['viewer-user-menu-nickname', 'nicknameRename'],
    ['viewer-user-menu-nickname-clear', 'nicknameClear'],
    ['gift-chime-destination-hint', 'giftChimeDestinationHint'],
    ['gift-chime-common-volume-label', 'giftChimeCommonVolumeLabel'],
    ['gift-chime-common-volume-hint', 'giftChimeCommonVolumeHint'],
    ['gift-speak-search-label', 'giftSpeakSearchLabel'],
    ['gift-speak-enable-all', 'giftSpeakEnableAll'],
    ['gift-speak-enable-none', 'giftSpeakEnableNone'],
    ['gift-test-hint', 'giftTestHint'],
    ['gift-catalog-reload-hint', 'giftCatalogReloadHint'],
    ['btn-reload-gifts', 'giftCatalogReloadButton'],
    ['gift-chime-col-enable', 'giftChimeColEnable'],
    ['gift-chime-col-gift', 'giftChimeColGift'],
    ['gift-chime-col-sound', 'giftChimeColSound'],
    ['gift-chime-col-volume', 'giftChimeColVolume'],
    ['tab-look', 'settingsTabLook'],
    ['look-tab-hint', 'lookTabHint'],
    ['look-chat-title', 'lookChatTitle'],
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
    ['overlay-like-ranking-enabled-label', 'overlayLikeRankingEnabledLabel'],
    ['overlay-like-ranking-max-label', 'overlayLikeRankingMaxLabel'],
    ['overlay-like-ranking-hint', 'overlayLikeRankingHint'],
    ['overlay-ranking-mode-label', 'overlayRankingModeLabel'],
    ['overlay-ranking-mode-hint', 'overlayRankingModeHint'],
    ['overlay-ranking-mode-likes-label', 'overlayRankingModeLikes'],
    ['overlay-ranking-mode-diamonds-label', 'overlayRankingModeDiamonds'],
    ['overlay-ranking-like-sync-label', 'overlayRankingLikeSyncLabel'],
    ['overlay-ranking-like-sync-hint', 'overlayRankingLikeSyncHint'],
    ['overlay-ranking-like-sync-live-label', 'overlayRankingLikeSyncLive'],
    ['overlay-ranking-like-sync-poll-label', 'overlayRankingLikeSyncPoll'],
    ['overlay-ranking-like-poll-sec-label', 'overlayRankingLikePollSecLabel'],
    ['look-section-comment', 'lookSectionComment'],
    ['look-section-ranking', 'lookSectionRanking'],
    ['look-section-alerts', 'lookSectionAlerts'],
    ['look-alerts-hint', 'lookAlertsHint'],
    ['look-section-easy', 'lookSectionEasy'],
    ['look-section-chat', 'lookSectionChat'],
    ['look-section-name', 'lookSectionName'],
    ['overlay-css-summary', 'overlayCustomCssSummary'],
    ['overlay-css-label', 'overlayCustomCssLabel'],
    ['overlay-css-hint', 'overlayCustomCssHint'],
    ['overlay-css-ref', 'overlayCustomCssRef'],
  ];
  for (const [id, key] of pairs) {
    const el = $(id);
    if (el && uiCopy[key]) {
      el.textContent = uiCopy[key];
    }
  }
  const resetTabs = ['connect', 'filter', 'comment', 'gift', 'events', 'look', 'tts', 'app'];
  for (const tab of resetTabs) {
    const hint = $(`reset-tab-hint-${tab}`);
    const hintText = uiCopy.resetTabHints?.[tab];
    if (hint && hintText) {
      hint.textContent = hintText;
    }
    const button = $(`btn-reset-tab-${tab}`);
    if (button && uiCopy.resetTabLabel) {
      button.textContent = uiCopy.resetTabLabel;
    }
  }
  const lookSections = $('look-sections');
  if (lookSections && uiCopy.lookSectionsLabel) {
    lookSections.setAttribute('aria-label', uiCopy.lookSectionsLabel);
  }
  const lookCommentSections = $('look-comment-sections');
  if (lookCommentSections && uiCopy.lookCommentSectionsLabel) {
    lookCommentSections.setAttribute('aria-label', uiCopy.lookCommentSectionsLabel);
  }
  if (typeof applyLikesLookCopy === 'function') {
    applyLikesLookCopy();
  }
  const commentNotifyMode = $('comment-notify-mode');
  if (commentNotifyMode && uiCopy.commentNotifyModeLabel) {
    commentNotifyMode.setAttribute('aria-label', uiCopy.commentNotifyModeLabel);
  }
  const commonVolumeLabel = uiCopy.giftChimeCommonVolumeLabel || '';
  if (commonVolumeLabel) {
    const commonRange = $('gift-chime-common-volume-range');
    const commonNumber = $('gift-chime-common-volume-number');
    if (commonRange) {
      commonRange.setAttribute('aria-label', commonVolumeLabel);
    }
    if (commonNumber) {
      commonNumber.setAttribute('aria-label', `${commonVolumeLabel}（数値）`);
    }
  }
  const profileName = $('config-profile-name');
  if (profileName && uiCopy.profileNamePlaceholder) {
    profileName.placeholder = uiCopy.profileNamePlaceholder;
  }
  syncRepeatSpeechOptions();
  fillMotionSelect($('look-motion')?.value);
  syncMotionSpeedButtons(selectedMotionSpeed());
  fillPinTypes(collectPinTypes());
  syncPinOptions();
  if (typeof applyOverlayUrlCopy === 'function') {
    applyOverlayUrlCopy();
  }
}

function fillConfig(config) {
  applyCopy(config);
  $('unique-id').value = config.uniqueId ?? '';
  $('overlay-port').value = String(config.overlayPort ?? 8787);
  if (typeof fillOverlayUrlUi === 'function') {
    fillOverlayUrlUi(config, { force: true });
  }
  if (typeof setOverlayBoards === 'function') {
    setOverlayBoards(config.overlayBoards);
  }
  $('chat-max-rows').value = String(config.chatMaxRows ?? 8);
  fillDisplayTime(config.chatDisplayMs);
  $('overlay-css').value = config.overlayCustomCss ?? '';
  $('max-display-chars').value = String(config.maxDisplayChars ?? 80);
  fillLook(config);
  if (typeof fillLikesLook === 'function') {
    fillLikesLook(config);
  }
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
  fillNicknameMap(config);
  fillGiftSpeakMaps(config);
  fillProfilesUi(config);
  $('like-milestone').value = String(config.likeMilestone ?? 10);
  if ($('overlay-like-ranking-enabled')) {
    $('overlay-like-ranking-enabled').checked = config.overlayLikeRankingEnabled !== false;
  }
  if ($('overlay-like-ranking-max')) {
    $('overlay-like-ranking-max').value = String(config.overlayLikeRankingMax ?? 5);
  }
  if ($('overlay-ranking-mode')) {
    $('overlay-ranking-mode').value =
      config.overlayRankingMode === 'diamonds' ? 'diamonds' : 'likes';
  }
  if ($('overlay-ranking-like-sync')) {
    $('overlay-ranking-like-sync').value =
      config.overlayRankingLikeSyncMode === 'poll' ? 'poll' : 'live';
  }
  if ($('overlay-ranking-like-poll-sec')) {
    $('overlay-ranking-like-poll-sec').value = String(
      config.overlayRankingLikePollSec ?? 30,
    );
  }
  if (typeof syncOverlayRankingLikeSyncVisibility === 'function') {
    syncOverlayRankingLikeSyncVisibility();
  }
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
  refreshAllLineLists();
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
  if ($('speak-fan-club-comments')) {
    $('speak-fan-club-comments').checked = config.speakFanClubComments !== false;
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
  if (typeof syncCommentNotifyModeUi === 'function') {
    syncCommentNotifyModeUi();
  }
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
  if ($('viewer-log-max-rows')) {
    $('viewer-log-max-rows').value = String(config.viewerLogMaxRows ?? 1000);
    if (typeof VIEWER_MAX_ROWS !== 'undefined') {
      VIEWER_MAX_ROWS = config.viewerLogMaxRows ?? 1000;
    }
  }
  fillSpeechReplaceMap(config.speechReplaceMap ?? []);

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

  fillGiftNotifyUi(config);
  if (typeof fillEventAlertUi === 'function') {
    fillEventAlertUi(config);
  }

  updateTtsEngineUi();
  syncViewerEmpty();
  applyPreviewPane(config.settingsPreviewPx);
  applyViewerEventPane(config.viewerEventPanePx);
  applyViewerDisplay(config.viewerDisplay);
  applyViewerLayout(config.viewerLayout, false);
  applyViewerFontSize(config.viewerFontSize);
  if (typeof fillTemplateAccentColors === 'function') {
    fillTemplateAccentColors(config);
  } else if (typeof syncAllTemplateEditors === 'function') {
    syncAllTemplateEditors();
  }
  syncSettingsPreview();
}

function readOverlayStreamSettings() {
  const config = collectConfig();
  return {
    chatMaxRows: config.chatMaxRows,
    chatDisplayMs: config.chatDisplayMs,
    overlayCustomCss: config.overlayCustomCss,
    hideUserName: config.hideUserName,
    maxDisplayChars: config.maxDisplayChars,
    overlayTheme: config.overlayTheme,
    overlayFontSize: config.overlayFontSize,
    overlayBgOpacity: config.overlayBgOpacity,
    overlayShowAvatar: config.overlayShowAvatar,
    overlayGiftIconSize: config.overlayGiftIconSize,
    overlayItemRadius: config.overlayItemRadius,
    overlayNeonHue: config.overlayNeonHue,
    overlayAlign: config.overlayAlign,
    overlayPreviewBackdrop: config.overlayPreviewBackdrop,
    overlayFontFamily: config.overlayFontFamily,
    overlayMotion: config.overlayMotion,
    overlayMotionSpeed: config.overlayMotionSpeed,
    overlayPinEnabled: config.overlayPinEnabled,
    overlayPinMs: config.overlayPinMs,
    overlayPinMsByType: config.overlayPinMsByType,
    overlayPinHold: config.overlayPinHold,
    overlayPinTypes: config.overlayPinTypes,
    overlayPinPreview: config.overlayPinPreview,
    overlayNameColorEnabled: config.overlayNameColorEnabled,
    overlayNameColors: config.overlayNameColors,
    templateAccentColors: config.templateAccentColors,
    commentDisplayTemplate: config.commentDisplayTemplate,
    giftDisplayTemplate: config.giftDisplayTemplate,
    followDisplayTemplate: config.followDisplayTemplate,
    shareDisplayTemplate: config.shareDisplayTemplate,
    subscribeDisplayTemplate: config.subscribeDisplayTemplate,
    superFanDisplayTemplate: config.superFanDisplayTemplate,
    superFanBoxDisplayTemplate: config.superFanBoxDisplayTemplate,
    envelopeDisplayTemplate: config.envelopeDisplayTemplate,
    portalDisplayTemplate: config.portalDisplayTemplate,
    portalJoinDisplayTemplate: config.portalJoinDisplayTemplate,
    likeDisplayTemplate: config.likeDisplayTemplate,
    memberDisplayTemplate: config.memberDisplayTemplate,
    likeMilestone: config.likeMilestone,
    overlayLikeRankingEnabled: config.overlayLikeRankingEnabled,
    overlayLikeRankingMax: config.overlayLikeRankingMax,
    overlayRankingMode: config.overlayRankingMode,
    overlayRankingLikeSyncMode: config.overlayRankingLikeSyncMode,
    overlayRankingLikePollSec: config.overlayRankingLikePollSec,
    overlayRankingMotion: config.overlayRankingMotion,
    overlayRankingMotionSpeed: config.overlayRankingMotionSpeed,
    overlayLikesTheme: config.overlayLikesTheme,
    overlayLikesFontFamily: config.overlayLikesFontFamily,
    overlayLikesFontSize: config.overlayLikesFontSize,
    overlayLikesBgOpacity: config.overlayLikesBgOpacity,
    overlayLikesShowAvatar: config.overlayLikesShowAvatar,
    overlayLikesAvatarSize: config.overlayLikesAvatarSize,
    overlayLikesItemRadius: config.overlayLikesItemRadius,
    overlayLikesRowGap: config.overlayLikesRowGap,
    overlayLikesPanelWidth: config.overlayLikesPanelWidth,
    overlayLikesShowUnit: config.overlayLikesShowUnit,
    overlayLikesNeonHue: config.overlayLikesNeonHue,
  };
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
    overlayPinMsByType: collectPinMsByType(),
    overlayPinPreview: $('look-pin-preview')?.checked !== false,
    ...currentNameColorSettings(),
    ...(typeof collectTemplateAccentColors === 'function'
      ? { templateAccentColors: collectTemplateAccentColors() }
      : {}),
    maxDisplayChars: Number($('max-display-chars').value),
    hideUserName: $('hide-user-name').checked,
    maxSpeechChars: Number($('max-speech-chars').value),
    maxQueue: Number($('max-queue').value),
    skipSpeechHotkey: speechHotkeyValue('hotkey-skip-speech', DEFAULT_SKIP_SPEECH_HOTKEY),
    clearSpeechHotkey: speechHotkeyValue('hotkey-clear-speech', DEFAULT_CLEAR_SPEECH_HOTKEY),
    clearPinHotkey: speechHotkeyValue('hotkey-clear-pin', DEFAULT_CLEAR_PIN_HOTKEY),
    pauseSpeechHotkey: speechHotkeyValue('hotkey-pause-speech', DEFAULT_PAUSE_SPEECH_HOTKEY),
    muteCommentSoundHotkey: speechHotkeyValue(
      'hotkey-mute-comment-sound',
      DEFAULT_MUTE_COMMENT_SOUND_HOTKEY,
    ),
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
    ...collectGiftNotifyUi(),
    giftSpeakByGiftId: collectGiftSpeakByGiftId(),
    giftChimeByGiftId: collectGiftChimeByGiftId(),
    giftChimeVolumeByGiftId: collectGiftChimeVolumeByGiftId(),
    nicknameMap: collectNicknameMap(),
    speechReplaceMap: collectSpeechReplaceMap(),
    viewerLogMaxRows: Number($('viewer-log-max-rows')?.value) || 1000,
    ...collectProfilesUi(),
    alwaysOnTop: Boolean($('always-on-top')?.checked),
    compactViewer: Boolean($('compact-viewer')?.checked),
    likeMilestone: Number($('like-milestone').value),
    overlayLikeRankingEnabled: Boolean($('overlay-like-ranking-enabled')?.checked),
    overlayLikeRankingMax: Number($('overlay-like-ranking-max')?.value),
    overlayRankingMode: $('overlay-ranking-mode')?.value === 'diamonds' ? 'diamonds' : 'likes',
    overlayRankingLikeSyncMode:
      $('overlay-ranking-like-sync')?.value === 'poll' ? 'poll' : 'live',
    overlayRankingLikePollSec: Number($('overlay-ranking-like-poll-sec')?.value),
    ...(typeof collectLikesLookConfig === 'function' ? collectLikesLookConfig() : {}),
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
    speakFanClubComments: Boolean($('speak-fan-club-comments')?.checked),
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
    ...(typeof getOverlayBoards === 'function' && Array.isArray(getOverlayBoards())
      ? { overlayBoards: getOverlayBoards() }
      : {}),
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
    uiCopy.invalidOverlayLikeRankingMax,
    uiCopy.invalidOverlayRankingLikePollSec,
    uiCopy.invalidDisplaySec,
    uiCopy.invalidDisplayChars,
    uiCopy.invalidSpeechChars,
    uiCopy.invalidMaxQueue,
    uiCopy.invalidPinSec,
    uiCopy.invalidGiftChimeBandOverlap,
    uiCopy.invalidGiftChimeBandRange,
    uiCopy.invalidGiftChimeBandValue,
    uiCopy.invalidSpeakFanSubEmpty,
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

  const likeRankingMax = Number($('overlay-like-ranking-max')?.value);
  if (!Number.isInteger(likeRankingMax) || likeRankingMax < 1 || likeRankingMax > 10) {
    return uiCopy.invalidOverlayLikeRankingMax;
  }

  const rankingMode =
    $('overlay-ranking-mode')?.value === 'diamonds' ? 'diamonds' : 'likes';
  const likeSync =
    $('overlay-ranking-like-sync')?.value === 'poll' ? 'poll' : 'live';
  if (rankingMode === 'likes' && likeSync === 'poll') {
    const likePollSec = Number($('overlay-ranking-like-poll-sec')?.value);
    if (!Number.isInteger(likePollSec) || likePollSec < 1 || likePollSec > 300) {
      return uiCopy.invalidOverlayRankingLikePollSec;
    }
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

  if (typeof validateEventAlertForm === 'function') {
    const alertError = validateEventAlertForm();
    if (alertError) {
      return alertError;
    }
  }
  if (typeof validateGiftChimeDiamondBandsForm === 'function') {
    const bandError = validateGiftChimeDiamondBandsForm();
    if (bandError) {
      return bandError;
    }
  }

  if (
    $('speak-fan-sub-only')?.checked &&
    !$('speak-fan-club-comments')?.checked &&
    !$('speak-subscriber-comments')?.checked
  ) {
    return uiCopy.invalidSpeakFanSubEmpty;
  }

  const skipHotkey = speechHotkeyValue('hotkey-skip-speech', DEFAULT_SKIP_SPEECH_HOTKEY);
  const clearHotkey = speechHotkeyValue('hotkey-clear-speech', DEFAULT_CLEAR_SPEECH_HOTKEY);
  const pinHotkey = speechHotkeyValue('hotkey-clear-pin', DEFAULT_CLEAR_PIN_HOTKEY);
  const pauseHotkey = speechHotkeyValue('hotkey-pause-speech', DEFAULT_PAUSE_SPEECH_HOTKEY);
  const muteHotkey = speechHotkeyValue(
    'hotkey-mute-comment-sound',
    DEFAULT_MUTE_COMMENT_SOUND_HOTKEY,
  );
  const usedHotkeys = [skipHotkey, clearHotkey, pinHotkey, pauseHotkey, muteHotkey].filter(
    Boolean,
  );
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
  const fanClubOn = Boolean($('speak-fan-club-comments')?.checked);
  box?.classList.toggle('is-disabled', !enabled);
  if ($('speak-fan-club-comments')) {
    $('speak-fan-club-comments').disabled = !enabled;
  }
  const minField = $('speak-fan-min-level-field');
  minField?.classList.toggle('is-disabled', !enabled || !fanClubOn);
  if ($('speak-fan-min-level')) {
    $('speak-fan-min-level').disabled = !enabled || !fanClubOn;
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
