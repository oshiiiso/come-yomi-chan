import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_FAN_LEVEL_LOOK,
  fanLevelColor,
  fanLevelStepIndex,
  normalizeFanLevelLook,
} from '../../shared/fan-level-look';

test('初期の境目は 1 / 10 / 15 / 20 / 25', () => {
  assert.deepEqual(
    DEFAULT_FAN_LEVEL_LOOK.map((step) => step.minLevel),
    [1, 10, 15, 20, 25],
  );
});

test('レベ以上で段階が上がる', () => {
  assert.equal(fanLevelStepIndex(1), 0);
  assert.equal(fanLevelStepIndex(9), 0);
  assert.equal(fanLevelStepIndex(10), 1);
  assert.equal(fanLevelStepIndex(12), 1);
  assert.equal(fanLevelStepIndex(15), 2);
  assert.equal(fanLevelStepIndex(20), 3);
  assert.equal(fanLevelStepIndex(25), 4);
  assert.equal(fanLevelStepIndex(40), 4);
});

test('色は段階の色を返す', () => {
  assert.equal(fanLevelColor(1), DEFAULT_FAN_LEVEL_LOOK[0].color);
  assert.equal(fanLevelColor(25), DEFAULT_FAN_LEVEL_LOOK[4].color);
});

test('壊れた設定は初期値に戻しつつ5段階にする', () => {
  const look = normalizeFanLevelLook([
    { minLevel: 10, color: '#ff0000' },
    { minLevel: 1, color: 'red' },
    { minLevel: 10, color: '#00FF00' },
  ]);
  assert.equal(look.length, 5);
  assert.equal(look[0].minLevel, 1);
  assert.equal(look[1].color, '#ff0000');
  assert.equal(look[2].color, '#00ff00');
  assert.ok(look[1].minLevel < look[2].minLevel);
});
