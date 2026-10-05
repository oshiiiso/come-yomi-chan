import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeMainWindowBounds,
  placeMainWindowBoundsOnDisplays,
} from '../../shared/window-bounds';
import { WINDOW_LAYOUT } from '../../shared/window-layout';

test('壊れた窓位置は捨て、幅高さは下限以上に丸める', () => {
  assert.equal(normalizeMainWindowBounds(null), null);
  assert.equal(normalizeMainWindowBounds({ x: 1, y: 2 }), null);
  assert.deepEqual(
    normalizeMainWindowBounds({
      x: 10.4,
      y: -20.6,
      width: 100,
      height: 50,
      isMaximized: true,
    }),
    {
      x: 10,
      y: -21,
      width: WINDOW_LAYOUT.main.minWidth,
      height: WINDOW_LAYOUT.main.minHeight,
      isMaximized: true,
    },
  );
});

test('画面外の窓は先頭モニタの中央へ戻す', () => {
  const displays = [
    { x: 0, y: 0, width: 1920, height: 1080 },
    { x: 1920, y: 0, width: 1280, height: 800 },
  ];
  const placed = placeMainWindowBoundsOnDisplays(
    {
      x: -5000,
      y: -4000,
      width: 900,
      height: 700,
      isMaximized: false,
    },
    displays,
  );
  assert.equal(placed.x, Math.round((1920 - 900) / 2));
  assert.equal(placed.y, Math.round((1080 - 700) / 2));
  assert.equal(placed.isMaximized, false);
});

test('どれかのモニタに載っていれば位置を保つ', () => {
  const displays = [
    { x: 0, y: 0, width: 1920, height: 1080 },
    { x: 1920, y: 0, width: 1280, height: 800 },
  ];
  const placed = placeMainWindowBoundsOnDisplays(
    {
      x: 2000,
      y: 40,
      width: 900,
      height: 700,
      isMaximized: true,
    },
    displays,
  );
  assert.equal(placed.x, 2000);
  assert.equal(placed.y, 40);
  assert.equal(placed.isMaximized, true);
});
