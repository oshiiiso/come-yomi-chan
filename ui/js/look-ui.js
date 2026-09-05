function fillFontSelect(selected) {
  const select = $('look-font');
  if (overlayFonts.length === 0) {
    overlayFonts = [{ id: 'default', label: '標準', css: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif' }];
  }
  const current = selected || select.value || 'default';
  select.innerHTML = '';
  for (const font of overlayFonts) {
    const option = document.createElement('option');
    option.value = font.id;
    option.textContent = font.label;
    option.dataset.css = font.css;
    select.appendChild(option);
  }
  select.value = overlayFonts.some((font) => font.id === current) ? current : 'default';
}

function selectedFontCss() {
  const select = $('look-font');
  const option = select.options[select.selectedIndex];
  return option?.dataset.css || overlayFonts[0]?.css || '';
}

function selectedMotionSpeed() {
  const active = document.querySelector('#look-motion-speed [data-motion-speed].is-active');
  return normalizeOverlayMotionSpeed(active?.dataset.motionSpeed);
}

function fillMotionSelect(selected) {
  const select = $('look-motion');
  if (!select) {
    return;
  }
  const current = normalizeOverlayMotion(selected || select.value);
  select.replaceChildren();
  for (const id of OVERLAY_MOTIONS) {
    const option = document.createElement('option');
    option.value = id;
    const key = overlayMotionCopyKey(id);
    option.textContent = (key && uiCopy[key]) || id;
    select.appendChild(option);
  }
  select.value = current;
}

function syncMotionSpeedButtons(speed) {
  const current = normalizeOverlayMotionSpeed(speed);
  for (const button of document.querySelectorAll('#look-motion-speed [data-motion-speed]')) {
    const value = normalizeOverlayMotionSpeed(button.dataset.motionSpeed);
    button.classList.toggle('is-active', value === current);
    button.setAttribute('aria-pressed', value === current ? 'true' : 'false');
    const key = `overlayMotionSpeed${value}`;
    if (uiCopy[key]) {
      button.textContent = uiCopy[key];
    }
  }
}

function replayLookMotion() {
  const frame = $('overlay-preview');
  if (!frame?.contentWindow) {
    return;
  }
  frame.contentWindow.postMessage({ kind: 'overlay-replay' }, '*');
}

function currentLook() {
  return {
    theme: $('look-theme').value || 'dark',
    fontFamily: $('look-font').value || 'default',
    fontCss: selectedFontCss(),
    fontSize: Number($('look-font-size').value),
    bgOpacity: Number($('look-bg-opacity').value),
    showAvatar: $('look-show-avatar').checked,
    giftIconSize: Number($('look-gift-size').value),
    itemRadius: Number($('look-radius').value),
    neonHue: Number($('look-neon-hue').value),
    align: $('look-align').value,
    previewBackdrop: $('look-backdrop').value,
    motion: normalizeOverlayMotion($('look-motion')?.value),
    motionSpeed: selectedMotionSpeed(),
  };
}

function fillPinTypes(types) {
  const box = $('look-pin-types');
  if (!box) {
    return;
  }
  const current = normalizeOverlayPinTypes(types);
  box.replaceChildren();
  for (const type of OVERLAY_PIN_TYPES) {
    const label = document.createElement('label');
    label.className = 'viewer-display__check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.pinType = type;
    input.checked = current[type] === true;
    label.append(input, (uiCopy.viewerTypes && uiCopy.viewerTypes[type]) || type);
    box.appendChild(label);
  }
}

function collectPinTypes() {
  const box = $('look-pin-types');
  const types = {};
  for (const type of OVERLAY_PIN_TYPES) {
    const input = box?.querySelector(`[data-pin-type="${type}"]`);
    types[type] = input ? input.checked : true;
  }
  return normalizeOverlayPinTypes(types);
}

function currentPin() {
  const sec = Number($('look-pin-sec')?.value);
  return {
    enabled: $('look-pin-enabled')?.checked !== false,
    displayMs: normalizeOverlayPinMs(Number.isFinite(sec) ? sec * 1000 : DEFAULT_OVERLAY_PIN_MS),
    hold: Boolean($('look-pin-hold')?.checked),
    types: collectPinTypes(),
    previewPinned: $('look-pin-preview')?.checked !== false,
  };
}

function syncPinOptions() {
  const on = $('look-pin-enabled')?.checked !== false;
  const box = $('look-pin-options');
  box?.classList.toggle('is-disabled', !on);
  for (const input of box?.querySelectorAll('input') ?? []) {
    input.disabled = !on;
  }
}

function fillPin(config) {
  const ms = normalizeOverlayPinMs(config.overlayPinMs);
  if ($('look-pin-enabled')) {
    $('look-pin-enabled').checked = config.overlayPinEnabled !== false;
  }
  if ($('look-pin-sec')) {
    $('look-pin-sec').value = String(Math.max(1, Math.round(ms / 1000)));
  }
  if ($('look-pin-hold')) {
    $('look-pin-hold').checked = Boolean(config.overlayPinHold);
  }
  if ($('look-pin-preview')) {
    $('look-pin-preview').checked = config.overlayPinPreview !== false;
  }
  fillPinTypes(config.overlayPinTypes);
  syncPinOptions();
}

function fillLook(config) {
  if (config.overlayLookPresets) {
    lookPresets = config.overlayLookPresets;
  }
  if (Array.isArray(config.overlayFonts) && config.overlayFonts.length > 0) {
    overlayFonts = config.overlayFonts;
  }
  fillFontSelect(config.overlayFontFamily ?? 'default');
  $('look-theme').value = config.overlayTheme ?? 'dark';
  $('look-font-size').value = String(config.overlayFontSize ?? 20);
  $('look-bg-opacity').value = String(config.overlayBgOpacity ?? 72);
  $('look-radius').value = String(config.overlayItemRadius ?? 12);
  $('look-gift-size').value = String(config.overlayGiftIconSize ?? 40);
  $('look-neon-hue').value = String(config.overlayNeonHue ?? 280);
  $('look-align').value = config.overlayAlign ?? 'full';
  $('look-backdrop').value = config.overlayPreviewBackdrop ?? 'checker';
  $('look-show-avatar').checked = config.overlayShowAvatar !== false;
  fillMotionSelect(config.overlayMotion);
  syncMotionSpeedButtons(config.overlayMotionSpeed);
  if (
    config.overlayPinMs != null ||
    config.overlayPinTypes != null ||
    typeof config.overlayPinEnabled === 'boolean' ||
    typeof config.overlayPinHold === 'boolean' ||
    typeof config.overlayPinPreview === 'boolean'
  ) {
    fillPin(config);
  }
  syncLookLabels();
  syncNeonHueField();
  syncLookPresetButtons();
}

function syncLookLabels() {
  const fontSize = $('look-font-size')?.value;
  const previewFont = $('preview-font-size');
  if (previewFont && fontSize != null && previewFont.value !== fontSize) {
    previewFont.value = fontSize;
  }
  setRangeLabel('look-font-size', fontSize, 'px');
  setRangeLabel('preview-font-size', fontSize, 'px');
  setRangeLabel('look-bg-opacity', $('look-bg-opacity').value, '%');
  setRangeLabel('look-radius', $('look-radius').value, 'px');
  setRangeLabel('look-gift-size', $('look-gift-size').value, 'px');
  const hue = Number($('look-neon-hue')?.value);
  const swatch = $('look-neon-hue-value');
  if (swatch) {
    const value = Number.isFinite(hue) ? hue : 280;
    swatch.style.background = `hsl(${value} 90% 60%)`;
  }
}

function syncNeonHueField() {
  const field = $('look-neon-hue-field');
  if (field) {
    field.hidden = ($('look-theme')?.value || 'dark') !== 'neon';
  }
}

function lookMatchesPreset(preset) {
  if (!preset) {
    return false;
  }
  const current = currentLook();
  return (
    current.theme === preset.theme &&
    current.fontSize === preset.fontSize &&
    current.bgOpacity === preset.bgOpacity &&
    current.showAvatar === preset.showAvatar &&
    current.giftIconSize === preset.giftIconSize &&
    current.itemRadius === preset.itemRadius &&
    current.align === preset.align &&
    (current.theme !== 'neon' || current.neonHue === preset.neonHue)
  );
}

function syncLookPresetButtons() {
  for (const button of document.querySelectorAll('[data-look-preset]')) {
    const preset = lookPresets[button.dataset.lookPreset];
    button.classList.toggle('is-active', lookMatchesPreset(preset));
  }
}

function applyLookPreset(id) {
  const preset = lookPresets[id];
  if (!preset) {
    return;
  }
  fillLook({
    overlayTheme: preset.theme,
    overlayFontSize: preset.fontSize,
    overlayBgOpacity: preset.bgOpacity,
    overlayShowAvatar: preset.showAvatar,
    overlayGiftIconSize: preset.giftIconSize,
    overlayItemRadius: preset.itemRadius,
    overlayNeonHue:
      preset.theme === 'neon'
        ? (preset.neonHue ?? 280)
        : Number($('look-neon-hue')?.value ?? 280),
    overlayAlign: preset.align,
    overlayPreviewBackdrop: $('look-backdrop').value,
    overlayFontFamily: $('look-font').value,
    overlayMotion: $('look-motion')?.value,
    overlayMotionSpeed: selectedMotionSpeed(),
  });
  noteFormChanged();
  pushLookPreview();
}

function pushLookPreview() {
  const frame = $('overlay-preview');
  if (!frame?.contentWindow) {
    return;
  }
  frame.contentWindow.postMessage({
    kind: 'overlay-look',
    look: {
      ...currentLook(),
      hideUserName: $('hide-user-name').checked,
    },
    pin: currentPin(),
  }, '*');
}

function overlayPreviewSrc(overlayUrl) {
  if (!overlayUrl) {
    return '';
  }
  const backdrop = $('look-backdrop')?.value || 'checker';
  return `${overlayUrl}?preview=1&backdrop=${encodeURIComponent(backdrop)}`;
}

function unloadPreviewFrame() {
  const frame = $('overlay-preview');
  if (!frame) {
    return;
  }
  frame.dataset.src = '';
  frame.src = 'about:blank';
}

function syncSettingsPreview() {
  const workspace = document.querySelector('.view-settings .workspace');
  const show = appMode === 'settings' && activeTabName() === 'look';
  workspace?.classList.toggle('is-preview-hidden', !show);
  if (show) {
    refreshPreviewFrame(savedConfig?.overlayPreviewUrl || savedConfig?.overlayUrl);
    return;
  }
  unloadPreviewFrame();
}

function refreshPreviewFrame(overlayUrl) {
  if (appMode !== 'settings' || activeTabName() !== 'look') {
    return;
  }
  const frame = $('overlay-preview');
  const next = overlayPreviewSrc(overlayUrl);
  if (frame && frame.dataset.src !== next) {
    frame.dataset.src = next;
    frame.src = next;
  }
  pushLookPreview();
}
