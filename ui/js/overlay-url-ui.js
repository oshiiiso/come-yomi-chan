/** 接続タブの配信ソースURL（種類切替＋コピー） */

/** @type {'chat'|'alerts'|'ranking'} */
let overlayUrlKind = 'chat';
/** @type {'live'|'obs'|'studio'} */
let overlayUrlVariant = 'live';

/** @type {{ chat: { live: string, obs: string, studio: string }, alerts: { live: string, obs: string, studio: string }, ranking: { live: string, obs: string, studio: string } }} */
let overlayUrlBundle = {
  chat: { live: '', obs: '', studio: '' },
  alerts: { live: '', obs: '', studio: '' },
  ranking: { live: '', obs: '', studio: '' },
};

function overlayUrlFor(kind, variant) {
  const safeKind = typeof isOverlayUrlKind === 'function' && isOverlayUrlKind(kind) ? kind : 'chat';
  const safeVariant =
    typeof isOverlayUrlVariant === 'function' && isOverlayUrlVariant(variant) ? variant : 'live';
  const value = overlayUrlBundle[safeKind]?.[safeVariant];
  return typeof value === 'string' ? value : '';
}

function selectedOverlayUrlKind() {
  const select = $('overlay-url-kind');
  const value = select instanceof HTMLSelectElement ? select.value : overlayUrlKind;
  return typeof isOverlayUrlKind === 'function' && isOverlayUrlKind(value) ? value : 'chat';
}

function setOverlayUrlKind(kind) {
  if (typeof isOverlayUrlKind !== 'function' || !isOverlayUrlKind(kind)) {
    return;
  }
  overlayUrlKind = kind;
  syncOverlayUrlKindSelect();
  syncOverlayUrlDisplay();
}

function syncOverlayUrlKindSelect() {
  const select = $('overlay-url-kind');
  if (select instanceof HTMLSelectElement) {
    select.value = overlayUrlKind;
  }
}

function overlayUrlKindHintText(kind) {
  if (kind === 'alerts') {
    return (
      (typeof uiCopy === 'object' && uiCopy?.eventAlertAlertsUrlHint) ||
      '中央に画像や GIF を出す用です。コメント列とは別に、配信ソフトへソースを追加してこの URL を貼ってください。'
    );
  }
  if (kind === 'ranking') {
    return (
      (typeof uiCopy === 'object' && uiCopy?.overlayUrlLikesHint) ||
      'セッション中のいいね／ダイヤ累計トップを出す用です。コメント列とは別に、配信ソフトへソースを追加してこの URL を貼ってください。'
    );
  }
  return (
    (typeof uiCopy === 'object' && uiCopy?.overlayUrlChatHint) ||
    'TikTok LIVE Studio でソース追加 → リンクに貼るときは LIVE Studio用、OBS のブラウザソースには OBS用を使います。'
  );
}

function overlayUrlVariantHintText(variant) {
  if (variant === 'obs') {
    return (
      (typeof uiCopy === 'object' && uiCopy?.overlayUrlObsHint) ||
      'OBS のブラウザソースに貼ってください。自分の耳に二重で聞こえるときは、このソースの音声モニタリングをオフにしてください。'
    );
  }
  if (variant === 'studio') {
    return (
      (typeof uiCopy === 'object' && uiCopy?.overlayUrlAltHint) ||
      'LIVE Studio で上のアドレスが通らないときだけ使います。'
    );
  }
  return (
    (typeof uiCopy === 'object' && uiCopy?.overlayUrlLiveHint) ||
    '「正しいURLを入力してください」と出るときは、127.0.0.1 を手打ちしていないか確認してください。LIVE Studio用を使います。'
  );
}

function syncOverlayRankingLikeSyncVisibility() {
  const syncBlock = $('overlay-ranking-like-sync-settings');
  const pollField = $('overlay-ranking-like-poll-sec-field');
  const modeSelect = $('overlay-ranking-mode');
  const syncSelect = $('overlay-ranking-like-sync');
  const isLikes =
    !(modeSelect instanceof HTMLSelectElement) || modeSelect.value !== 'diamonds';
  if (syncBlock instanceof HTMLElement) {
    syncBlock.hidden = !isLikes;
  }
  const isPoll =
    isLikes &&
    syncSelect instanceof HTMLSelectElement &&
    syncSelect.value === 'poll';
  if (pollField instanceof HTMLElement) {
    pollField.hidden = !isPoll;
  }
}

function syncOverlayRankingSettingsVisibility() {
  syncOverlayRankingLikeSyncVisibility();
}

function syncOverlayUrlDisplay() {
  const line = $('overlay-url');
  if (line) {
    line.textContent = overlayUrlFor(overlayUrlKind, overlayUrlVariant);
  }
  const kindHint = $('overlay-url-kind-hint');
  if (kindHint) {
    kindHint.textContent = overlayUrlKindHintText(overlayUrlKind);
  }
  const variantHint = $('overlay-url-variant-hint');
  if (variantHint) {
    variantHint.textContent = overlayUrlVariantHintText(overlayUrlVariant);
  }
  syncOverlayRankingSettingsVisibility();
  for (const btn of document.querySelectorAll('[data-overlay-copy]')) {
    if (!(btn instanceof HTMLButtonElement)) {
      continue;
    }
    const variant = btn.getAttribute('data-overlay-copy') || '';
    btn.classList.toggle('is-active', variant === overlayUrlVariant);
    btn.setAttribute('aria-pressed', variant === overlayUrlVariant ? 'true' : 'false');
  }
}

function overlayUrlBundleFromFields(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const hasAny =
    typeof source.overlayUrl === 'string' ||
    typeof source.overlayPreviewUrl === 'string' ||
    typeof source.overlayStudioUrl === 'string' ||
    typeof source.overlayAlertsUrl === 'string' ||
    typeof source.overlayAlertsPreviewUrl === 'string' ||
    typeof source.overlayAlertsStudioUrl === 'string' ||
    typeof source.overlayLikesUrl === 'string' ||
    typeof source.overlayLikesPreviewUrl === 'string' ||
    typeof source.overlayLikesStudioUrl === 'string';
  if (!hasAny) {
    return null;
  }
  return {
    chat: {
      live: typeof source.overlayUrl === 'string' ? source.overlayUrl : overlayUrlBundle.chat.live,
      obs:
        typeof source.overlayPreviewUrl === 'string'
          ? source.overlayPreviewUrl
          : overlayUrlBundle.chat.obs,
      studio:
        typeof source.overlayStudioUrl === 'string'
          ? source.overlayStudioUrl
          : overlayUrlBundle.chat.studio,
    },
    alerts: {
      live:
        typeof source.overlayAlertsUrl === 'string'
          ? source.overlayAlertsUrl
          : overlayUrlBundle.alerts.live,
      obs:
        typeof source.overlayAlertsPreviewUrl === 'string'
          ? source.overlayAlertsPreviewUrl
          : overlayUrlBundle.alerts.obs,
      studio:
        typeof source.overlayAlertsStudioUrl === 'string'
          ? source.overlayAlertsStudioUrl
          : overlayUrlBundle.alerts.studio,
    },
    ranking: {
      live:
        typeof source.overlayLikesUrl === 'string'
          ? source.overlayLikesUrl
          : overlayUrlBundle.ranking.live,
      obs:
        typeof source.overlayLikesPreviewUrl === 'string'
          ? source.overlayLikesPreviewUrl
          : overlayUrlBundle.ranking.obs,
      studio:
        typeof source.overlayLikesStudioUrl === 'string'
          ? source.overlayLikesStudioUrl
          : overlayUrlBundle.ranking.studio,
    },
  };
}

/** フォームのポート入力が、届いた URL 束のポートと違うときは編集中とみなす */
function isOverlayPortFieldAheadOf(source) {
  const input = $('overlay-port');
  if (!(input instanceof HTMLInputElement)) {
    return false;
  }
  const formPort = Number(input.value);
  if (!Number.isInteger(formPort) || formPort < 1024 || formPort > 65535) {
    return false;
  }
  const url =
    (typeof source?.overlayUrl === 'string' && source.overlayUrl) ||
    (typeof source?.overlayPreviewUrl === 'string' && source.overlayPreviewUrl) ||
    '';
  const matched = String(url).match(/:(\d+)(?:\/|$)/);
  if (!matched) {
    return false;
  }
  const sourcePort = Number(matched[1]);
  if (!Number.isInteger(sourcePort)) {
    return false;
  }
  return formPort !== sourcePort;
}

/**
 * @param {object} source
 * @param {{ force?: boolean }} [options] force ならポート入力の食い違いを無視して更新
 */
function fillOverlayUrlUi(source, options) {
  if (!options?.force && isOverlayPortFieldAheadOf(source)) {
    return;
  }
  const next = overlayUrlBundleFromFields(source);
  if (!next) {
    return;
  }
  overlayUrlBundle = next;
  syncOverlayUrlKindSelect();
  syncOverlayUrlDisplay();
}

function applyOverlayUrlCopy() {
  const cardTitle = $('overlay-url-card-title');
  if (cardTitle && uiCopy.overlayUrlCardTitle) {
    cardTitle.textContent = uiCopy.overlayUrlCardTitle;
  }
  const kindSelect = $('overlay-url-kind');
  if (kindSelect instanceof HTMLSelectElement && uiCopy.overlayUrlKindLabel) {
    kindSelect.setAttribute('aria-label', uiCopy.overlayUrlKindLabel);
  }
  const kindLabel = $('overlay-url-kind-label');
  if (kindLabel && uiCopy.overlayUrlKindLabel) {
    kindLabel.textContent = uiCopy.overlayUrlKindLabel;
  }
  const chatLabel = $('overlay-url-kind-chat-label');
  if (chatLabel && uiCopy.eventAlertChatUrlTitle) {
    chatLabel.textContent = uiCopy.eventAlertChatUrlTitle;
  }
  const alertsLabel = $('overlay-url-kind-alerts-label');
  if (alertsLabel && uiCopy.eventAlertAlertsUrlTitle) {
    alertsLabel.textContent = uiCopy.eventAlertAlertsUrlTitle;
  }
  const likesLabel = $('overlay-url-kind-likes-label');
  if (likesLabel && uiCopy.overlayUrlLikesTitle) {
    likesLabel.textContent = uiCopy.overlayUrlLikesTitle;
  }
  const rankingModeLabel = $('overlay-ranking-mode-label');
  if (rankingModeLabel && uiCopy.overlayRankingModeLabel) {
    rankingModeLabel.textContent = uiCopy.overlayRankingModeLabel;
  }
  const rankingModeLikes = $('overlay-ranking-mode-likes-label');
  if (rankingModeLikes && uiCopy.overlayRankingModeLikes) {
    rankingModeLikes.textContent = uiCopy.overlayRankingModeLikes;
  }
  const rankingModeDiamonds = $('overlay-ranking-mode-diamonds-label');
  if (rankingModeDiamonds && uiCopy.overlayRankingModeDiamonds) {
    rankingModeDiamonds.textContent = uiCopy.overlayRankingModeDiamonds;
  }
  const rankingModeHint = $('overlay-ranking-mode-hint');
  if (rankingModeHint && uiCopy.overlayRankingModeHint) {
    rankingModeHint.textContent = uiCopy.overlayRankingModeHint;
  }
  const rankingModeSelect = $('overlay-ranking-mode');
  if (rankingModeSelect instanceof HTMLSelectElement && uiCopy.overlayRankingModeLabel) {
    rankingModeSelect.setAttribute('aria-label', uiCopy.overlayRankingModeLabel);
  }
  const likeSyncLabel = $('overlay-ranking-like-sync-label');
  if (likeSyncLabel && uiCopy.overlayRankingLikeSyncLabel) {
    likeSyncLabel.textContent = uiCopy.overlayRankingLikeSyncLabel;
  }
  const likeSyncLive = $('overlay-ranking-like-sync-live-label');
  if (likeSyncLive && uiCopy.overlayRankingLikeSyncLive) {
    likeSyncLive.textContent = uiCopy.overlayRankingLikeSyncLive;
  }
  const likeSyncPoll = $('overlay-ranking-like-sync-poll-label');
  if (likeSyncPoll && uiCopy.overlayRankingLikeSyncPoll) {
    likeSyncPoll.textContent = uiCopy.overlayRankingLikeSyncPoll;
  }
  const likeSyncHint = $('overlay-ranking-like-sync-hint');
  if (likeSyncHint && uiCopy.overlayRankingLikeSyncHint) {
    likeSyncHint.textContent = uiCopy.overlayRankingLikeSyncHint;
  }
  const likeSyncSelect = $('overlay-ranking-like-sync');
  if (likeSyncSelect instanceof HTMLSelectElement && uiCopy.overlayRankingLikeSyncLabel) {
    likeSyncSelect.setAttribute('aria-label', uiCopy.overlayRankingLikeSyncLabel);
  }
  const likePollSecLabel = $('overlay-ranking-like-poll-sec-label');
  if (likePollSecLabel && uiCopy.overlayRankingLikePollSecLabel) {
    likePollSecLabel.textContent = uiCopy.overlayRankingLikePollSecLabel;
  }
  const likePollSecInput = $('overlay-ranking-like-poll-sec');
  if (likePollSecInput instanceof HTMLInputElement && uiCopy.overlayRankingLikePollSecLabel) {
    likePollSecInput.setAttribute('aria-label', uiCopy.overlayRankingLikePollSecLabel);
  }
  const copyGroup = document.querySelector('.overlay-url-copy-row');
  if (copyGroup instanceof HTMLElement && uiCopy.overlayUrlCopyGroupLabel) {
    copyGroup.setAttribute('aria-label', uiCopy.overlayUrlCopyGroupLabel);
  }
  const sampleGroup = $('overlay-connect-sample-row');
  if (sampleGroup instanceof HTMLElement && uiCopy.overlayConnectSampleGroupLabel) {
    sampleGroup.setAttribute('aria-label', uiCopy.overlayConnectSampleGroupLabel);
  }
  const sampleBtn = $('btn-connect-overlay-sample');
  if (sampleBtn && uiCopy.overlayConnectSample) {
    sampleBtn.textContent = uiCopy.overlayConnectSample;
  }
  const clearBtn = $('btn-connect-overlay-clear');
  if (clearBtn && uiCopy.overlayConnectClear) {
    clearBtn.textContent = uiCopy.overlayConnectClear;
  }
  const sampleHint = $('overlay-connect-sample-hint');
  if (sampleHint && uiCopy.overlayConnectSampleHint) {
    sampleHint.textContent = uiCopy.overlayConnectSampleHint;
  }
  const liveBtn = $('btn-copy-url');
  if (liveBtn && uiCopy.overlayUrlCopyLiveLabel) {
    liveBtn.textContent = uiCopy.overlayUrlCopyLiveLabel;
  }
  const obsBtn = $('btn-copy-obs-url');
  if (obsBtn && uiCopy.copyObsLabel) {
    obsBtn.textContent = uiCopy.copyObsLabel;
  }
  const studioBtn = $('btn-copy-studio-url');
  if (studioBtn && uiCopy.overlayUrlCopyAltLabel) {
    studioBtn.textContent = uiCopy.overlayUrlCopyAltLabel;
  }
  syncOverlayUrlDisplay();
}

/**
 * 接続タブ／メニュー共通。
 * kind 省略時は今の種類。明示指定（見た目タブなど）では select を動かさない。
 */
async function previewSelectedOverlaySample(kind) {
  const useSelect = kind === undefined;
  const safeKind =
    typeof normalizeOverlayUrlKind === 'function'
      ? normalizeOverlayUrlKind(useSelect ? selectedOverlayUrlKind() : kind)
      : 'chat';
  if (useSelect && typeof isOverlayUrlKind === 'function' && isOverlayUrlKind(safeKind)) {
    overlayUrlKind = safeKind;
    syncOverlayUrlKindSelect();
    syncOverlayUrlDisplay();
  }
  const streamSettings =
    typeof readOverlayStreamSettings === 'function' ? readOverlayStreamSettings() : undefined;
  if (typeof window.liveTts?.previewOverlay !== 'function') {
    return { ok: false, message: uiCopy.testerFailed || 'テストに失敗しました' };
  }
  try {
    const result = await window.liveTts.previewOverlay('overlay', streamSettings, safeKind);
    if (!result || typeof result !== 'object') {
      return { ok: false, message: uiCopy.testerFailed || 'テストに失敗しました' };
    }
    return {
      ok: result.ok === true,
      message:
        typeof result.message === 'string' && result.message
          ? result.message
          : result.ok
            ? uiCopy.overlayPreviewShown || '配信ソースにサンプルを表示しました'
            : uiCopy.testerFailed || 'テストに失敗しました',
    };
  } catch (_error) {
    return { ok: false, message: uiCopy.testerFailed || 'テストに失敗しました' };
  }
}

/**
 * kind 省略時は今の種類。'all' は全種類（メニュー／見た目タブ）。
 * 明示指定では select を動かさない。
 */
async function clearSelectedOverlaySample(kind) {
  const useSelect = kind === undefined;
  const target =
    kind === 'all'
      ? 'all'
      : typeof normalizeOverlayUrlKind === 'function'
        ? normalizeOverlayUrlKind(useSelect ? selectedOverlayUrlKind() : kind)
        : 'chat';
  if (
    useSelect &&
    target !== 'all' &&
    typeof isOverlayUrlKind === 'function' &&
    isOverlayUrlKind(target)
  ) {
    overlayUrlKind = target;
    syncOverlayUrlKindSelect();
    syncOverlayUrlDisplay();
  }
  if (typeof window.liveTts?.clearOverlay !== 'function') {
    return { ok: false, message: uiCopy.testerFailed || 'テストに失敗しました' };
  }
  try {
    const result = await window.liveTts.clearOverlay(target);
    if (!result || typeof result !== 'object') {
      return { ok: false, message: uiCopy.testerFailed || 'テストに失敗しました' };
    }
    return {
      ok: result.ok === true,
      message:
        typeof result.message === 'string' && result.message
          ? result.message
          : result.ok
            ? uiCopy.previewCleared || '配信ソースの表示を消しました'
            : uiCopy.testerFailed || 'テストに失敗しました',
    };
  } catch (_error) {
    return { ok: false, message: uiCopy.testerFailed || 'テストに失敗しました' };
  }
}

/**
 * @param {'live'|'obs'|'studio'} [variant]
 * @param {{ kind?: 'chat'|'alerts'|'ranking' }} [options]
 */
async function copySelectedOverlayUrl(variant, options) {
  const safeVariant =
    typeof isOverlayUrlVariant === 'function' && isOverlayUrlVariant(variant) ? variant : 'live';
  if (options && typeof isOverlayUrlKind === 'function' && isOverlayUrlKind(options.kind)) {
    overlayUrlKind = options.kind;
    syncOverlayUrlKindSelect();
  } else {
    overlayUrlKind = selectedOverlayUrlKind();
  }
  overlayUrlVariant = safeVariant;
  syncOverlayUrlDisplay();
  const ipcKind =
    typeof overlayCopyKindFrom === 'function'
      ? overlayCopyKindFrom(overlayUrlKind, safeVariant)
      : 'default';
  if (typeof window.liveTts?.copyOverlayUrl !== 'function') {
    return { ok: false, message: uiCopy.copyFailed || 'コピーに失敗しました' };
  }
  try {
    const result = await window.liveTts.copyOverlayUrl(ipcKind);
    if (!result || typeof result !== 'object') {
      return { ok: false, message: uiCopy.copyFailed || 'コピーに失敗しました' };
    }
    return {
      ok: result.ok === true,
      message:
        typeof result.message === 'string' && result.message
          ? result.message
          : result.ok
            ? uiCopy.copied || 'コピーしました'
            : uiCopy.copyFailed || 'コピーに失敗しました',
    };
  } catch (_error) {
    return { ok: false, message: uiCopy.copyFailed || 'コピーに失敗しました' };
  }
}

function bindOverlayUrlUi() {
  const kindSelect = $('overlay-url-kind');
  if (kindSelect instanceof HTMLSelectElement && kindSelect.dataset.boundOverlayUrl !== '1') {
    kindSelect.dataset.boundOverlayUrl = '1';
    kindSelect.addEventListener('change', () => {
      if (typeof isOverlayUrlKind !== 'function' || !isOverlayUrlKind(kindSelect.value)) {
        return;
      }
      overlayUrlKind = kindSelect.value;
      overlayUrlVariant = 'live';
      syncOverlayUrlDisplay();
    });
  }

  const rankingModeSelect = $('overlay-ranking-mode');
  if (
    rankingModeSelect instanceof HTMLSelectElement &&
    rankingModeSelect.dataset.boundRankingMode !== '1'
  ) {
    rankingModeSelect.dataset.boundRankingMode = '1';
    rankingModeSelect.addEventListener('change', () => {
      syncOverlayRankingLikeSyncVisibility();
    });
  }

  const likeSyncSelect = $('overlay-ranking-like-sync');
  if (
    likeSyncSelect instanceof HTMLSelectElement &&
    likeSyncSelect.dataset.boundLikeSync !== '1'
  ) {
    likeSyncSelect.dataset.boundLikeSync = '1';
    likeSyncSelect.addEventListener('change', () => {
      syncOverlayRankingLikeSyncVisibility();
    });
  }

  for (const btn of document.querySelectorAll('[data-overlay-copy]')) {
    if (!(btn instanceof HTMLButtonElement) || btn.dataset.boundOverlayCopy === '1') {
      continue;
    }
    btn.dataset.boundOverlayCopy = '1';
    btn.addEventListener('click', async () => {
      const variant = btn.getAttribute('data-overlay-copy') || 'live';
      const result = await copySelectedOverlayUrl(variant);
      if (typeof setToast === 'function') {
        setToast(result.message, !result.ok);
      }
    });
  }

  const sampleBtn = $('btn-connect-overlay-sample');
  if (sampleBtn instanceof HTMLButtonElement && sampleBtn.dataset.boundOverlaySample !== '1') {
    sampleBtn.dataset.boundOverlaySample = '1';
    sampleBtn.addEventListener('click', async () => {
      const result = await previewSelectedOverlaySample();
      if (typeof setToast === 'function') {
        setToast(result.message, !result.ok);
      }
    });
  }

  const clearBtn = $('btn-connect-overlay-clear');
  if (clearBtn instanceof HTMLButtonElement && clearBtn.dataset.boundOverlayClear !== '1') {
    clearBtn.dataset.boundOverlayClear = '1';
    clearBtn.addEventListener('click', async () => {
      const result = await clearSelectedOverlaySample();
      if (typeof setToast === 'function') {
        setToast(result.message, !result.ok);
      }
    });
  }
}
