(() => {
  const root = document.getElementById('board');
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const boardId = location.pathname.split('/').filter(Boolean).pop() || '';
  const FONT_CSS = {
    default: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif',
    'yu-gothic': '"Yu Gothic UI", "Yu Gothic", sans-serif',
    meiryo: '"Meiryo UI", Meiryo, sans-serif',
    gothic: '"MS Gothic", "MS PGothic", sans-serif',
    mincho: '"MS Mincho", "MS PMincho", serif',
    segoe: '"Segoe UI", sans-serif',
  };

  let socket = null;
  let reconnectTimer = 0;
  let currentIdentity = '';
  let widgetsById = new Map();
  let lastBoard = null;
  let viewScale = 1;

  function fontCss(id) {
    return FONT_CSS[id] || FONT_CSS.default;
  }

  function postWidget(frame, widget) {
    if (!frame.contentWindow || !widget) {
      return;
    }
    const settings = widget.settings || {};
    if (widget.kind === 'ranking') {
      frame.contentWindow.postMessage(
        {
          kind: 'ranking-look',
          look: {
            theme: settings.theme,
            fontFamily: settings.fontFamily,
            fontCss: fontCss(settings.fontFamily),
            fontSize: settings.fontSize,
            bgOpacity: settings.bgOpacity,
            showAvatar: settings.showAvatar,
            avatarSize: settings.avatarSize,
            itemRadius: settings.itemRadius,
            rowGap: settings.rowGap,
            panelWidth: settings.panelWidth,
            showUnit: settings.showUnit,
            neonHue: settings.neonHue,
          },
          rankingMotion: settings.motion,
          rankingMotionSpeed: settings.motionSpeed,
          nameColorEnabled: settings.nameColorEnabled,
          nameColors: settings.nameColors,
          max: settings.max,
          mode: settings.mode,
          enabled: settings.enabled,
          likeSyncMode: settings.likeSyncMode,
          likePollSec: settings.likePollSec,
        },
        '*',
      );
      return;
    }
    if (widget.kind === 'alerts') {
      frame.contentWindow.postMessage(
        {
          kind: 'alert-preview',
          nameColorEnabled: settings.nameColorEnabled,
          nameColors: settings.nameColors,
          templateAccentColors: settings.templateAccentColors,
        },
        '*',
      );
      return;
    }
    frame.contentWindow.postMessage(
      {
        kind: 'overlay-look',
        look: {
          theme: settings.overlayTheme,
          fontFamily: settings.overlayFontFamily,
          fontCss: fontCss(settings.overlayFontFamily),
          fontSize: settings.overlayFontSize,
          bgOpacity: settings.overlayBgOpacity,
          showAvatar: settings.overlayShowAvatar,
          giftIconSize: settings.overlayGiftIconSize,
          itemRadius: settings.overlayItemRadius,
          neonHue: settings.overlayNeonHue,
          align: settings.overlayAlign,
          motion: settings.overlayMotion,
          motionSpeed: settings.overlayMotionSpeed,
          hideUserName: settings.hideUserName === true,
        },
        pin: {
          enabled: settings.overlayPinEnabled !== false,
          displayMs: settings.overlayPinMs,
          displayMsByType: settings.overlayPinMsByType,
          hold: settings.overlayPinHold === true,
          types: settings.overlayPinTypes,
          previewPinned: settings.overlayPinPreview !== false,
        },
        nameColorEnabled: settings.overlayNameColorEnabled,
        nameColors: settings.overlayNameColors,
        templateAccentColors: settings.templateAccentColors,
        customCss: settings.overlayCustomCss || '',
        chatMaxRows: settings.chatMaxRows,
        chatDisplayMs: settings.chatDisplayMs,
      },
      '*',
    );
  }

  function widgetMetrics(widget) {
    const boxWidth = Number(widget.width) || 0;
    const boxHeight = Number(widget.height) || 0;
    const contentWidth = Number(widget.contentWidth);
    const contentHeight = Number(widget.contentHeight);
    const width = Number.isFinite(contentWidth) && contentWidth > 0 ? contentWidth : boxWidth;
    const height = Number.isFinite(contentHeight) && contentHeight > 0 ? contentHeight : boxHeight;
    const layoutWidth = Number(widget.layoutWidth);
    const layoutHeight = Number(widget.layoutHeight);
    const layoutW = Number.isFinite(layoutWidth) && layoutWidth > 0 ? layoutWidth : width;
    const layoutH = Number.isFinite(layoutHeight) && layoutHeight > 0 ? layoutHeight : height;
    const contentX = Number(widget.contentX);
    const contentY = Number(widget.contentY);
    const scaleX = layoutW > 0 ? width / layoutW : 1;
    const scaleY = layoutH > 0 ? height / layoutH : 1;
    return {
      contentX: Number.isFinite(contentX) ? contentX : 0,
      contentY: Number.isFinite(contentY) ? contentY : 0,
      layoutW,
      layoutH,
      scaleX,
      scaleY,
    };
  }

  function placeFrame(frame, widget) {
    const metrics = widgetMetrics(widget);
    frame.style.left = `${metrics.contentX * viewScale}px`;
    frame.style.top = `${metrics.contentY * viewScale}px`;
    frame.style.width = `${metrics.layoutW}px`;
    frame.style.height = `${metrics.layoutH}px`;
    frame.style.transformOrigin = '0 0';
    frame.style.zoom = '';
    frame.style.transform = `scale(${viewScale * metrics.scaleX})`;
  }

  function placeScale(frame, widget) {
    const metrics = widgetMetrics(widget);
    frame.style.left = `${metrics.contentX * viewScale}px`;
    frame.style.top = `${metrics.contentY * viewScale}px`;
    frame.style.transformOrigin = '0 0';
    frame.style.transform = `scale(${viewScale * metrics.scaleX})`;
  }

  function widgetSrc(kind) {
    if (kind === 'ranking') {
      return '/overlay/ranking/?embed=1';
    }
    if (kind === 'alerts') {
      return '/overlay/alerts/?embed=1';
    }
    return '/overlay/?embed=1';
  }

  function postFrame(frame) {
    const widget = widgetsById.get(frame.dataset.widgetId);
    if (!widget || !frame.contentWindow) {
      return;
    }
    frame.title = widget.name || widget.kind;
    const geom = frameGeom(widget);
    if (frame.dataset.geom !== geom) {
      placeFrame(frame, widget);
      frame.dataset.geom = geom;
    } else {
      placeScale(frame, widget);
    }
    postWidget(frame, widget);
  }

  function viewportSize() {
    return {
      width: window.innerWidth || document.documentElement.clientWidth || 0,
      height: window.innerHeight || document.documentElement.clientHeight || 0,
    };
  }

  function fitRoot(board) {
    const width = board.orientation === 'portrait' ? 1080 : 1920;
    const height = board.orientation === 'portrait' ? 1920 : 1080;
    const view = viewportSize();
    if (view.width < 1 || view.height < 1) {
      return false;
    }
    const scale = Math.min(view.width / width, view.height / height);
    if (!Number.isFinite(scale) || scale <= 0) {
      return false;
    }
    viewScale = scale;
    root.style.width = `${width * viewScale}px`;
    root.style.height = `${height * viewScale}px`;
    root.style.transform = 'none';
    root.style.zoom = '';
    return true;
  }

  function refit() {
    if (!lastBoard) {
      return;
    }
    const before = viewScale;
    if (!fitRoot(lastBoard) || before === viewScale) {
      return;
    }
    moveExisting(visibleWidgets(lastBoard));
  }

  function placeBox(box, widget, zIndex) {
    box.style.left = `${widget.x * viewScale}px`;
    box.style.top = `${widget.y * viewScale}px`;
    box.style.width = `${widget.width * viewScale}px`;
    box.style.height = `${widget.height * viewScale}px`;
    box.style.zIndex = String(zIndex);
  }

  function visibleWidgets(board) {
    return (Array.isArray(board.widgets) ? board.widgets : []).filter((widget) => widget.visible !== false);
  }

  function frameGeom(widget) {
    const metrics = widgetMetrics(widget);
    return [metrics.layoutW, metrics.layoutH].join(',');
  }

  function moveFrame(frame, widget, zIndex) {
    const box = frame.parentElement;
    if (!(box instanceof HTMLElement)) {
      return;
    }
    placeBox(box, widget, zIndex);
    const geom = frameGeom(widget);
    if (frame.dataset.geom !== geom) {
      placeFrame(frame, widget);
      frame.dataset.geom = geom;
    } else {
      placeScale(frame, widget);
    }
  }

  function moveExisting(visible) {
    for (const [index, widget] of visible.entries()) {
      const frame = root.querySelector(`iframe[data-widget-id="${widget.id}"]`);
      if (!(frame instanceof HTMLIFrameElement)) {
        return false;
      }
      moveFrame(frame, widget, index + 1);
    }
    return root.querySelectorAll('iframe').length === visible.length;
  }

  function createFrame(widget) {
    const box = document.createElement('div');
    box.className = 'board__widget';
    const frame = document.createElement('iframe');
    frame.title = widget.name || widget.kind;
    frame.dataset.widgetId = widget.id;
    placeFrame(frame, widget);
    frame.dataset.geom = frameGeom(widget);
    frame.src = widgetSrc(widget.kind);
    frame.addEventListener('load', () => {
      postFrame(frame);
      window.setTimeout(() => postFrame(frame), 200);
    });
    box.append(frame);
    root.append(box);
    return frame;
  }

  function paint(board) {
    if (!board || board.id !== boardId) {
      widgetsById = new Map();
      root.replaceChildren();
      currentIdentity = '';
      return;
    }
    lastBoard = board;
    fitRoot(board);
    const widgets = (Array.isArray(board.widgets) ? board.widgets : []).filter((widget) => widget?.id);
    widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
    const keep = new Set(widgets.map((widget) => widget.id));
    for (const frame of root.querySelectorAll('iframe')) {
      if (!keep.has(frame.dataset.widgetId || '')) {
        frame.parentElement?.remove();
      }
    }
    for (const [index, widget] of widgets.entries()) {
      const found = root.querySelector(`iframe[data-widget-id="${widget.id}"]`);
      const frame = found instanceof HTMLIFrameElement ? found : createFrame(widget);
      moveFrame(frame, widget, index + 1);
      if (frame.parentElement) {
        frame.parentElement.hidden = widget.visible === false;
      }
    }
    currentIdentity = visibleWidgets(board).map((widget) => `${widget.id}:${widget.kind}`).join('|');
  }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(
      `${proto}://${location.host}/overlay/ws?role=board&board=${encodeURIComponent(boardId)}`,
    );
    socket.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data ?? ''));
      } catch {
        return;
      }
      if (message?.kind === 'board') {
        paint(message.board);
      }
    });
    socket.addEventListener('close', () => {
      if (reconnectTimer) {
        return;
      }
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = 0;
        connect();
      }, 1200);
    });
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.kind !== 'board-layout' || message.boardId !== boardId) {
      return;
    }
    if (!Array.isArray(message.widgets)) {
      return;
    }
    const visible = message.widgets.filter((widget) => widget && widget.visible !== false);
    widgetsById = new Map(visible.map((widget) => [widget.id, widget]));
    const identity = visible.map((widget) => `${widget.id}:${widget.kind}`).join('|');
    if (identity === currentIdentity && moveExisting(visible)) {
      return;
    }
    paint({
      id: boardId,
      orientation: message.orientation === 'portrait' ? 'portrait' : 'landscape',
      widgets: message.widgets,
    });
  });

  window.addEventListener('resize', refit);
  window.visualViewport?.addEventListener('resize', refit);
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => refit());
    observer.observe(document.documentElement);
  }
  window.setTimeout(refit, 0);
  window.setTimeout(refit, 300);

  connect();
})();
