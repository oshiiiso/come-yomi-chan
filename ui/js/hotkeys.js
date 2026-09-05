// src/shared/hotkeys.ts と同じ判定。bundler が無いので UI 側にも置く。
const DEFAULT_SKIP_SPEECH_HOTKEY = 'F8';
const DEFAULT_CLEAR_SPEECH_HOTKEY = 'F9';
const DEFAULT_CLEAR_PIN_HOTKEY = 'F10';
const BLOCKED_HOTKEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'AltGraph',
  'OS',
  'Hyper',
  'Super',
  'Process',
  'Dead',
  'Compose',
  'Unidentified',
]);
const HOTKEY_LABELS = {
  ' ': 'スペース',
  Space: 'スペース',
  Spacebar: 'スペース',
  Escape: 'Esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

function isBlockedHotkey(key) {
  return !key || BLOCKED_HOTKEYS.has(key);
}

function isModifierToken(token) {
  const name = token.toLowerCase();
  return (
    name === 'ctrl' ||
    name === 'control' ||
    name === 'ctl' ||
    name === 'alt' ||
    name === 'shift' ||
    name === 'meta' ||
    name === 'win' ||
    name === 'cmd' ||
    name === 'super'
  );
}

function applyModifier(parts, token) {
  const name = token.toLowerCase();
  if (name === 'ctrl' || name === 'control' || name === 'ctl') {
    parts.ctrl = true;
    return;
  }
  if (name === 'alt') {
    parts.alt = true;
    return;
  }
  if (name === 'shift') {
    parts.shift = true;
    return;
  }
  parts.meta = true;
}

function normalizeMainKey(key) {
  if (key === ' ' || key === 'Spacebar' || key === 'Space') {
    return 'Space';
  }
  if (/^f\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }
  if (key.length === 1 && /[a-z]/.test(key)) {
    return key.toUpperCase();
  }
  return key;
}

function serializeHotkey(parts) {
  const mods = [];
  if (parts.ctrl) {
    mods.push('Ctrl');
  }
  if (parts.alt) {
    mods.push('Alt');
  }
  if (parts.shift) {
    mods.push('Shift');
  }
  if (parts.meta) {
    mods.push('Meta');
  }
  return [...mods, parts.key].join('+');
}

function parseHotkey(raw) {
  const rawTokens = raw.split('+');
  const tokens = rawTokens.map((token, index) => {
    const trimmed = token.trim();
    if (trimmed !== '') {
      return trimmed;
    }
    if (index === rawTokens.length - 1 && token.includes(' ')) {
      return 'Space';
    }
    return '';
  });
  if (tokens.length === 0 || tokens.some((token) => token === '')) {
    return null;
  }
  const keyToken = tokens[tokens.length - 1];
  if (isBlockedHotkey(keyToken) || isModifierToken(keyToken)) {
    return null;
  }
  const parts = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    key: normalizeMainKey(keyToken),
  };
  for (const token of tokens.slice(0, -1)) {
    if (!isModifierToken(token)) {
      return null;
    }
    applyModifier(parts, token);
  }
  return parts;
}

function partsFromEvent(event) {
  const key = typeof event.key === 'string' ? event.key : '';
  if (isBlockedHotkey(key)) {
    return null;
  }
  return {
    ctrl: Boolean(event.ctrlKey),
    alt: Boolean(event.altKey),
    shift: Boolean(event.shiftKey),
    meta: Boolean(event.metaKey),
    key: normalizeMainKey(key),
  };
}

function normalizeHotkey(raw, fallback) {
  if (typeof raw !== 'string') {
    return fallback;
  }
  const key = raw.trim();
  if (key === '') {
    return '';
  }
  const parts = parseHotkey(key);
  if (!parts) {
    return fallback;
  }
  return serializeHotkey(parts);
}

function hotkeyLabel(key) {
  if (!key) {
    return 'なし';
  }
  const parts = parseHotkey(key);
  if (!parts) {
    return HOTKEY_LABELS[key] ?? key;
  }
  const main = HOTKEY_LABELS[parts.key] ?? parts.key;
  const mods = [];
  if (parts.ctrl) {
    mods.push('Ctrl');
  }
  if (parts.alt) {
    mods.push('Alt');
  }
  if (parts.shift) {
    mods.push('Shift');
  }
  if (parts.meta) {
    mods.push('Meta');
  }
  return mods.length > 0 ? `${mods.join('+')}+${main}` : main;
}

function hotkeyFromEvent(event) {
  const parts = partsFromEvent(event);
  if (!parts) {
    return null;
  }
  return serializeHotkey(parts);
}

function isHotkeyEvent(event, hotkey) {
  if (!hotkey || event.repeat) {
    return false;
  }
  const expected = parseHotkey(hotkey);
  const actual = partsFromEvent(event);
  if (!expected || !actual) {
    return false;
  }
  return (
    actual.ctrl === expected.ctrl &&
    actual.alt === expected.alt &&
    actual.shift === expected.shift &&
    actual.meta === expected.meta &&
    actual.key === expected.key
  );
}
