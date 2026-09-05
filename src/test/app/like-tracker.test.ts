import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LikeTracker } from '../../app/like-tracker';

test('ユーザーごとにいいねを累計し、区切りをまたいだときだけ通知する', () => {
  const tracker = new LikeTracker();
  assert.equal(tracker.consume('a', 3, 10), null);
  assert.equal(tracker.consume('a', 7, 10), 10);
  assert.equal(tracker.consume('a', 1, 10), null);
  assert.equal(tracker.consume('b', 10, 10), 10);
});

test('一度に区切りを複数またいだときは最大値だけ返す', () => {
  const tracker = new LikeTracker();
  assert.equal(tracker.consume('a', 25, 10), 20);
  assert.equal(tracker.consume('a', 4, 10), null);
  assert.equal(tracker.consume('a', 1, 10), 30);
});

test('reset すると累計が消える', () => {
  const tracker = new LikeTracker();
  tracker.consume('a', 10, 10);
  tracker.reset();
  assert.equal(tracker.consume('a', 9, 10), null);
});

test('ユーザー数が上限を超えたら古い累計を捨てる', () => {
  const tracker = new LikeTracker(2);
  assert.equal(tracker.consume('a', 9, 10), null);
  assert.equal(tracker.consume('b', 9, 10), null);
  assert.equal(tracker.consume('c', 10, 10), 10);
  assert.equal(tracker.consume('a', 9, 10), null);
  assert.equal(tracker.consume('a', 1, 10), 10);
});
