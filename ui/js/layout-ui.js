function applyPreviewPane(px) {
  const workspace = document.querySelector('.workspace');
  previewPanePx = clampSettingsPreviewPx(px, workspace?.clientWidth || 0);
  workspace?.style.setProperty('--preview-pane', `${previewPanePx}px`);
  const split = $('workspace-split');
  if (split) {
    split.setAttribute('aria-valuenow', String(previewPanePx));
    split.setAttribute('aria-valuemin', String(MIN_SETTINGS_PREVIEW_PX));
    split.setAttribute('aria-valuemax', String(MAX_SETTINGS_PREVIEW_PX));
  }
}

function patchSnapshotPreviewPx(px) {
  if (!savedSnapshot) {
    return;
  }
  try {
    const snap = JSON.parse(savedSnapshot);
    snap.settingsPreviewPx = px;
    savedSnapshot = JSON.stringify(snap);
    updateDirtyUi();
  } catch {
    return;
  }
}

function patchSnapshotUserLists(mutedUsers, blockedUsers) {
  if (!savedSnapshot) {
    return;
  }
  try {
    const snap = JSON.parse(savedSnapshot);
    snap.mutedUsers = mutedUsers;
    snap.blockedUsers = blockedUsers;
    savedSnapshot = JSON.stringify(snap);
    updateDirtyUi();
  } catch {
    return;
  }
}

function applyWindowPrefUi(alwaysOnTop, compactViewer) {
  document.querySelector('.app-shell')?.classList.toggle('is-compact', compactViewer);
  if ($('always-on-top')) {
    $('always-on-top').checked = alwaysOnTop;
  }
  if ($('compact-viewer')) {
    $('compact-viewer').checked = compactViewer;
  }
  const alwaysOnTopBtn = $('btn-always-on-top');
  const compactBtn = $('btn-compact-viewer');
  alwaysOnTopBtn?.classList.toggle('is-active', alwaysOnTop);
  alwaysOnTopBtn?.setAttribute('aria-checked', alwaysOnTop ? 'true' : 'false');
  compactBtn?.classList.toggle('is-active', compactViewer);
  compactBtn?.setAttribute('aria-checked', compactViewer ? 'true' : 'false');
}

function patchSnapshotWindowPrefs(alwaysOnTop, compactViewer) {
  if (!savedSnapshot) {
    return;
  }
  try {
    const snap = JSON.parse(savedSnapshot);
    snap.alwaysOnTop = alwaysOnTop;
    snap.compactViewer = compactViewer;
    savedSnapshot = JSON.stringify(snap);
    updateDirtyUi();
  } catch {
    return;
  }
}

async function persistWindowPrefs(partial) {
  const alwaysOnTop =
    typeof partial.alwaysOnTop === 'boolean'
      ? partial.alwaysOnTop
      : Boolean($('always-on-top')?.checked);
  const compactViewer =
    typeof partial.compactViewer === 'boolean'
      ? partial.compactViewer
      : Boolean($('compact-viewer')?.checked);
  applyWindowPrefUi(alwaysOnTop, compactViewer);
  if (compactViewer) {
    await requestAppMode('viewer');
  }
  await persistConfigPartial({ alwaysOnTop, compactViewer }, (config) => {
    applyWindowPrefUi(Boolean(config.alwaysOnTop), Boolean(config.compactViewer));
    patchSnapshotWindowPrefs(Boolean(config.alwaysOnTop), Boolean(config.compactViewer));
  });
}

async function persistConfigPartial(partial, onSaved) {
  configEchoWait += 1;
  try {
    const result = await window.liveTts.saveConfig(partial);
    if (result?.config) {
      savedConfig = result.config;
      onSaved?.(result.config);
      return result;
    }
    configEchoWait = Math.max(0, configEchoWait - 1);
    return result || { ok: false };
  } catch (error) {
    configEchoWait = Math.max(0, configEchoWait - 1);
    const message = error instanceof Error ? error.message : String(error || '');
    return { ok: false, message: message || '保存に失敗しました' };
  }
}

async function persistPreviewPane() {
  await persistConfigPartial({ settingsPreviewPx: previewPanePx }, () => {
    patchSnapshotPreviewPx(previewPanePx);
  });
}

function bindPreviewPaneResize() {
  const split = $('workspace-split');
  const workspace = document.querySelector('.workspace');
  if (!split || !workspace) {
    return;
  }

  let dragging = false;

  const onMove = (event) => {
    if (!dragging) {
      return;
    }
    const rect = workspace.getBoundingClientRect();
    applyPreviewPane(rect.right - event.clientX);
  };

  const onUp = () => {
    if (!dragging) {
      return;
    }
    dragging = false;
    workspace.classList.remove('is-resizing');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    void persistPreviewPane();
  };

  split.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragging = true;
    workspace.classList.add('is-resizing');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  split.addEventListener('dblclick', () => {
    applyPreviewPane(DEFAULT_SETTINGS_PREVIEW_PX);
    void persistPreviewPane();
  });

  split.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    applyPreviewPane(previewPanePx + (event.key === 'ArrowLeft' ? 24 : -24));
    void persistPreviewPane();
  });

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => {
      const before = previewPanePx;
      applyPreviewPane(previewPanePx);
      if (previewPanePx !== before) {
        patchSnapshotPreviewPx(previewPanePx);
      }
    });
    observer.observe(workspace);
  }
}

function applyViewerEventPane(px) {
  const workspace = document.querySelector('.viewer-workspace');
  viewerEventPanePx = clampViewerEventPanePx(px, workspace?.clientWidth || 0);
  workspace?.style.setProperty('--viewer-event-pane', `${viewerEventPanePx}px`);
  const split = $('viewer-split');
  if (split) {
    split.setAttribute('aria-valuenow', String(viewerEventPanePx));
    split.setAttribute('aria-valuemin', String(MIN_VIEWER_EVENT_PANE_PX));
    split.setAttribute('aria-valuemax', String(MAX_VIEWER_EVENT_PANE_PX));
  }
}

function patchSnapshotViewerEventPx(px) {
  if (!savedSnapshot) {
    return;
  }
  try {
    const snap = JSON.parse(savedSnapshot);
    snap.viewerEventPanePx = px;
    savedSnapshot = JSON.stringify(snap);
    updateDirtyUi();
  } catch {
    return;
  }
}

async function persistViewerEventPane() {
  await persistConfigPartial({ viewerEventPanePx }, () => {
    patchSnapshotViewerEventPx(viewerEventPanePx);
  });
}

function bindViewerPaneResize() {
  const split = $('viewer-split');
  const workspace = document.querySelector('.viewer-workspace');
  if (!split || !workspace) {
    return;
  }

  let dragging = false;

  const onMove = (event) => {
    if (!dragging) {
      return;
    }
    const rect = workspace.getBoundingClientRect();
    applyViewerEventPane(rect.right - event.clientX);
  };

  const onUp = () => {
    if (!dragging) {
      return;
    }
    dragging = false;
    workspace.classList.remove('is-resizing');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    void persistViewerEventPane();
  };

  split.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragging = true;
    workspace.classList.add('is-resizing');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  split.addEventListener('dblclick', () => {
    applyViewerEventPane(DEFAULT_VIEWER_EVENT_PANE_PX);
    void persistViewerEventPane();
  });

  split.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    applyViewerEventPane(viewerEventPanePx + (event.key === 'ArrowLeft' ? 24 : -24));
    void persistViewerEventPane();
  });

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => {
      const before = viewerEventPanePx;
      applyViewerEventPane(viewerEventPanePx);
      if (viewerEventPanePx !== before) {
        patchSnapshotViewerEventPx(viewerEventPanePx);
      }
    });
    observer.observe(workspace);
  }
}

function patchSnapshotViewerLayout(mode, dock) {
  if (!savedSnapshot) {
    return;
  }
  try {
    const snap = JSON.parse(savedSnapshot);
    snap.viewerLayout = mode;
    if (dock) {
      snap.viewerDock = cloneDock(dock);
    }
    savedSnapshot = JSON.stringify(snap);
    updateDirtyUi();
  } catch {
    return;
  }
}

function applyViewerFontSize(value) {
  viewerFontSize = clampViewerFontSize(value);
  const input = $('viewer-font-size');
  if (input) {
    input.value = String(viewerFontSize);
    input.min = String(MIN_VIEWER_FONT_SIZE);
    input.max = String(MAX_VIEWER_FONT_SIZE);
  }
  setRangeLabel('viewer-font-size', viewerFontSize, 'px');
  $('view-viewer')?.style.setProperty('--viewer-font-size', `${viewerFontSize}px`);
}

function patchSnapshotViewerFontSize(size) {
  if (!savedSnapshot) {
    return;
  }
  try {
    const snap = JSON.parse(savedSnapshot);
    snap.viewerFontSize = size;
    savedSnapshot = JSON.stringify(snap);
    updateDirtyUi();
  } catch {
    return;
  }
}

async function persistViewerFontSize() {
  await persistConfigPartial({ viewerFontSize }, (config) => {
    patchSnapshotViewerFontSize(config.viewerFontSize ?? viewerFontSize);
  });
}

function schedulePersistViewerFontSize() {
  window.clearTimeout(viewerFontSaveTimer);
  viewerFontSaveTimer = window.setTimeout(() => {
    void persistViewerFontSize();
  }, 250);
}

async function persistViewerLayout() {
  const result = await persistConfigPartial({
    viewerLayout,
    viewerDock: cloneDock(viewerDock),
  }, () => {
    patchSnapshotViewerLayout(viewerLayout, viewerDock);
  });
  if (!result.ok && result.message) {
    setToast(result.message, true);
  }
}

function queuePersistViewerLayout() {
  viewerLayoutPersistChain = viewerLayoutPersistChain
    .catch(() => undefined)
    .then(() => persistViewerLayout());
}

async function flushViewerLayoutPersist() {
  queuePersistViewerLayout();
  await viewerLayoutPersistChain;
}
