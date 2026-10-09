(() => {
  // src/shared/event-alert.ts の EVENT_ALERT_QUEUE_MAX と揃える
  const QUEUE_MAX = 40;
  const DEFAULT_DISPLAY_MS = 4000;
  const MIN_DISPLAY_MS = 1000;
  const MAX_DISPLAY_MS = 120_000;

  const stage = document.getElementById('alert-stage');
  const mediaWrap = document.getElementById('alert-media-wrap');
  const media = document.getElementById('alert-media');
  const textEl = document.getElementById('alert-text');
  const isPreview = new URLSearchParams(location.search).has('preview');
  const isEmbed = new URLSearchParams(location.search).get('embed') === '1';
  if (isEmbed) {
    document.documentElement.dataset.embed = '1';
  }
  const DEFAULT_NAME_COLORS = window.OverlayNameColors?.DEFAULT_NAME_COLORS || [
    '#5eead4',
    '#93c5fd',
    '#fcd34d',
    '#f9a8d4',
    '#86efac',
  ];

  let displayMs = DEFAULT_DISPLAY_MS;
  let nameColorEnabled = true;
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
  /** @type {Array<{ type: string, displayText: string, displayParts: Array<{ kind: string, value: string, color?: string }>, imageUrl: string|null, displayMs: number, user: { nickname?: string, uniqueId?: string }|null, nameColor: string|null }>} */
  const queue = [];
  let busy = false;
  let holdTimer = 0;
  /** @type {(() => void) | null} */
  let holdResolve = null;
  let showGeneration = 0;
  let socket = null;
  let reconnectTimer = 0;

  function clampDisplayMs(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return DEFAULT_DISPLAY_MS;
    }
    return Math.min(MAX_DISPLAY_MS, Math.max(MIN_DISPLAY_MS, Math.trunc(n)));
  }

  function isCurrentGeneration(generation) {
    return generation === showGeneration;
  }

  function clearHoldTimer() {
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = 0;
    }
    if (holdResolve) {
      const resolve = holdResolve;
      holdResolve = null;
      resolve();
    }
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

  function normalizeNameColors(raw) {
    if (window.OverlayNameColors?.normalizeNameColors) {
      return window.OverlayNameColors.normalizeNameColors(raw);
    }
    const list = Array.isArray(raw) ? raw : [];
    return DEFAULT_NAME_COLORS.map((def, index) => {
      const candidate = list[index];
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

  function nameColorForUser(uniqueId, nickname) {
    if (window.OverlayNameColors?.nameColorForUser) {
      return window.OverlayNameColors.nameColorForUser(uniqueId, nickname, nameColors);
    }
    const colors =
      nameColors.length === DEFAULT_NAME_COLORS.length ? nameColors : [...DEFAULT_NAME_COLORS];
    return colors[nameColorIndexLocal(uniqueId, nickname)];
  }

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

  function refreshAccentColors() {
    if (!(textEl instanceof HTMLElement)) {
      return;
    }
    for (const accentEl of textEl.querySelectorAll('.alert-accent[data-accent-token]')) {
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

  function paintNameColor(el, color) {
    if (!(el instanceof HTMLElement)) {
      return;
    }
    if (!color) {
      el.style.removeProperty('color');
      el.style.removeProperty('-webkit-text-fill-color');
      return;
    }
    el.style.setProperty('color', color, 'important');
    el.style.setProperty('-webkit-text-fill-color', color, 'important');
  }

  function refreshColoredNames() {
    if (!(textEl instanceof HTMLElement)) {
      return;
    }
    for (const nameEl of textEl.querySelectorAll('.alert-name')) {
      if (!(nameEl instanceof HTMLElement)) {
        continue;
      }
      if (!nameColorEnabled) {
        paintNameColor(nameEl, '');
        continue;
      }
      const uniqueId = nameEl.dataset.uniqueId || '';
      const nickname = nameEl.dataset.nickname || nameEl.textContent || '';
      paintNameColor(nameEl, nameColorForUser(uniqueId, nickname));
    }
  }

  function resolveAlertNameColor(user, nameColor) {
    if (typeof nameColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(nameColor)) {
      return nameColor.toLowerCase();
    }
    if (!nameColorEnabled) {
      return '';
    }
    const nickname = String(user?.nickname ?? '').trim();
    if (!nickname) {
      return '';
    }
    return nameColorForUser(user?.uniqueId, nickname);
  }

  function normalizeDisplayParts(rawParts, displayText, user, nameColor) {
    if (Array.isArray(rawParts) && rawParts.length > 0) {
      return rawParts
        .map((part) => {
          if (!part || typeof part !== 'object') {
            return null;
          }
          const value = typeof part.value === 'string' ? part.value : '';
          if (!value) {
            return null;
          }
          if (part.kind === 'name') {
            const color =
              typeof part.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(part.color)
                ? part.color.toLowerCase()
                : '';
            return { kind: 'name', value, color };
          }
          if (part.kind === 'accent') {
            const color =
              typeof part.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(part.color)
                ? part.color.toLowerCase()
                : '';
            const token = typeof part.token === 'string' ? part.token : '';
            return {
              kind: 'accent',
              value,
              color,
              ...(token ? { token } : {}),
            };
          }
          return { kind: 'text', value };
        })
        .filter(Boolean);
    }
    const nickname = String(user?.nickname ?? '').trim();
    const color = resolveAlertNameColor(user, nameColor);
    if (color && nickname && displayText.includes(nickname)) {
      const idx = displayText.indexOf(nickname);
      const parts = [];
      if (idx > 0) {
        parts.push({ kind: 'text', value: displayText.slice(0, idx) });
      }
      parts.push({ kind: 'name', value: nickname, color });
      const after = displayText.slice(idx + nickname.length);
      if (after) {
        parts.push({ kind: 'text', value: after });
      }
      return parts;
    }
    return displayText ? [{ kind: 'text', value: displayText }] : [];
  }

  function fillAlertText(item) {
    if (!(textEl instanceof HTMLElement)) {
      return;
    }
    textEl.replaceChildren();
    const parts = Array.isArray(item.displayParts) ? item.displayParts : [];
    const uniqueId = item.user?.uniqueId;
    if (parts.length === 0) {
      textEl.textContent = item.displayText || '';
      return;
    }
    for (const part of parts) {
      if (part.kind === 'name') {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'alert-name';
        nameSpan.dataset.uniqueId = String(uniqueId || '');
        nameSpan.dataset.nickname = part.value;
        paintNameColor(
          nameSpan,
          nameColorEnabled ? nameColorForUser(uniqueId, part.value) : '',
        );
        nameSpan.textContent = part.value;
        textEl.appendChild(nameSpan);
        continue;
      }
      if (part.kind === 'accent') {
        const accentSpan = document.createElement('span');
        accentSpan.className = 'alert-accent';
        if (typeof part.token === 'string' && part.token) {
          accentSpan.dataset.accentToken = part.token;
        }
        const resolved =
          typeof part.token === 'string' && templateAccentColors[part.token]
            ? templateAccentColors[part.token]
            : part.color;
        accentSpan.style.color = resolved || '';
        accentSpan.textContent = part.value;
        textEl.appendChild(accentSpan);
        continue;
      }
      textEl.appendChild(document.createTextNode(part.value));
    }
  }

  function pushAlert(raw) {
    if (!raw || typeof raw !== 'object') {
      return;
    }
    const displayText = typeof raw.displayText === 'string' ? raw.displayText.trim() : '';
    const imageUrl = typeof raw.imageUrl === 'string' && raw.imageUrl ? raw.imageUrl : null;
    // 画像未設定は文言だけでも出さない（設定の「なし」と同じ）
    if (!imageUrl) {
      return;
    }
    const user =
      raw.user && typeof raw.user === 'object' && !Array.isArray(raw.user) ? raw.user : null;
    const nameColor =
      typeof raw.nameColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.nameColor)
        ? raw.nameColor.toLowerCase()
        : null;
    const displayParts = normalizeDisplayParts(raw.displayParts, displayText, user, nameColor);
    queue.push({
      type: typeof raw.type === 'string' ? raw.type : '',
      displayText,
      displayParts,
      imageUrl,
      displayMs: clampDisplayMs(raw.displayMs ?? displayMs),
      user,
      nameColor,
    });
    while (queue.length > QUEUE_MAX) {
      queue.shift();
    }
    void pump();
  }

  function clearMedia() {
    if (mediaWrap) {
      mediaWrap.hidden = true;
    }
    if (media) {
      media.hidden = true;
      media.removeAttribute('src');
    }
  }

  async function applyMedia(imageUrl, generation) {
    clearMedia();
    if (!imageUrl || !mediaWrap || !media) {
      return;
    }
    if (!isCurrentGeneration(generation)) {
      return;
    }
    // 同梱 GIF / ユーザー画像はどちらも <img>。バイナリを HTML に流し込まない
    media.hidden = false;
    media.src = imageUrl;
    mediaWrap.hidden = false;
  }

  function hideStage() {
    stage.hidden = true;
    stage.classList.remove('is-enter', 'is-leave');
    clearMedia();
    if (textEl) {
      textEl.replaceChildren();
    }
  }

  function waitAnimation(el, className) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) {
          return;
        }
        done = true;
        el.removeEventListener('animationend', onEnd);
        window.clearTimeout(fallback);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target === el) {
          finish();
        }
      };
      el.addEventListener('animationend', onEnd);
      el.classList.add(className);
      const fallback = window.setTimeout(finish, 800);
    });
  }

  function wait(ms) {
    return new Promise((resolve) => {
      holdResolve = resolve;
      holdTimer = window.setTimeout(() => {
        holdTimer = 0;
        holdResolve = null;
        resolve();
      }, ms);
    });
  }

  async function showOne(item, generation) {
    clearHoldTimer();
    if (!isCurrentGeneration(generation)) {
      return;
    }
    stage.classList.remove('is-enter', 'is-leave');
    fillAlertText(item);
    await applyMedia(item.imageUrl, generation);
    if (!isCurrentGeneration(generation)) {
      return;
    }
    stage.hidden = false;
    await waitAnimation(stage, 'is-enter');
    if (!isCurrentGeneration(generation)) {
      return;
    }
    stage.classList.remove('is-enter');
    await wait(item.displayMs);
    if (!isCurrentGeneration(generation)) {
      return;
    }
    await waitAnimation(stage, 'is-leave');
    if (!isCurrentGeneration(generation)) {
      return;
    }
    hideStage();
  }

  async function pump() {
    if (busy) {
      return;
    }
    busy = true;
    const generation = showGeneration;
    try {
      while (queue.length > 0) {
        if (!isCurrentGeneration(generation)) {
          break;
        }
        const next = queue.shift();
        if (!next) {
          continue;
        }
        await showOne(next, generation);
      }
    }     finally {
      if (sampleLoopActive() && isCurrentGeneration(generation) && queue.length === 0) {
        enqueueNextLoopedSample();
      }
      busy = false;
      if (queue.length > 0) {
        void pump();
      }
    }
  }

  function clearAll() {
    showGeneration += 1;
    queue.length = 0;
    clearHoldTimer();
    hideStage();
    // busy は触らない。進行中の pump が世代不一致で抜け、finally で下ろす。
    // ここで false にすると、古い finally が新しい pump の busy を潰して二重表示になる。
  }

  function applyHello(message) {
    if (typeof message.eventAlertDisplayMs === 'number') {
      displayMs = clampDisplayMs(message.eventAlertDisplayMs);
    }
    if (applyNameColorSettings(message)) {
      refreshColoredNames();
    }
    if (applyTemplateAccentSettings(message)) {
      refreshAccentColors();
    }
  }

  function handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') {
      return;
    }
    if (message.kind === 'hello') {
      if (isEmbed) {
        if (typeof message.eventAlertDisplayMs === 'number') {
          displayMs = clampDisplayMs(message.eventAlertDisplayMs);
        }
        return;
      }
      applyHello(message);
      return;
    }
    if (message.kind === 'clear') {
      // 配信ソースの周回だけ止める。プレビューの繰り返しは残す
      if (!isPreview) {
        streamSampleActive = false;
        loopSamples = [];
      }
      clearAll();
      if (isPreview) {
        enqueueNextLoopedSample();
        void pump();
      }
      return;
    }
    if (message.kind === 'sample-display') {
      if (isPreview) {
        return;
      }
      applyStreamSamples(message);
      return;
    }
    if (message.kind === 'alert' && message.payload) {
      if (isPreview || streamSampleActive) {
        return;
      }
      pushAlert(message.payload);
    }
  }

  const FALLBACK_ALERT_SAMPLES = [
    {
      type: 'gift',
      displayText: 'テストユーザーさんがバラを贈りました',
      displayParts: [],
      imageUrl: '/overlay/alert-templates/gift.gif',
      displayMs: DEFAULT_DISPLAY_MS,
      user: { nickname: 'テストユーザー', uniqueId: 'preview_gift' },
      nameColor: null,
    },
    {
      type: 'follow',
      displayText: 'あさんがフォローしました',
      displayParts: [],
      imageUrl: '/overlay/alert-templates/follow.gif',
      displayMs: DEFAULT_DISPLAY_MS,
      user: { nickname: 'あ', uniqueId: 'preview_follow' },
      nameColor: null,
    },
  ];
  let streamSampleActive = false;
  let loopSamples = isPreview ? FALLBACK_ALERT_SAMPLES.map((sample) => ({ ...sample })) : [];
  let loopIndex = 0;

  function sampleLoopActive() {
    return isPreview || streamSampleActive;
  }

  function usableAlertSamples(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter(
      (sample) =>
        sample &&
        typeof sample === 'object' &&
        typeof sample.imageUrl === 'string' &&
        sample.imageUrl &&
        typeof sample.displayText === 'string' &&
        sample.displayText.trim(),
    );
  }

  function previewSampleKey(list) {
    return JSON.stringify(
      list.map((sample) => [
        sample.type,
        sample.displayText,
        sample.imageUrl,
        sample.displayMs,
        sample.displayParts,
      ]),
    );
  }

  function enqueueNextLoopedSample() {
    if (!sampleLoopActive() || loopSamples.length === 0) {
      return;
    }
    const sample = loopSamples[loopIndex % loopSamples.length];
    loopIndex += 1;
    pushAlert(sample);
  }

  function restartSampleLoop(samples) {
    loopSamples = samples;
    loopIndex = 0;
    clearAll();
    enqueueNextLoopedSample();
    void pump();
  }

  function applyStreamSamples(message) {
    if (!isEmbed) {
      applyHello(message);
    }
    const next = usableAlertSamples(message.alertSamples);
    if (next.length === 0) {
      streamSampleActive = false;
      loopSamples = [];
      clearAll();
      return;
    }
    streamSampleActive = true;
    restartSampleLoop(next);
  }

  function applyAlertPreview(message) {
    if (typeof message.backdrop === 'string' && message.backdrop) {
      document.documentElement.dataset.backdrop = message.backdrop;
    }
    const nameChanged = applyNameColorSettings(message);
    const accentChanged = applyTemplateAccentSettings(message);
    if (nameChanged) {
      refreshColoredNames();
    }
    if (accentChanged) {
      refreshAccentColors();
    }
    if (!Array.isArray(message.samples)) {
      return;
    }
    const next = usableAlertSamples(message.samples);
    if (next.length === 0 || previewSampleKey(next) === previewSampleKey(loopSamples)) {
      return;
    }
    restartSampleLoop(next);
  }

  window.addEventListener('message', (event) => {
    if (!isPreview && !isEmbed) {
      return;
    }
    const message = event.data;
    if (!message || typeof message !== 'object' || message.kind !== 'alert-preview') {
      return;
    }
    try {
      applyAlertPreview(message);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`アラートプレビューの更新に失敗しました: ${detail}`);
    }
  });

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const preview = isPreview ? '&preview=1' : '';
    socket = new WebSocket(`${proto}://${location.host}/overlay/ws?role=alerts${preview}`);
    socket.addEventListener('message', (event) => {
      handleMessage(String(event.data ?? ''));
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

  hideStage();
  connect();
  if (isPreview) {
    enqueueNextLoopedSample();
    void pump();
  }
})();
