function hideViewerUserMenu() {
  const menu = $('viewer-user-menu');
  if (menu) {
    menu.hidden = true;
    delete menu.dataset.uniqueId;
    delete menu.dataset.nickname;
    delete menu.dataset.displayText;
  }
}

function viewerItemMatchesUser(item, user) {
  return userListHas(
    [item.dataset.uniqueId, item.dataset.nickname].filter(Boolean),
    user,
  );
}

function removeViewerItemsForUser(user) {
  for (const log of allViewerLogs()) {
    for (const item of [...(log?.querySelectorAll('.viewer__item') || [])]) {
      if (viewerItemMatchesUser(item, user)) {
        item.remove();
      }
    }
  }
}

function showViewerUserMenu(event, item) {
  const uniqueId = item.dataset.uniqueId || '';
  const nickname = item.dataset.nickname || '';
  const displayText =
    item.dataset.displayText || item.querySelector('.viewer__text')?.textContent || '';
  if (!listedUserIdFrom({ uniqueId, nickname }) && !displayText) {
    setToast(uiCopy.viewerUserMissing, true);
    return;
  }
  const menu = $('viewer-user-menu');
  const label = $('viewer-user-menu-label');
  const copyBtn = $('viewer-user-menu-copy');
  const copyIdBtn = $('viewer-user-menu-copy-id');
  const copyNicknameBtn = $('viewer-user-menu-copy-nickname');
  const muteBtn = $('viewer-user-menu-mute');
  const blockBtn = $('viewer-user-menu-block');
  if (!menu || !copyBtn || !copyIdBtn || !copyNicknameBtn || !muteBtn || !blockBtn) {
    return;
  }
  const user = { uniqueId, nickname };
  const muted = savedConfig?.mutedUsers ?? parseUserLines($('muted-users')?.value);
  const blocked = savedConfig?.blockedUsers ?? parseUserLines($('blocked-users')?.value);
  const isMuted = userListHas(muted, user);
  const isBlocked = userListHas(blocked, user);
  const hasUser = Boolean(listedUserIdFrom(user));
  const idValue = uniqueId.replace(/^@/, '').trim();
  menu.dataset.uniqueId = uniqueId;
  menu.dataset.nickname = nickname;
  menu.dataset.displayText = displayText;
  if (label) {
    label.textContent = uniqueId ? `@${uniqueId}` : nickname || uiCopy.viewerCopyComment;
  }
  copyBtn.textContent = uiCopy.viewerCopyComment;
  copyBtn.disabled = !displayText;
  copyIdBtn.textContent = uiCopy.viewerCopyId;
  copyIdBtn.disabled = !idValue;
  copyNicknameBtn.textContent = uiCopy.viewerCopyNickname;
  copyNicknameBtn.disabled = !nickname.trim();
  muteBtn.textContent = isMuted ? uiCopy.viewerUnmuteUser : uiCopy.viewerMuteUser;
  blockBtn.textContent = isBlocked ? uiCopy.viewerUnblockUser : uiCopy.viewerBlockUser;
  muteBtn.hidden = !hasUser;
  blockBtn.hidden = !hasUser;
  menu.hidden = false;
  const pad = 8;
  const left = Math.min(event.clientX, window.innerWidth - menu.offsetWidth - pad);
  const top = Math.min(event.clientY, window.innerHeight - menu.offsetHeight - pad);
  menu.style.left = `${Math.max(pad, left)}px`;
  menu.style.top = `${Math.max(pad, top)}px`;
}

async function copyViewerMenuField(kind) {
  const menu = $('viewer-user-menu');
  let text = '';
  let empty = uiCopy.viewerCommentEmpty;
  let copied = uiCopy.viewerCommentCopied;
  if (kind === 'id') {
    text = String(menu?.dataset.uniqueId || '')
      .replace(/^@/, '')
      .trim();
    empty = uiCopy.viewerIdEmpty;
    copied = uiCopy.viewerIdCopied;
  } else if (kind === 'nickname') {
    text = String(menu?.dataset.nickname || '').trim();
    empty = uiCopy.viewerNicknameEmpty;
    copied = uiCopy.viewerNicknameCopied;
  } else {
    text = menu?.dataset.displayText || '';
  }
  hideViewerUserMenu();
  if (!text) {
    setToast(empty, true);
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error('clipboard');
    }
    setToast(copied);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    setToast(ok ? copied : uiCopy.viewerCommentCopyFailed, !ok);
  }
}

async function applyViewerUserAction(kind) {
  const menu = $('viewer-user-menu');
  const user = {
    uniqueId: menu?.dataset.uniqueId || '',
    nickname: menu?.dataset.nickname || '',
  };
  hideViewerUserMenu();
  const id = listedUserIdFrom(user);
  if (!id) {
    setToast(uiCopy.viewerUserMissing, true);
    return;
  }
  const name = user.nickname || id;
  let muted = parseUserLines($('muted-users')?.value);
  let blocked = parseUserLines($('blocked-users')?.value);
  const wasMuted = userListHas(muted, user);
  const wasBlocked = userListHas(blocked, user);
  if (kind === 'mute') {
    muted = wasMuted ? removeUserLine(muted, user) : addUserLine(muted, id);
  } else if (wasBlocked) {
    blocked = removeUserLine(blocked, user);
  } else {
    blocked = addUserLine(blocked, id);
    muted = removeUserLine(muted, user);
  }
  writeUserLines('muted-users', muted);
  writeUserLines('blocked-users', blocked);
  const result = await persistConfigPartial({
    mutedUsers: muted,
    blockedUsers: blocked,
  }, (config) => {
    muted = config.mutedUsers ?? muted;
    blocked = config.blockedUsers ?? blocked;
    writeUserLines('muted-users', muted);
    writeUserLines('blocked-users', blocked);
    patchSnapshotUserLists(muted, blocked);
  });
  if (!result.ok) {
    setToast(result.message || uiCopy.saveFailed || '保存に失敗しました', true);
    return;
  }
  if (kind === 'block' && !wasBlocked) {
    removeViewerItemsForUser(user);
    syncViewerEmpty();
    setToast(formatUserCopy(uiCopy.viewerUserBlocked, name));
    return;
  }
  if (kind === 'block') {
    setToast(formatUserCopy(uiCopy.viewerUserUnblocked, name));
    return;
  }
  setToast(
    formatUserCopy(wasMuted ? uiCopy.viewerUserUnmuted : uiCopy.viewerUserMuted, name),
  );
}
