import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_NAME_COLOR_ENABLED,
  DEFAULT_OVERLAY_NAME_COLORS,
  OVERLAY_NAME_COLORS_BY_LOOK_PRESET,
  isAutoOverlayNameColors,
  nameColorForUser,
  nameColorIndexForUser,
  nameColorsForLookPreset,
  normalizeOverlayNameColorEnabled,
  normalizeOverlayNameColors,
  resolveNameColorsForLookPreset,
} from '../../shared/overlay-name-colors';

test('壊れた色は既定5色に戻し、有効な hex は小文字にする', () => {
  assert.deepEqual(normalizeOverlayNameColors(undefined), [...DEFAULT_OVERLAY_NAME_COLORS]);
  assert.deepEqual(normalizeOverlayNameColors(['#AABBCC']), [
    '#aabbcc',
    DEFAULT_OVERLAY_NAME_COLORS[1],
    DEFAULT_OVERLAY_NAME_COLORS[2],
    DEFAULT_OVERLAY_NAME_COLORS[3],
    DEFAULT_OVERLAY_NAME_COLORS[4],
  ]);
  assert.equal(normalizeOverlayNameColors(['#12345'])[0], DEFAULT_OVERLAY_NAME_COLORS[0]);
});

test('名前色の ON/OFF は false 以外 true', () => {
  assert.equal(DEFAULT_OVERLAY_NAME_COLOR_ENABLED, true);
  assert.equal(normalizeOverlayNameColorEnabled(undefined), true);
  assert.equal(normalizeOverlayNameColorEnabled(false), false);
});

test('同じユーザーは同じ色。ID 優先で大文字小文字は区別しない', () => {
  const palette = normalizeOverlayNameColors(undefined);
  const indexA = nameColorIndexForUser('Alice', '別名');
  const indexB = nameColorIndexForUser('@ALICE', 'x');
  assert.equal(indexA, indexB);
  assert.equal(nameColorForUser('Alice', '別名', palette), palette[indexA]);
  const byNick = nameColorIndexForUser('', 'Bob');
  assert.equal(nameColorIndexForUser('', 'bob'), byNick);
  assert.equal(nameColorIndexForUser('', ''), 0);
});

test('かんたん見た目の名前色は初期値やプリセット色のときだけ差し替える', () => {
  assert.equal(isAutoOverlayNameColors(DEFAULT_OVERLAY_NAME_COLORS), true);
  assert.equal(isAutoOverlayNameColors(OVERLAY_NAME_COLORS_BY_LOOK_PRESET.light), true);
  assert.equal(isAutoOverlayNameColors(['#111111', '#222222', '#333333', '#444444', '#555555']), false);

  assert.deepEqual(
    resolveNameColorsForLookPreset('light', DEFAULT_OVERLAY_NAME_COLORS),
    OVERLAY_NAME_COLORS_BY_LOOK_PRESET.light,
  );
  assert.deepEqual(
    resolveNameColorsForLookPreset('neon', OVERLAY_NAME_COLORS_BY_LOOK_PRESET.light),
    OVERLAY_NAME_COLORS_BY_LOOK_PRESET.neon,
  );
  assert.equal(
    resolveNameColorsForLookPreset('light', ['#111111', '#222222', '#333333', '#444444', '#555555']),
    null,
  );
  assert.deepEqual(nameColorsForLookPreset('dark'), [...DEFAULT_OVERLAY_NAME_COLORS]);
});
