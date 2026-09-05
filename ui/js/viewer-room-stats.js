function formatViewerRoomCount(count) {
  return new Intl.NumberFormat('ja-JP').format(Math.max(0, Number(count) || 0));
}

function viewerRoomChipName(user) {
  const nickname = String(user?.nickname || '').trim();
  if (nickname) {
    return nickname;
  }
  return String(user?.uniqueId || '').replace(/^@/, '').trim() || uiCopy.viewerUnknownUser;
}

function viewerRoomChipCoins(coinCount) {
  return uiCopy.viewerRoomTopCoins.replace('{coin}', formatViewerRoomCount(coinCount));
}

function applyViewerRoomStats(status) {
  const row = $('viewer-room-stats-row');
  const countEl = $('viewer-room-count');
  const topWrap = $('viewer-room-top');
  const topLabel = $('viewer-room-top-label');
  const giftersEl = $('viewer-room-top-gifters');
  if (!row || !countEl || !topWrap || !topLabel || !giftersEl) {
    return;
  }

  const live = status?.state === 'live';
  const stats = live && status?.roomStats ? status.roomStats : null;
  row.hidden = !stats;
  if (!stats) {
    countEl.textContent = '';
    topWrap.hidden = true;
    giftersEl.replaceChildren();
    return;
  }

  countEl.textContent = uiCopy.viewerRoomCount.replace(
    '{count}',
    formatViewerRoomCount(stats.viewerCount),
  );
  topLabel.textContent = uiCopy.viewerRoomTopLabel;
  giftersEl.replaceChildren();
  const gifters = Array.isArray(stats.topGifters) ? stats.topGifters : [];
  for (const gifter of gifters) {
    const chip = document.createElement('span');
    chip.className = 'viewer-room-stats__chip';
    const nameEl = document.createElement('span');
    nameEl.className = 'viewer-room-stats__chip-name';
    nameEl.textContent = viewerRoomChipName(gifter);
    const coinsEl = document.createElement('span');
    coinsEl.className = 'viewer-room-stats__chip-coins';
    coinsEl.textContent = viewerRoomChipCoins(gifter.coinCount);
    chip.append(nameEl, coinsEl);
    const id = String(gifter.uniqueId || '').replace(/^@/, '').trim();
    chip.title = id ? `@${id}` : '';
    giftersEl.appendChild(chip);
  }
  topWrap.hidden = giftersEl.childElementCount === 0;
}
