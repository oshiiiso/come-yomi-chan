/** src/shared/overlay-name-colors.ts と揃える（配信ソース用） */
(function (global) {
  const DEFAULT_NAME_COLORS = [
    '#5eead4',
    '#93c5fd',
    '#fcd34d',
    '#f9a8d4',
    '#86efac',
  ];

  function isNameColorHex(value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  }

  function normalizeNameColors(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return DEFAULT_NAME_COLORS.map((def, index) => {
      const candidate = list[index];
      return isNameColorHex(candidate) ? candidate.toLowerCase() : def;
    });
  }

  function sameNameColors(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((color, index) => color === right[index]);
  }

  function nameColorIndex(uniqueId, nickname) {
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

  function nameColorForUser(uniqueId, nickname, palette) {
    const colors = normalizeNameColors(
      Array.isArray(palette) && palette.length === DEFAULT_NAME_COLORS.length
        ? palette
        : DEFAULT_NAME_COLORS,
    );
    return colors[nameColorIndex(uniqueId, nickname)];
  }

  global.OverlayNameColors = {
    DEFAULT_NAME_COLORS,
    normalizeNameColors,
    sameNameColors,
    nameColorIndex,
    nameColorForUser,
  };
})(window);
