const OVERLAY_BOARD_MAX = 30;
const OVERLAY_BOARD_WIDGET_MAX = 20;
const OVERLAY_BOARD_WIDGET_MIN_PX = 120;
const OVERLAY_BOARD_WIDGET_VISIBLE_PX = 48;

const BOARD_KINDS = [
  { kind: 'chat', label: 'コメント' },
  { kind: 'ranking', label: 'ランキング' },
  { kind: 'alerts', label: 'アラート' },
];

let overlayBoardsReady = false;
let overlayBoards = [];
let boardSelectedId = '';
let boardSelectedWidgetId = '';
let boardMenu = null;
let boardSettings = null;
let boardRevealedLayerId = '';

function boardSize(orientation) {
  return orientation === 'portrait'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

function boardClampRect(rect, orientation) {
  const canvas = boardSize(orientation);
  const width = Math.min(canvas.width, Math.max(OVERLAY_BOARD_WIDGET_MIN_PX, Math.trunc(rect.width)));
  const height = Math.min(canvas.height, Math.max(OVERLAY_BOARD_WIDGET_MIN_PX, Math.trunc(rect.height)));
  const minX = OVERLAY_BOARD_WIDGET_VISIBLE_PX - width;
  const maxX = canvas.width - OVERLAY_BOARD_WIDGET_VISIBLE_PX;
  const minY = OVERLAY_BOARD_WIDGET_VISIBLE_PX - height;
  const maxY = canvas.height - OVERLAY_BOARD_WIDGET_VISIBLE_PX;
  return {
    x: Math.min(maxX, Math.max(minX, Math.trunc(rect.x))),
    y: Math.min(maxY, Math.max(minY, Math.trunc(rect.y))),
    width,
    height,
  };
}

function boardClampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

/** src/shared/overlay-board.ts の normalizeOverlayBoardContent と同じ */
function normalizeOverlayBoardContent(raw, frame, orientation) {
  const canvas = boardSize(orientation);
  let contentWidth = boardClampInt(raw?.contentWidth, frame.width, frame.width, canvas.width);
  let contentHeight = boardClampInt(raw?.contentHeight, frame.height, frame.height, canvas.height);
  if (contentWidth < frame.width) {
    contentWidth = frame.width;
  }
  if (contentHeight < frame.height) {
    contentHeight = frame.height;
  }
  return {
    contentX: boardClampInt(raw?.contentX, 0, frame.width - contentWidth, 0),
    contentY: boardClampInt(raw?.contentY, 0, frame.height - contentHeight, 0),
    contentWidth,
    contentHeight,
  };
}

function boardClampSpan(start, end, contentStart, contentEnd, moveStart) {
  const min = OVERLAY_BOARD_WIDGET_MIN_PX;
  let from = start;
  let to = end;
  if (to - from < min) {
    if (moveStart) {
      from = to - min;
    } else {
      to = from + min;
    }
  }
  if (from < contentStart) {
    from = contentStart;
  }
  if (to > contentEnd) {
    to = contentEnd;
  }
  if (to - from < min) {
    if (moveStart) {
      from = Math.max(contentStart, Math.min(from, contentEnd - min));
      to = from + min;
      if (to > contentEnd) {
        to = contentEnd;
        from = to - min;
      }
    } else {
      to = Math.min(contentEnd, Math.max(to, contentStart + min));
      from = to - min;
      if (from < contentStart) {
        from = contentStart;
        to = from + min;
      }
    }
  }
  return [from, to];
}

function boardLayoutSize(origin) {
  return {
    layoutWidth: boardClampInt(origin.layoutWidth, origin.contentWidth, 1, 10000),
    layoutHeight: boardClampInt(origin.layoutHeight, origin.contentHeight, 1, 10000),
  };
}

/** src/shared/overlay-board.ts の lockAspectFrame と同じ */
function boardLockAspectFrame(handle, left, top, right, bottom, origin, aspect, orientation) {
  const ratio = aspect > 0 ? aspect : origin.width / origin.height;
  const horizontal = handle.includes('e') || handle.includes('w');
  const vertical = handle.includes('n') || handle.includes('s');
  const anchorX = handle.includes('w') ? origin.x + origin.width : origin.x;
  const anchorY = handle.includes('n') ? origin.y + origin.height : origin.y;
  let growX = (handle.includes('w') ? -1 : 1) * ((handle.includes('w') ? left : right) - anchorX);
  let growY = (handle.includes('n') ? -1 : 1) * ((handle.includes('n') ? top : bottom) - anchorY);
  if (horizontal && vertical) {
    const vx = ratio;
    const vy = 1;
    const denom = vx * vx + vy * vy;
    const t = denom > 0 ? (growX * vx + growY * vy) / denom : 0;
    growX = t * ratio;
    growY = t;
  } else if (horizontal) {
    growY = growX / ratio;
  } else {
    growX = growY * ratio;
  }
  const min = OVERLAY_BOARD_WIDGET_MIN_PX;
  const minW = Math.max(min, Math.ceil(min * ratio));
  const minH = Math.max(min, Math.ceil(min / ratio));
  if (growX < minW || growY < minH) {
    growX = Math.max(growX, minW);
    growY = growX / ratio;
    if (growY < minH) {
      growY = minH;
      growX = growY * ratio;
    }
  }
  const width = Math.max(minW, Math.round(growX));
  const height = Math.max(minH, Math.round(width / ratio));
  let x = origin.x + (origin.width - width) / 2;
  let y = origin.y + (origin.height - height) / 2;
  if (handle.includes('e')) {
    x = origin.x;
  } else if (handle.includes('w')) {
    x = origin.x + origin.width - width;
  }
  if (handle.includes('s')) {
    y = origin.y;
  } else if (handle.includes('n')) {
    y = origin.y + origin.height - height;
  }
  return boardClampRect({ x, y, width, height }, orientation);
}

/** src/shared/overlay-board.ts の scaleCropToFrame と同じ */
function boardScaleCropToFrame(origin, frame, orientation) {
  const scale = origin.width > 0 ? frame.width / origin.width : 1;
  return normalizeOverlayBoardContent(
    {
      contentX: Math.round(origin.contentX * scale),
      contentY: Math.round(origin.contentY * scale),
      contentWidth: Math.round(origin.contentWidth * scale),
      contentHeight: Math.round(origin.contentHeight * scale),
    },
    frame,
    orientation,
  );
}

/** src/shared/overlay-board.ts の resizeOverlayBoardWidget と同じ */
function resizeOverlayBoardWidget(input) {
  const originContent = normalizeOverlayBoardContent(input.origin, input.origin, input.orientation);
  const origin = { ...input.origin, ...originContent };
  if (!input.handle) {
    const frame = boardClampRect(
      {
        x: origin.x + input.dx,
        y: origin.y + input.dy,
        width: origin.width,
        height: origin.height,
      },
      input.orientation,
    );
    return {
      ...frame,
      contentX: origin.contentX,
      contentY: origin.contentY,
      contentWidth: origin.contentWidth,
      contentHeight: origin.contentHeight,
      ...boardLayoutSize(origin),
    };
  }
  let left = origin.x;
  let top = origin.y;
  let right = origin.x + origin.width;
  let bottom = origin.y + origin.height;
  if (input.handle.includes('e')) {
    right += input.dx;
  }
  if (input.handle.includes('s')) {
    bottom += input.dy;
  }
  if (input.handle.includes('w')) {
    left += input.dx;
  }
  if (input.handle.includes('n')) {
    top += input.dy;
  }
  if (!input.alt) {
    const layout = boardLayoutSize(origin);
    const frame = boardLockAspectFrame(
      input.handle,
      left,
      top,
      right,
      bottom,
      origin,
      layout.layoutWidth / layout.layoutHeight,
      input.orientation,
    );
    return {
      ...frame,
      ...boardScaleCropToFrame(origin, frame, input.orientation),
      ...layout,
    };
  }
  const contentLeft = origin.x + origin.contentX;
  const contentTop = origin.y + origin.contentY;
  const contentRight = contentLeft + origin.contentWidth;
  const contentBottom = contentTop + origin.contentHeight;
  if (input.handle.includes('e') || input.handle.includes('w')) {
    [left, right] = boardClampSpan(left, right, contentLeft, contentRight, input.handle.includes('w'));
  }
  if (input.handle.includes('n') || input.handle.includes('s')) {
    [top, bottom] = boardClampSpan(top, bottom, contentTop, contentBottom, input.handle.includes('n'));
  }
  const frame = boardClampRect(
    { x: left, y: top, width: right - left, height: bottom - top },
    input.orientation,
  );
  return {
    ...frame,
    ...normalizeOverlayBoardContent(
      {
        contentX: contentLeft - frame.x,
        contentY: contentTop - frame.y,
        contentWidth: origin.contentWidth,
        contentHeight: origin.contentHeight,
      },
      frame,
      input.orientation,
    ),
    ...boardLayoutSize(origin),
  };
}

function boardById(id) {
  return overlayBoards.find((board) => board.id === id) || null;
}

function selectedBoard() {
  return boardById(boardSelectedId) || overlayBoards[0] || null;
}

function selectedWidget(board) {
  return board?.widgets?.find((widget) => widget.id === boardSelectedWidgetId) || null;
}

function getOverlayBoards() {
  return overlayBoardsReady ? overlayBoards : null;
}

function setOverlayBoards(next) {
  overlayBoardsReady = true;
  overlayBoards = Array.isArray(next) ? next.map((board) => structuredClone(board)) : [];
  if (!boardById(boardSelectedId)) {
    boardSelectedId = overlayBoards[0]?.id || '';
  }
  const board = selectedBoard();
  if (board && !selectedWidget(board)) {
    boardSelectedWidgetId = board.widgets[0]?.id || '';
  }
  renderOverlayBoardEditor();
}

function boardUniqueName(base, used) {
  const first = String(base || '').trim().slice(0, 40) || '配置';
  if (!used.has(first)) {
    used.add(first);
    return first;
  }
  for (let index = 2; index < 1000; index += 1) {
    const next = `${first} ${index}`.slice(0, 40);
    if (!used.has(next)) {
      used.add(next);
      return next;
    }
  }
  return first;
}

function boardNewId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function boardWidgetFromConfig(kind, orientation, config) {
  const slots = orientation === 'portrait'
    ? {
        chat: { x: 48, y: 1200, width: 984, height: 560 },
        ranking: { x: 48, y: 180, width: 984, height: 460 },
        alerts: { x: 80, y: 700, width: 920, height: 420 },
      }
    : {
        chat: { x: 40, y: 520, width: 560, height: 520 },
        ranking: { x: 1400, y: 40, width: 480, height: 720 },
        alerts: { x: 640, y: 280, width: 640, height: 420 },
      };
  const label = BOARD_KINDS.find((item) => item.kind === kind)?.label || kind;
  const used = new Set((selectedBoard()?.widgets || []).map((widget) => widget.name));
  const rect = boardClampRect(slots[kind], orientation);
  return {
    id: boardNewId('w'),
    kind,
    name: boardUniqueName(label, used),
    visible: true,
    ...rect,
    contentX: 0,
    contentY: 0,
    contentWidth: rect.width,
    contentHeight: rect.height,
    layoutWidth: rect.width,
    layoutHeight: rect.height,
    settings: boardSettingsFromConfig(kind, config),
  };
}

function boardSettingsFromConfig(kind, config) {
  const source = config || (typeof collectConfig === 'function' ? collectConfig() : {});
  if (kind === 'ranking') {
    return {
      enabled: source.overlayLikeRankingEnabled !== false,
      max: Number(source.overlayLikeRankingMax) || 5,
      mode: source.overlayRankingMode === 'diamonds' ? 'diamonds' : 'likes',
      likeSyncMode: source.overlayRankingLikeSyncMode === 'poll' ? 'poll' : 'live',
      likePollSec: Number(source.overlayRankingLikePollSec) || 30,
      motion: source.overlayRankingMotion || 'slide',
      motionSpeed: Number(source.overlayRankingMotionSpeed) || 2,
      theme: source.overlayLikesTheme || 'standard',
      fontFamily: source.overlayLikesFontFamily || 'default',
      fontSize: Number(source.overlayLikesFontSize) || 22,
      bgOpacity: Number(source.overlayLikesBgOpacity) || 0,
      showAvatar: source.overlayLikesShowAvatar !== false,
      avatarSize: Number(source.overlayLikesAvatarSize) || 36,
      itemRadius: Number(source.overlayLikesItemRadius) || 14,
      rowGap: Number(source.overlayLikesRowGap) || 6,
      panelWidth: Number(source.overlayLikesPanelWidth) || 420,
      showUnit: source.overlayLikesShowUnit !== false,
      neonHue: Number(source.overlayLikesNeonHue) || 280,
      nameColorEnabled: source.overlayNameColorEnabled !== false,
      nameColors: Array.isArray(source.overlayNameColors) ? source.overlayNameColors.slice() : [],
    };
  }
  if (kind === 'alerts') {
    return {
      nameColorEnabled: source.overlayNameColorEnabled !== false,
      nameColors: Array.isArray(source.overlayNameColors) ? source.overlayNameColors.slice() : [],
      templateAccentColors: source.templateAccentColors ? structuredClone(source.templateAccentColors) : {},
    };
  }
  return {
    hideUserName: source.hideUserName === true,
    chatMaxRows: Number(source.chatMaxRows) || 8,
    chatDisplayMs: Number(source.chatDisplayMs) || 0,
    overlayCustomCss: source.overlayCustomCss || '',
    overlayTheme: source.overlayTheme || 'dark',
    overlayFontFamily: source.overlayFontFamily || 'default',
    overlayFontSize: Number(source.overlayFontSize) || 20,
    overlayBgOpacity: Number(source.overlayBgOpacity) || 0,
    overlayShowAvatar: source.overlayShowAvatar !== false,
    overlayGiftIconSize: Number(source.overlayGiftIconSize) || 40,
    overlayItemRadius: Number(source.overlayItemRadius) || 12,
    overlayNeonHue: Number(source.overlayNeonHue) || 280,
    overlayAlign: source.overlayAlign || 'full',
    overlayMotion: source.overlayMotion || 'fuwatto',
    overlayMotionSpeed: Number(source.overlayMotionSpeed) || 2,
    overlayPinEnabled: source.overlayPinEnabled !== false,
    overlayPinMs: Number(source.overlayPinMs) || 4000,
    overlayPinMsByType: source.overlayPinMsByType ? structuredClone(source.overlayPinMsByType) : {},
    overlayPinHold: source.overlayPinHold === true,
    overlayPinTypes: source.overlayPinTypes ? structuredClone(source.overlayPinTypes) : {},
    overlayPinPreview: source.overlayPinPreview !== false,
    overlayNameColorEnabled: source.overlayNameColorEnabled !== false,
    overlayNameColors: Array.isArray(source.overlayNameColors) ? source.overlayNameColors.slice() : [],
    templateAccentColors: source.templateAccentColors ? structuredClone(source.templateAccentColors) : {},
  };
}

function boardChanged() {
  if (typeof noteFormChanged === 'function') {
    noteFormChanged();
  }
}

function closeBoardMenu() {
  boardMenu?.remove();
  boardMenu = null;
  $('board-add')?.setAttribute('aria-expanded', 'false');
  $('board-widget-add')?.setAttribute('aria-expanded', 'false');
}

function openBoardMenu(anchor, items) {
  closeBoardMenu();
  const menu = document.createElement('div');
  menu.className = 'board-menu';
  menu.setAttribute('role', 'menu');
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
  menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 40)}px`;
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'board-menu__item';
    button.setAttribute('role', 'menuitem');
    button.textContent = item.label;
    button.disabled = item.disabled === true;
    button.addEventListener('click', () => {
      closeBoardMenu();
      item.onSelect?.();
    });
    menu.append(button);
  }
  document.body.append(menu);
  boardMenu = menu;
  menu.querySelector('button:not(:disabled)')?.focus();
  anchor.setAttribute('aria-expanded', 'true');
}

function openBoardContextMenu(x, y, widget) {
  closeBoardMenu();
  const board = selectedBoard();
  if (!board || !widget) {
    return;
  }
  const menu = document.createElement('div');
  menu.className = 'board-menu';
  menu.setAttribute('role', 'menu');
  menu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 280)}px`;
  const actions = [
    ['項目名を変える', () => renameBoardWidget(widget)],
    [widget.visible === false ? '表示' : '非表示', () => toggleBoardWidget(widget)],
    ['最前面', () => orderBoardWidget(widget, 'front')],
    ['前面', () => orderBoardWidget(widget, 'forward')],
    ['背面', () => orderBoardWidget(widget, 'backward')],
    ['最背面', () => orderBoardWidget(widget, 'back')],
    ['複製', () => duplicateBoardWidget(widget)],
    ['削除', () => removeBoardWidget(widget)],
    ['設定', () => openBoardWidgetSettings(widget)],
  ];
  for (const [label, run] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'board-menu__item';
    button.setAttribute('role', 'menuitem');
    button.textContent = label;
    button.addEventListener('click', () => {
      closeBoardMenu();
      run();
    });
    menu.append(button);
  }
  document.body.append(menu);
  boardMenu = menu;
  menu.querySelector('button')?.focus();
}

function askBoardName({ title, message, value, onSubmit, returnFocus }) {
  document.getElementById('board-name-dialog')?.remove();
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.id = 'board-name-dialog';
  const card = document.createElement('form');
  card.className = 'modal__card board-name-dialog';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'board-name-title');
  const heading = document.createElement('h2');
  heading.id = 'board-name-title';
  heading.textContent = title;
  const lead = document.createElement('p');
  lead.className = 'hint';
  lead.textContent = message;
  const field = document.createElement('label');
  field.className = 'field';
  const span = document.createElement('span');
  span.textContent = '名前';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 40;
  input.value = value;
  input.autocomplete = 'off';
  input.spellcheck = false;
  field.append(span, input);
  const note = document.createElement('p');
  note.className = 'hint';
  note.textContent = '空欄のときは自動で名前が付きます。同じ名前があると、うしろに番号が付きます。';
  const actions = document.createElement('div');
  actions.className = 'row';
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'btn';
  save.textContent = 'この名前にする';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn--ghost';
  cancel.textContent = 'キャンセル';
  const close = () => {
    dialog.remove();
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
      returnFocus.focus();
    }
  };
  cancel.addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      close();
    }
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  card.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = input.value;
    close();
    onSubmit(next);
  });
  actions.append(save, cancel);
  card.append(heading, lead, field, note, actions);
  dialog.append(card);
  document.body.append(dialog);
  input.focus();
  input.select();
}

function renameBoardWidget(widget) {
  const board = selectedBoard();
  if (!board || !widget) {
    return;
  }
  askBoardName({
    title: '項目の名前',
    message: `「${widget.name}」の表示名を変えます。レイヤー一覧に出ます。`,
    value: widget.name,
    returnFocus: $('board-widget-add'),
    onSubmit: (next) => {
      const current = selectedBoard();
      if (!current || !current.widgets.includes(widget)) {
        return;
      }
      const used = new Set(current.widgets.filter((item) => item !== widget).map((item) => item.name));
      widget.name = boardUniqueName(next, used);
      renderOverlayBoardEditor();
      boardChanged();
      document.querySelector(`.board-layer[data-widget-id="${CSS.escape(widget.id)}"] .board-layer__eye`)?.focus();
    },
  });
}

function toggleBoardWidget(widget) {
  widget.visible = widget.visible === false;
  renderOverlayBoardEditor();
  boardChanged();
}

function orderBoardWidget(widget, mode) {
  boardRevealedLayerId = '';
  const board = selectedBoard();
  if (!board) {
    return;
  }
  const index = board.widgets.indexOf(widget);
  if (index < 0) {
    return;
  }
  board.widgets.splice(index, 1);
  if (mode === 'front') {
    board.widgets.push(widget);
  } else if (mode === 'back') {
    board.widgets.unshift(widget);
  } else if (mode === 'forward') {
    board.widgets.splice(Math.min(board.widgets.length, index + 1), 0, widget);
  } else {
    board.widgets.splice(Math.max(0, index - 1), 0, widget);
  }
  renderOverlayBoardEditor();
  boardChanged();
}

function duplicateBoardWidget(widget) {
  const board = selectedBoard();
  if (!board || board.widgets.length >= OVERLAY_BOARD_WIDGET_MAX) {
    return;
  }
  const used = new Set(board.widgets.map((item) => item.name));
  const copy = structuredClone(widget);
  copy.id = boardNewId('w');
  copy.name = boardUniqueName(`${widget.name} のコピー`, used);
  const moved = boardClampRect(
    { x: widget.x + 24, y: widget.y + 24, width: widget.width, height: widget.height },
    board.orientation,
  );
  Object.assign(copy, moved);
  board.widgets.push(copy);
  boardSelectedWidgetId = copy.id;
  renderOverlayBoardEditor();
  boardChanged();
}

function removeBoardWidget(widget) {
  const board = selectedBoard();
  if (!board) {
    return;
  }
  board.widgets = board.widgets.filter((item) => item !== widget);
  boardSelectedWidgetId = board.widgets.at(-1)?.id || '';
  renderOverlayBoardEditor();
  boardChanged();
}

function addBoard(orientation, template) {
  if (overlayBoards.length >= OVERLAY_BOARD_MAX) {
    return;
  }
  const config = typeof collectConfig === 'function' ? collectConfig() : {};
  const used = new Set(overlayBoards.map((board) => board.name));
  const base = orientation === 'portrait' ? '縦' : '横';
  const board = {
    id: boardNewId('b'),
    name: boardUniqueName(base, used),
    orientation,
    showGuide: true,
    widgets: template
      ? ['chat', 'ranking', 'alerts'].map((kind) => boardWidgetFromConfig(kind, orientation, config))
      : [],
  };
  if (template) {
    const names = new Set();
    for (const widget of board.widgets) {
      widget.name = boardUniqueName(BOARD_KINDS.find((item) => item.kind === widget.kind)?.label || widget.kind, names);
    }
  }
  overlayBoards.push(board);
  boardSelectedId = board.id;
  boardSelectedWidgetId = board.widgets[0]?.id || '';
  renderOverlayBoardEditor();
  boardChanged();
}

function renameSelectedBoard() {
  const board = selectedBoard();
  if (!board) {
    return;
  }
  askBoardName({
    title: '配置の名前',
    message: `「${board.name}」の表示名を変えます。上の配置一覧に出ます。配信ソースの中身は変わりません。`,
    value: board.name,
    returnFocus: $('board-rename'),
    onSubmit: (next) => {
      const current = overlayBoards.find((item) => item.id === board.id);
      if (!current) {
        return;
      }
      const used = new Set(overlayBoards.filter((item) => item !== current).map((item) => item.name));
      current.name = boardUniqueName(next, used);
      renderOverlayBoardEditor();
      boardChanged();
      $('board-rename')?.focus();
    },
  });
}

function deleteSelectedBoard() {
  const board = selectedBoard();
  if (!board) {
    return;
  }
  if (!window.confirm(`「${board.name}」を削除しますか？\n配信ソフトに貼ったこのURLは使えなくなります。`)) {
    return;
  }
  overlayBoards = overlayBoards.filter((item) => item.id !== board.id);
  boardSelectedId = overlayBoards[0]?.id || '';
  boardSelectedWidgetId = selectedBoard()?.widgets[0]?.id || '';
  renderOverlayBoardEditor();
  boardChanged();
  if (overlayBoards.length === 0) {
    $('board-add')?.focus();
  }
}

function addBoardWidget(kind) {
  const board = selectedBoard();
  if (!board || board.widgets.length >= OVERLAY_BOARD_WIDGET_MAX) {
    return;
  }
  const config = typeof collectConfig === 'function' ? collectConfig() : {};
  const widget = boardWidgetFromConfig(kind, board.orientation, config);
  const offset = board.widgets.length * 24;
  Object.assign(
    widget,
    boardClampRect(
      { x: widget.x + offset, y: widget.y + offset, width: widget.width, height: widget.height },
      board.orientation,
    ),
  );
  widget.contentX = 0;
  widget.contentY = 0;
  widget.contentWidth = widget.width;
  widget.contentHeight = widget.height;
  widget.layoutWidth = widget.width;
  widget.layoutHeight = widget.height;
  board.widgets.push(widget);
  boardSelectedWidgetId = widget.id;
  renderOverlayBoardEditor();
  boardChanged();
}

function boardUrl(variant) {
  const board = selectedBoard();
  const config = typeof savedConfig === 'object' && savedConfig ? savedConfig : {};
  const base =
    variant === 'obs'
      ? config.overlayPreviewUrl
      : variant === 'studio'
        ? config.overlayStudioUrl
        : config.overlayUrl;
  if (!board || typeof base !== 'string' || !base) {
    return '';
  }
  const root = base.replace(/\/overlay\/?.*$/, '');
  return `${root}/overlay/board/${encodeURIComponent(board.id)}/`;
}

async function copyBoardUrl(variant) {
  const url = boardUrl(variant);
  if (!url) {
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    if (typeof setToast === 'function') {
      setToast('コピーしました', false);
    }
  } catch {
    if (typeof setToast === 'function') {
      setToast('コピーに失敗しました', true);
    }
  }
}

function revealBoardLayerRow(list) {
  const row = list?.querySelector('.board-layer.is-selected');
  const id = row?.dataset.widgetId || '';
  if (!list || !row || id === boardRevealedLayerId) {
    if (!id) {
      boardRevealedLayerId = '';
    }
    return;
  }
  boardRevealedLayerId = id;
  const listRect = list.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  if (rowRect.top < listRect.top) {
    list.scrollTop -= listRect.top - rowRect.top;
  } else if (rowRect.bottom > listRect.bottom) {
    list.scrollTop += rowRect.bottom - listRect.bottom;
  }
}

function paintBoardCount(node, current, max, title) {
  if (!node) {
    return;
  }
  node.textContent = `${current}/${max}`;
  node.title = title;
  node.setAttribute('aria-label', `${title}（${current}/${max}）`);
  node.classList.toggle('is-full', current >= max);
}

function renderOverlayBoardEditor() {
  const list = $('board-list');
  const layers = $('board-layer-list');
  const canvas = $('board-canvas');
  const count = $('board-count');
  const widgetCount = $('board-widget-count');
  if (!list || !layers || !canvas) {
    return;
  }
  const board = selectedBoard();
  paintBoardCount(count, overlayBoards.length, OVERLAY_BOARD_MAX, `配置は${OVERLAY_BOARD_MAX}枚まで`);
  paintBoardCount(widgetCount, board?.widgets.length || 0, OVERLAY_BOARD_WIDGET_MAX, `項目は${OVERLAY_BOARD_WIDGET_MAX}個まで`);
  const addBoardBtn = $('board-add');
  if (addBoardBtn) {
    addBoardBtn.disabled = overlayBoards.length >= OVERLAY_BOARD_MAX;
  }
  const addWidgetBtn = $('board-widget-add');
  if (addWidgetBtn) {
    addWidgetBtn.disabled = !board || board.widgets.length >= OVERLAY_BOARD_WIDGET_MAX;
  }
  const deleteBtn = $('board-delete');
  if (deleteBtn) {
    deleteBtn.disabled = !board;
  }
  const renameBtn = $('board-rename');
  if (renameBtn) {
    renameBtn.disabled = !board;
  }
  const urlLine = $('board-url');
  if (urlLine) {
    urlLine.textContent = board ? boardUrl('live') : '';
  }
  const workspace = $('board-workspace');
  if (workspace) {
    workspace.hidden = !board;
  }
  const actions = $('board-actions');
  if (actions) {
    actions.hidden = !board;
  }
  const emptyNote = $('board-empty');
  if (emptyNote) {
    emptyNote.hidden = Boolean(board);
  }

  list.replaceChildren();
  if (overlayBoards.length === 0) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '配置がありません';
    list.append(empty);
    list.disabled = true;
    list.value = '';
  } else {
    list.disabled = false;
    for (const item of overlayBoards) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      list.append(option);
    }
    list.value = board?.id || overlayBoards[0].id;
  }

  layers.replaceChildren();
  const frontFirst = [...(board?.widgets || [])].reverse();
  for (const widget of frontFirst) {
    const row = document.createElement('li');
    row.className = 'board-layer';
    row.draggable = true;
    if (widget.id === boardSelectedWidgetId) {
      row.classList.add('is-selected');
    }
    const hidden = widget.visible === false;
    if (hidden) {
      row.classList.add('is-off');
    }
    row.dataset.widgetId = widget.id;
    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'board-layer__eye';
    eye.draggable = false;
    eye.setAttribute('aria-label', hidden ? '非表示。クリックで表示' : '表示。クリックで非表示');
    eye.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    eye.append(boardEyeIcon(hidden));
    eye.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleBoardWidget(widget);
    });
    const name = document.createElement('span');
    name.className = 'board-layer__name';
    name.textContent = widget.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'board-layer__remove';
    remove.draggable = false;
    remove.setAttribute('aria-label', `${widget.name} を削除`);
    remove.append(boardTrashIcon());
    const restoreLayerDrag = () => {
      row.draggable = true;
    };
    remove.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      row.draggable = false;
    });
    remove.addEventListener('pointerup', restoreLayerDrag);
    remove.addEventListener('pointercancel', restoreLayerDrag);
    remove.addEventListener('pointerleave', restoreLayerDrag);
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      row.draggable = true;
      removeBoardWidget(widget);
      const next = document.querySelector('.board-layer.is-selected .board-layer__eye') || $('board-widget-add');
      if (next instanceof HTMLElement) {
        next.focus();
      }
    });
    row.append(eye, name, remove);
    row.addEventListener('click', () => {
      boardSelectedWidgetId = widget.id;
      renderOverlayBoardEditor();
    });
    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      boardSelectedWidgetId = widget.id;
      renderOverlayBoardEditor();
      openBoardContextMenu(event.clientX, event.clientY, widget);
    });
    row.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', widget.id);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      const rect = row.getBoundingClientRect();
      row.classList.toggle('is-drop-after', event.clientY > rect.top + rect.height / 2);
      row.classList.toggle('is-drop-before', event.clientY <= rect.top + rect.height / 2);
    });
    row.addEventListener('dragleave', () => {
      row.classList.remove('is-drop-before', 'is-drop-after');
    });
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const placeAfter = row.classList.contains('is-drop-after');
      row.classList.remove('is-drop-before', 'is-drop-after');
      const id = event.dataTransfer?.getData('text/plain');
      moveBoardLayer(id, widget.id, placeAfter);
    });
    layers.append(row);
  }
  layers.classList.toggle('is-scrollable', layers.scrollHeight > layers.clientHeight + 1);
  revealBoardLayerRow(layers);

  for (const child of [...canvas.children]) {
    if (!child.classList.contains('board-editor__live')) {
      child.remove();
    }
  }
  canvas.classList.toggle('is-portrait', board?.orientation === 'portrait');
  canvas.classList.toggle('is-landscape', board?.orientation !== 'portrait');
  syncBoardLivePreview(canvas, board);
  if (!board) {
    return;
  }
  for (const widget of board.widgets) {
    if (widget.visible === false) {
      continue;
    }
    const box = document.createElement('div');
    box.className = 'board-widget';
    if (widget.id === boardSelectedWidgetId) {
      box.classList.add('is-selected');
    }
    placeBoardWidgetBox(box, widget, board.orientation);
    box.dataset.widgetId = widget.id;
    box.style.zIndex = String(board.widgets.indexOf(widget) + 1);
    const clip = document.createElement('div');
    clip.className = 'board-widget__clip';
    const inner = document.createElement('div');
    inner.className = 'board-widget__content';
    placeBoardWidgetContent(inner, widget, board.orientation);
    const label = document.createElement('span');
    label.className = 'board-widget__label';
    label.textContent = widget.name;
    inner.append(label);
    clip.append(inner);
    box.append(clip);
    for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      const knob = document.createElement('span');
      knob.className = `board-widget__handle board-widget__handle--${handle}`;
      knob.dataset.handle = handle;
      box.append(knob);
    }
    box.addEventListener('pointerdown', (event) => startBoardPointer(event, widget));
    box.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      boardSelectedWidgetId = widget.id;
      renderOverlayBoardEditor();
      openBoardContextMenu(event.clientX, event.clientY, widget);
    });
    canvas.append(box);
  }
}

function placeBoardWidgetBox(box, widget, orientation) {
  const canvasSize = boardSize(orientation);
  box.style.left = `${(widget.x / canvasSize.width) * 100}%`;
  box.style.top = `${(widget.y / canvasSize.height) * 100}%`;
  box.style.width = `${(widget.width / canvasSize.width) * 100}%`;
  box.style.height = `${(widget.height / canvasSize.height) * 100}%`;
  const inner = box.querySelector('.board-widget__content');
  if (inner) {
    placeBoardWidgetContent(inner, widget, orientation);
  }
  markBoardCropEdges(box, widget, orientation);
}

function markBoardCropEdges(box, widget, orientation) {
  const content = normalizeOverlayBoardContent(widget, widget, orientation);
  const width = widget.width > 0 ? widget.width : 1;
  const height = widget.height > 0 ? widget.height : 1;
  const cropped = {
    w: content.contentX < -1,
    n: content.contentY < -1,
    e: content.contentX + content.contentWidth > width + 1,
    s: content.contentY + content.contentHeight > height + 1,
  };
  box.classList.toggle('is-crop-w', cropped.w);
  box.classList.toggle('is-crop-n', cropped.n);
  box.classList.toggle('is-crop-e', cropped.e);
  box.classList.toggle('is-crop-s', cropped.s);
  const sides = [
    cropped.n ? '上' : '',
    cropped.s ? '下' : '',
    cropped.w ? '左' : '',
    cropped.e ? '右' : '',
  ].filter(Boolean);
  if (sides.length > 0) {
    box.title = `${sides.join('・')}を切っています`;
  } else {
    box.removeAttribute('title');
  }
}

function placeBoardWidgetContent(inner, widget, orientation) {
  const content = normalizeOverlayBoardContent(widget, widget, orientation);
  const width = widget.width > 0 ? widget.width : 1;
  const height = widget.height > 0 ? widget.height : 1;
  inner.style.left = `${(content.contentX / width) * 100}%`;
  inner.style.top = `${(content.contentY / height) * 100}%`;
  inner.style.width = `${(content.contentWidth / width) * 100}%`;
  inner.style.height = `${(content.contentHeight / height) * 100}%`;
}

function markBoardSelection() {
  for (const box of document.querySelectorAll('.board-widget')) {
    box.classList.toggle('is-selected', box.dataset.widgetId === boardSelectedWidgetId);
  }
  for (const row of document.querySelectorAll('.board-layer')) {
    row.classList.toggle('is-selected', row.dataset.widgetId === boardSelectedWidgetId);
  }
}

function pushBoardPreviewLayout() {
  const frame = document.querySelector('.board-editor__live');
  const board = selectedBoard();
  if (!(frame instanceof HTMLIFrameElement) || !board) {
    return;
  }
  frame.contentWindow?.postMessage(
    { kind: 'board-layout', boardId: board.id, orientation: board.orientation, widgets: board.widgets },
    '*',
  );
}

function syncBoardLivePreview(canvas, board) {
  const src = board ? boardUrl('obs') : '';
  let frame = canvas.querySelector('.board-editor__live');
  if (!src) {
    frame?.remove();
    return;
  }
  if (!(frame instanceof HTMLIFrameElement)) {
    frame = document.createElement('iframe');
    frame.className = 'board-editor__live';
    frame.title = '配置の配信プレビュー';
    canvas.prepend(frame);
  }
  if (frame.getAttribute('src') !== src) {
    frame.src = src;
  }
}

function moveBoardLayer(dragId, targetId, placeAfter) {
  const board = selectedBoard();
  if (!board || !dragId || dragId === targetId) {
    return;
  }
  const visual = [...board.widgets].reverse();
  const from = visual.findIndex((widget) => widget.id === dragId);
  if (from < 0 || !visual.some((widget) => widget.id === targetId)) {
    return;
  }
  const [moving] = visual.splice(from, 1);
  let nextIndex = visual.findIndex((widget) => widget.id === targetId);
  if (nextIndex < 0) {
    return;
  }
  if (placeAfter) {
    nextIndex += 1;
  }
  visual.splice(nextIndex, 0, moving);
  board.widgets = visual.reverse();
  renderOverlayBoardEditor();
  boardChanged();
}

function boardTrashIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute('fill', 'none');
  body.setAttribute('stroke', 'currentColor');
  body.setAttribute('stroke-width', '1.4');
  body.setAttribute('stroke-linejoin', 'round');
  body.setAttribute('d', 'M3.5 4.5h9M6.2 4.5V3.2h3.6v1.3M4.6 4.5l.6 8.2h5.6l.6-8.2');
  svg.append(body);
  return svg;
}

function boardEyeIcon(hidden) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const eye = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  eye.setAttribute('fill', 'none');
  eye.setAttribute('stroke', 'currentColor');
  eye.setAttribute('stroke-width', '1.4');
  eye.setAttribute('d', 'M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8z');
  svg.append(eye);
  const pupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pupil.setAttribute('cx', '8');
  pupil.setAttribute('cy', '8');
  pupil.setAttribute('r', '1.6');
  pupil.setAttribute('fill', 'currentColor');
  svg.append(pupil);
  if (hidden) {
    const slash = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    slash.setAttribute('fill', 'none');
    slash.setAttribute('stroke', 'currentColor');
    slash.setAttribute('stroke-width', '1.4');
    slash.setAttribute('stroke-linecap', 'round');
    slash.setAttribute('d', 'M3 3l10 10');
    svg.append(slash);
  }
  return svg;
}

const BOARD_SNAP_PX = 12;

function boardSnapTargets(board, widgetId) {
  const canvas = boardSize(board.orientation);
  const xs = [0, canvas.width / 2, canvas.width];
  const ys = [0, canvas.height / 2, canvas.height];
  for (const other of board.widgets) {
    if (!other || other.id === widgetId || other.visible === false) {
      continue;
    }
    xs.push(other.x, other.x + other.width / 2, other.x + other.width);
    ys.push(other.y, other.y + other.height / 2, other.y + other.height);
  }
  return { xs, ys };
}

function boardPickSnap(start, size, targets) {
  let best = null;
  for (const point of [start, start + size / 2, start + size]) {
    for (const target of targets) {
      const delta = target - point;
      const distance = Math.abs(delta);
      if (distance <= BOARD_SNAP_PX && (best === null || distance < Math.abs(best.delta))) {
        best = { delta, target };
      }
    }
  }
  return best;
}

function clearBoardSnapLines() {
  for (const line of document.querySelectorAll('.board-snap')) {
    line.remove();
  }
}

function showBoardSnapLine(orientation, axis, target) {
  const canvas = $('board-canvas');
  const size = boardSize(orientation);
  if (!canvas || target === null || !Number.isFinite(target)) {
    return;
  }
  const line = document.createElement('div');
  line.className = `board-snap board-snap--${axis}`;
  if (axis === 'v') {
    line.style.left = `${(target / size.width) * 100}%`;
  } else {
    line.style.top = `${(target / size.height) * 100}%`;
  }
  canvas.append(line);
}

function boardSnapFrame(next, origin, handle, board) {
  const { xs, ys } = boardSnapTargets(board, next.id || origin.id);
  if (!handle) {
    const snapX = boardPickSnap(next.x, next.width, xs);
    const snapY = boardPickSnap(next.y, next.height, ys);
    const frame = boardClampRect(
      {
        x: next.x + (snapX?.delta || 0),
        y: next.y + (snapY?.delta || 0),
        width: next.width,
        height: next.height,
      },
      board.orientation,
    );
    showBoardSnapLine(board.orientation, 'v', snapX ? snapX.target : null);
    showBoardSnapLine(board.orientation, 'h', snapY ? snapY.target : null);
    return { ...next, ...frame };
  }
  const ratio = next.height > 0 ? next.width / next.height : 1;
  const candidates = [];
  if (handle.includes('e')) {
    candidates.push({ axis: 'x', edge: next.x + next.width, grow: true });
  }
  if (handle.includes('w')) {
    candidates.push({ axis: 'x', edge: next.x, grow: false });
  }
  if (handle.includes('s')) {
    candidates.push({ axis: 'y', edge: next.y + next.height, grow: true });
  }
  if (handle.includes('n')) {
    candidates.push({ axis: 'y', edge: next.y, grow: false });
  }
  let best = null;
  for (const candidate of candidates) {
    const snap = boardPickSnap(candidate.edge, 0, candidate.axis === 'x' ? xs : ys);
    if (!snap) {
      continue;
    }
    if (best === null || Math.abs(snap.delta) < Math.abs(best.snap.delta)) {
      best = { ...candidate, snap };
    }
  }
  if (!best) {
    return next;
  }
  let width = next.width;
  let height = next.height;
  if (best.axis === 'x') {
    width = best.grow ? next.width + best.snap.delta : next.width - best.snap.delta;
    height = Math.round(width / ratio);
  } else {
    height = best.grow ? next.height + best.snap.delta : next.height - best.snap.delta;
    width = Math.round(height * ratio);
  }
  if (width < OVERLAY_BOARD_WIDGET_MIN_PX || height < OVERLAY_BOARD_WIDGET_MIN_PX) {
    return next;
  }
  let x = origin.x + (origin.width - width) / 2;
  let y = origin.y + (origin.height - height) / 2;
  if (handle.includes('e')) {
    x = origin.x;
  } else if (handle.includes('w')) {
    x = origin.x + origin.width - width;
  }
  if (handle.includes('s')) {
    y = origin.y;
  } else if (handle.includes('n')) {
    y = origin.y + origin.height - height;
  }
  const frame = boardClampRect({ x, y, width, height }, board.orientation);
  showBoardSnapLine(board.orientation, best.axis === 'x' ? 'v' : 'h', best.snap.target);
  return {
    ...next,
    ...frame,
    ...boardScaleCropToFrame(origin, frame, board.orientation),
  };
}

function canvasPoint(event) {
  const canvas = $('board-canvas');
  const board = selectedBoard();
  if (!canvas || !board) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  const size = boardSize(board.orientation);
  return {
    x: ((event.clientX - rect.left) / rect.width) * size.width,
    y: ((event.clientY - rect.top) / rect.height) * size.height,
  };
}

function startBoardPointer(event, widget) {
  if (event.button !== 0) {
    return;
  }
  const handle = event.target instanceof Element ? event.target.dataset.handle : '';
  const board = selectedBoard();
  const start = canvasPoint(event);
  if (!board || !start) {
    return;
  }
  boardSelectedWidgetId = widget.id;
  try {
    document.documentElement.setPointerCapture(event.pointerId);
  } catch {
    // キャプチャできないときは window の pointerup で止める
  }
  const origin = {
    x: widget.x,
    y: widget.y,
    width: widget.width,
    height: widget.height,
    contentX: widget.contentX,
    contentY: widget.contentY,
    contentWidth: widget.contentWidth,
    contentHeight: widget.contentHeight,
    layoutWidth: widget.layoutWidth,
    layoutHeight: widget.layoutHeight,
  };
  const move = (nextEvent) => {
    const point = canvasPoint(nextEvent);
    if (!point) {
      return;
    }
    clearBoardSnapLines();
    const resized = resizeOverlayBoardWidget({
      orientation: board.orientation,
      handle,
      alt: nextEvent.altKey === true,
      origin,
      dx: point.x - start.x,
      dy: point.y - start.y,
    });
    Object.assign(
      widget,
      nextEvent.altKey === true ? resized : boardSnapFrame({ ...resized, id: widget.id }, origin, handle, board),
    );
    const box = document.querySelector(`.board-widget[data-widget-id="${widget.id}"]`);
    if (box) {
      placeBoardWidgetBox(box, widget, board.orientation);
      pushBoardPreviewLayout();
    } else {
      renderOverlayBoardEditor();
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (document.documentElement.hasPointerCapture?.(event.pointerId)) {
      document.documentElement.releasePointerCapture(event.pointerId);
    }
    clearBoardSnapLines();
    boardChanged();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  event.preventDefault();
  markBoardSelection();
}

function fieldRow(label, control) {
  const row = document.createElement('label');
  row.className = 'field';
  const span = document.createElement('span');
  span.textContent = label;
  row.append(span, control);
  return row;
}

function boardHeading(text) {
  const heading = document.createElement('h3');
  heading.className = 'board-settings__heading';
  heading.textContent = text;
  return heading;
}

function boardCopy(key, fallback) {
  return (typeof uiCopy === 'object' && uiCopy && uiCopy[key]) || fallback;
}

const BOARD_ACCENT_FIELDS = [
  ['gift', 'ギフト'],
  ['count', '個数'],
  ['likes', 'いいね'],
  ['comment', 'コメント'],
  ['event', 'イベント'],
  ['emphasis', '強調'],
];

function openBoardWidgetSettings(widget) {
  boardSettings?.remove();
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  const card = document.createElement('div');
  card.className = 'modal__card board-settings';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'board-settings-title');
  const title = document.createElement('h2');
  title.id = 'board-settings-title';
  title.textContent = `${widget.name} の設定`;
  const form = document.createElement('div');
  form.className = 'board-settings__body';
  const settings = structuredClone(widget.settings || {});
  const inputs = {};
  const mountSection = (title) => {
    const block = document.createElement('section');
    block.className = 'setting-block board-settings__section';
    if (title) {
      block.append(boardHeading(title));
    }
    form.append(block);
    return block;
  };
  const mountGrid = (parent) => {
    const grid = document.createElement('div');
    grid.className = 'field-grid';
    parent.append(grid);
    return grid;
  };
  const mountChecks = (parent) => {
    const row = document.createElement('div');
    row.className = 'board-settings__checks';
    row.setAttribute('role', 'group');
    parent.append(row);
    return row;
  };
  const addCheck = (parent, key, label) => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = settings[key] === true || (settings[key] !== false && settings[key] !== undefined && Boolean(settings[key]));
    if (settings[key] === undefined) {
      input.checked = false;
    }
    inputs[key] = input;
    const row = document.createElement('label');
    row.className = 'viewer-display__check';
    row.append(input, document.createTextNode(label));
    parent.append(row);
    return input;
  };
  const addNumber = (parent, key, label, min, max, value) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value ?? settings[key] ?? '');
    inputs[key] = input;
    parent.append(fieldRow(label, input));
    return input;
  };
  const addRange = (parent, key, label, min, max, suffix) => {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(settings[key] ?? min);
    const note = document.createElement('em');
    note.textContent = `${input.value}${suffix}`;
    input.addEventListener('input', () => {
      note.textContent = `${input.value}${suffix}`;
    });
    const span = document.createElement('span');
    span.append(label, ' ', note);
    const row = document.createElement('label');
    row.className = 'field';
    row.append(span, input);
    inputs[key] = input;
    parent.append(row);
    return row;
  };
  const addSelect = (parent, key, label, options) => {
    const select = document.createElement('select');
    for (const option of options) {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      select.append(node);
    }
    select.value = String(settings[key] ?? options[0]?.value ?? '');
    inputs[key] = select;
    parent.append(fieldRow(label, select));
    return select;
  };
  const addFont = (parent, key) => {
    const fonts = Array.isArray(overlayFonts) && overlayFonts.length > 0
      ? overlayFonts
      : [{ id: 'default', label: '標準' }];
    addSelect(
      parent,
      key,
      'フォント',
      fonts.map((font) => ({ value: font.id, label: font.label || font.id })),
    );
  };
  const addNameColors = (key) => {
    const block = mountSection('名前の色');
    const checks = mountChecks(block);
    addCheck(checks, key === 'overlayNameColors' ? 'overlayNameColorEnabled' : 'nameColorEnabled', '名前に色をつける');
    const colors = Array.isArray(settings[key]) ? settings[key] : [];
    const row = document.createElement('div');
    row.className = 'board-settings__colors';
    for (let index = 0; index < 5; index += 1) {
      const input = document.createElement('input');
      input.type = 'color';
      input.value = typeof colors[index] === 'string' ? colors[index] : '#5eead4';
      input.dataset.boardColor = key;
      input.setAttribute('aria-label', `名前色${index + 1}`);
      row.append(input);
    }
    block.append(row);
  };
  const addAccents = () => {
    const block = mountSection(boardCopy('templateAccentColorLabel', '差し込みの色'));
    const colors = settings.templateAccentColors || {};
    const row = document.createElement('div');
    row.className = 'board-settings__colors';
    for (const [id, label] of BOARD_ACCENT_FIELDS) {
      const wrap = document.createElement('label');
      wrap.className = 'board-settings__accent';
      const input = document.createElement('input');
      input.type = 'color';
      input.value = typeof colors[id] === 'string' ? colors[id] : '#5eead4';
      input.dataset.boardAccent = id;
      input.setAttribute('aria-label', label);
      const span = document.createElement('span');
      span.textContent = label;
      wrap.append(span, input);
      row.append(wrap);
    }
    block.append(row);
  };

  if (widget.kind === 'chat') {
    const look = mountSection('見た目');
    const lookChecks = mountChecks(look);
    addCheck(lookChecks, 'hideUserName', '名前を出さない');
    addCheck(lookChecks, 'overlayShowAvatar', 'アイコンを出す');
    const lookGrid = mountGrid(look);
    addFont(lookGrid, 'overlayFontFamily');
    addRange(lookGrid, 'overlayFontSize', '文字サイズ', 10, 60, 'px');
    addRange(lookGrid, 'overlayBgOpacity', '背景の濃さ', 0, 100, '%');
    addRange(lookGrid, 'overlayItemRadius', '角の丸み', 0, 28, 'px');
    addRange(lookGrid, 'overlayGiftIconSize', 'ギフトアイコン', 16, 80, 'px');
    const neonRow = addRange(lookGrid, 'overlayNeonHue', 'ネオンの色', 0, 360, '');
    addSelect(lookGrid, 'overlayTheme', 'テーマ', [
      { value: 'dark', label: '標準' },
      { value: 'light', label: '明るい' },
      { value: 'minimal', label: '文字だけ' },
      { value: 'neon', label: 'ネオン' },
    ]);
    addSelect(lookGrid, 'overlayAlign', 'コメントの位置', [
      { value: 'full', label: '横いっぱいに' },
      { value: 'left', label: '左に寄せる' },
      { value: 'right', label: '右に寄せる' },
    ]);
    addSelect(
      lookGrid,
      'overlayMotion',
      boardCopy('overlayMotionLabel', '動き'),
      (typeof OVERLAY_MOTIONS === 'undefined' ? ['fuwatto'] : OVERLAY_MOTIONS).map((id) => ({
        value: id,
        label: boardCopy(typeof overlayMotionCopyKey === 'function' ? overlayMotionCopyKey(id) : '', id),
      })),
    );
    addSelect(lookGrid, 'overlayMotionSpeed', boardCopy('overlayMotionSpeedLabel', '速さ'), [1, 2, 3, 4, 5].map((speed) => ({
      value: String(speed),
      label: boardCopy(`overlayMotionSpeed${speed}`, String(speed)),
    })));
    const syncNeon = () => {
      neonRow.hidden = inputs.overlayTheme.value !== 'neon';
    };
    inputs.overlayTheme.addEventListener('change', syncNeon);
    syncNeon();

    const chat = mountSection(boardCopy('lookChatTitle', 'コメント列'));
    const chatGrid = mountGrid(chat);
    addNumber(chatGrid, 'chatMaxRows', '表示行数', 1, 50);
    const unlimited = document.createElement('input');
    unlimited.type = 'checkbox';
    unlimited.checked = !(Number(settings.chatDisplayMs) > 0);
    const sec = addNumber(
      chatGrid,
      'chatDisplaySec',
      '表示時間（秒）',
      1,
      120,
      Number(settings.chatDisplayMs) > 0 ? Math.round(Number(settings.chatDisplayMs) / 1000) : 12,
    );
    const chatChecks = mountChecks(chat);
    const unlimitedLabel = document.createElement('label');
    unlimitedLabel.className = 'viewer-display__check';
    unlimitedLabel.append(unlimited, document.createTextNode('時間で消えない'));
    chatChecks.append(unlimitedLabel);
    unlimited.addEventListener('change', () => {
      sec.disabled = unlimited.checked;
    });
    sec.disabled = unlimited.checked;
    inputs.chatDisplayUnlimited = unlimited;

    const pin = mountSection(boardCopy('overlayPinTitle', '固定枠'));
    const pinChecks = mountChecks(pin);
    const pinEnabled = addCheck(pinChecks, 'overlayPinEnabled', boardCopy('overlayPinEnabledLabel', '固定枠を使う'));
    const pinHold = addCheck(pinChecks, 'overlayPinHold', '次が無いときは出したまま');
    addCheck(pinChecks, 'overlayPinPreview', 'プレビューも固定枠で見る');
    const pinGrid = mountGrid(pin);
    const pinSec = addNumber(
      pinGrid,
      'overlayPinMs',
      '表示時間（秒）',
      1,
      120,
      Math.max(1, Math.round(Number(settings.overlayPinMs || 4000) / 1000)),
    );
    pinSec.dataset.unit = 'sec';
    const pinTypes = typeof normalizeOverlayPinTypes === 'function'
      ? normalizeOverlayPinTypes(settings.overlayPinTypes)
      : (settings.overlayPinTypes || {});
    const pinMs = typeof normalizeOverlayPinMsByType === 'function'
      ? normalizeOverlayPinMsByType(settings.overlayPinMsByType)
      : (settings.overlayPinMsByType || {});
    const pinBox = document.createElement('div');
    pinBox.className = 'board-settings__pins';
    for (const type of OVERLAY_PIN_TYPES) {
      const row = document.createElement('div');
      row.className = 'pin-type-row';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = pinTypes[type] === true;
      check.dataset.pinType = type;
      const name = (uiCopy.viewerTypes && uiCopy.viewerTypes[type]) || type;
      const label = document.createElement('label');
      label.className = 'viewer-display__check';
      label.append(check, name);
      const typeSec = document.createElement('input');
      typeSec.type = 'number';
      typeSec.min = '1';
      typeSec.max = '120';
      typeSec.className = 'pin-type-sec';
      typeSec.dataset.pinTypeSec = type;
      typeSec.placeholder = '共通';
      typeSec.setAttribute('aria-label', `${name} 秒`);
      typeSec.value = typeof pinMs[type] === 'number' ? String(Math.round(pinMs[type] / 1000)) : '';
      row.append(label, typeSec);
      pinBox.append(row);
    }
    pin.append(pinBox);
    const syncPin = () => {
      const on = pinEnabled.checked;
      pinBox.querySelectorAll('input').forEach((input) => {
        input.disabled = !on || (input.classList.contains('pin-type-sec') && pinHold.checked);
      });
      pinSec.disabled = !on;
      pinHold.disabled = !on;
    };
    pinEnabled.addEventListener('change', syncPin);
    pinHold.addEventListener('change', syncPin);
    syncPin();

    addNameColors('overlayNameColors');
    addAccents();
    const cssBlock = mountSection('カスタム CSS');
    const css = document.createElement('textarea');
    css.className = 'css-editor';
    css.spellcheck = false;
    css.value = settings.overlayCustomCss || '';
    inputs.overlayCustomCss = css;
    cssBlock.append(fieldRow('上書き用 CSS', css));
  } else if (widget.kind === 'ranking') {
    const rank = mountSection('表示');
    const rankChecks = mountChecks(rank);
    addCheck(rankChecks, 'enabled', 'ランキングを出す');
    const rankGrid = mountGrid(rank);
    addSelect(rankGrid, 'mode', 'ランキングの種類', [
      { value: 'likes', label: 'いいね' },
      { value: 'diamonds', label: 'ダイヤ' },
    ]);
    const sync = addSelect(rankGrid, 'likeSyncMode', 'いいねの更新', [
      { value: 'live', label: '常時' },
      { value: 'poll', label: 'ポーリング' },
    ]);
    const pollRow = fieldRow('ポーリング間隔（秒）', document.createElement('input'));
    const pollInput = pollRow.querySelector('input');
    pollInput.type = 'number';
    pollInput.min = '1';
    pollInput.max = '300';
    pollInput.value = String(settings.likePollSec ?? 30);
    inputs.likePollSec = pollInput;
    rankGrid.append(pollRow);
    const syncPoll = () => {
      const hide = inputs.mode.value === 'diamonds' || sync.value !== 'poll';
      pollRow.hidden = hide;
    };
    sync.addEventListener('change', syncPoll);
    inputs.mode.addEventListener('change', syncPoll);
    syncPoll();
    addNumber(rankGrid, 'max', '表示人数', 1, 10);
    const look = mountSection('見た目');
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = '列の幅はキャンバスの枠です。';
    look.append(hint);
    const lookChecks = mountChecks(look);
    addCheck(lookChecks, 'showAvatar', 'アイコンを出す');
    addCheck(lookChecks, 'showUnit', '件数アイコンを付ける');
    const lookGrid = mountGrid(look);
    addFont(lookGrid, 'fontFamily');
    addRange(lookGrid, 'fontSize', '文字サイズ', 10, 60, 'px');
    addRange(lookGrid, 'bgOpacity', '背景の濃さ', 0, 100, '%');
    addRange(lookGrid, 'itemRadius', '角の丸み', 0, 28, 'px');
    addRange(lookGrid, 'avatarSize', 'アイコンサイズ', 16, 80, 'px');
    addRange(lookGrid, 'rowGap', '行の間隔', 0, 20, 'px');
    const neonRow = addRange(lookGrid, 'neonHue', 'ネオンの色', 0, 360, '');
    addSelect(lookGrid, 'theme', 'テーマ', [
      { value: 'standard', label: '標準' },
      { value: 'luxury', label: '豪華' },
      { value: 'compact', label: 'コンパクト' },
      { value: 'neon', label: 'ネオン' },
      { value: 'minimal', label: 'シンプル' },
    ]);
    const syncNeon = () => {
      neonRow.hidden = inputs.theme.value !== 'neon';
    };
    inputs.theme.addEventListener('change', syncNeon);
    syncNeon();
    addSelect(lookGrid, 'motion', '入れ替わりの動き', [
      { value: 'slide', label: 'スライド' },
      { value: 'soft', label: 'ふわっと' },
      { value: 'emphasis', label: 'スライド＋強調' },
    ]);
    addSelect(lookGrid, 'motionSpeed', '入れ替わりの速さ', [
      { value: '1', label: boardCopy('overlayRankingMotionSpeed1', '遅い') },
      { value: '2', label: boardCopy('overlayRankingMotionSpeed2', 'ふつう') },
      { value: '3', label: boardCopy('overlayRankingMotionSpeed3', '速い') },
    ]);
    addNameColors('nameColors');
  } else {
    addNameColors('nameColors');
    addAccents();
  }

  const actions = document.createElement('div');
  actions.className = 'row';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn';
  save.textContent = '保存';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn--ghost';
  cancel.textContent = '閉じる';
  const close = () => {
    dialog.remove();
    boardSettings = null;
  };
  cancel.addEventListener('click', close);
  save.addEventListener('click', () => {
    const next = structuredClone(widget.settings || {});
    for (const [key, input] of Object.entries(inputs)) {
      if (key === 'chatDisplaySec' || key === 'chatDisplayUnlimited') {
        continue;
      }
      if (input instanceof HTMLInputElement && input.type === 'checkbox') {
        next[key] = input.checked;
      } else if (input instanceof HTMLInputElement && input.dataset.unit === 'sec') {
        next[key] = Math.round(Number(input.value) * 1000);
      } else if (input instanceof HTMLInputElement && (input.type === 'number' || input.type === 'range')) {
        next[key] = Number(input.value);
      } else if ('value' in input) {
        next[key] = input.value;
      }
    }
    if (widget.kind === 'chat' && inputs.chatDisplayUnlimited) {
      next.chatDisplayMs = inputs.chatDisplayUnlimited.checked
        ? 0
        : Math.round(Number(inputs.chatDisplaySec.value) * 1000);
      next.overlayPinTypes = {};
      for (const input of form.querySelectorAll('[data-pin-type]')) {
        next.overlayPinTypes[input.dataset.pinType] = input.checked;
      }
      next.overlayPinMsByType = {};
      for (const input of form.querySelectorAll('[data-pin-type-sec]')) {
        const text = input.value.trim();
        if (!text) {
          continue;
        }
        const sec = Number(text);
        if (Number.isFinite(sec)) {
          next.overlayPinMsByType[input.dataset.pinTypeSec] = Math.round(sec * 1000);
        }
      }
    }
    const colorKey = widget.kind === 'chat' ? 'overlayNameColors' : 'nameColors';
    const colors = [...form.querySelectorAll(`[data-board-color="${colorKey}"]`)].map((input) => input.value);
    if (colors.length > 0) {
      next[colorKey] = colors;
    }
    if (widget.kind !== 'ranking') {
      next.templateAccentColors = { ...(next.templateAccentColors || {}) };
      for (const input of form.querySelectorAll('[data-board-accent]')) {
        next.templateAccentColors[input.dataset.boardAccent] = input.value;
      }
    }
    widget.settings = next;
    close();
    boardChanged();
  });
  actions.append(save, cancel);
  card.append(title, form, actions);
  dialog.append(card);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      close();
    }
  });
  document.body.append(dialog);
  boardSettings = dialog;
  save.focus();
}

function bindOverlayBoardEditor() {
  $('board-add')?.addEventListener('click', () => {
    const atLimit = overlayBoards.length >= OVERLAY_BOARD_MAX;
    openBoardMenu($('board-add'), [
      { label: '横（テンプレート）', disabled: atLimit, onSelect: () => addBoard('landscape', true) },
      { label: '横（空白）', disabled: atLimit, onSelect: () => addBoard('landscape', false) },
      { label: '縦（テンプレート）', disabled: atLimit, onSelect: () => addBoard('portrait', true) },
      { label: '縦（空白）', disabled: atLimit, onSelect: () => addBoard('portrait', false) },
    ]);
  });
  $('board-widget-add')?.addEventListener('click', () => {
    const board = selectedBoard();
    const atLimit = !board || board.widgets.length >= OVERLAY_BOARD_WIDGET_MAX;
    openBoardMenu($('board-widget-add'), BOARD_KINDS.map((item) => ({
      label: item.label,
      disabled: atLimit,
      onSelect: () => addBoardWidget(item.kind),
    })));
  });
  $('board-delete')?.addEventListener('click', () => deleteSelectedBoard());
  $('board-rename')?.addEventListener('click', () => renameSelectedBoard());
  $('board-list')?.addEventListener('change', () => {
    const id = $('board-list')?.value || '';
    if (!id || id === boardSelectedId) {
      return;
    }
    const next = overlayBoards.find((item) => item.id === id);
    if (!next) {
      return;
    }
    boardSelectedId = next.id;
    boardSelectedWidgetId = next.widgets.at(-1)?.id || '';
    renderOverlayBoardEditor();
  });
  document.querySelector('.board-editor__body')?.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) {
      return;
    }
    if (event.target.closest('.board-widget, .board-layer, button, a, input, label')) {
      return;
    }
    if (!boardSelectedWidgetId) {
      return;
    }
    boardSelectedWidgetId = '';
    renderOverlayBoardEditor();
  });
  const layerPane = document.querySelector('.board-layers');
  layerPane?.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const list = $('board-layer-list');
    if (!list) {
      return;
    }
    const rect = list.getBoundingClientRect();
    const edge = 28;
    if (event.clientY < rect.top + edge) {
      list.scrollTop -= 14;
    } else if (event.clientY > rect.bottom - edge) {
      list.scrollTop += 14;
    }
  });
  layerPane?.addEventListener('drop', (event) => {
    if (event.target instanceof Element && event.target.closest('.board-layer')) {
      return;
    }
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    const rows = [...($('board-layer-list')?.querySelectorAll('.board-layer') || [])];
    if (!id || rows.length === 0) {
      return;
    }
    let target = rows[rows.length - 1];
    let placeAfter = true;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (event.clientY <= rect.top + rect.height / 2) {
        target = row;
        placeAfter = false;
        break;
      }
      target = row;
      placeAfter = true;
    }
    moveBoardLayer(id, target.dataset.widgetId || '', placeAfter);
  });
  $('board-copy-live')?.addEventListener('click', () => void copyBoardUrl('live'));
  $('board-copy-obs')?.addEventListener('click', () => void copyBoardUrl('obs'));
  $('board-copy-studio')?.addEventListener('click', () => void copyBoardUrl('studio'));
  document.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Node) || boardMenu?.contains(event.target)) {
      return;
    }
    if (event.target instanceof Element && event.target.closest('#board-add, #board-widget-add')) {
      return;
    }
    closeBoardMenu();
  });
  document.addEventListener('scroll', (event) => {
    if (!boardMenu) {
      return;
    }
    if (event.target instanceof Node && boardMenu.contains(event.target)) {
      return;
    }
    closeBoardMenu();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeBoardMenu();
      boardSettings?.querySelector('.btn--ghost')?.click();
    }
    const board = selectedBoard();
    const widget = selectedWidget(board);
    if (!board || !widget || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }
    if (document.querySelector('[data-look-section-btn="board"].is-active') == null) {
      return;
    }
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const next = { x: widget.x, y: widget.y, width: widget.width, height: widget.height };
    if (event.key === 'ArrowLeft') next.x -= step;
    if (event.key === 'ArrowRight') next.x += step;
    if (event.key === 'ArrowUp') next.y -= step;
    if (event.key === 'ArrowDown') next.y += step;
    Object.assign(widget, boardClampRect(next, board.orientation));
    renderOverlayBoardEditor();
    boardChanged();
  });
}

bindOverlayBoardEditor();
