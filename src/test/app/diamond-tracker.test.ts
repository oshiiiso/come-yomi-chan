import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DiamondTracker } from '../../app/diamond-tracker';
import { giftDiamondDelta } from '../../shared/like-ranking';

test('ギフトダイヤ加算は個数×ダイヤ', () => {
  assert.equal(giftDiamondDelta(5, 3), 15);
  assert.equal(giftDiamondDelta(0, 10), 0);
  assert.equal(giftDiamondDelta(7, undefined), 7);
  assert.equal(giftDiamondDelta(-1, 2), 0);
});

test('ユーザーごとにダイヤを累計し多い順で返す', () => {
  const tracker = new DiamondTracker();
  tracker.consume('low', '少', giftDiamondDelta(1, 3));
  tracker.consume('high', '多', giftDiamondDelta(100, 2));
  tracker.consume('mid', '中', giftDiamondDelta(10, 5));
  assert.deepEqual(tracker.top(2), [
    { uniqueId: 'high', nickname: '多', count: 200, avatarUrl: '' },
    { uniqueId: 'mid', nickname: '中', count: 50, avatarUrl: '' },
  ]);
});

test('reset するとダイヤ累計が消える', () => {
  const tracker = new DiamondTracker();
  tracker.consume('a', 'A', 50);
  tracker.reset();
  assert.deepEqual(tracker.top(5), []);
});

test('0以下の加算は無視する', () => {
  const tracker = new DiamondTracker();
  tracker.consume('a', 'A', 0);
  tracker.consume('a', 'A', -3);
  assert.deepEqual(tracker.top(5), []);
});

test('ユーザー数が上限を超えたら古い累計を捨てる', () => {
  const tracker = new DiamondTracker(2);
  tracker.consume('a', 'A', 10);
  tracker.consume('b', 'B', 20);
  tracker.consume('c', 'C', 30);
  assert.deepEqual(
    tracker.top(5).map((row) => row.uniqueId),
    ['c', 'b'],
  );
});
