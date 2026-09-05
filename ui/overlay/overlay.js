(() => {
  const chat = document.getElementById('chat');
  const pin = document.getElementById('pin');
  const customCss = document.getElementById('custom-css');
  if (!(chat instanceof HTMLOListElement)) {
    return;
  }

  const audioQueue = [];
  let playing = false;
  let currentAudio = null;
  let finishCurrent = null;
  let chatMaxRows = 8;
  let chatDisplayMs = 12000;
  let showAvatar = true;
  let hideUserName = false;
  let motionName = 'fuwatto';
  let motionMs = 180;
  const pendingRows = [];
  const PIN_TYPES = [
    'gift',
    'follow',
    'share',
    'superFan',
    'envelope',
    'portal',
    'like',
    'member',
  ];
  const PIN_QUEUE_MAX = 80;
  let pinEnabled = true;
  let pinDisplayMs = 4000;
  let pinHold = false;
  let pinPreviewPinned = true;
  let pinTypes = {
    gift: true,
    follow: true,
    share: true,
    superFan: true,
    envelope: true,
    portal: true,
    like: true,
    member: true,
  };
  const pinQueue = [];
  let pinShowing = false;
  let pinHoldWait = false;
  let pinLeaving = false;
  let pinSwitchTimer = 0;
  let connectGen = 0;
  let reconnectTimer = 0;
  let activeSocket = null;
  const isPreview = new URLSearchParams(location.search).has('preview');

  if (isPreview) {
    document.documentElement.dataset.preview = '1';
    const backdrop = new URLSearchParams(location.search).get('backdrop');
    document.documentElement.dataset.backdrop = backdrop || 'checker';
  }

  const MOTIONS = [
    'fuwatto',
    'fade',
    'slide-up',
    'slide-down',
    'slide-left',
    'slide-right',
    'zoom',
    'bounce',
    'blur',
    'flip',
    'none',
  ];

  function applyMotion(look) {
    const nextMotion = MOTIONS.includes(look.motion) ? look.motion : 'fuwatto';
    const speed = Number(look.motionSpeed);
    const nextMs =
      speed === 1 ? 1080 : speed === 2 ? 720 : speed === 4 ? 320 : speed === 5 ? 180 : 480;
    const changed = nextMotion !== motionName || nextMs !== motionMs;
    motionName = nextMotion;
    motionMs = nextMs;
    for (const list of lookLists()) {
      list.dataset.motion = motionName;
      list.style.setProperty('--motion-ms', `${motionMs}ms`);
    }
    return changed;
  }

  function lookLists() {
    return [pin, chat].filter((list) => list instanceof HTMLOListElement);
  }

  function normalizePinMs(value) {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) {
      return 4000;
    }
    return Math.min(120000, Math.max(1000, Math.trunc(parsed)));
  }

  function normalizePinTypes(raw) {
    const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const next = {};
    for (const type of PIN_TYPES) {
      next[type] = record[type] !== false;
    }
    return next;
  }

  function shouldPinType(type) {
    if (!pinEnabled) {
      return false;
    }
    if (isPreview && !pinPreviewPinned) {
      return false;
    }
    if (typeof type !== 'string' || type === 'comment') {
      return false;
    }
    const key = type === 'subscribe' ? 'superFan' : type;
    if (!PIN_TYPES.includes(key)) {
      return false;
    }
    return pinTypes[key] === true;
  }

  function canHoldPin() {
    return pinHold && PIN_TYPES.some((type) => shouldPinType(type));
  }

  function applyPinSettings(next) {
    if (!next || typeof next !== 'object') {
      return false;
    }
    const nextTypes = normalizePinTypes(next.types);
    const nextEnabled = next.enabled !== false;
    const previewChanged = (next.previewPinned !== false) !== pinPreviewPinned;
    const typesChanged = PIN_TYPES.some((type) => nextTypes[type] !== pinTypes[type]);
    const enabledChanged = nextEnabled !== pinEnabled;
    pinEnabled = nextEnabled;
    pinDisplayMs = normalizePinMs(next.displayMs);
    pinHold = next.hold === true;
    pinTypes = nextTypes;
    pinPreviewPinned = next.previewPinned !== false;
    if (typesChanged || enabledChanged) {
      applyCurrentPinTypesToQueue();
    }
    if (pinHoldWait && !canHoldPin()) {
      pinHoldWait = false;
      leavePinThen(finishPinLeave);
    }
    return previewChanged || typesChanged || enabledChanged;
  }

  function applyLook(look, replayPreview = false) {
    if (!look || typeof look !== 'object') {
      return;
    }
    const theme = typeof look.theme === 'string' ? look.theme : 'dark';
    const align = typeof look.align === 'string' ? look.align : 'full';
    const backdrop =
      typeof look.previewBackdrop === 'string' ? look.previewBackdrop : 'checker';
    showAvatar = look.showAvatar !== false;
    const motionChanged = applyMotion(look);
    const opacity = Number(look.bgOpacity);
    const neonHue = Number(look.neonHue);
    for (const list of lookLists()) {
      const pinClass = list === pin ? ' chat--pin' : '';
      list.className = `chat${pinClass} chat--theme-${theme} chat--align-${align}`;
      list.dataset.motion = motionName;
      list.classList.toggle('chat--hide-avatar', !showAvatar);
      list.style.setProperty('--body-size', `${Number(look.fontSize) || 20}px`);
      list.style.setProperty(
        '--bubble-alpha',
        `${Number.isFinite(opacity) ? opacity : 72}%`,
      );
      list.style.setProperty('--gift-size', `${Number(look.giftIconSize) || 40}px`);
      list.style.setProperty('--item-radius', `${Number(look.itemRadius) || 0}px`);
      list.style.setProperty(
        '--neon-hue',
        String(Number.isFinite(neonHue) ? Math.min(360, Math.max(0, Math.round(neonHue))) : 280),
      );
      if (typeof look.fontCss === 'string' && look.fontCss) {
        list.style.setProperty('--chat-font', look.fontCss);
      }
    }
    if (isPreview) {
      document.documentElement.dataset.backdrop = backdrop;
    }
    if (isPreview && (replayPreview || motionChanged)) {
      seedPreviewSamples(true);
    }
  }

  function wsUrl() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const preview = isPreview ? '?preview=1' : '';
    return `${protocol}//${location.host}/overlay/ws${preview}`;
  }

  function applyCustomCss(css) {
    if (customCss) {
      customCss.textContent = typeof css === 'string' ? css : '';
    }
  }

  function applySettings(message) {
    if (typeof message.chatMaxRows === 'number' && Number.isFinite(message.chatMaxRows)) {
      chatMaxRows = Math.min(50, Math.max(1, Math.trunc(message.chatMaxRows)));
    }
    if (typeof message.chatDisplayMs === 'number' && Number.isFinite(message.chatDisplayMs)) {
      chatDisplayMs = Math.max(0, Math.trunc(message.chatDisplayMs));
    }
    if (typeof message.customCss === 'string') {
      applyCustomCss(message.customCss);
    }
    if (message.look) {
      applyLook(message.look);
    }
    const previewChanged = applyPinSettings(message.pin);
    trimOverflow();
    flushPendingRows();
    if (isPreview && previewChanged) {
      seedPreviewSamples(true);
    } else {
      seedPreviewSamples();
    }
  }

  function stopCurrentAudio() {
    const audio = currentAudio;
    currentAudio = null;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  function revokeIfBlob(src) {
    if (typeof src === 'string' && src.startsWith('blob:')) {
      URL.revokeObjectURL(src);
    }
  }

  let chimeContext = null;

  function playGiftChime() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    if (!chimeContext) {
      chimeContext = new AudioCtx();
    }
    if (chimeContext.state === 'suspended') {
      void chimeContext.resume();
    }
    const now = chimeContext.currentTime;
    const osc = chimeContext.createOscillator();
    const gain = chimeContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain);
    gain.connect(chimeContext.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  function skipAudio() {
    const finish = finishCurrent;
    finishCurrent = null;
    stopCurrentAudio();
    if (typeof finish === 'function') {
      finish();
    }
  }

  function clearPendingAudio() {
    const pending = audioQueue.splice(0, audioQueue.length);
    for (const item of pending) {
      void Promise.resolve(item)
        .then(revokeIfBlob)
        .catch(() => undefined);
    }
  }

  async function fetchAudioObjectUrl(src) {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`音声の取得に失敗しました (${response.status})`);
    }
    const blob = await response.blob();
    if (blob.size < 44) {
      throw new Error('音声データが空です');
    }
    return URL.createObjectURL(blob);
  }

  function enqueueAudio(url) {
    if (!url) {
      return;
    }
    let resolved;
    try {
      resolved = new URL(url, location.origin).href;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`音声URLを解釈できません: ${message}`);
      return;
    }
    audioQueue.push(fetchAudioObjectUrl(resolved));
    void pumpAudio();
  }

  async function pumpAudio() {
    if (playing) {
      return;
    }
    playing = true;
    try {
      while (audioQueue.length > 0) {
        const item = audioQueue.shift();
        let src = '';
        try {
          src = await item;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`音声の読み込みに失敗しました: ${message}`);
          continue;
        }
        try {
          await playAudio(src);
        } finally {
          revokeIfBlob(src);
        }
      }
    } finally {
      playing = false;
      if (audioQueue.length > 0) {
        void pumpAudio();
      }
    }
  }

  function playAudio(src) {
    return new Promise((resolve) => {
      let done = false;
      const audio = new Audio(src);
      currentAudio = audio;
      const finish = () => {
        if (done) {
          return;
        }
        done = true;
        if (finishCurrent === finish) {
          finishCurrent = null;
        }
        if (currentAudio === audio) {
          currentAudio = null;
        }
        resolve();
      };
      finishCurrent = finish;
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', () => {
        console.warn(`音声の読み込みに失敗しました: ${src}`);
        finish();
      }, { once: true });
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`音声を再生できません: ${message}`);
          finish();
        });
      }
    });
  }

  function oldestStayingRow() {
    return [...chat.children].find((item) => !item.classList.contains('is-leaving'));
  }

  function clearRowTimer(item) {
    const id = Number(item.dataset.leaveTimer || 0);
    if (id) {
      window.clearTimeout(id);
    }
    item.removeAttribute('data-leave-timer');
  }

  function onRowRemoved() {
    trimOverflow();
    flushPendingRows();
  }

  function rowMotion(item) {
    return MOTIONS.includes(item.dataset.motion) ? item.dataset.motion : motionName;
  }

  function rowMotionMs(item) {
    const ms = Number.parseInt(item.style.getPropertyValue('--motion-ms'), 10);
    return Number.isFinite(ms) ? ms : motionMs;
  }

  function beginLeave(item, onDone) {
    const finish = () => {
      if (item.isConnected) {
        item.remove();
      }
      if (typeof onDone === 'function') {
        onDone();
      } else {
        onRowRemoved();
      }
    };
    if (!(item instanceof HTMLElement) || item.classList.contains('is-leaving')) {
      return;
    }
    if (!item.isConnected) {
      return;
    }
    clearRowTimer(item);
    const ms = rowMotionMs(item);
    if (rowMotion(item) === 'none' || ms <= 0) {
      finish();
      return;
    }
    item.classList.add('is-leaving');
    const done = window.setTimeout(() => {
      finish();
    }, ms + 20);
    item.dataset.leaveTimer = String(done);
  }

  function trimOverflow() {
    while (chat.children.length > chatMaxRows) {
      const leaving = [...chat.children].filter((item) => item.classList.contains('is-leaving')).length;
      if (leaving >= chat.children.length - chatMaxRows) {
        break;
      }
      const oldest = oldestStayingRow();
      if (!oldest) {
        break;
      }
      beginLeave(oldest);
    }
  }

  function flushPendingRows() {
    while (pendingRows.length > 0 && chat.children.length < chatMaxRows) {
      appendRow(chat, pendingRows.shift());
    }
  }

  function queueLatestRow(payload) {
    pendingRows.length = 0;
    pendingRows.push(payload);
  }

  function addRow(payload) {
    if (!payload?.displayText) {
      return;
    }
    if (shouldPinType(payload.type) && pin instanceof HTMLOListElement) {
      enqueuePin(payload);
      return;
    }
    if (chat.children.length < chatMaxRows) {
      appendRow(chat, payload);
      return;
    }
    const alreadyLeaving = [...chat.children].some((item) => item.classList.contains('is-leaving'));
    if (!alreadyLeaving) {
      const oldest = oldestStayingRow();
      if (oldest) {
        beginLeave(oldest);
      }
    }
    if (chat.children.length < chatMaxRows) {
      appendRow(chat, payload);
      return;
    }
    queueLatestRow(payload);
  }

  function appendRow(list, payload) {
    if (!payload?.displayText || !(list instanceof HTMLOListElement)) {
      return;
    }

    const item = document.createElement('li');
    item.className = `chat__item chat__item--${payload.type || 'comment'}`;
    item.dataset.motion = motionName;
    item.style.setProperty('--motion-ms', `${motionMs}ms`);

    if ((isPreview || showAvatar) && payload.user && payload.user.avatarUrl) {
      const img = document.createElement('img');
      img.className = 'chat__avatar';
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.remove());
      img.src = payload.user.avatarUrl;
      item.appendChild(img);
    }

    if ((payload.type === 'gift' || payload.type === 'portal') && payload.giftImageUrl) {
      const gift = document.createElement('img');
      gift.className = 'chat__gift';
      gift.alt = '';
      gift.referrerPolicy = 'no-referrer';
      gift.decoding = 'async';
      gift.addEventListener('error', () => gift.remove());
      gift.src = payload.giftImageUrl;
      item.appendChild(gift);
    }

    const body = document.createElement('div');
    body.className = 'chat__body';
    body.textContent = payload.displayText;
    item.appendChild(body);
    list.appendChild(item);
    if (list !== chat) {
      return;
    }
    trimOverflow();

    if (chatDisplayMs > 0 && !isPreview) {
      const timer = window.setTimeout(() => {
        beginLeave(item);
      }, chatDisplayMs);
      item.dataset.leaveTimer = String(timer);
    }
  }

  function clearList(list) {
    if (!(list instanceof HTMLOListElement)) {
      return;
    }
    for (const item of [...list.children]) {
      clearRowTimer(item);
    }
    list.replaceChildren();
  }

  function hidePinFrame() {
    if (!(pin instanceof HTMLOListElement)) {
      return;
    }
    pin.hidden = true;
    clearList(pin);
  }

  function resetPinState() {
    window.clearTimeout(pinSwitchTimer);
    pinSwitchTimer = 0;
    pinQueue.length = 0;
    pinLeaving = false;
    pinShowing = false;
    pinHoldWait = false;
    hidePinFrame();
  }

  function enqueuePin(payload) {
    if (pinQueue.length >= PIN_QUEUE_MAX) {
      pinQueue.shift();
    }
    pinQueue.push(payload);
    if (pinHoldWait) {
      pinHoldWait = false;
      schedulePinAdvance();
      return;
    }
    pumpPin();
  }

  function applyCurrentPinTypesToQueue() {
    const keep = [];
    const rest = [];
    for (const item of pinQueue) {
      if (shouldPinType(item.type)) {
        keep.push(item);
      } else {
        rest.push(item);
      }
    }
    pinQueue.length = 0;
    pinQueue.push(...keep);
    for (const payload of rest) {
      addRow(payload);
    }
  }

  function pumpPin() {
    if (pinLeaving || pinShowing) {
      return;
    }
    while (pinQueue.length > 0) {
      const next = pinQueue.shift();
      if (!next?.displayText) {
        continue;
      }
      if (!shouldPinType(next.type) || !(pin instanceof HTMLOListElement)) {
        addRow(next);
        continue;
      }
      showPin(next);
      return;
    }
    hidePinFrame();
  }

  function showPin(payload) {
    if (!(pin instanceof HTMLOListElement) || !payload?.displayText) {
      return;
    }
    pin.hidden = false;
    clearList(pin);
    appendRow(pin, payload);
    pinShowing = true;
    pinHoldWait = false;
    schedulePinAdvance();
  }

  function schedulePinAdvance() {
    window.clearTimeout(pinSwitchTimer);
    pinSwitchTimer = window.setTimeout(() => {
      pinSwitchTimer = 0;
      advancePin();
    }, pinDisplayMs);
  }

  function finishPinLeave() {
    pinShowing = false;
    refillPreviewPinQueue();
    if (pinQueue.length > 0) {
      pumpPin();
      return;
    }
    hidePinFrame();
  }

  function advancePin() {
    refillPreviewPinQueue();
    if (pinQueue.length > 0) {
      leavePinThen(finishPinLeave);
      return;
    }
    if (canHoldPin()) {
      pinHoldWait = true;
      return;
    }
    leavePinThen(finishPinLeave);
  }

  function leavePinThen(done) {
    if (pinLeaving) {
      return;
    }
    const item = pin instanceof HTMLOListElement ? pin.firstElementChild : null;
    if (!(item instanceof HTMLElement)) {
      pinLeaving = false;
      done();
      return;
    }
    pinLeaving = true;
    window.clearTimeout(pinSwitchTimer);
    pinSwitchTimer = 0;
    beginLeave(item, () => {
      pinLeaving = false;
      done();
    });
  }

  function previewSampleUser() {
    return { avatarUrl: '/overlay/preview-avatar.svg' };
  }

  function previewCommentSample() {
    return {
      type: 'comment',
      user: previewSampleUser(),
      displayText: hideUserName ? 'テストコメントです' : 'テストユーザー: テストコメントです',
    };
  }

  function previewEventSample(type) {
    const user = previewSampleUser();
    const named = hideUserName ? '' : 'テストユーザーさんが';
    const texts = {
      gift: hideUserName ? 'バラ×100' : 'テストユーザーさんからバラ×100',
      follow: `${named}フォローしました`,
      share: `${named}シェアしました`,
      superFan: `${named}スーパーファンになりました`,
      envelope: `${named}宝箱を投げたよ`,
      portal: `${named}ポータルを投げたよ`,
      like: hideUserName ? '100いいね' : 'テストユーザーさんが100いいね',
      member: `${named}入室しました`,
    };
    const payload = {
      type,
      user,
      displayText: texts[type] || (hideUserName ? 'イベントです' : 'テストユーザーさんのイベントです'),
    };
    if (type === 'gift' || type === 'portal') {
      payload.giftImageUrl = '/overlay/gift-rose.svg';
    }
    return payload;
  }

  function previewPinnedSamples() {
    const list = [];
    for (const type of PIN_TYPES) {
      if (shouldPinType(type)) {
        list.push(previewEventSample(type));
      }
    }
    return list;
  }

  function refillPreviewPinQueue() {
    if (!isPreview || pinQueue.length > 0) {
      return;
    }
    const samples = previewPinnedSamples();
    if (samples.length === 0) {
      return;
    }
    pinQueue.push(...samples);
  }

  function seedPreviewSamples(force = false) {
    if (!isPreview) {
      return;
    }
    if (!force && chat.children.length > 0) {
      return;
    }
    pendingRows.length = 0;
    resetPinState();
    clearList(chat);
    const comment = previewCommentSample();
    const samples = PIN_TYPES.map((type) => previewEventSample(type));
    const pinned = samples.filter((row) => shouldPinType(row.type));
    if (pinned.length === 0) {
      appendRow(chat, comment);
      appendRow(chat, previewEventSample('gift'));
      appendRow(chat, previewEventSample('follow'));
      trimOverflow();
      return;
    }
    appendRow(chat, comment);
    for (const row of samples) {
      if (!shouldPinType(row.type)) {
        appendRow(chat, row);
      }
    }
    refillPreviewPinQueue();
    pumpPin();
    trimOverflow();
  }

  function handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`オーバーレイのメッセージを解釈できません: ${detail}`);
      return;
    }

    try {
      applyOverlayMessage(message);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`オーバーレイの更新に失敗しました: ${detail}`);
    }
  }

  function applyOverlayMessage(message) {
    if (message.kind === 'hello') {
      applySettings(message);
      return;
    }

    if (message.kind === 'clear') {
      pendingRows.length = 0;
      resetPinState();
      clearList(chat);
      seedPreviewSamples();
      return;
    }

    if (message.kind === 'pin-control') {
      if (message.action === 'clear') {
        resetPinState();
        if (isPreview) {
          seedPreviewSamples(true);
        }
      }
      return;
    }

    if (isPreview && (message.kind === 'event' || message.kind === 'audio' || message.kind === 'chime' || message.kind === 'audio-control')) {
      return;
    }

    if (message.kind === 'audio-control') {
      if (message.action === 'skip') {
        skipAudio();
      } else if (message.action === 'clear-pending') {
        clearPendingAudio();
      }
      return;
    }

    if (message.kind === 'audio') {
      enqueueAudio(message.audioUrl);
      return;
    }

    if (message.kind === 'chime') {
      playGiftChime();
      return;
    }

    if (message.kind !== 'event' || !message.payload) {
      return;
    }

    addRow(message.payload);
    enqueueAudio(message.payload.audioUrl);
  }

  function connect() {
    window.clearTimeout(reconnectTimer);
    const gen = ++connectGen;
    if (activeSocket) {
      try {
        activeSocket.close();
      } catch {
        // 切断済みでも落とさない
      }
      activeSocket = null;
    }
    let socket;
    try {
      socket = new WebSocket(wsUrl());
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`オーバーレイ接続に失敗しました: ${detail}`);
      if (gen === connectGen) {
        reconnectTimer = window.setTimeout(connect, 1500);
      }
      return;
    }
    activeSocket = socket;
    socket.addEventListener('message', (event) => handleMessage(event.data));
    socket.addEventListener('close', () => {
      if (activeSocket === socket) {
        activeSocket = null;
      }
      if (gen !== connectGen) {
        return;
      }
      reconnectTimer = window.setTimeout(connect, 1500);
    });
    socket.addEventListener('error', () => {
      try {
        socket.close();
      } catch {
        // 切断済みでも落とさない
      }
    });
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || (data.kind !== 'overlay-look' && data.kind !== 'overlay-replay')) {
      return;
    }
    try {
      if (data.kind === 'overlay-replay') {
        seedPreviewSamples(true);
        return;
      }
      const nextHide = data.look?.hideUserName === true;
      const nameChanged = nextHide !== hideUserName;
      hideUserName = nextHide;
      const previewChanged = applyPinSettings(data.pin);
      applyLook(data.look, nameChanged || previewChanged);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`見た目の更新に失敗しました: ${detail}`);
    }
  });

  connect();
  seedPreviewSamples();
})();
