// src/shared/overlay-pin.ts と同じ判定。bundler が無いので UI 側にも置く。
const OVERLAY_PIN_TYPES = [
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];
const DEFAULT_OVERLAY_PIN_MS = 4000;
const MIN_OVERLAY_PIN_MS = 1000;
const MAX_OVERLAY_PIN_MS = 120000;
const OVERLAY_PIN_QUEUE_MAX = 80;
const DEFAULT_OVERLAY_PIN_TYPES = {
  gift: true,
  follow: true,
  share: true,
  superFan: true,
  envelope: true,
  portal: true,
  like: true,
  member: true,
};

function normalizeOverlayPinMs(value) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_OVERLAY_PIN_MS;
  }
  const ms = Math.trunc(parsed);
  return Math.min(MAX_OVERLAY_PIN_MS, Math.max(MIN_OVERLAY_PIN_MS, ms));
}

function normalizeOverlayPinTypes(raw) {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const next = { ...DEFAULT_OVERLAY_PIN_TYPES };
  for (const type of OVERLAY_PIN_TYPES) {
    if (typeof record[type] === 'boolean') {
      next[type] = record[type];
    }
  }
  return next;
}

function shouldPinOverlayType(type, types, options) {
  if (options?.enabled === false) {
    return false;
  }
  if (options?.preview && options.previewPinned === false) {
    return false;
  }
  if (typeof type !== 'string' || type === 'comment') {
    return false;
  }
  const key = type === 'subscribe' ? 'superFan' : type;
  if (!OVERLAY_PIN_TYPES.includes(key)) {
    return false;
  }
  const map = types || DEFAULT_OVERLAY_PIN_TYPES;
  return map[key] === true;
}

function canHoldOverlayPin(hold, types, options) {
  if (hold !== true) {
    return false;
  }
  return OVERLAY_PIN_TYPES.some((type) => shouldPinOverlayType(type, types, options));
}

function takeOverlayPinQueue(queue, incoming) {
  const next = [...queue, incoming];
  if (next.length <= OVERLAY_PIN_QUEUE_MAX) {
    return next;
  }
  return next.slice(next.length - OVERLAY_PIN_QUEUE_MAX);
}

function splitOverlayPinQueue(queue, types, options) {
  const pinned = [];
  const rest = [];
  for (const item of queue) {
    if (shouldPinOverlayType(item.type, types, options)) {
      pinned.push(item);
    } else {
      rest.push(item);
    }
  }
  return { pinned, rest };
}
