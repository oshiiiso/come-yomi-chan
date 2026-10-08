(() => {
  const chat = document.getElementById('chat');
  const pin = document.getElementById('pin');
  const customCss = document.getElementById('custom-css');
  if (!(chat instanceof HTMLOListElement)) {
    return;
  }

  const audioQueue = [];
  let playing = false;
  let audioEpoch = 0;
  let currentAudio = null;
  let finishCurrent = null;
  let chatMaxRows = 8;
  let chatDisplayMs = 12000;
  let showAvatar = true;
  let hideUserName = false;
  let settingsReady = false;
  const earlyRows = [];
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
  let pinMsByType = {};
  let pinCurrentDisplayMs = 4000;
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
  let nameColorEnabled = true;
  const DEFAULT_NAME_COLORS = window.OverlayNameColors?.DEFAULT_NAME_COLORS || [
    '#5eead4',
    '#93c5fd',
    '#fcd34d',
    '#f9a8d4',
    '#86efac',
  ];
  let nameColors = [...DEFAULT_NAME_COLORS];
  const DEFAULT_TEMPLATE_ACCENT_COLORS = {
    gift: '#5eead4',
    count: '#93c5fd',
    likes: '#93c5fd',
    comment: '#f1f3f5',
    event: '#f9a8d4',
    emphasis: '#86efac',
  };
  let templateAccentColors = { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
  let connectGen = 0;
  let reconnectTimer = 0;
  let activeSocket = null;
  let streamSampleActive = false;
  let chatSampleQueue = [];
  let chatSampleIndex = 0;
  let chatSampleTimer = 0;
  let pinSampleTemplates = [];
  /** IPC / sample-display でテンプレ由来サンプルを受け取ったか */
  let hasOverlaySamplePlan = false;
  const isPreview = new URLSearchParams(location.search).has('preview');

  function usesOverlaySampleLoop() {
    return isPreview || streamSampleActive;
  }

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
      for (const item of list.children) {
        if (item instanceof HTMLElement) {
          item.dataset.motion = motionName;
          item.style.setProperty('--motion-ms', `${motionMs}ms`);
        }
      }
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

  function normalizePinMsByType(raw) {
    const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const next = {};
    for (const type of PIN_TYPES) {
      if (!(type in record)) continue;
      const parsed =
        typeof record[type] === 'number'
          ? record[type]
          : Number.parseInt(String(record[type] ?? ''), 10);
      if (!Number.isFinite(parsed)) continue;
      const ms = Math.trunc(parsed);
      if (ms < 1000 || ms > 120000) continue;
      next[type] = ms;
    }
    return next;
  }

  function resolveOverlayPinDisplayMs(type, commonMs, byType, hold) {
    const baseMs = normalizePinMs(commonMs);
    if (hold === true) return baseMs;
    if (typeof type !== 'string') return baseMs;
    const key = type === 'subscribe' ? 'superFan' : type;
    if (!PIN_TYPES.includes(key)) return baseMs;
    const typed = byType?.[key];
    return typeof typed === 'number' ? typed : baseMs;
  }

  function nameColorIndexLocal(uniqueId, nickname) {
    const id = String(uniqueId ?? '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase();
    const key = id || String(nickname ?? '').trim().toLowerCase();
    if (!key) {
      return 0;
    }
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % DEFAULT_NAME_COLORS.length;
  }

  function nameColorForUser(uniqueId, nickname) {
    if (window.OverlayNameColors?.nameColorForUser) {
      return window.OverlayNameColors.nameColorForUser(uniqueId, nickname, nameColors);
    }
    const colors =
      nameColors.length === DEFAULT_NAME_COLORS.length ? nameColors : [...DEFAULT_NAME_COLORS];
    return colors[nameColorIndexLocal(uniqueId, nickname)];
  }

  function normalizeNameColors(raw) {
    if (window.OverlayNameColors?.normalizeNameColors) {
      return window.OverlayNameColors.normalizeNameColors(raw);
    }
    const list = Array.isArray(raw) ? raw : [];
    return DEFAULT_NAME_COLORS.map((def, i) => {
      const candidate = list[i];
      return typeof candidate === 'string' && /^#[0-9a-fA-F]{6}$/.test(candidate)
        ? candidate.toLowerCase()
        : def;
    });
  }

  function sameNameColors(left, right) {
    if (window.OverlayNameColors?.sameNameColors) {
      return window.OverlayNameColors.sameNameColors(left, right);
    }
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((color, index) => color === right[index]);
  }

  /** 名前色の設定を取り込み、変わったときだけ true。 */
  function applyNameColorSettings(message) {
    let changed = false;
    if (typeof message?.nameColorEnabled === 'boolean') {
      if (message.nameColorEnabled !== nameColorEnabled) {
        nameColorEnabled = message.nameColorEnabled;
        changed = true;
      }
    }
    if (Array.isArray(message?.nameColors)) {
      const next = normalizeNameColors(message.nameColors);
      if (!sameNameColors(next, nameColors)) {
        nameColors = next;
        changed = true;
      }
    }
    return changed;
  }

  /** 出ている行の名前色を今のパレットに合わせる。 */
  function refreshColoredNames() {
    for (const list of lookLists()) {
      for (const nameEl of list.querySelectorAll('.chat__name')) {
        if (!(nameEl instanceof HTMLElement)) {
          continue;
        }
        if (!nameColorEnabled) {
          nameEl.style.removeProperty('color');
          continue;
        }
        const uniqueId = nameEl.dataset.uniqueId || '';
        const nickname = nameEl.dataset.nickname || nameEl.textContent || '';
        nameEl.style.color = nameColorForUser(uniqueId, nickname);
      }
    }
  }

  function normalizeTemplateAccentColors(raw) {
    const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const out = { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
    for (const key of Object.keys(DEFAULT_TEMPLATE_ACCENT_COLORS)) {
      const value = record[key];
      if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
        out[key] = value.toLowerCase();
      }
    }
    return out;
  }

  function sameTemplateAccentColors(left, right) {
    return Object.keys(DEFAULT_TEMPLATE_ACCENT_COLORS).every((key) => left?.[key] === right?.[key]);
  }

  /** 差し込み色の設定を取り込み、変わったときだけ true。 */
  function applyTemplateAccentSettings(message) {
    if (!message || typeof message !== 'object' || !('templateAccentColors' in message)) {
      return false;
    }
    const next = normalizeTemplateAccentColors(message.templateAccentColors);
    if (sameTemplateAccentColors(next, templateAccentColors)) {
      return false;
    }
    templateAccentColors = next;
    return true;
  }

  /** 出ている行の差し込み色を今の設定に合わせる。 */
  function refreshAccentColors() {
    for (const list of lookLists()) {
      for (const accentEl of list.querySelectorAll('.chat__accent[data-accent-token]')) {
        if (!(accentEl instanceof HTMLElement)) {
          continue;
        }
        const token = accentEl.dataset.accentToken || '';
        const color = templateAccentColors[token];
        if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) {
          accentEl.style.color = color.toLowerCase();
        }
      }
    }
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
    pinMsByType = normalizePinMsByType(next.displayMsByType);
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
    if (look.hideUserName === true) {
      hideUserName = true;
    } else if (look.hideUserName === false) {
      hideUserName = false;
    }
    const theme = typeof look.theme === 'string' ? look.theme : 'dark';
    const align = typeof look.align === 'string' ? look.align : 'full';
    const backdrop =
      typeof look.previewBackdrop === 'string' ? look.previewBackdrop : 'checker';
    showAvatar = look.showAvatar !== false;
    settingsReady = true;
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
    const params = new URLSearchParams();
    params.set('role', 'chat');
    if (isPreview) {
      params.set('preview', '1');
    }
    return `${protocol}//${location.host}/overlay/ws?${params.toString()}`;
  }

  function applyCustomCss(css) {
    if (customCss) {
      customCss.textContent = typeof css === 'string' ? css : '';
    }
  }

  function applySettings(message, options = {}) {
    if (typeof message.chatMaxRows === 'number' && Number.isFinite(message.chatMaxRows)) {
      chatMaxRows = Math.min(50, Math.max(1, Math.trunc(message.chatMaxRows)));
    }
    if (typeof message.chatDisplayMs === 'number' && Number.isFinite(message.chatDisplayMs)) {
      chatDisplayMs = Math.max(0, Math.trunc(message.chatDisplayMs));
    }
    if (typeof message.hideUserName === 'boolean') {
      hideUserName = message.hideUserName;
    }
    if (typeof message.customCss === 'string') {
      applyCustomCss(message.customCss);
    }
    const nameColorChanged = applyNameColorSettings(message);
    const accentChanged = applyTemplateAccentSettings(message);
    if (message.look) {
      applyLook(message.look);
    } else {
      settingsReady = true;
    }
    const previewChanged = applyPinSettings(message.pin);
    trimOverflow();
    flushPendingRows();
    if (nameColorChanged) {
      refreshColoredNames();
    }
    if (accentChanged) {
      refreshAccentColors();
    }
    if (!usesOverlaySampleLoop()) {
      releaseEarlyRows();
    }
    if (options.skipSampleSeed) {
      return;
    }
    if (isPreview && (previewChanged || nameColorChanged || accentChanged)) {
      seedPreviewSamples(true);
    } else {
      seedPreviewSamples();
    }
  }

  function releaseEarlyRows() {
    const queued = earlyRows.splice(0, earlyRows.length);
    for (const payload of queued) {
      addRow(payload);
    }
  }

  const SAMPLE_CHAT_INTERVAL_MIN_MS = 1000;
  const SAMPLE_CHAT_INTERVAL_MAX_MS = 6000;

  function randomSampleChatIntervalMs() {
    const span = SAMPLE_CHAT_INTERVAL_MAX_MS - SAMPLE_CHAT_INTERVAL_MIN_MS + 1;
    return SAMPLE_CHAT_INTERVAL_MIN_MS + Math.floor(Math.random() * span);
  }

  function stopChatSampleLoop() {
    window.clearTimeout(chatSampleTimer);
    chatSampleTimer = 0;
  }

  function resetSampleTemplates() {
    stopChatSampleLoop();
    chatSampleQueue = [];
    chatSampleIndex = 0;
    pinSampleTemplates = [];
    hasOverlaySamplePlan = false;
  }

  function normalizeSamplePayload(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.displayText !== 'string' || !raw.displayText) {
      return null;
    }
    return raw;
  }

  function pushNextChatSample() {
    if (chatSampleQueue.length === 0) {
      return;
    }
    const payload = normalizeSamplePayload(
      chatSampleQueue[chatSampleIndex % chatSampleQueue.length],
    );
    chatSampleIndex += 1;
    if (!payload) {
      return;
    }
    if (shouldPinType(payload.type)) {
      enqueuePin(payload);
      if (!pinLeaving && !pinShowing) {
        pumpPin();
      }
      return;
    }
    addRow(payload);
  }

  function scheduleChatSampleAdvance() {
    stopChatSampleLoop();
    if (!usesOverlaySampleLoop() || chatSampleQueue.length === 0) {
      return;
    }
    chatSampleTimer = window.setTimeout(() => {
      chatSampleTimer = 0;
      pushNextChatSample();
      scheduleChatSampleAdvance();
    }, randomSampleChatIntervalMs());
  }

  function applySampleQueues(message) {
    resetSampleTemplates();
    resetPinState();
    pendingRows.length = 0;
    clearList(chat);
    pinSampleTemplates = Array.isArray(message.pinSamples)
      ? message.pinSamples.map(normalizeSamplePayload).filter(Boolean)
      : [];
    chatSampleQueue = Array.isArray(message.chatSamples)
      ? message.chatSamples.map(normalizeSamplePayload).filter(Boolean)
      : [];
    chatSampleIndex = 0;
    hasOverlaySamplePlan = true;
    if (chatSampleQueue.length > 0) {
      pushNextChatSample();
      scheduleChatSampleAdvance();
    }
    if (pinSampleTemplates.length > 0) {
      pinQueue.push(...pinSampleTemplates);
    }
    pumpPin();
    trimOverflow();
  }

  function applyStreamSampleDisplay(message) {
    applySampleQueues(message);
    applySettings(message, { skipSampleSeed: true });
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

  function playGiftChime(soundUrl, volume) {
    const gain =
      typeof volume === 'number' && Number.isFinite(volume)
        ? Math.max(0, Math.min(5, volume / 100))
        : 0.85;
    stopCurrentChime();
    if (typeof soundUrl === 'string' && soundUrl.trim()) {
      currentChimeStop = playUrlWithGain(soundUrl.trim(), gain, () => undefined, () => {
        if (currentChimeStop) {
          currentChimeStop = null;
        }
      });
      return;
    }
    currentChimeStop = playBuiltinChime(gain, () => {
      if (currentChimeStop) {
        currentChimeStop = null;
      }
    });
  }

  let currentChimeStop = null;

  function stopCurrentChime() {
    if (typeof currentChimeStop === 'function') {
      const stop = currentChimeStop;
      currentChimeStop = null;
      stop();
    }
  }

  function playUrlWithGain(url, gain, onFail, onEnded) {
    const safeGain = Math.max(0, Math.min(5, Number(gain) || 0));
    const fail = typeof onFail === 'function' ? onFail : () => undefined;
    const ended = typeof onEnded === 'function' ? onEnded : () => undefined;
    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      ended();
    };
    const stopAudio = (audio) => {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // ignore
      }
    };

    if (safeGain <= 1) {
      try {
        const audio = new Audio(url);
        audio.volume = safeGain;
        audio.addEventListener('ended', finish);
        audio.addEventListener('error', () => {
          fail();
          finish();
        });
        void audio.play().catch(() => {
          fail();
          finish();
        });
        return () => {
          stopAudio(audio);
          finish();
        };
      } catch {
        fail();
        finish();
        return () => undefined;
      }
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      fail();
      finish();
      return () => undefined;
    }
    if (!chimeContext) {
      chimeContext = new AudioCtx();
    }
    const ctx = chimeContext;
    const abort = new AbortController();
    let bufferSource = null;
    let cancelled = false;

    const startBoost = async () => {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        const response = await fetch(url, {
          mode: 'cors',
          cache: 'no-store',
          signal: abort.signal,
        });
        if (!response.ok) {
          throw new Error(`sound fetch ${response.status}`);
        }
        const bytes = await response.arrayBuffer();
        if (cancelled || finished) {
          return;
        }
        const audioBuffer = await ctx.decodeAudioData(bytes.slice(0));
        if (cancelled || finished) {
          return;
        }
        bufferSource = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        gainNode.gain.value = safeGain;
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(gainNode);
        gainNode.connect(ctx.destination);
        bufferSource.onended = finish;
        bufferSource.start();
      } catch {
        if (cancelled || finished) {
          return;
        }
        fail();
        finish();
      }
    };
    void startBoost();

    return () => {
      cancelled = true;
      abort.abort();
      if (bufferSource) {
        try {
          bufferSource.stop();
        } catch {
          // ignore
        }
      }
      finish();
    };
  }

  /** ギフト用テンプレ（チャリン）。コメント新着音とは別。 */
  function playBuiltinChime(gainScale, onEnded) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      if (typeof onEnded === 'function') {
        onEnded();
      }
      return () => undefined;
    }
    if (!chimeContext) {
      chimeContext = new AudioCtx();
    }
    const ctx = chimeContext;
    const scale =
      typeof gainScale === 'number' && Number.isFinite(gainScale)
        ? Math.max(0, Math.min(5, gainScale))
        : 0.85;
    const oscillators = [];
    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      if (typeof onEnded === 'function') {
        onEnded();
      }
    };
    const start = () => {
      const now = ctx.currentTime;
      const makeDing = (freq, startAt, dur, peak) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + startAt);
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, peak * scale),
          now + startAt + 0.012,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startAt + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startAt);
        osc.stop(now + startAt + dur + 0.02);
        oscillators.push(osc);
        return osc;
      };
      makeDing(1568, 0, 0.11, 0.14);
      const second = makeDing(2093, 0.045, 0.16, 0.11);
      second.onended = finish;
    };
    if (ctx.state === 'suspended') {
      void ctx.resume().then(start).catch(finish);
    } else {
      start();
    }
    return () => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // ignore
        }
      }
      finish();
    };
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
    audioEpoch += 1;
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
    const epoch = audioEpoch;
    try {
      while (audioQueue.length > 0) {
        if (epoch !== audioEpoch) {
          break;
        }
        const item = audioQueue.shift();
        let src = '';
        try {
          src = await item;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`音声の読み込みに失敗しました: ${message}`);
          continue;
        }
        if (epoch !== audioEpoch) {
          revokeIfBlob(src);
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
    if (item instanceof HTMLElement) {
      item.style.removeProperty('opacity');
    }
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

  function pinPhaseMs() {
    if (motionName === 'none' || motionMs <= 0) {
      return 0;
    }
    if (pinCurrentDisplayMs >= motionMs * 2) {
      return motionMs;
    }
    return Math.max(1, Math.trunc(pinCurrentDisplayMs / 2));
  }

  function pinAdvanceDelayMs() {
    const phase = pinPhaseMs();
    if (phase <= 0) {
      return Math.max(0, pinCurrentDisplayMs);
    }
    return Math.max(phase, pinCurrentDisplayMs - phase);
  }

  function leaveMotionInName(item) {
    const source = item instanceof HTMLElement ? item : null;
    const list = pin instanceof HTMLOListElement ? pin : null;
    const fromItem = source ? getComputedStyle(source).getPropertyValue('--motion-in').trim() : '';
    if (fromItem) {
      return fromItem;
    }
    if (list) {
      return getComputedStyle(list).getPropertyValue('--motion-in').trim();
    }
    return '';
  }

  function pinLeaveDurationMs(enterAnim, fallbackMs) {
    if (!enterAnim?.effect) {
      return fallbackMs;
    }
    const timing = enterAnim.effect.getTiming();
    if (typeof timing.duration === 'number' && timing.duration > 0) {
      return timing.duration;
    }
    return fallbackMs;
  }

  function pinLeaveKeyframes(enterAnim) {
    if (!enterAnim?.effect) {
      return null;
    }
    try {
      const keyframes = enterAnim.effect.getKeyframes();
      return keyframes.length > 0 ? keyframes : null;
    } catch {
      return null;
    }
  }

  function pinReverseKeyframes(keyframes) {
    const sorted = [...keyframes].sort(
      (left, right) =>
        (left.offset ?? left.computedOffset ?? 0) - (right.offset ?? right.computedOffset ?? 0),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const from = {};
    const to = {};
    for (const key of ['opacity', 'transform', 'filter']) {
      if (last[key] != null) {
        from[key] = last[key];
      }
      if (first[key] != null) {
        to[key] = first[key];
      }
    }
    return [from, to];
  }

  function preparePinLeaveItem(item) {
    item.classList.add('is-leaving');
    item.style.removeProperty('opacity');
    item.style.setProperty('animation', 'none');
  }

  function pinLeaveFromRunning(enterAnim, item, ms) {
    const style = getComputedStyle(item);
    const transform = style.transform === 'none' ? undefined : style.transform;
    const from = {
      opacity: style.opacity,
      transform,
    };
    const keyframes = pinLeaveKeyframes(enterAnim);
    const first = keyframes?.[0];
    if (!first) {
      return null;
    }
    const to = {
      opacity: first.opacity ?? '0',
      transform: first.transform,
    };
    const currentTime =
      typeof enterAnim.currentTime === 'number' && Number.isFinite(enterAnim.currentTime)
        ? Math.max(1, Math.round(enterAnim.currentTime))
        : ms;
    preparePinLeaveItem(item);
    return item.animate([from, to], {
      duration: currentTime,
      easing: 'ease-in',
      fill: 'forwards',
    });
  }

  function beginPinLeave(item, onDone) {
    const finish = () => {
      if (item.isConnected) {
        item.remove();
      }
      if (typeof onDone === 'function') {
        onDone();
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
    if (!leaveMotionInName(item)) {
      finish();
      return;
    }
    let settled = false;
    let fallback = 0;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      if (fallback) {
        window.clearTimeout(fallback);
      }
      finish();
    };
    const bindLeaveAnim = (leaveAnim, durationMs) => {
      if (!leaveAnim) {
        settle();
        return;
      }
      leaveAnim.addEventListener('finish', settle, { once: true });
      leaveAnim.addEventListener('cancel', settle, { once: true });
      fallback = window.setTimeout(settle, durationMs + 100);
      item.dataset.leaveTimer = String(fallback);
    };

    const enterAnim = item
      .getAnimations()
      .find((anim) => anim.animationName && anim.animationName !== 'none' && anim.effect);
    const durationMs = pinLeaveDurationMs(enterAnim, ms);
    let leaveAnim = null;
    let leaveDurationMs = durationMs;

    if (enterAnim?.effect && enterAnim.playState === 'running') {
      leaveDurationMs = Math.max(
        1,
        Math.round(
          typeof enterAnim.currentTime === 'number' && Number.isFinite(enterAnim.currentTime)
            ? enterAnim.currentTime
            : durationMs,
        ),
      );
      leaveAnim = pinLeaveFromRunning(enterAnim, item, durationMs);
      enterAnim.cancel();
    } else {
      const keyframes = pinLeaveKeyframes(enterAnim);
      enterAnim?.cancel();
      preparePinLeaveItem(item);
      if (keyframes) {
        leaveAnim = item.animate(pinReverseKeyframes(keyframes), {
          duration: durationMs,
          easing: 'ease-in',
          fill: 'forwards',
        });
      }
    }

    if (!leaveAnim) {
      preparePinLeaveItem(item);
      leaveAnim = item.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: durationMs,
        easing: 'ease-in',
        fill: 'forwards',
      });
    }

    bindLeaveAnim(leaveAnim, leaveDurationMs);
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
    if (pin instanceof HTMLOListElement && item.parentElement === pin) {
      beginPinLeave(item, onDone);
      return;
    }
    clearRowTimer(item);
    const ms = rowMotionMs(item);
    if (rowMotion(item) === 'none' || ms <= 0) {
      finish();
      return;
    }
    let settled = false;
    let fallback = 0;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      item.removeEventListener('animationend', onAnimEnd);
      if (fallback) {
        window.clearTimeout(fallback);
      }
      finish();
    };
    const onAnimEnd = (event) => {
      if (event.target !== item || event.pseudoElement) {
        return;
      }
      settle();
    };
    for (const anim of item.getAnimations()) {
      anim.cancel();
    }
    item.style.opacity = '1';
    item.style.animation = 'none';
    void item.offsetWidth;
    item.style.removeProperty('animation');
    item.classList.add('is-leaving');
    item.addEventListener('animationend', onAnimEnd);
    fallback = window.setTimeout(settle, ms + 100);
    item.dataset.leaveTimer = String(fallback);
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
    if (!settingsReady) {
      earlyRows.push(payload);
      if (earlyRows.length > 40) {
        earlyRows.shift();
      }
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

  // src/shared/comment-emotes.ts と同じ判定（配信ソースは単一 JS）
  const EMOTE_ONLY_COMMENT = '絵文字';
  const MAX_COMMENT_EMOTES = 32;
  const COMMENT_EMOTE_PLACEHOLDER_RE = /\[[^\[\]\s]{1,32}\]/g;
  const COMMENT_EMOTE_SHORTCODES = {
    heart: '❤️',
    love: '❤️',
    like: '👍',
    wow: '😮',
    surprised: '😮',
    smile: '😊',
    happy: '😊',
    laugh: '😂',
    lol: '😂',
    cool: '😎',
    cry: '😢',
    sad: '😢',
    angry: '😠',
    mad: '😠',
    kiss: '😘',
    cute: '🥰',
    shy: '😳',
    sleepy: '😴',
    think: '🤔',
    applaud: '👏',
    clap: '👏',
    hi: '👋',
    bye: '👋',
    wave: '👋',
    ok: '👌',
    yes: '✅',
    no: '❌',
    thankyou: '🙏',
    thanks: '🙏',
    pray: '🙏',
    fire: '🔥',
    star: '⭐',
    gift: '🎁',
    rose: '🌹',
    music: '🎵',
    dance: '💃',
  };

  function normalizeOverlayCommentEmotes(emotes) {
    if (!Array.isArray(emotes) || emotes.length === 0) {
      return [];
    }
    const next = [];
    for (const item of emotes) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const imageUrl = String(item.imageUrl || '').trim();
      if (!imageUrl) {
        continue;
      }
      const parsed = typeof item.index === 'number' ? item.index : Number(item.index);
      const index = Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
      next.push({ index, imageUrl });
      if (next.length >= MAX_COMMENT_EMOTES) {
        break;
      }
    }
    return next;
  }

  function overlayPlaceholderAt(text, index) {
    const sliced = text.slice(index);
    const match = sliced.match(/^\[([^\[\]\s]{1,32})\]/);
    return match ? match[0] : '';
  }

  function overlayShortcodeToEmoji(token) {
    const inner = String(token || '')
      .replace(/^\[|\]$/g, '')
      .trim()
      .toLowerCase();
    if (!inner) {
      return '';
    }
    return COMMENT_EMOTE_SHORTCODES[inner] || '';
  }

  function expandOverlayShortcodes(text) {
    COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
    return text.replace(COMMENT_EMOTE_PLACEHOLDER_RE, (token) => {
      return overlayShortcodeToEmoji(token) || token;
    });
  }

  function pushOverlayTextSegment(segments, text) {
    if (!text) {
      return;
    }
    const expanded = expandOverlayShortcodes(text);
    if (expanded) {
      segments.push({ kind: 'text', text: expanded });
    }
  }

  function buildOverlayByIndexWithPlaceholders(base, emotes) {
    const ordered = emotes
      .map((item, order) => ({
        index: item.index > base.length ? base.length : Math.max(0, item.index),
        imageUrl: item.imageUrl,
        order,
      }))
      .sort((a, b) => a.index - b.index || a.order - b.order);
    const segments = [];
    let cursor = 0;
    let consumedPlaceholder = false;
    for (const emote of ordered) {
      let index = emote.index;
      if (index < cursor) {
        index = cursor;
      }
      if (index > cursor) {
        pushOverlayTextSegment(segments, base.slice(cursor, index));
        cursor = index;
      }
      segments.push({ kind: 'emote', imageUrl: emote.imageUrl });
      const placeholder = overlayPlaceholderAt(base, cursor);
      if (placeholder) {
        cursor += placeholder.length;
        consumedPlaceholder = true;
      }
    }
    if (cursor < base.length) {
      pushOverlayTextSegment(segments, base.slice(cursor));
    }
    return { segments, consumedPlaceholder };
  }

  function buildOverlayByPlaceholderOrder(base, emotes) {
    const ordered = [...emotes].sort((a, b) => a.index - b.index || 0);
    const segments = [];
    let cursor = 0;
    let emoteOrder = 0;
    COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
    for (const match of base.matchAll(COMMENT_EMOTE_PLACEHOLDER_RE)) {
      const start = match.index ?? 0;
      if (start > cursor) {
        pushOverlayTextSegment(segments, base.slice(cursor, start));
      }
      if (emoteOrder < ordered.length) {
        segments.push({ kind: 'emote', imageUrl: ordered[emoteOrder].imageUrl });
        emoteOrder += 1;
      } else {
        const emoji = overlayShortcodeToEmoji(match[0]);
        pushOverlayTextSegment(segments, emoji || match[0]);
      }
      cursor = start + match[0].length;
    }
    if (cursor < base.length) {
      pushOverlayTextSegment(segments, base.slice(cursor));
    }
    while (emoteOrder < ordered.length) {
      segments.push({ kind: 'emote', imageUrl: ordered[emoteOrder].imageUrl });
      emoteOrder += 1;
    }
    return segments;
  }

  function buildOverlayCommentSegments(comment, emotes) {
    const raw = String(comment || '');
    const base = raw.trim() === EMOTE_ONLY_COMMENT ? '' : raw;
    const list = normalizeOverlayCommentEmotes(emotes);
    if (list.length === 0) {
      if (!base) {
        return [];
      }
      const expanded = expandOverlayShortcodes(base);
      return expanded ? [{ kind: 'text', text: expanded }] : [];
    }
    COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
    const hasPlaceholders = COMMENT_EMOTE_PLACEHOLDER_RE.test(base);
    COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
    if (hasPlaceholders) {
      const byIndex = buildOverlayByIndexWithPlaceholders(base, list);
      if (byIndex.consumedPlaceholder) {
        return byIndex.segments;
      }
      return buildOverlayByPlaceholderOrder(base, list);
    }
    return buildOverlayByIndexWithPlaceholders(base, list).segments;
  }

  function createGiftImagePlaceholder(className) {
    const el = document.createElement('span');
    const base = String(className || '').trim();
    el.className = base ? `${base} gift-icon--missing` : 'gift-icon--missing';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = 'No';
    return el;
  }

  function createGiftImage(src, className) {
    const url = String(src || '').trim();
    const classes = String(className || '').trim();
    if (!url) {
      return createGiftImagePlaceholder(classes);
    }
    const img = document.createElement('img');
    img.className = classes;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      img.replaceWith(createGiftImagePlaceholder(classes));
    });
    img.src = url;
    return img;
  }

  function appendOverlayEmoteImage(host, imageUrl) {
    if (!(host instanceof HTMLElement) || !imageUrl) {
      return;
    }
    const img = document.createElement('img');
    img.className = 'chat__emote';
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.addEventListener('error', () => img.remove());
    img.src = imageUrl;
    host.appendChild(img);
  }

  function appendOverlayCommentSegments(host, segments) {
    if (!(host instanceof HTMLElement)) {
      return;
    }
    for (const segment of segments || []) {
      if (!segment || typeof segment !== 'object') {
        continue;
      }
      if (segment.kind === 'text') {
        if (segment.text) {
          host.appendChild(document.createTextNode(segment.text));
        }
        continue;
      }
      if (segment.kind === 'emote') {
        appendOverlayEmoteImage(host, segment.imageUrl);
      }
    }
  }

  function appendColoredName(body, nickname, uniqueId, color) {
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat__name';
    nameSpan.dataset.uniqueId = String(uniqueId || '');
    nameSpan.dataset.nickname = String(nickname || '');
    const resolved =
      typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
        ? color.toLowerCase()
        : nameColorForUser(uniqueId, nickname);
    if (nameColorEnabled && resolved) {
      nameSpan.style.color = resolved;
    }
    nameSpan.textContent = nickname;
    body.appendChild(nameSpan);
  }

  function appendPlainChatText(body, value) {
    if (!value) {
      return;
    }
    const textSpan = document.createElement('span');
    textSpan.className = 'chat__text';
    textSpan.textContent = value;
    body.appendChild(textSpan);
  }

  function appendAccentChatText(body, value, color, token) {
    if (!value) {
      return;
    }
    const accentSpan = document.createElement('span');
    accentSpan.className =
      token === 'emphasis' ? 'chat__accent chat__accent--emphasis' : 'chat__accent';
    if (typeof token === 'string' && token) {
      accentSpan.dataset.accentToken = token;
    }
    const resolved =
      typeof token === 'string' && templateAccentColors[token]
        ? templateAccentColors[token]
        : color;
    if (typeof resolved === 'string' && /^#[0-9a-fA-F]{6}$/.test(resolved)) {
      accentSpan.style.color = resolved.toLowerCase();
    }
    accentSpan.textContent = value;
    body.appendChild(accentSpan);
  }

  function appendCommentWithEmotes(body, comment, emotes) {
    const segments = buildOverlayCommentSegments(comment, emotes);
    const commentHost = document.createElement('span');
    commentHost.className = 'chat__text';
    appendOverlayCommentSegments(commentHost, segments);
    body.appendChild(commentHost);
  }

  function lineHasContent(line) {
    if (!(line instanceof HTMLElement)) {
      return false;
    }
    if (line.querySelector('img')) {
      return true;
    }
    return Boolean(String(line.textContent || '').trim());
  }

  function stripLeadingNameSeparator(line) {
    if (!(line instanceof HTMLElement)) {
      return;
    }
    const first = line.firstElementChild;
    if (!(first instanceof HTMLElement) || !first.classList.contains('chat__text') || first.children.length > 0) {
      return;
    }
    const next = String(first.textContent || '').replace(/^\s*[:：]\s*/, '');
    if (!next) {
      first.remove();
      return;
    }
    first.textContent = next;
  }

  function trimTextLineEdges(line) {
    if (!(line instanceof HTMLElement)) {
      return;
    }
    const trimEdge = (el, edge) => {
      if (!(el instanceof HTMLElement) || !el.classList.contains('chat__text') || el.children.length > 0) {
        return;
      }
      const raw = String(el.textContent || '');
      const next = edge === 'start' ? raw.replace(/^\s+/, '') : raw.replace(/\s+$/, '');
      if (!next) {
        el.remove();
        return;
      }
      el.textContent = next;
    };
    trimEdge(line.firstElementChild, 'start');
    trimEdge(line.lastElementChild, 'end');
  }

  function fillChatBodyFromParts(nameLine, textLine, payload, parts, emotes) {
    const comment = String(payload.comment || '');
    COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
    const hasPlaceholders = COMMENT_EMOTE_PLACEHOLDER_RE.test(comment);
    COMMENT_EMOTE_PLACEHOLDER_RE.lastIndex = 0;
    const useCommentSegments = emotes.length > 0 || hasPlaceholders;
    const needle =
      comment && useCommentSegments
        ? comment
        : emotes.length > 0
          ? EMOTE_ONLY_COMMENT
          : '';
    let emotesPlaced = false;
    for (const part of parts) {
      if (!part || typeof part.value !== 'string' || !part.value) {
        continue;
      }
      if (part.kind === 'name') {
        if (!hideUserName) {
          appendColoredName(nameLine, part.value, payload.user?.uniqueId, part.color);
        }
        continue;
      }
      if (
        !emotesPlaced &&
        needle &&
        (part.kind === 'text' || part.kind === 'accent') &&
        part.value.includes(needle)
      ) {
        const idx = part.value.indexOf(needle);
        const before = part.value.slice(0, idx);
        const after = part.value.slice(idx + needle.length);
        const commentText = needle === EMOTE_ONLY_COMMENT ? comment || needle : needle;
        if (part.kind === 'accent') {
          appendAccentChatText(textLine, before, part.color, part.token);
          appendCommentWithEmotes(textLine, commentText, emotes);
          appendAccentChatText(textLine, after, part.color, part.token);
        } else {
          appendPlainChatText(textLine, before);
          appendCommentWithEmotes(textLine, commentText, emotes);
          appendPlainChatText(textLine, after);
        }
        emotesPlaced = true;
        continue;
      }
      if (part.kind === 'accent') {
        appendAccentChatText(textLine, part.value, part.color, part.token);
        continue;
      }
      appendPlainChatText(textLine, part.value);
    }
    if (!emotesPlaced && useCommentSegments) {
      appendCommentWithEmotes(textLine, comment || EMOTE_ONLY_COMMENT, emotes);
    }
  }

  function fillChatBodyPlain(nameLine, textLine, payload) {
    const nickname = String(payload.user?.nickname || '');
    const displayText = String(payload.displayText || '');
    const comment = String(payload.comment || '');
    const emotes = normalizeOverlayCommentEmotes(payload.commentEmotes);
    const segments = buildOverlayCommentSegments(comment, emotes);
    const needle =
      comment && displayText.includes(comment)
        ? comment
        : emotes.length > 0 && displayText.includes(EMOTE_ONLY_COMMENT)
          ? EMOTE_ONLY_COMMENT
          : '';
    const commentAt = needle ? displayText.indexOf(needle) : -1;

    if (segments.length > 0 && commentAt >= 0) {
      const before = displayText.slice(0, commentAt);
      const after = displayText.slice(commentAt + needle.length);
      if (!hideUserName && nickname && before.includes(nickname)) {
        const idx = before.indexOf(nickname);
        appendPlainChatText(textLine, before.slice(0, idx));
        appendColoredName(nameLine, nickname, payload.user?.uniqueId);
        appendPlainChatText(textLine, before.slice(idx + nickname.length));
      } else if (before) {
        appendPlainChatText(textLine, before);
      }
      appendCommentWithEmotes(textLine, needle === EMOTE_ONLY_COMMENT ? comment || needle : needle, emotes);
      appendPlainChatText(textLine, after);
      return;
    }

    if (!hideUserName && nickname && displayText.includes(nickname)) {
      const idx = displayText.indexOf(nickname);
      appendPlainChatText(textLine, expandOverlayShortcodes(displayText.slice(0, idx)));
      appendColoredName(nameLine, nickname, payload.user?.uniqueId);
      appendPlainChatText(textLine, expandOverlayShortcodes(displayText.slice(idx + nickname.length)));
      return;
    }

    const fallback = expandOverlayShortcodes(displayText);
    if (fallback) {
      textLine.textContent = fallback;
    }
  }

  function fillChatBody(body, payload) {
    if (!(body instanceof HTMLElement) || !payload || typeof payload !== 'object') {
      return;
    }
    const nameLine = document.createElement('div');
    nameLine.className = 'chat__name-line';
    const textLine = document.createElement('div');
    textLine.className = 'chat__text-line';
    const emotes = normalizeOverlayCommentEmotes(payload.commentEmotes);
    const parts = Array.isArray(payload.displayParts)
      ? payload.displayParts.filter(
          (part) => part && typeof part.value === 'string' && part.value,
        )
      : [];

    try {
      if (parts.length > 0) {
        fillChatBodyFromParts(nameLine, textLine, payload, parts, emotes);
      } else {
        fillChatBodyPlain(nameLine, textLine, payload);
      }
    } catch {
      nameLine.replaceChildren();
      textLine.replaceChildren();
      textLine.textContent = String(payload.displayText || '');
    }

    trimTextLineEdges(textLine);
    if (lineHasContent(nameLine)) {
      stripLeadingNameSeparator(textLine);
      body.appendChild(nameLine);
    }
    if (lineHasContent(textLine)) {
      body.appendChild(textLine);
    }
    if (!body.childNodes.length) {
      textLine.textContent = String(payload.displayText || '');
      if (textLine.textContent) {
        body.appendChild(textLine);
      }
    }
  }

  function appendRow(list, payload) {
    if (!payload?.displayText || !(list instanceof HTMLOListElement)) {
      return;
    }

    const item = document.createElement('li');
    item.className = `chat__item chat__item--${payload.type || 'comment'}`;
    item.dataset.motion = motionName;
    const rowMs = list === pin ? pinPhaseMs() : motionMs;
    item.style.setProperty('--motion-ms', `${rowMs}ms`);

    if (showAvatar && payload.user && payload.user.avatarUrl) {
      const img = document.createElement('img');
      img.className = 'chat__avatar';
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        const placeholder = document.createElement('span');
        placeholder.className = 'chat__avatar chat__avatar--empty';
        placeholder.setAttribute('aria-hidden', 'true');
        img.replaceWith(placeholder);
      });
      img.src = payload.user.avatarUrl;
      item.appendChild(img);
    }

    if (payload.type === 'gift' || payload.type === 'portal') {
      item.appendChild(createGiftImage(payload.giftImageUrl || '', 'chat__gift'));
    }

    const body = document.createElement('div');
    body.className = 'chat__body';
    fillChatBody(body, payload);

    item.appendChild(body);
    list.appendChild(item);
    if (list === pin) {
      item.addEventListener(
        'animationend',
        (event) => {
          if (event.target !== item || event.pseudoElement || item.classList.contains('is-leaving')) {
            return;
          }
          item.dataset.entered = '1';
          item.style.opacity = '1';
        },
        { once: true },
      );
      return;
    }
    if (list !== chat) {
      return;
    }
    trimOverflow();

    const leaveMs = chatDisplayMs;
    if (leaveMs > 0 && (!isPreview || usesOverlaySampleLoop())) {
      const timer = window.setTimeout(() => {
        beginLeave(item);
      }, leaveMs);
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
    if (pinLeaving) {
      return;
    }
    const item = pin.firstElementChild;
    if (item instanceof HTMLElement) {
      if (item.classList.contains('is-leaving')) {
        return;
      }
      leavePinThen(() => {
        pin.hidden = true;
        clearList(pin);
      });
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
    if (pin instanceof HTMLOListElement) {
      pin.hidden = true;
      clearList(pin);
    }
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
    pinCurrentDisplayMs = resolveOverlayPinDisplayMs(payload.type, pinDisplayMs, pinMsByType, pinHold);
    const existing = pin.firstElementChild;
    if (existing instanceof HTMLElement) {
      if (existing.classList.contains('is-leaving') || pinLeaving) {
        return;
      }
      pinShowing = false;
      leavePinThen(() => {
        appendRow(pin, payload);
        pinShowing = true;
        pinHoldWait = false;
        schedulePinAdvance();
      });
      return;
    }
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
    }, pinAdvanceDelayMs());
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
    beginPinLeave(item, () => {
      pinLeaving = false;
      done();
    });
  }

  function previewSampleUser(uniqueId = 'test_user') {
    return {
      uniqueId,
      nickname: 'テストユーザー',
      avatarUrl: '/overlay/preview-avatar.svg',
    };
  }

  function previewCommentSample(uniqueId = 'test_user', comment = 'テストコメントです') {
    return {
      type: 'comment',
      user: previewSampleUser(uniqueId),
      comment,
      displayText: hideUserName ? comment : `テストユーザー: ${comment}`,
    };
  }

  function previewCommentSamples() {
    return [
      previewCommentSample('test_user', 'テストコメントです'),
      previewCommentSample('test_fan_4', 'ファンクラブのテストです'),
      previewCommentSample('test_super', 'スーパーファンのテストです'),
      previewCommentSample('test_fan_super', 'ファンでスパのテストです'),
      previewCommentSample('test_mod', 'テストコメントです'),
      previewCommentSample('test_anchor', 'テストコメントです'),
    ];
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

  function buildPreviewChatSampleQueue() {
    const queue = previewCommentSamples();
    for (const type of PIN_TYPES) {
      if (!shouldPinType(type)) {
        queue.push(previewEventSample(type));
      }
    }
    return queue;
  }

  function refillPreviewPinQueue() {
    if (!usesOverlaySampleLoop() || pinQueue.length > 0) {
      return;
    }
    const samples =
      pinSampleTemplates.length > 0
        ? [...pinSampleTemplates]
        : isPreview && !hasOverlaySamplePlan
          ? previewPinnedSamples()
          : [];
    if (samples.length === 0) {
      return;
    }
    pinQueue.push(...samples);
  }

  function seedPreviewSamples(force = false) {
    if (!usesOverlaySampleLoop()) {
      return;
    }
    if (!force && chat.children.length > 0) {
      return;
    }
    stopChatSampleLoop();
    pendingRows.length = 0;
    resetPinState();
    clearList(chat);

    // テンプレ由来がまだ無いときだけ仮文言。受け取済みならキューを維持して周回
    if (
      isPreview &&
      !hasOverlaySamplePlan &&
      chatSampleQueue.length === 0 &&
      pinSampleTemplates.length === 0
    ) {
      chatSampleQueue = buildPreviewChatSampleQueue();
      pinSampleTemplates = previewPinnedSamples();
    }
    chatSampleIndex = 0;

    if (chatSampleQueue.length > 0) {
      pushNextChatSample();
      scheduleChatSampleAdvance();
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
      streamSampleActive = false;
      resetSampleTemplates();
      pendingRows.length = 0;
      resetPinState();
      clearList(chat);
      seedPreviewSamples();
      return;
    }

    if (message.kind === 'sample-display') {
      streamSampleActive = true;
      applyStreamSampleDisplay(message);
      return;
    }

    if (message.kind === 'pin-control') {
      if (message.action === 'clear') {
        resetPinState();
        if (usesOverlaySampleLoop()) {
          seedPreviewSamples(true);
        }
      }
      return;
    }

    if (
      usesOverlaySampleLoop() &&
      (message.kind === 'event' ||
        message.kind === 'audio' ||
        message.kind === 'audio-control' ||
        message.kind === 'chime')
    ) {
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
      playGiftChime(message.soundUrl, message.volume);
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
    if (
      !data ||
      (data.kind !== 'overlay-look' &&
        data.kind !== 'overlay-replay' &&
        data.kind !== 'preview-samples')
    ) {
      return;
    }
    try {
      if (data.kind === 'overlay-replay') {
        seedPreviewSamples(true);
        return;
      }
      if (data.kind === 'preview-samples') {
        applySampleQueues(data);
        return;
      }
      const nextHide = data.look?.hideUserName === true;
      const hideChanged = nextHide !== hideUserName;
      hideUserName = nextHide;
      if (typeof data.customCss === 'string') {
        applyCustomCss(data.customCss);
      }
      const nameColorChanged = applyNameColorSettings(data);
      const accentChanged = applyTemplateAccentSettings(data);
      if (nameColorChanged) {
        refreshColoredNames();
      }
      if (accentChanged) {
        refreshAccentColors();
      }
      const previewChanged = applyPinSettings(data.pin);
      applyLook(
        data.look,
        hideChanged || previewChanged || nameColorChanged || accentChanged,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`見た目の更新に失敗しました: ${detail}`);
    }
  });

  connect();
  window.setTimeout(() => {
    if (settingsReady) {
      return;
    }
    settingsReady = true;
    if (usesOverlaySampleLoop()) {
      seedPreviewSamples();
      return;
    }
    releaseEarlyRows();
  }, 1500);
})();
