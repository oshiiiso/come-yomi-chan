/** いいねランキング配信ソースの見た目（オーバーレイタブ） */

/** @type {Record<string, object>} */
let likesLookPresets =
  typeof OVERLAY_LIKES_LOOK_PRESETS === 'object' && OVERLAY_LIKES_LOOK_PRESETS
    ? { ...OVERLAY_LIKES_LOOK_PRESETS }
    : {};

function fillLikesFontSelect(selected) {
  const select = $('likes-look-font');
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }
  if (typeof overlayFonts === 'undefined' || !Array.isArray(overlayFonts) || overlayFonts.length === 0) {
    overlayFonts = [
      {
        id: 'default',
        label: '標準',
        css: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif',
      },
    ];
  }
  const current = selected || select.value || 'default';
  select.replaceChildren();
  for (const font of overlayFonts) {
    const option = document.createElement('option');
    option.value = font.id;
    option.textContent = font.label;
    option.dataset.css = font.css || '';
    select.appendChild(option);
  }
  select.value = overlayFonts.some((font) => font.id === current) ? current : 'default';
}

function selectedLikesFontCss() {
  const select = $('likes-look-font');
  const option = select instanceof HTMLSelectElement ? select.options[select.selectedIndex] : null;
  return option?.dataset.css || '';
}

function currentLikesLook() {
  return {
    theme: $('likes-look-theme')?.value || 'standard',
    fontFamily: $('likes-look-font')?.value || 'default',
    fontCss: selectedLikesFontCss(),
    fontSize: Number($('likes-look-font-size')?.value),
    bgOpacity: Number($('likes-look-bg-opacity')?.value),
    showAvatar: $('likes-look-show-avatar')?.checked !== false,
    avatarSize: Number($('likes-look-avatar-size')?.value),
    itemRadius: Number($('likes-look-radius')?.value),
    rowGap: Number($('likes-look-row-gap')?.value),
    panelWidth: Number($('likes-look-panel-width')?.value),
    showUnit: $('likes-look-show-unit')?.checked !== false,
    neonHue: Number($('likes-look-neon-hue')?.value),
  };
}

function collectLikesLookConfig() {
  const look =
    typeof normalizeOverlayLikesLook === 'function'
      ? normalizeOverlayLikesLook(currentLikesLook())
      : currentLikesLook();
  return {
    overlayLikesTheme: look.theme,
    overlayLikesFontFamily: look.fontFamily,
    overlayLikesFontSize: look.fontSize,
    overlayLikesBgOpacity: look.bgOpacity,
    overlayLikesShowAvatar: look.showAvatar,
    overlayLikesAvatarSize: look.avatarSize,
    overlayLikesItemRadius: look.itemRadius,
    overlayLikesRowGap: look.rowGap,
    overlayLikesPanelWidth: look.panelWidth,
    overlayLikesShowUnit: look.showUnit,
    overlayLikesNeonHue: look.neonHue,
    ...collectRankingMotionConfig(),
  };
}

function selectedRankingMotionSpeed() {
  const active = document.querySelector(
    '#overlay-ranking-motion-speed [data-ranking-motion-speed].is-active',
  );
  return typeof normalizeOverlayRankingMotionSpeed === 'function'
    ? normalizeOverlayRankingMotionSpeed(active?.dataset.rankingMotionSpeed)
    : Number(active?.dataset.rankingMotionSpeed) || 2;
}

function syncRankingMotionSpeedButtons(speed) {
  const current =
    typeof normalizeOverlayRankingMotionSpeed === 'function'
      ? normalizeOverlayRankingMotionSpeed(speed)
      : Number(speed) || 2;
  for (const button of document.querySelectorAll(
    '#overlay-ranking-motion-speed [data-ranking-motion-speed]',
  )) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    const value =
      typeof normalizeOverlayRankingMotionSpeed === 'function'
        ? normalizeOverlayRankingMotionSpeed(button.dataset.rankingMotionSpeed)
        : Number(button.dataset.rankingMotionSpeed);
    button.classList.toggle('is-active', value === current);
    button.setAttribute('aria-pressed', value === current ? 'true' : 'false');
    const key = `overlayRankingMotionSpeed${value}`;
    if (uiCopy[key]) {
      button.textContent = uiCopy[key];
    }
  }
}

function fillRankingMotionSelect(selected) {
  const select = $('overlay-ranking-motion');
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }
  const current =
    typeof normalizeOverlayRankingMotion === 'function'
      ? normalizeOverlayRankingMotion(selected || select.value)
      : selected || 'slide';
  if (typeof OVERLAY_RANKING_MOTIONS !== 'undefined' && Array.isArray(OVERLAY_RANKING_MOTIONS)) {
    select.replaceChildren();
    for (const id of OVERLAY_RANKING_MOTIONS) {
      const option = document.createElement('option');
      option.value = id;
      const key =
        typeof overlayRankingMotionCopyKey === 'function'
          ? overlayRankingMotionCopyKey(id)
          : '';
      option.textContent = (key && uiCopy[key]) || id;
      select.appendChild(option);
    }
  }
  select.value = current;
  if (select.value !== current) {
    select.value = 'slide';
  }
}

function collectRankingMotionConfig() {
  const motion =
    typeof normalizeOverlayRankingMotion === 'function'
      ? normalizeOverlayRankingMotion($('overlay-ranking-motion')?.value)
      : $('overlay-ranking-motion')?.value || 'slide';
  return {
    overlayRankingMotion: motion,
    overlayRankingMotionSpeed: selectedRankingMotionSpeed(),
  };
}

function fillRankingMotion(config) {
  fillRankingMotionSelect(config.overlayRankingMotion);
  syncRankingMotionSpeedButtons(config.overlayRankingMotionSpeed);
}

function syncLikesLookLabels() {
  setRangeLabel('likes-look-font-size', $('likes-look-font-size')?.value, 'px');
  setRangeLabel('likes-look-bg-opacity', $('likes-look-bg-opacity')?.value, '%');
  setRangeLabel('likes-look-radius', $('likes-look-radius')?.value, 'px');
  setRangeLabel('likes-look-avatar-size', $('likes-look-avatar-size')?.value, 'px');
  setRangeLabel('likes-look-row-gap', $('likes-look-row-gap')?.value, 'px');
  setRangeLabel('likes-look-panel-width', $('likes-look-panel-width')?.value, 'px');
  const hue = Number($('likes-look-neon-hue')?.value);
  const swatch = $('likes-look-neon-hue-value');
  const hueInput = $('likes-look-neon-hue');
  if (swatch) {
    const value = Number.isFinite(hue) ? hue : 280;
    const color = `hsl(${value} 90% 60%)`;
    swatch.style.background = color;
    if (hueInput) {
      hueInput.style.setProperty('--hue-thumb', color);
    }
  }
}

function syncLikesNeonHueField() {
  const field = $('likes-look-neon-hue-field');
  if (field) {
    field.hidden = ($('likes-look-theme')?.value || 'standard') !== 'neon';
  }
}

function likesLookMatchesPreset(preset) {
  if (!preset) {
    return false;
  }
  const current = currentLikesLook();
  return (
    current.theme === preset.theme &&
    current.fontSize === preset.fontSize &&
    current.bgOpacity === preset.bgOpacity &&
    current.showAvatar === preset.showAvatar &&
    current.avatarSize === preset.avatarSize &&
    current.itemRadius === preset.itemRadius &&
    current.rowGap === preset.rowGap &&
    current.panelWidth === preset.panelWidth &&
    current.showUnit === preset.showUnit &&
    (current.theme !== 'neon' || current.neonHue === preset.neonHue)
  );
}

function syncLikesLookPresetButtons() {
  for (const button of document.querySelectorAll('[data-likes-look-preset]')) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    const preset = likesLookPresets[button.dataset.likesLookPreset];
    button.classList.toggle('is-active', likesLookMatchesPreset(preset));
  }
}

function fillLikesLook(config) {
  if (config.overlayLikesLookPresets && typeof config.overlayLikesLookPresets === 'object') {
    likesLookPresets = { ...likesLookPresets, ...config.overlayLikesLookPresets };
  }
  if (Array.isArray(config.overlayFonts) && config.overlayFonts.length > 0) {
    overlayFonts = config.overlayFonts;
  }
  fillLikesFontSelect(config.overlayLikesFontFamily ?? 'default');
  if ($('likes-look-theme')) {
    $('likes-look-theme').value = config.overlayLikesTheme ?? 'standard';
  }
  if ($('likes-look-font-size')) {
    $('likes-look-font-size').value = String(config.overlayLikesFontSize ?? 22);
  }
  if ($('likes-look-bg-opacity')) {
    $('likes-look-bg-opacity').value = String(config.overlayLikesBgOpacity ?? 48);
  }
  if ($('likes-look-radius')) {
    $('likes-look-radius').value = String(config.overlayLikesItemRadius ?? 14);
  }
  if ($('likes-look-avatar-size')) {
    $('likes-look-avatar-size').value = String(config.overlayLikesAvatarSize ?? 36);
  }
  if ($('likes-look-row-gap')) {
    $('likes-look-row-gap').value = String(config.overlayLikesRowGap ?? 6);
  }
  if ($('likes-look-panel-width')) {
    $('likes-look-panel-width').value = String(config.overlayLikesPanelWidth ?? 420);
  }
  if ($('likes-look-neon-hue')) {
    $('likes-look-neon-hue').value = String(config.overlayLikesNeonHue ?? 280);
  }
  if ($('likes-look-show-avatar')) {
    $('likes-look-show-avatar').checked = config.overlayLikesShowAvatar !== false;
  }
  if ($('likes-look-show-unit')) {
    $('likes-look-show-unit').checked = config.overlayLikesShowUnit !== false;
  }
  fillRankingMotion(config);
  syncLikesLookLabels();
  syncLikesNeonHueField();
  syncLikesLookPresetButtons();
}

function applyLikesLookPreset(id) {
  const preset = likesLookPresets[id];
  if (!preset) {
    return;
  }
  fillLikesLook({
    overlayLikesTheme: preset.theme,
    overlayLikesFontSize: preset.fontSize,
    overlayLikesBgOpacity: preset.bgOpacity,
    overlayLikesShowAvatar: preset.showAvatar,
    overlayLikesAvatarSize: preset.avatarSize,
    overlayLikesItemRadius: preset.itemRadius,
    overlayLikesRowGap: preset.rowGap,
    overlayLikesPanelWidth: preset.panelWidth,
    overlayLikesShowUnit: preset.showUnit,
    overlayLikesNeonHue:
      preset.theme === 'neon'
        ? (preset.neonHue ?? 280)
        : Number($('likes-look-neon-hue')?.value ?? 280),
    overlayLikesFontFamily: $('likes-look-font')?.value || 'default',
  });
  if (typeof noteFormChanged === 'function') {
    noteFormChanged();
  }
  if (typeof pushLookPreview === 'function') {
    pushLookPreview();
  }
}

function applyLikesLookCopy() {
  const pairs = [
    ['likes-look-title', 'likesLookTitle'],
    ['likes-look-hint', 'likesLookHint'],
    ['likes-look-show-avatar-label', 'likesLookShowAvatarLabel'],
    ['likes-look-show-unit-label', 'likesLookShowUnitLabel'],
    ['overlay-ranking-motion-label', 'overlayRankingMotionLabel'],
    ['overlay-ranking-motion-hint', 'overlayRankingMotionHint'],
    ['overlay-ranking-motion-speed-label', 'overlayRankingMotionSpeedLabel'],
  ];
  for (const [id, key] of pairs) {
    const el = $(id);
    if (el && uiCopy[key]) {
      el.textContent = uiCopy[key];
    }
  }
  const labels = {
    standard: uiCopy.likesLookPresetStandard,
    luxury: uiCopy.likesLookPresetLuxury,
    compact: uiCopy.likesLookPresetCompact,
    neon: uiCopy.likesLookPresetNeon,
    minimal: uiCopy.likesLookPresetMinimal,
  };
  for (const button of document.querySelectorAll('[data-likes-look-preset]')) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    const key = button.dataset.likesLookPreset;
    if (key && labels[key]) {
      button.textContent = labels[key];
    }
  }
  fillRankingMotionSelect($('overlay-ranking-motion')?.value);
  syncRankingMotionSpeedButtons(selectedRankingMotionSpeed());
  const motionSelect = $('overlay-ranking-motion');
  if (motionSelect instanceof HTMLSelectElement && uiCopy.overlayRankingMotionLabel) {
    motionSelect.setAttribute('aria-label', uiCopy.overlayRankingMotionLabel);
  }
}
