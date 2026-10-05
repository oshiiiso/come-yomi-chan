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

function fillPinTypes(types, msByType) {
  const box = $('look-pin-types');
  if (!box) {
    return;
  }
  const current = normalizeOverlayPinTypes(types);
  const currentMs = normalizeOverlayPinMsByType(msByType ?? {});
  box.replaceChildren();
  for (const type of OVERLAY_PIN_TYPES) {
    const row = document.createElement('div');
    row.className = 'pin-type-row';
    const label = document.createElement('label');
    label.className = 'viewer-display__check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.pinType = type;
    input.checked = current[type] === true;
    label.append(input, (uiCopy.viewerTypes && uiCopy.viewerTypes[type]) || type);
    const secInput = document.createElement('input');
    secInput.type = 'number';
    secInput.min = '1';
    secInput.max = '120';
    secInput.className = 'pin-type-sec';
    secInput.dataset.pinTypeSec = type;
    secInput.placeholder = uiCopy.overlayPinTypeSecPlaceholder || '共通';
    secInput.title = uiCopy.overlayPinTypeSecHint || '秒 (空=共通)';
    secInput.setAttribute('aria-label', `${(uiCopy.viewerTypes && uiCopy.viewerTypes[type]) || type} 秒`);
    const ms = currentMs[type];
    secInput.value = typeof ms === 'number' ? String(Math.round(ms / 1000)) : '';
    row.append(label, secInput);
    box.appendChild(row);
  }
}

function collectPinMsByType() {
  const box = $('look-pin-types');
  const result = {};
  for (const type of OVERLAY_PIN_TYPES) {
    const input = box?.querySelector(`[data-pin-type-sec="${type}"]`);
    if (!input) continue;
    const val = input.value.trim();
    if (!val) continue;
    const sec = Number(val);
    if (Number.isFinite(sec) && sec >= 1 && sec <= 120) {
      result[type] = Math.trunc(sec * 1000);
    }
  }
  return result;
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
    displayMsByType: collectPinMsByType(),
    hold: Boolean($('look-pin-hold')?.checked),
    types: collectPinTypes(),
    previewPinned: $('look-pin-preview')?.checked !== false,
  };
}

function syncPinOptions() {
  const on = $('look-pin-enabled')?.checked !== false;
  const hold = $('look-pin-hold')?.checked === true;
  const box = $('look-pin-options');
  box?.classList.toggle('is-disabled', !on);
  for (const input of box?.querySelectorAll('input') ?? []) {
    input.disabled = !on;
  }
  // 「保持」ON 中は個別秒入力を無効化
  for (const secInput of box?.querySelectorAll('.pin-type-sec') ?? []) {
    secInput.disabled = !on || hold;
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
  fillPinTypes(config.overlayPinTypes, config.overlayPinMsByType);
  syncPinOptions();
}

/** src/shared/overlay-name-colors.ts の DEFAULT / プリセットと同じ。 */
const DEFAULT_NAME_COLORS_UI = ['#5eead4', '#93c5fd', '#fcd34d', '#f9a8d4', '#86efac'];
/** @type {Record<string, string[]>} */
let nameColorPresets = {
  dark: [...DEFAULT_NAME_COLORS_UI],
  light: ['#0f766e', '#1d4ed8', '#a16207', '#be185d', '#15803d'],
  minimal: [...DEFAULT_NAME_COLORS_UI],
  neon: ['#67e8f9', '#e879f9', '#f0abfc', '#fde047', '#86efac'],
};

function sameNameColorsUi(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((color, index) => color === right[index]);
}

function normalizeNameColorsUi(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return DEFAULT_NAME_COLORS_UI.map((def, index) => {
    const candidate = list[index];
    return typeof candidate === 'string' && /^#[0-9a-fA-F]{6}$/.test(candidate)
      ? candidate.toLowerCase()
      : def;
  });
}

function isAutoNameColorsUi(raw) {
  const colors = normalizeNameColorsUi(raw);
  if (sameNameColorsUi(colors, DEFAULT_NAME_COLORS_UI)) {
    return true;
  }
  return Object.values(nameColorPresets).some((palette) => sameNameColorsUi(colors, palette));
}

function nameColorsForLookPresetUi(presetId) {
  const palette = nameColorPresets[presetId];
  return palette ? [...palette] : [...DEFAULT_NAME_COLORS_UI];
}

function resolveNameColorsForLookPresetUi(presetId, current) {
  if (!isAutoNameColorsUi(current)) {
    return null;
  }
  return nameColorsForLookPresetUi(presetId);
}

function fillNameColors(config) {
  const enabledEl = $('look-name-color-enabled');
  if (enabledEl) {
    enabledEl.checked = config.overlayNameColorEnabled !== false;
  }
  const colors = normalizeNameColorsUi(config.overlayNameColors);
  for (let i = 0; i < 5; i += 1) {
    const el = document.getElementById(`look-name-color-${i}`);
    if (el) {
      el.value = colors[i];
    }
  }
}

function collectNameColors() {
  return normalizeNameColorsUi(
    Array.from({ length: 5 }, (_, i) => document.getElementById(`look-name-color-${i}`)?.value || ''),
  );
}

function currentNameColorSettings() {
  return {
    overlayNameColorEnabled: $('look-name-color-enabled')?.checked !== false,
    overlayNameColors: collectNameColors(),
  };
}

function fillLook(config) {
  if (config.overlayLookPresets) {
    lookPresets = config.overlayLookPresets;
  }
  if (config.overlayNameColorPresets && typeof config.overlayNameColorPresets === 'object') {
    nameColorPresets = { ...nameColorPresets, ...config.overlayNameColorPresets };
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
  if (
    Array.isArray(config.overlayNameColors) ||
    typeof config.overlayNameColorEnabled === 'boolean'
  ) {
    fillNameColors(config);
  }
  syncLookLabels();
  syncNeonHueField();
  syncLookPresetButtons();
}

function applyPreviewZoom() {
  const percent = Number($('preview-font-size')?.value || 100);
  const scale = Number.isFinite(percent) ? percent / 100 : 1;
  const frame = document.querySelector('.preview-frame');
  if (!frame) {
    return;
  }
  if (scale === 1) {
    frame.style.removeProperty('transform');
    frame.style.removeProperty('transform-origin');
  } else {
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = 'top center';
  }
}

function syncLookLabels() {
  const fontSize = $('look-font-size')?.value;
  setRangeLabel('look-font-size', fontSize, 'px');
  setRangeLabel('preview-font-size', $('preview-font-size')?.value, '%');
  setRangeLabel('look-bg-opacity', $('look-bg-opacity').value, '%');
  setRangeLabel('look-radius', $('look-radius').value, 'px');
  setRangeLabel('look-gift-size', $('look-gift-size').value, 'px');
  const hue = Number($('look-neon-hue')?.value);
  const swatch = $('look-neon-hue-value');
  const hueInput = $('look-neon-hue');
  if (swatch) {
    const value = Number.isFinite(hue) ? hue : 280;
    const color = `hsl(${value} 90% 60%)`;
    swatch.style.background = color;
    if (hueInput) {
      hueInput.style.setProperty('--hue-thumb', color);
    }
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
  const currentColors = collectNameColors();
  const nextColors = resolveNameColorsForLookPresetUi(id, currentColors);
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
    overlayNameColorEnabled: $('look-name-color-enabled')?.checked !== false,
    overlayNameColors: nextColors || currentColors,
  });
  noteFormChanged();
  pushLookPreview();
}

function pushLookPreview() {
  const frame = $('overlay-preview');
  if (!frame?.contentWindow) {
    return;
  }
  const nameSettings = currentNameColorSettings();
  frame.contentWindow.postMessage({
    kind: 'overlay-look',
    look: {
      ...currentLook(),
      hideUserName: $('hide-user-name').checked,
    },
    pin: currentPin(),
    nameColorEnabled: nameSettings.overlayNameColorEnabled,
    nameColors: nameSettings.overlayNameColors,
    customCss: $('overlay-css')?.value ?? '',
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
    applyPreviewZoom();
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
