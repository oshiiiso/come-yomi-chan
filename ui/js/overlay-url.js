/** src/shared/overlay-url.ts の種類・コピー kind と揃える */

const OVERLAY_URL_KINDS = ['chat', 'alerts', 'ranking'];
const OVERLAY_URL_VARIANTS = ['live', 'obs', 'studio'];
const OVERLAY_COPY_KINDS = [
  'default',
  'local',
  'studio',
  'alerts',
  'alerts-local',
  'alerts-studio',
  'ranking',
  'ranking-local',
  'ranking-studio',
  'likes',
  'likes-local',
  'likes-studio',
];

function isOverlayUrlKind(value) {
  return typeof value === 'string' && OVERLAY_URL_KINDS.includes(value);
}

/** サンプル／クリア用。未知はコメント列。旧 likes は ranking へ */
function normalizeOverlayUrlKind(value) {
  if (value === 'likes' || value === 'ranking') {
    return 'ranking';
  }
  return isOverlayUrlKind(value) ? value : 'chat';
}

function isOverlayUrlVariant(value) {
  return typeof value === 'string' && OVERLAY_URL_VARIANTS.includes(value);
}

function normalizeOverlayCopyKind(value) {
  if (typeof value !== 'string') {
    return 'default';
  }
  if (value === 'likes') {
    return 'ranking';
  }
  if (value === 'likes-local') {
    return 'ranking-local';
  }
  if (value === 'likes-studio') {
    return 'ranking-studio';
  }
  return OVERLAY_COPY_KINDS.includes(value) ? value : 'default';
}

/** UI の種類×用途 → IPC kind */
function overlayCopyKindFrom(kind, variant) {
  const safeKind = normalizeOverlayUrlKind(kind);
  const safeVariant = isOverlayUrlVariant(variant) ? variant : 'live';
  if (safeKind === 'alerts') {
    if (safeVariant === 'obs') {
      return 'alerts-local';
    }
    if (safeVariant === 'studio') {
      return 'alerts-studio';
    }
    return 'alerts';
  }
  if (safeKind === 'ranking') {
    if (safeVariant === 'obs') {
      return 'ranking-local';
    }
    if (safeVariant === 'studio') {
      return 'ranking-studio';
    }
    return 'ranking';
  }
  if (safeVariant === 'obs') {
    return 'local';
  }
  if (safeVariant === 'studio') {
    return 'studio';
  }
  return 'default';
}
