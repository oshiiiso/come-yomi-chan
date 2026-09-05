function paneTitleForTypes(types) {
  const labels = VIEWER_DOCK_TYPES.filter((type) => types.includes(type)).map(viewerTypeLabel);
  return labels.join('・') || uiCopy.viewerPaneEvents;
}

function viewerItemType(item) {
  if (item.dataset.viewerType) {
    return item.dataset.viewerType;
  }
  if (item.classList.contains('viewer__item--status')) {
    return 'comment';
  }
  const match = /viewer__item--([A-Za-z]+)/.exec(item.className || '');
  return match?.[1] || 'comment';
}

function sortViewerLog(log) {
  const items = [...log.children];
  items.sort((left, right) => {
    const a = left.querySelector('time')?.dateTime || '';
    const b = right.querySelector('time')?.dateTime || '';
    return a.localeCompare(b);
  });
  for (const item of items) {
    log.appendChild(item);
  }
}

function allViewerLogs() {
  return [...document.querySelectorAll('#viewer-workspace ol.viewer')];
}

function collectAllViewerItems() {
  const items = [];
  for (const log of allViewerLogs()) {
    items.push(...log.children);
  }
  return items;
}

function redistributeViewerLogs() {
  const items = collectAllViewerItems();
  items.sort((left, right) => {
    const a = left.querySelector('time')?.dateTime || '';
    const b = right.querySelector('time')?.dateTime || '';
    return a.localeCompare(b);
  });
  for (const item of items) {
    const log = viewerLogForType(viewerItemType(item));
    log?.appendChild(item);
  }
}

function renderViewerDock() {
  const root = $('viewer-dock');
  const workspace = $('viewer-workspace');
  if (!root || !workspace) {
    return;
  }
  const items = collectAllViewerItems();
  viewerDock = ensureDockTypes(viewerDock);
  const tree = pruneDock(viewerDock);
  root.replaceChildren();
  const build = (node) => {
    if (node.kind === 'leaf') {
      const pane = document.createElement('section');
      pane.className = 'viewer-dock-pane';
      pane.dataset.leafId = node.id;
      const head = document.createElement('div');
      head.className = 'viewer-dock-pane__head';
      head.draggable = true;
      const chips = document.createElement('div');
      chips.className = 'viewer-dock-pane__chips';
      for (const type of VIEWER_DOCK_TYPES.filter((item) => node.types.includes(item))) {
        const chip = document.createElement('span');
        chip.className = 'viewer-dock-chip';
        chip.draggable = true;
        chip.dataset.dockType = type;
        chip.textContent = viewerTypeLabel(type);
        chips.appendChild(chip);
      }
      if (!chips.childElementCount) {
        chips.textContent = paneTitleForTypes(node.types);
      }
      head.appendChild(chips);
      const empty = document.createElement('p');
      empty.className = 'viewer-pane__empty';
      empty.hidden = true;
      const log = document.createElement('ol');
      log.className = 'viewer';
      log.id = `viewer-log-${node.id}`;
      log.setAttribute('aria-live', 'polite');
      const drop = document.createElement('div');
      drop.className = 'viewer-dock-drop';
      pane.append(head, empty, log, drop);
      return pane;
    }
    const split = document.createElement('div');
    split.className = 'viewer-dock-split';
    split.dataset.dir = node.dir;
    split.dataset.splitId = node.id;
    const first = build(node.a);
    const sash = document.createElement('div');
    sash.className = 'viewer-dock-sash';
    sash.dataset.splitId = node.id;
    const second = build(node.b);
    first.style.flex = `${node.ratio} 1 0`;
    second.style.flex = `${1 - node.ratio} 1 0`;
    split.append(first, sash, second);
    return split;
  };
  root.appendChild(build(tree));
  for (const item of items) {
    viewerLogForType(viewerItemType(item))?.appendChild(item);
  }
  bindViewerDockEvents();
}

function applyViewerLayoutUi() {
  const workspace = $('viewer-workspace');
  const dock = $('viewer-dock');
  workspace?.classList.toggle('is-combined', viewerLayout === 'combined');
  workspace?.classList.toggle('is-custom', viewerLayout === 'custom');
  $('btn-viewer-layout-combined')?.classList.toggle('is-active', viewerLayout === 'combined');
  $('btn-viewer-layout-split')?.classList.toggle('is-active', viewerLayout === 'split');
  $('btn-viewer-layout-custom')?.classList.toggle('is-active', viewerLayout === 'custom');
  const split = $('viewer-split');
  if (split) {
    split.hidden = viewerLayout !== 'split';
    split.tabIndex = viewerLayout === 'split' ? 0 : -1;
  }
  if (dock) {
    dock.hidden = viewerLayout !== 'custom';
  }
}

function applyViewerLayout(mode, persist) {
  viewerLayout = normalizeViewerLayout(mode);
  if (viewerLayout === 'custom') {
    renderViewerDock();
  }
  redistributeViewerLogs();
  applyViewerLayoutUi();
  applyViewerSearch();
  applyViewerFocus();
  for (const log of allViewerLogs()) {
    if (getViewerStick(log)) {
      scrollViewerLogToLatest(log);
    }
  }
  syncViewerLatestButton();
  if (persist) {
    queuePersistViewerLayout();
  }
}

function persistViewerDockSoon() {
  queuePersistViewerLayout();
}

function bindViewerDockEvents() {
  const root = $('viewer-dock');
  const workspace = $('viewer-workspace');
  if (!root || root.dataset.bound === '1') {
    // rebind after rebuild
  }
  root.dataset.bound = '1';
  root.onpointerdown = (event) => {
    const sash = event.target.closest('.viewer-dock-sash');
    if (!sash || event.button !== 0) {
      return;
    }
    const split = sash.closest('.viewer-dock-split');
    if (!split) {
      return;
    }
    event.preventDefault();
    const vertical = split.dataset.dir === 'v';
    workspace.classList.add(vertical ? 'is-resizing-row' : 'is-resizing');
    const onMove = (moveEvent) => {
      const rect = split.getBoundingClientRect();
      const ratio = vertical
        ? (moveEvent.clientY - rect.top) / rect.height
        : (moveEvent.clientX - rect.left) / rect.width;
      const clamped = Math.min(0.8, Math.max(0.2, ratio));
      const [first, , second] = split.children;
      if (first && second) {
        first.style.flex = `${clamped} 1 0`;
        second.style.flex = `${1 - clamped} 1 0`;
      }
      const apply = (node) => {
        if (!node) {
          return;
        }
        if (node.kind === 'split' && node.id === split.dataset.splitId) {
          node.ratio = clamped;
          return;
        }
        if (node.kind === 'split') {
          apply(node.a);
          apply(node.b);
        }
      };
      apply(viewerDock);
    };
    const onUp = () => {
      workspace.classList.remove('is-resizing', 'is-resizing-row');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      persistViewerDockSoon();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  root.ondragstart = (event) => {
    const chip = event.target.closest('.viewer-dock-chip');
    const head = event.target.closest('.viewer-dock-pane__head');
    const pane = event.target.closest('.viewer-dock-pane');
    if (!pane) {
      return;
    }
    if (chip) {
      dockDrag = { kind: 'type', type: chip.dataset.dockType, sourceId: pane.dataset.leafId };
    } else if (head) {
      dockDrag = { kind: 'leaf', sourceId: pane.dataset.leafId };
    } else {
      return;
    }
    event.dataTransfer?.setData('text/plain', JSON.stringify(dockDrag));
    event.dataTransfer.effectAllowed = 'move';
  };

  root.ondragover = (event) => {
    const pane = event.target.closest('.viewer-dock-pane');
    if (!pane || !dockDrag) {
      return;
    }
    event.preventDefault();
    const edge = dockDropEdge(event, pane);
    pane.classList.remove('is-drop-left', 'is-drop-right', 'is-drop-top', 'is-drop-bottom', 'is-drop-center');
    pane.classList.add(`is-drop-${edge}`);
  };

  root.ondragleave = (event) => {
    const pane = event.target.closest('.viewer-dock-pane');
    if (pane && !pane.contains(event.relatedTarget)) {
      pane.classList.remove('is-drop-left', 'is-drop-right', 'is-drop-top', 'is-drop-bottom', 'is-drop-center');
    }
  };

  root.ondrop = (event) => {
    const pane = event.target.closest('.viewer-dock-pane');
    if (!pane || !dockDrag) {
      return;
    }
    event.preventDefault();
    const edge = dockDropEdge(event, pane);
    pane.classList.remove('is-drop-left', 'is-drop-right', 'is-drop-top', 'is-drop-bottom', 'is-drop-center');
    if (dockDrag.kind === 'type') {
      viewerDock = dockTypeToEdge(viewerDock, dockDrag.type, pane.dataset.leafId, edge);
    } else {
      viewerDock = dockLeafToEdge(viewerDock, dockDrag.sourceId, pane.dataset.leafId, edge);
    }
    dockDrag = null;
    renderViewerDock();
    applyViewerSearch();
    applyViewerFocus();
    persistViewerDockSoon();
  };

  root.ondragend = () => {
    dockDrag = null;
    for (const pane of root.querySelectorAll('.viewer-dock-pane')) {
      pane.classList.remove('is-drop-left', 'is-drop-right', 'is-drop-top', 'is-drop-bottom', 'is-drop-center');
    }
  };
}
