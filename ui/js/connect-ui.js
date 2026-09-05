async function openConnectSetup() {
  await requestAppMode('settings');
  await requestTab('connect');
  window.setTimeout(() => {
    $('unique-id')?.focus();
  }, 0);
}

function typedUniqueId() {
  return ($('unique-id')?.value || '').replace(/^@/, '').trim();
}

function sameUniqueId(left, right) {
  return (left || '').replace(/^@/, '').trim().toLowerCase() === (right || '').replace(/^@/, '').trim().toLowerCase();
}

function setConnectBusy(busy) {
  lookupBusy = busy;
  const connect = $('btn-connect');
  if (connect) {
    connect.disabled = busy;
  }
  const guide = $('btn-guide-action');
  if (guide && guide.dataset.action === 'connect') {
    guide.disabled = busy;
  }
}

function hideConnectConfirm() {
  pendingConnectUser = null;
  $('connect-confirm').hidden = true;
}

function showConnectConfirm(user) {
  pendingConnectUser = user;
  $('connect-confirm-title').textContent = uiCopy.confirmUserTitle;
  $('connect-confirm-hint').textContent = uiCopy.confirmUserHint;
  $('btn-connect-confirm').textContent = uiCopy.confirmUserButton;
  $('btn-connect-cancel').textContent = uiCopy.confirmUserCancel;
  $('connect-confirm-name').textContent = user.nickname || user.uniqueId;
  $('connect-confirm-id').textContent = `@${user.uniqueId}`;
  const avatar = $('connect-confirm-avatar');
  const fallback = $('connect-confirm-fallback');
  const initial = String(user.nickname || user.uniqueId || '?').slice(0, 1);
  fallback.textContent = initial;
  fallback.classList.remove('is-hidden');
  avatar.classList.add('is-hidden');
  avatar.removeAttribute('src');
  if (user.avatarDisplayUrl || user.avatarUrl) {
    avatar.onload = () => {
      avatar.classList.remove('is-hidden');
      fallback.classList.add('is-hidden');
    };
    avatar.onerror = () => {
      avatar.classList.add('is-hidden');
      fallback.classList.remove('is-hidden');
    };
    avatar.src = user.avatarDisplayUrl || user.avatarUrl;
  }
  $('connect-confirm').hidden = false;
  $('btn-connect-confirm').focus();
}

async function startConfirmedConnect(user) {
  hideConnectConfirm();
  const currentId = typedUniqueId();
  if (user.uniqueId && !sameUniqueId(currentId, user.uniqueId)) {
    $('unique-id').value = user.uniqueId;
  }
  const saved = await window.liveTts.saveConfig({
    uniqueId: user.uniqueId || typedUniqueId(),
    confirmedUniqueId: user.uniqueId || typedUniqueId(),
  });
  if (saved.config) {
    savedConfig = saved.config;
    fillConfig(saved.config);
    markClean();
  }
  if (!saved.ok) {
    setToast(saved.message, true);
    return;
  }
  try {
    applyStatus(await window.liveTts.connect());
  } catch (error) {
    setToast(error instanceof Error ? error.message : '接続に失敗しました', true);
  }
}

async function connectNow() {
  if (lookupBusy) {
    return;
  }
  if (!typedUniqueId()) {
    await openConnectSetup();
    setToast(uiCopy.uniqueIdRequired, true);
    return;
  }
  const state = lastStatus?.state || 'disconnected';
  if (
    (state === 'live' || state === 'waiting_live' || state === 'connecting') &&
    sameUniqueId(typedUniqueId(), lastStatus.uniqueId || savedConfig?.uniqueId)
  ) {
    setToast(uiCopy.alreadyConnected);
    return;
  }
  const saved = await flushFormSave();
  if (!saved.ok) {
    return;
  }
  setConnectBusy(true);
  setToast(uiCopy.lookingUp);
  try {
    const result = await window.liveTts.lookupUser(typedUniqueId());
    if (!result.ok || !result.user) {
      setToast(result.message || uiCopy.uniqueIdRequired, true);
      return;
    }
    setToast('');
    showConnectConfirm(result.user);
  } catch (error) {
    setToast(error instanceof Error ? error.message : 'アカウントを確認できませんでした', true);
  } finally {
    setConnectBusy(false);
  }
}

function applyStatus(status) {
  lastStatus = status && typeof status === 'object' ? status : lastStatus;
  const nextStatus = lastStatus;
  const line = $('status-line');
  line.classList.remove('is-live', 'is-wait', 'is-error');
  if (nextStatus.state === 'live') {
    line.classList.add('is-live');
  } else if (nextStatus.state === 'waiting_live' || nextStatus.state === 'connecting') {
    line.classList.add('is-wait');
  } else if (nextStatus.state === 'error') {
    line.classList.add('is-error');
  }
  $('status-text').textContent = nextStatus.message || '未接続';
  syncLiveDurationClock(nextStatus);
  if (nextStatus.overlayUrl) {
    $('overlay-url').textContent = nextStatus.overlayUrl;
  }
  const overlayStatus = $('overlay-status-line');
  if (overlayStatus) {
    if (!nextStatus.overlayListening) {
      overlayStatus.textContent = uiCopy.overlayServerDown;
    } else if (nextStatus.overlayClients > 0) {
      overlayStatus.textContent = uiCopy.overlayClientsConnected.replace(
        '{n}',
        String(nextStatus.overlayClients),
      );
    } else {
      overlayStatus.textContent = uiCopy.overlayClientsWaiting;
    }
  }
  if (nextStatus.state === 'live') {
    void loadTestGifts();
  }
  applyViewerRoomStats(nextStatus);
  syncViewerEmpty();
}
