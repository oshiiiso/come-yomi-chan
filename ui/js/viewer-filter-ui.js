function collectViewerDisplay() {
  const display = { ...DEFAULT_VIEWER_DISPLAY, comment: true };
  for (const type of VIEWER_DISPLAY_TYPES) {
    const input = $(`viewer-display-${type}`);
    display[type] = input ? Boolean(input.checked) : display[type];
  }
  display.subscribe = display.superFan;
  return display;
}

function applyViewerDisplay(display) {
  const scrollState = captureViewerScrollState();
  const map = { ...DEFAULT_VIEWER_DISPLAY, ...(display || {}), comment: true };
  const root = $('view-viewer');
  for (const type of VIEWER_DISPLAY_TYPES) {
    const input = $(`viewer-display-${type}`);
    if (input) {
      input.checked = map[type] === true;
    }
    root?.classList.toggle(`is-hide-${type}`, map[type] !== true);
  }
  root?.classList.toggle('is-hide-subscribe', map.superFan !== true);
  syncViewerEmpty();
  restoreViewerScrollState(scrollState);
}

function patchSnapshotViewerDisplay(display) {
  if (!savedSnapshot) {
    return;
  }
  try {
    const snap = JSON.parse(savedSnapshot);
    snap.viewerDisplay = display;
    savedSnapshot = JSON.stringify(snap);
    updateDirtyUi();
  } catch {
    return;
  }
}

async function persistViewerDisplay() {
  const viewerDisplay = collectViewerDisplay();
  applyViewerDisplay(viewerDisplay);
  patchSnapshotViewerDisplay(viewerDisplay);
  await persistConfigPartial({ viewerDisplay }, (config) => {
    patchSnapshotViewerDisplay(config.viewerDisplay ?? viewerDisplay);
  });
}

function isViewerTypeShown(type) {
  if (!type || type === 'comment') {
    return true;
  }
  const key = type === 'subscribe' ? 'superFan' : type;
  return Boolean($(`viewer-display-${key}`)?.checked);
}

function viewerItemIsSearchHidden(item) {
  return item.classList.contains('is-search-hidden');
}

function viewerLogHasVisible(log) {
  return [...(log?.children || [])].some(
    (item) =>
      item.classList.contains('viewer__item--status') ||
      (isViewerTypeShown(viewerItemType(item)) && !viewerItemIsSearchHidden(item)),
  );
}

function applyFanBadgeColor(badge, level) {
  const color = fanLevelColor(level, fanLevelLook);
  badge.style.color = color;
  badge.style.background = `color-mix(in srgb, ${color} 18%, transparent)`;
}

function refreshViewerFanBadges() {
  for (const badge of document.querySelectorAll('.viewer__badge--fan[data-fan-level]')) {
    if (badge.classList.contains('is-inactive')) {
      applyInactiveFanBadgeColor(badge);
      continue;
    }
    applyFanBadgeColor(badge, badge.dataset.fanLevel);
  }
}

function viewerItemSearchText(item) {
  return [
    item.dataset.uniqueId,
    item.dataset.nickname,
    item.dataset.displayText,
    item.querySelector('.viewer__text')?.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function applyViewerSearch() {
  const scrollState = captureViewerScrollState();
  const query = viewerSearchQuery.trim().toLowerCase();
  const countEl = $('viewer-search-count');
  let matches = 0;
  for (const log of allViewerLogs()) {
    for (const item of [...(log?.querySelectorAll('.viewer__item') || [])]) {
      if (item.classList.contains('viewer__item--status')) {
        continue;
      }
      const hit = !query || viewerItemSearchText(item).includes(query);
      item.classList.toggle('is-search-hidden', !hit);
      if (hit) {
        matches += 1;
      }
    }
  }
  if (countEl) {
    countEl.hidden = !query;
    countEl.textContent = query ? `${matches}件` : '';
  }
  syncViewerEmpty();
  restoreViewerScrollState(scrollState);
}

function applyViewerFocus() {
  const root = $('view-viewer');
  const hasFocus = Boolean(viewerFocusUser && (viewerFocusUser.uniqueId || viewerFocusUser.nickname));
  root?.classList.toggle('is-user-focus', hasFocus);
  for (const log of allViewerLogs()) {
    for (const item of [...(log?.querySelectorAll('.viewer__item') || [])]) {
      item.classList.toggle('is-focus-user', hasFocus && viewerItemMatchesUser(item, viewerFocusUser));
    }
  }
}

function toggleViewerFocus(item) {
  const user = {
    uniqueId: item.dataset.uniqueId || '',
    nickname: item.dataset.nickname || '',
  };
  if (viewerFocusUser && viewerItemMatchesUser(item, viewerFocusUser)) {
    viewerFocusUser = null;
  } else {
    viewerFocusUser = user;
    setToast(uiCopy.viewerFocusOn);
  }
  applyViewerFocus();
}

function collectFanLevelLook() {
  const rows = [...document.querySelectorAll('#fan-level-look-rows .fan-level-look__row')];
  if (rows.length !== 5) {
    return normalizeFanLevelLook(fanLevelLook);
  }
  return normalizeFanLevelLook(
    rows.map((row) => ({
      minLevel: Number(row.querySelector('[data-fan-min]')?.value),
      color: row.querySelector('[data-fan-color]')?.value,
    })),
  );
}

function renderFanLevelLook() {
  const host = $('fan-level-look-rows');
  if (!host) {
    return;
  }
  host.replaceChildren();
  fanLevelLook.forEach((step, index) => {
    const row = document.createElement('div');
    row.className = 'fan-level-look__row';
    const min = document.createElement('label');
    min.className = 'fan-level-look__min';
    min.append('レベ ');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '99';
    input.dataset.fanMin = String(index);
    input.value = String(step.minLevel);
    min.append(input, ' 以上');
    const swatches = document.createElement('div');
    swatches.className = 'fan-level-look__swatches';
    for (const color of FAN_LEVEL_COLOR_PRESETS) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'fan-level-swatch';
      swatch.style.background = color;
      swatch.dataset.color = color;
      if (color === step.color) {
        swatch.classList.add('is-active');
      }
      swatches.appendChild(swatch);
    }
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'fan-level-look__picker';
    picker.dataset.fanColor = String(index);
    picker.value = step.color;
    const preview = document.createElement('span');
    preview.className = 'viewer__badge viewer__badge--fan';
    preview.textContent = `${uiCopy.viewerBadgeFan}${step.minLevel}`;
    applyFanBadgeColor(preview, step.minLevel);
    row.append(min, swatches, picker, preview);
    host.appendChild(row);
  });
}
