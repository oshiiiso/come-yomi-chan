(() => {
  const listEl = document.getElementById('likes-list');
  const rootEl = document.getElementById('likes-root');
  const isPreview = new URLSearchParams(location.search).has('preview');
  const DEFAULT_NAME_COLORS = window.OverlayNameColors?.DEFAULT_NAME_COLORS || [
    '#5eead4',
    '#93c5fd',
    '#fcd34d',
    '#f9a8d4',
    '#86efac',
  ];
  const DEFAULT_LIKES_LOOK = {
    theme: 'standard',
    fontFamily: 'default',
    fontCss: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif',
    fontSize: 22,
    bgOpacity: 48,
    showAvatar: true,
    avatarSize: 36,
    itemRadius: 14,
    rowGap: 6,
    panelWidth: 420,
    showUnit: true,
    neonHue: 280,
  };
  const DEFAULT_RANKING_MOTION = 'slide';
  const DEFAULT_RANKING_MOTION_MS = 480;

  let nameColorEnabled = true;
  let nameColors = [...DEFAULT_NAME_COLORS];
  let enabled = true;
  let rankingMode = 'likes';
  let likesLook = { ...DEFAULT_LIKES_LOOK };
  let rankingMotion = DEFAULT_RANKING_MOTION;
  let rankingMotionMs = DEFAULT_RANKING_MOTION_MS;
  /** @type {Array<{ uniqueId: string, nickname: string, count: number, avatarUrl: string }>} */
  let entries = [];
  /** @type {Map<string, HTMLLIElement>} */
  const rowByKey = new Map();
  /** @type {Map<string, number>} */
  const countTweenByKey = new Map();
  let motionGen = 0;
  let socket = null;
  let reconnectTimer = 0;

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  function unitLabelForMode(mode) {
    return mode === 'diamonds' ? 'ダイヤ' : 'likes';
  }

  // src/shared/like-ranking.ts の formatLikeCount と同じ
  function formatLikeCount(value) {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) {
      return '0';
    }
    const abs = Math.max(0, Math.trunc(Math.abs(num)));
    return String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

  function entryKey(entry) {
    const id = String(entry?.uniqueId ?? '')
      .replace(/^@/, '')
      .trim();
    if (id) {
      return `id:${id.toLowerCase()}`;
    }
    const name = String(entry?.nickname ?? '').trim();
    return name ? `name:${name.toLowerCase()}` : '';
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

  function normalizeRankingMotion(value) {
    return value === 'soft' || value === 'emphasis' ? value : 'slide';
  }

  function applyRankingMotionSettings(message) {
    let changed = false;
    if (message.rankingMotion !== undefined) {
      const next = normalizeRankingMotion(message.rankingMotion);
      if (next !== rankingMotion) {
        rankingMotion = next;
        changed = true;
      }
    }
    if (message.rankingMotionMs !== undefined) {
      const ms = Number(message.rankingMotionMs);
      const next = Number.isFinite(ms) ? Math.max(120, Math.trunc(ms)) : DEFAULT_RANKING_MOTION_MS;
      if (next !== rankingMotionMs) {
        rankingMotionMs = next;
        changed = true;
      }
    } else if (message.rankingMotionSpeed !== undefined) {
      const speed = Number(message.rankingMotionSpeed);
      const map = { 1: 720, 2: 480, 3: 320 };
      const next = map[speed] || DEFAULT_RANKING_MOTION_MS;
      if (next !== rankingMotionMs) {
        rankingMotionMs = next;
        changed = true;
      }
    }
    if (changed && listEl instanceof HTMLOListElement) {
      listEl.style.setProperty('--ranking-motion-ms', `${rankingMotionMs}ms`);
      listEl.dataset.rankingMotion = rankingMotion;
    }
    return changed;
  }

  function applyLikesLook(raw) {
    if (!raw || typeof raw !== 'object') {
      return false;
    }
    const next = {
      theme: typeof raw.theme === 'string' ? raw.theme : DEFAULT_LIKES_LOOK.theme,
      fontFamily:
        typeof raw.fontFamily === 'string' ? raw.fontFamily : DEFAULT_LIKES_LOOK.fontFamily,
      fontCss:
        typeof raw.fontCss === 'string' && raw.fontCss
          ? raw.fontCss
          : DEFAULT_LIKES_LOOK.fontCss,
      fontSize: Number.isFinite(Number(raw.fontSize))
        ? Math.trunc(Number(raw.fontSize))
        : DEFAULT_LIKES_LOOK.fontSize,
      bgOpacity: Number.isFinite(Number(raw.bgOpacity))
        ? Math.trunc(Number(raw.bgOpacity))
        : DEFAULT_LIKES_LOOK.bgOpacity,
      showAvatar: raw.showAvatar !== false,
      avatarSize: Number.isFinite(Number(raw.avatarSize))
        ? Math.trunc(Number(raw.avatarSize))
        : DEFAULT_LIKES_LOOK.avatarSize,
      itemRadius: Number.isFinite(Number(raw.itemRadius))
        ? Math.trunc(Number(raw.itemRadius))
        : DEFAULT_LIKES_LOOK.itemRadius,
      rowGap: Number.isFinite(Number(raw.rowGap))
        ? Math.trunc(Number(raw.rowGap))
        : DEFAULT_LIKES_LOOK.rowGap,
      panelWidth: Number.isFinite(Number(raw.panelWidth))
        ? Math.trunc(Number(raw.panelWidth))
        : DEFAULT_LIKES_LOOK.panelWidth,
      showUnit: raw.showUnit !== false,
      neonHue: Number.isFinite(Number(raw.neonHue))
        ? Math.trunc(Number(raw.neonHue))
        : DEFAULT_LIKES_LOOK.neonHue,
    };
    const same =
      likesLook.theme === next.theme &&
      likesLook.fontCss === next.fontCss &&
      likesLook.fontSize === next.fontSize &&
      likesLook.bgOpacity === next.bgOpacity &&
      likesLook.showAvatar === next.showAvatar &&
      likesLook.avatarSize === next.avatarSize &&
      likesLook.itemRadius === next.itemRadius &&
      likesLook.rowGap === next.rowGap &&
      likesLook.panelWidth === next.panelWidth &&
      likesLook.showUnit === next.showUnit &&
      likesLook.neonHue === next.neonHue;
    likesLook = next;
    paintLook();
    return !same;
  }

  function paintLook() {
    if (!(listEl instanceof HTMLOListElement)) {
      return;
    }
    const theme = ['standard', 'luxury', 'compact', 'neon', 'minimal'].includes(likesLook.theme)
      ? likesLook.theme
      : 'standard';
    listEl.className = `likes-list likes-list--${theme}`;
    listEl.classList.toggle('likes-list--hide-avatar', !likesLook.showAvatar);
    listEl.classList.toggle('likes-list--hide-unit', !likesLook.showUnit);
    listEl.style.setProperty('--likes-font', likesLook.fontCss || DEFAULT_LIKES_LOOK.fontCss);
    listEl.style.setProperty('--likes-font-size', `${likesLook.fontSize}px`);
    listEl.style.setProperty('--likes-bg-alpha', `${likesLook.bgOpacity}%`);
    listEl.style.setProperty('--likes-avatar-size', `${likesLook.avatarSize}px`);
    listEl.style.setProperty('--likes-item-radius', `${likesLook.itemRadius}px`);
    listEl.style.setProperty('--likes-row-gap', `${likesLook.rowGap}px`);
    listEl.style.setProperty('--likes-panel-width', `${likesLook.panelWidth}px`);
    listEl.style.setProperty('--likes-neon-hue', String(likesLook.neonHue));
    listEl.style.setProperty('--ranking-motion-ms', `${rankingMotionMs}ms`);
    listEl.dataset.rankingMotion = rankingMotion;
    if (rootEl instanceof HTMLElement) {
      rootEl.dataset.theme = theme;
    }
  }

  function rankClass(index) {
    if (index === 0) {
      return 'likes-row likes-row--1';
    }
    if (index === 1) {
      return 'likes-row likes-row--2';
    }
    if (index === 2) {
      return 'likes-row likes-row--3';
    }
    return 'likes-row likes-row--rest';
  }

  function cancelCountTweens() {
    for (const id of countTweenByKey.values()) {
      window.cancelAnimationFrame(id);
    }
    countTweenByKey.clear();
  }

  function clearRowMotionStyles(row) {
    if (!(row instanceof HTMLElement)) {
      return;
    }
    row.style.transition = 'none';
    row.style.transform = '';
    row.style.opacity = '';
    row.style.position = '';
    row.style.left = '';
    row.style.top = '';
    row.style.width = '';
    row.style.margin = '';
    row.style.zIndex = '';
    row.classList.remove(
      'likes-row--enter',
      'likes-row--leave',
      'likes-row--soft',
      'likes-row--flash',
      'likes-row--flip',
    );
    // インライン transition:none を残すと次の FLIP が動かない
    void row.offsetWidth;
    row.style.removeProperty('transition');
  }

  function removeLeavingRows() {
    if (!(listEl instanceof HTMLOListElement)) {
      return;
    }
    for (const child of [...listEl.children]) {
      if (child instanceof HTMLElement && child.classList.contains('likes-row--leave')) {
        child.remove();
      }
    }
  }

  function finishInFlightMotion() {
    motionGen += 1;
    cancelCountTweens();
    // 退場中の行は rowByKey 外。世代が進んだら必ず落とす
    removeLeavingRows();
    for (const row of rowByKey.values()) {
      clearRowMotionStyles(row);
    }
  }

  function avatarSrcMatches(img, url) {
    if (!(img instanceof HTMLImageElement) || !url) {
      return false;
    }
    const attr = img.getAttribute('src') || '';
    if (attr === url) {
      return true;
    }
    try {
      return new URL(attr, location.href).href === new URL(url, location.href).href;
    } catch {
      return false;
    }
  }

  function setAvatar(row, entry) {
    const existing = row.querySelector('.likes-avatar');
    if (!likesLook.showAvatar) {
      if (existing) {
        existing.remove();
      }
      return;
    }
    if (entry.avatarUrl) {
      let avatar = existing instanceof HTMLImageElement ? existing : null;
      if (!avatar) {
        if (existing) {
          existing.remove();
        }
        avatar = document.createElement('img');
        avatar.className = 'likes-avatar';
        avatar.alt = '';
        avatar.decoding = 'async';
        avatar.loading = 'lazy';
        avatar.addEventListener('error', () => {
          const ph = document.createElement('span');
          ph.className = 'likes-avatar likes-avatar--empty';
          avatar.replaceWith(ph);
        });
        const rank = row.querySelector('.likes-rank');
        if (rank) {
          rank.after(avatar);
        } else {
          row.prepend(avatar);
        }
      }
      if (!avatarSrcMatches(avatar, entry.avatarUrl)) {
        avatar.src = entry.avatarUrl;
      }
      return;
    }
    if (existing && existing.classList.contains('likes-avatar--empty')) {
      return;
    }
    if (existing) {
      existing.remove();
    }
    const ph = document.createElement('span');
    ph.className = 'likes-avatar likes-avatar--empty';
    const rank = row.querySelector('.likes-rank');
    if (rank) {
      rank.after(ph);
    } else {
      row.prepend(ph);
    }
  }

  function createRow(entry, index) {
    const row = document.createElement('li');
    row.className = rankClass(index);
    row.dataset.key = entryKey(entry);
    row.dataset.rank = String(index);
    row.dataset.count = String(entry.count);

    const rank = document.createElement('span');
    rank.className = 'likes-rank';
    rank.textContent = String(index + 1);
    rank.setAttribute('aria-label', `${index + 1}位`);
    row.append(rank);

    setAvatar(row, entry);

    const name = document.createElement('span');
    name.className = 'likes-name';
    name.textContent = entry.nickname || entry.uniqueId || '—';
    if (nameColorEnabled) {
      paintNameColor(name, nameColorForUser(entry.uniqueId, entry.nickname));
    }

    const countWrap = document.createElement('span');
    countWrap.className = 'likes-count-wrap';
    const count = document.createElement('span');
    count.className = 'likes-count';
    count.textContent = formatLikeCount(entry.count);
    countWrap.append(count);
    if (likesLook.showUnit) {
      const unit = document.createElement('span');
      unit.className = 'likes-unit';
      unit.textContent = unitLabelForMode(rankingMode);
      countWrap.append(unit);
    }

    const main = document.createElement('div');
    main.className = 'likes-main';
    main.append(name, countWrap);
    row.append(main);
    return row;
  }

  function updateRowContent(row, entry, index, options) {
    const animate = options?.animate !== false;
    const emphasize = options?.emphasize === true;
    const prevRank = Number(row.dataset.rank);
    const prevCount = Number(row.dataset.count);
    row.className = rankClass(index);
    row.dataset.rank = String(index);
    row.dataset.count = String(entry.count);

    const rank = row.querySelector('.likes-rank');
    if (rank instanceof HTMLElement) {
      rank.textContent = String(index + 1);
      rank.setAttribute('aria-label', `${index + 1}位`);
    }

    setAvatar(row, entry);

    const name = row.querySelector('.likes-name');
    if (name instanceof HTMLElement) {
      name.textContent = entry.nickname || entry.uniqueId || '—';
      if (nameColorEnabled) {
        paintNameColor(name, nameColorForUser(entry.uniqueId, entry.nickname));
      } else {
        paintNameColor(name, '');
      }
    }

    let count = row.querySelector('.likes-count');
    if (!(count instanceof HTMLElement)) {
      const wrap = row.querySelector('.likes-count-wrap') || document.createElement('span');
      wrap.className = 'likes-count-wrap';
      count = document.createElement('span');
      count.className = 'likes-count';
      wrap.replaceChildren(count);
    if (!wrap.parentElement) {
      const main = row.querySelector('.likes-main');
      if (main instanceof HTMLElement) {
        main.append(wrap);
      } else {
        row.append(wrap);
      }
    }
    }

    let unit = row.querySelector('.likes-unit');
    if (likesLook.showUnit) {
      if (!(unit instanceof HTMLElement)) {
        unit = document.createElement('span');
        unit.className = 'likes-unit';
        count.parentElement?.append(unit);
      }
      unit.textContent = unitLabelForMode(rankingMode);
    } else if (unit) {
      unit.remove();
    }

    if (
      emphasize &&
      animate &&
      Number.isFinite(prevRank) &&
      index < prevRank &&
      rankingMotion === 'emphasis'
    ) {
      row.classList.remove('likes-row--flash');
      // reflow でアニメ再発火
      void row.offsetWidth;
      row.classList.add('likes-row--flash');
      window.setTimeout(() => {
        row.classList.remove('likes-row--flash');
      }, rankingMotionMs);
    }

    if (
      emphasize &&
      animate &&
      rankingMotion === 'emphasis' &&
      Number.isFinite(prevCount) &&
      prevCount !== entry.count
    ) {
      tweenCount(row.dataset.key || '', count, prevCount, entry.count);
    } else {
      count.textContent = formatLikeCount(entry.count);
    }
  }

  function tweenCount(key, el, from, to) {
    if (!(el instanceof HTMLElement) || !key) {
      return;
    }
    const prev = countTweenByKey.get(key);
    if (prev) {
      window.cancelAnimationFrame(prev);
    }
    const start = performance.now();
    const duration = Math.max(120, rankingMotionMs);
    const gen = motionGen;
    const step = (now) => {
      if (gen !== motionGen) {
        return;
      }
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      const value = Math.round(from + (to - from) * eased);
      el.textContent = formatLikeCount(value);
      if (t < 1) {
        countTweenByKey.set(key, window.requestAnimationFrame(step));
      } else {
        countTweenByKey.delete(key);
        el.textContent = formatLikeCount(to);
      }
    };
    countTweenByKey.set(key, window.requestAnimationFrame(step));
  }

  function captureTops() {
    /** @type {Map<string, number>} */
    const map = new Map();
    for (const [key, row] of rowByKey) {
      map.set(key, row.getBoundingClientRect().top);
    }
    return map;
  }

  function reconcileRows(nextEntries, options) {
    if (!(listEl instanceof HTMLOListElement)) {
      return;
    }
    paintLook();
    const animate = options?.animate !== false && !prefersReducedMotion();
    finishInFlightMotion();
    const gen = motionGen;

    if (!enabled || nextEntries.length === 0) {
      for (const row of [...rowByKey.values()]) {
        row.remove();
      }
      rowByKey.clear();
      listEl.hidden = true;
      return;
    }
    listEl.hidden = false;

    const firstTops = animate ? captureTops() : new Map();
    const nextKeys = new Set();
    const leaving = [];

    for (const [key, row] of rowByKey) {
      const still = nextEntries.some((entry) => entryKey(entry) === key);
      if (!still) {
        leaving.push({ key, row });
      }
    }

    // 位置はまとめて測ってから absolute 化（1件ずつ外すと後続の offset がずれる）
    const leavePins = leaving.map(({ key, row }) => ({
      key,
      row,
      top: row.offsetTop,
      left: row.offsetLeft,
      width: row.offsetWidth,
    }));
    for (const { key, row, top, left, width } of leavePins) {
      rowByKey.delete(key);
      if (!animate) {
        row.remove();
        continue;
      }
      // フローから外して FLIP の First/Last をずらさない
      row.style.position = 'absolute';
      row.style.top = `${top}px`;
      row.style.left = `${left}px`;
      row.style.width = `${width}px`;
      row.style.margin = '0';
      row.style.zIndex = '0';
      void row.offsetWidth;
      row.classList.add('likes-row--leave');
      const onEnd = () => {
        // 世代が変わっていても必ず外す（残ると幽霊行になる）
        row.remove();
      };
      row.addEventListener('transitionend', onEnd, { once: true });
      window.setTimeout(onEnd, rankingMotionMs + 80);
    }

    const fragment = document.createDocumentFragment();
    const entering = [];
    const softChanged = [];
    nextEntries.forEach((entry, index) => {
      const key = entryKey(entry);
      if (!key) {
        return;
      }
      nextKeys.add(key);
      let row = rowByKey.get(key);
      if (!row) {
        row = createRow(entry, index);
        rowByKey.set(key, row);
        entering.push(row);
      } else {
        const prevRank = Number(row.dataset.rank);
        const prevCount = Number(row.dataset.count);
        const changed =
          prevRank !== index || (Number.isFinite(prevCount) && prevCount !== entry.count);
        updateRowContent(row, entry, index, {
          animate,
          emphasize: rankingMotion === 'emphasis',
        });
        if (changed) {
          softChanged.push(row);
        }
      }
      fragment.append(row);
    });
    listEl.append(fragment);

    if (!animate) {
      for (const row of entering) {
        row.classList.remove('likes-row--enter', 'likes-row--soft');
      }
      return;
    }

    if (rankingMotion === 'soft') {
      for (const row of entering) {
        row.classList.add('likes-row--enter', 'likes-row--soft');
        window.setTimeout(() => {
          if (gen === motionGen) {
            row.classList.remove('likes-row--enter', 'likes-row--soft');
          }
        }, rankingMotionMs + 40);
      }
      for (const row of softChanged) {
        row.classList.add('likes-row--soft');
        window.setTimeout(() => {
          if (gen === motionGen) {
            row.classList.remove('likes-row--soft');
          }
        }, rankingMotionMs + 40);
      }
      return;
    }

    // slide / emphasis: FLIP
    const lastTops = captureTops();
    for (const [key, row] of rowByKey) {
      if (!nextKeys.has(key)) {
        continue;
      }
      const first = firstTops.get(key);
      const last = lastTops.get(key);
      if (first === undefined || last === undefined) {
        if (entering.includes(row)) {
          row.classList.add('likes-row--enter');
          window.setTimeout(() => {
            if (gen === motionGen) {
              row.classList.remove('likes-row--enter');
            }
          }, rankingMotionMs + 40);
        }
        continue;
      }
      const dy = first - last;
      if (Math.abs(dy) < 0.5) {
        continue;
      }
      row.classList.add('likes-row--flip');
      row.style.transform = `translateY(${dy}px)`;
      row.style.transition = 'none';
      void row.offsetWidth;
      row.style.transition = '';
      row.style.transform = '';
      const clearFlip = () => {
        if (gen === motionGen) {
          row.classList.remove('likes-row--flip');
        }
      };
      row.addEventListener('transitionend', clearFlip, { once: true });
      window.setTimeout(clearFlip, rankingMotionMs + 80);
    }
    for (const row of entering) {
      row.classList.add('likes-row--enter');
      window.setTimeout(() => {
        if (gen === motionGen) {
          row.classList.remove('likes-row--enter');
        }
      }, rankingMotionMs + 40);
    }
  }

  function renderImmediate() {
    reconcileRows(entries, { animate: false });
  }

  function applyRanking(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }
    enabled = payload.enabled !== false;
    rankingMode = payload.mode === 'diamonds' ? 'diamonds' : 'likes';
    const raw = Array.isArray(payload.entries) ? payload.entries : [];
    entries = raw
      .map((item) => {
        const fromCount =
          typeof item?.count === 'number' && Number.isFinite(item.count)
            ? Math.max(0, Math.trunc(item.count))
            : null;
        const fromLegacy =
          typeof item?.likeCount === 'number' && Number.isFinite(item.likeCount)
            ? Math.max(0, Math.trunc(item.likeCount))
            : 0;
        return {
          uniqueId: typeof item?.uniqueId === 'string' ? item.uniqueId : '',
          nickname: typeof item?.nickname === 'string' ? item.nickname : '',
          count: fromCount ?? fromLegacy,
          avatarUrl: typeof item?.avatarUrl === 'string' ? item.avatarUrl.trim() : '',
        };
      })
      .filter((item) => item.count > 0 && (item.uniqueId || item.nickname));
    reconcileRows(entries, { animate: true });
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
      let lookChanged = applyNameColorSettings(message);
      if (message.likesLook && applyLikesLook(message.likesLook)) {
        lookChanged = true;
      }
      applyRankingMotionSettings(message);
      // 見た目・動き設定だけ。順位データは動かさない
      if (lookChanged) {
        paintLook();
        for (const [index, entry] of entries.entries()) {
          const key = entryKey(entry);
          const row = rowByKey.get(key);
          if (row) {
            updateRowContent(row, entry, index, { animate: false, emphasize: false });
          }
        }
      } else {
        paintLook();
      }
      return;
    }
    if ((message.kind === 'ranking' || message.kind === 'like-ranking') && message.payload) {
      if (isPreview) {
        return;
      }
      applyRanking(message.payload);
    }
  }

  const previewRankingRows = [
    { id: 's1', nickname: 'テストユーザー', likes: 12500, diamonds: 8800 },
    { id: 's2', nickname: 'あ', likes: 3800, diamonds: 4200 },
    { id: 's3', nickname: 'すごく長いニックネームのテストユーザーさん一二三四五', likes: 1450, diamonds: 2150 },
    { id: 's4', nickname: '🐱✨', likes: 890, diamonds: 980 },
    { id: 's5', nickname: 'みかん', likes: 420, diamonds: 560 },
    { id: 's6', nickname: 'たろう', likes: 220, diamonds: 310 },
    { id: 's7', nickname: 'はなこ', likes: 95, diamonds: 140 },
    { id: 's8', nickname: '🌟', likes: 60, diamonds: 75 },
    { id: 's9', nickname: 'ゆうき', likes: 35, diamonds: 40 },
    { id: 's10', nickname: 'りん', likes: 12, diamonds: 18 },
  ];
  let previewMax = 5;
  let previewMode = 'likes';
  let previewPhase = 0;
  let previewTimer = 0;

  function previewIntervalMs() {
    return Math.max(720, rankingMotionMs + 280);
  }

  function buildPreviewRanking() {
    const max = Math.min(previewRankingRows.length, Math.max(1, previewMax));
    const base = previewRankingRows.slice(0, max);
    const countOf = (row) => (previewMode === 'diamonds' ? row.diamonds : row.likes);
    const phase = previewPhase % Math.max(1, base.length);
    previewPhase += 1;
    const counts = base.map(countOf);
    const rotated = counts.slice(phase).concat(counts.slice(0, phase));
    const entries = base
      .map((row, index) => ({
        uniqueId: `ranking_sample_${row.id}`,
        nickname: row.nickname,
        count: rotated[index] ?? 0,
        avatarUrl: '/overlay/preview-avatar.svg',
      }))
      .sort((left, right) => right.count - left.count || left.uniqueId.localeCompare(right.uniqueId));
    return { enabled: true, max, mode: previewMode, entries };
  }

  function repaintRankingRows() {
    for (const [index, entry] of entries.entries()) {
      const row = rowByKey.get(entryKey(entry));
      if (row) {
        updateRowContent(row, entry, index, { animate: false, emphasize: false });
      }
    }
  }

  function startPreviewRanking(immediate) {
    if (!isPreview) {
      return;
    }
    if (previewTimer) {
      window.clearTimeout(previewTimer);
      previewTimer = 0;
    }
    const tick = () => {
      try {
        applyRanking(buildPreviewRanking());
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.warn(`ランキングプレビューの更新に失敗しました: ${detail}`);
      }
      previewTimer = window.setTimeout(tick, previewIntervalMs());
    };
    if (immediate) {
      tick();
      return;
    }
    previewTimer = window.setTimeout(tick, previewIntervalMs());
  }

  function applyPreviewLook(message) {
    if (typeof message.backdrop === 'string' && message.backdrop) {
      document.documentElement.dataset.backdrop = message.backdrop;
    }
    applyNameColorSettings(message);
    if (message.look) {
      applyLikesLook(message.look);
    }
    applyRankingMotionSettings(message);
    paintLook();
    const nextMax = Number(message.max);
    const nextMode = message.mode === 'diamonds' ? 'diamonds' : 'likes';
    const maxChanged = Number.isFinite(nextMax) && Math.trunc(nextMax) !== previewMax;
    const modeChanged = nextMode !== previewMode;
    if (Number.isFinite(nextMax)) {
      previewMax = Math.min(10, Math.max(1, Math.trunc(nextMax)));
    }
    previewMode = nextMode;
    if (!previewTimer || maxChanged || modeChanged) {
      startPreviewRanking(true);
      return;
    }
    repaintRankingRows();
  }

  window.addEventListener('message', (event) => {
    if (!isPreview) {
      return;
    }
    const message = event.data;
    if (!message || typeof message !== 'object' || message.kind !== 'ranking-look') {
      return;
    }
    try {
      applyPreviewLook(message);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`ランキングプレビューの見た目反映に失敗しました: ${detail}`);
    }
  });

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const preview = isPreview ? '&preview=1' : '';
    socket = new WebSocket(`${proto}://${location.host}/overlay/ws?role=ranking${preview}`);
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

  renderImmediate();
  connect();
  if (isPreview) {
    startPreviewRanking(true);
  }
})();
