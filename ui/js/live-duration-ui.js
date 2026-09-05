/** src/shared/live-duration.ts と同じ。bundler が無いので UI 側にも置く。 */
function formatLiveDuration(startedAtMs, nowMs) {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) {
    return '';
  }
  const totalSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

let liveDurationTimer = 0;
let liveDurationStartedAtMs = null;

function stopLiveDurationClock() {
  if (liveDurationTimer) {
    window.clearInterval(liveDurationTimer);
    liveDurationTimer = 0;
  }
  liveDurationStartedAtMs = null;
  const el = $('status-live-duration');
  if (el) {
    el.textContent = '';
    el.hidden = true;
  }
}

function tickLiveDurationClock() {
  const el = $('status-live-duration');
  if (!el || liveDurationStartedAtMs == null) {
    return;
  }
  el.textContent = formatLiveDuration(liveDurationStartedAtMs, Date.now());
}

function syncLiveDurationClock(status) {
  const el = $('status-live-duration');
  if (!el) {
    return;
  }
  if (status?.state !== 'live') {
    stopLiveDurationClock();
    return;
  }
  const startedAt = Number(status.streamStartedAtMs);
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    stopLiveDurationClock();
    return;
  }
  if (liveDurationStartedAtMs === startedAt && liveDurationTimer) {
    tickLiveDurationClock();
    return;
  }
  stopLiveDurationClock();
  liveDurationStartedAtMs = startedAt;
  el.hidden = false;
  tickLiveDurationClock();
  liveDurationTimer = window.setInterval(tickLiveDurationClock, 1000);
}
