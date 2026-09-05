function formatViewerTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function viewerUserLabel(user) {
  const nickname = String(user?.nickname || '').trim();
  if (nickname) {
    return nickname;
  }
  return String(user?.uniqueId || '').replace(/^@/, '').trim();
}

function viewerAvatarInitial(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return '?';
  }
  return [...trimmed][0];
}

function createViewerAvatarPlaceholder(initial) {
  const placeholder = document.createElement('span');
  placeholder.className = 'viewer__avatar viewer__avatar--placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.textContent = initial;
  return placeholder;
}

function viewerFanClubStatus(user) {
  const status = Number(user?.fanClubStatus);
  if (status === 1 || status === 2) {
    return status;
  }
  const level = Number(user?.fanClubLevel);
  return Number.isFinite(level) && level > 0 ? 1 : 0;
}

function viewerFanBadgeLevel(user) {
  const level = Number(user?.fanClubLevel);
  if (Number.isFinite(level) && level > 0) {
    return Math.trunc(level);
  }
  return 0;
}

function viewerFanBadgeLabel(user) {
  const clubName = String(user?.fanClubName || '').trim();
  const prefix = clubName || uiCopy.viewerBadgeFan;
  const level = viewerFanBadgeLevel(user);
  return level > 0 ? `${prefix}${level}` : prefix;
}

function applyInactiveFanBadgeColor(badge) {
  badge.style.color = '#64748b';
  badge.style.background = 'color-mix(in srgb, #64748b 18%, transparent)';
}

function appendViewerBadge(parent, className, label) {
  const badge = document.createElement('span');
  badge.className = `viewer__badge ${className}`;
  badge.textContent = label;
  parent.appendChild(badge);
}

function appendViewerBadges(parent, user) {
  if (user?.isAnchor) {
    appendViewerBadge(parent, 'viewer__badge--anchor', uiCopy.viewerBadgeAnchor);
  }
  if (user?.isModerator) {
    appendViewerBadge(parent, 'viewer__badge--mod', uiCopy.viewerBadgeMod);
  }
  const fanStatus = viewerFanClubStatus(user);
  if (fanStatus === 1 || fanStatus === 2) {
    const fanLevel = viewerFanBadgeLevel(user);
    const fanBadge = document.createElement('span');
    fanBadge.className = 'viewer__badge viewer__badge--fan';
    fanBadge.dataset.fanLevel = String(fanLevel || '');
    fanBadge.textContent = viewerFanBadgeLabel(user);
    if (fanStatus === 2) {
      fanBadge.classList.add('is-inactive');
      applyInactiveFanBadgeColor(fanBadge);
    } else {
      applyFanBadgeColor(fanBadge, fanLevel);
    }
    parent.appendChild(fanBadge);
  }
  if (user?.isSuperFan) {
    appendViewerBadge(parent, 'viewer__badge--super', uiCopy.viewerBadgeSuperFan);
  }
}

function appendViewerAvatar(item, user) {
  const name = viewerUserLabel(user) || uiCopy.viewerUnknownUser;
  const initial = viewerAvatarInitial(name);
  const url = giftIconSrc(user?.avatarUrl || '');
  if (!url) {
    item.appendChild(createViewerAvatarPlaceholder(initial));
    return;
  }
  const avatar = document.createElement('img');
  avatar.className = 'viewer__avatar';
  avatar.alt = '';
  avatar.referrerPolicy = 'no-referrer';
  avatar.decoding = 'async';
  avatar.addEventListener('error', () => {
    avatar.replaceWith(createViewerAvatarPlaceholder(initial));
  });
  avatar.src = url;
  item.appendChild(avatar);
}

function viewerTypeLabel(type) {
  return uiCopy.viewerTypes?.[type] || type || '';
}

function isViewerNearBottom(scroller) {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
}

function viewerCommentLog() {
  if (viewerLayout === 'custom') {
    const leaf = listDockLeaves(pruneDock(viewerDock)).find((item) => item.types.includes('comment'));
    if (leaf) {
      return $(`viewer-log-${leaf.id}`);
    }
  }
  return $('viewer-log-comments');
}

function viewerLogForType(type) {
  if (viewerLayout === 'custom') {
    const leaf = listDockLeaves(pruneDock(viewerDock)).find((item) => item.types.includes(type));
    return leaf ? $(`viewer-log-${leaf.id}`) : $('viewer-log-comments');
  }
  if (viewerLayout === 'combined') {
    return $('viewer-log-comments');
  }
  return type && type !== 'comment' ? $('viewer-log-events') : $('viewer-log-comments');
}

function getViewerStick(log) {
  if (!log?.id) {
    return true;
  }
  if (viewerStickByLog.has(log.id)) {
    return viewerStickByLog.get(log.id);
  }
  return log.id === 'viewer-log-events' ? viewerEventStick : viewerCommentStick;
}

function setViewerStick(log, value) {
  if (!log?.id) {
    return;
  }
  viewerStickByLog.set(log.id, value);
  if (log.id === 'viewer-log-events') {
    viewerEventStick = value;
  } else if (log.id === 'viewer-log-comments') {
    viewerCommentStick = value;
  }
}

function scrollViewerLogToLatest(log) {
  if (!log) {
    return;
  }
  setViewerStick(log, true);
  log.scrollTop = log.scrollHeight;
}

function captureViewerScrollState() {
  const map = new Map();
  for (const log of allViewerLogs()) {
    if (!log.id) {
      continue;
    }
    map.set(log.id, {
      stick: getViewerStick(log) || isViewerNearBottom(log),
      scrollTop: log.scrollTop,
    });
  }
  return map;
}

function restoreViewerScrollState(map) {
  if (!map?.size) {
    return;
  }
  for (const log of allViewerLogs()) {
    const saved = map.get(log.id);
    if (!saved) {
      continue;
    }
    if (saved.stick) {
      scrollViewerLogToLatest(log);
      continue;
    }
    const maxTop = Math.max(0, log.scrollHeight - log.clientHeight);
    log.scrollTop = Math.min(saved.scrollTop, maxTop);
  }
  syncViewerLatestButton();
}

function syncViewerEmpty() {
  const guide = $('viewer-guide');
  const workspace = $('viewer-workspace');
  const commentLog = $('viewer-log-comments');
  const eventLog = $('viewer-log-events');
  if (!guide) {
    return;
  }

  const logs = allViewerLogs();
  const hasRows = logs.some((log) => log.children.length > 0);
  const hasSampleRows = logs.some((log) =>
    [...log.children].some((item) => item.dataset.sample === '1'),
  );
  const hasLiveRows = logs.some((log) =>
    [...log.children].some((item) => item.dataset.sample !== '1'),
  );
  const hasUniqueId = Boolean($('unique-id')?.value.trim() || savedConfig?.uniqueId);
  const state = lastStatus?.state || 'disconnected';
  let kind = 'need-id';
  if (hasLiveRows) {
    kind = 'hidden';
  } else if (!hasUniqueId) {
    kind = 'need-id';
  } else if (state === 'live') {
    kind = 'live';
  } else if (state === 'waiting_live' || state === 'connecting') {
    kind = 'waiting';
  } else {
    kind = 'need-connect';
  }

  guide.hidden = kind === 'hidden';
  if (workspace) {
    workspace.hidden = false;
    applyViewerEventPane(viewerEventPanePx);
  }
  if ($('btn-viewer-clear')) {
    $('btn-viewer-clear').disabled = !hasRows;
  }
  const clearSamples = $('btn-guide-clear-samples');
  if (clearSamples) {
    clearSamples.hidden = !hasSampleRows;
  }
  const commentsEmpty = $('viewer-empty-comments');
  const eventsEmpty = $('viewer-empty-events');
  const searching = Boolean(viewerSearchQuery.trim());
  if (commentsEmpty && commentLog) {
    commentsEmpty.textContent = searching ? uiCopy.viewerSearchEmpty : uiCopy.viewerEmptyComments;
    commentsEmpty.hidden = viewerLogHasVisible(commentLog);
  }
  if (eventsEmpty && eventLog) {
    eventsEmpty.textContent = searching ? uiCopy.viewerSearchEmpty : uiCopy.viewerEmptyEvents;
    eventsEmpty.hidden = viewerLogHasVisible(eventLog);
  }
  for (const log of logs) {
    const empty = log.previousElementSibling;
    if (empty?.classList.contains('viewer-pane__empty') && log.id !== 'viewer-log-comments' && log.id !== 'viewer-log-events') {
      empty.textContent = searching ? uiCopy.viewerSearchEmpty : uiCopy.viewerEmptyEvents;
      empty.hidden = viewerLogHasVisible(log);
    }
  }
  if (kind === 'hidden') {
    return;
  }

  $('guide-step-id').textContent = uiCopy.guideStepId;
  $('guide-step-connect').textContent = uiCopy.guideStepConnect;
  $('guide-step-live').textContent = uiCopy.guideStepLive;
  $('guide-step-id').className = hasUniqueId ? 'is-done' : 'is-current';
  $('guide-step-connect').className =
    kind === 'need-id' ? '' : kind === 'need-connect' ? 'is-current' : 'is-done';
  $('guide-step-live').className =
    kind === 'waiting' || kind === 'live' ? 'is-current' : '';
  if (kind === 'live') {
    $('guide-step-live').className = 'is-done';
  }

  const action = $('btn-guide-action');
  const extra = $('guide-extra');
  const title = $('guide-title');
  if (kind === 'need-id') {
    title.textContent = uiCopy.guideNeedIdTitle;
    extra.textContent = uiCopy.guideNeedIdExtra;
    action.textContent = uiCopy.guideNeedIdButton;
    action.dataset.action = 'setup';
    action.classList.remove('is-hidden');
  } else if (kind === 'need-connect') {
    title.textContent = uiCopy.guideNeedConnectTitle;
    extra.textContent = uiCopy.guideNeedConnectExtra;
    action.textContent = uiCopy.guideNeedConnectButton;
    action.dataset.action = 'connect';
    action.classList.remove('is-hidden');
  } else if (kind === 'waiting') {
    title.textContent = uiCopy.guideWaitingTitle;
    extra.textContent = uiCopy.guideWaitingExtra;
    action.dataset.action = '';
    action.classList.add('is-hidden');
  } else {
    title.textContent = uiCopy.guideLiveTitle;
    extra.textContent = uiCopy.guideLiveExtra;
    action.textContent = uiCopy.guideLiveButton;
    action.dataset.action = 'copy-url';
    action.classList.remove('is-hidden');
  }
}

function syncViewerLatestButton() {
  const logs = allViewerLogs().filter((log) => log.children.length > 0 || viewerLayout === 'custom');
  const stuck = logs.length === 0 || logs.every((log) => getViewerStick(log));
  $('btn-viewer-latest')?.classList.toggle('is-hidden', stuck);
}

function appendViewerStatusLine(notice) {
  if (!notice || !notice.text) {
    return;
  }
  const log = viewerCommentLog();
  if (!log) {
    return;
  }
  const stick = getViewerStick(log) || isViewerNearBottom(log);
  const item = document.createElement('li');
  item.className = `viewer__item viewer__item--status viewer__item--status-${notice.kind}`;
  item.dataset.statusKind = notice.kind;
  item.dataset.viewerType = 'comment';

  const body = document.createElement('div');
  body.className = 'viewer__body viewer__body--status';

  const text = document.createElement('p');
  text.className = 'viewer__text';
  text.textContent = notice.text;

  const time = document.createElement('time');
  time.className = 'viewer__time';
  const receivedAt = new Date().toISOString();
  time.dateTime = receivedAt;
  time.textContent = formatViewerTime(receivedAt);

  body.appendChild(text);
  body.appendChild(time);
  item.appendChild(body);

  log.appendChild(item);
  while (log.children.length > VIEWER_MAX_ROWS) {
    log.firstElementChild?.remove();
  }
  applyViewerSearch();
  if (stick) {
    scrollViewerLogToLatest(log);
  }
  syncViewerEmpty();
  syncViewerLatestButton();
}

function appendViewerEvent(payload) {
  if (!payload || typeof payload !== 'object') {
    return;
  }
  if (payload.statusKind === 'connected' || payload.statusKind === 'disconnected') {
    appendViewerStatusLine({
      kind: payload.statusKind,
      text: String(payload.displayText || '').trim(),
    });
    return;
  }
  const type = payload.type || 'comment';
  const commentBody = String(payload.comment || '').trim();
  const displayText = String(payload.displayText || '').trim();
  const name = viewerUserLabel(payload.user);
  const bodyText = type === 'comment' && commentBody ? commentBody : displayText;
  if (!bodyText && !name) {
    return;
  }
  const log = viewerLogForType(payload.type);
  if (!log) {
    return;
  }
  const stick = getViewerStick(log) || isViewerNearBottom(log);
  const item = document.createElement('li');
  item.className = `viewer__item viewer__item--${type}`;
  if (type === 'gift' || type === 'envelope' || (type === 'portal' && payload.giftName)) {
    item.classList.add(`viewer__item--gift-${giftDiamondTier(payload.diamondCount)}`);
  }
  item.dataset.uniqueId = payload.user?.uniqueId || '';
  item.dataset.nickname = payload.user?.nickname || '';
  if (payload.sample === true) {
    item.dataset.sample = '1';
  }

  appendViewerAvatar(item, payload.user);

  if ((type === 'gift' || type === 'portal') && payload.giftImageUrl) {
    const gift = document.createElement('img');
    gift.className = 'viewer__gift';
    gift.alt = '';
    gift.referrerPolicy = 'no-referrer';
    gift.decoding = 'async';
    gift.addEventListener('error', () => gift.remove());
    gift.src = giftIconSrc(payload.giftImageUrl);
    item.appendChild(gift);
  }

  const body = document.createElement('div');
  body.className = 'viewer__body';

  const meta = document.createElement('div');
  meta.className = 'viewer__meta';

  appendViewerBadges(meta, payload.user);

  const nameEl = document.createElement('span');
  nameEl.className = 'viewer__name';
  nameEl.textContent = name || uiCopy.viewerUnknownUser;
  if (payload.user?.uniqueId) {
    nameEl.title = `@${String(payload.user.uniqueId).replace(/^@/, '')}`;
  }
  meta.appendChild(nameEl);

  if (type !== 'comment') {
    const kind = document.createElement('span');
    kind.className = 'viewer__type';
    kind.textContent = viewerTypeLabel(type);
    meta.appendChild(kind);
  }

  const time = document.createElement('time');
  time.className = 'viewer__time';
  time.dateTime = payload.receivedAt || '';
  time.textContent = formatViewerTime(payload.receivedAt);
  meta.appendChild(time);
  body.appendChild(meta);

  const text = document.createElement('p');
  text.className = 'viewer__text';
  text.textContent = bodyText;
  body.appendChild(text);
  item.appendChild(body);

  item.dataset.displayText = text.textContent || '';

  log.appendChild(item);
  while (log.children.length > VIEWER_MAX_ROWS) {
    log.firstElementChild?.remove();
  }
  applyViewerSearch();
  applyViewerFocus();
  if (stick) {
    scrollViewerLogToLatest(log);
  }
  syncViewerEmpty();
  syncViewerLatestButton();
}

function clearViewerLog() {
  for (const log of allViewerLogs()) {
    log.replaceChildren();
  }
  viewerCommentStick = true;
  viewerEventStick = true;
  viewerStickByLog.clear();
  applyViewerSearch();
  applyViewerFocus();
  syncViewerEmpty();
  syncViewerLatestButton();
}
