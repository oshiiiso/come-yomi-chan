import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LikeTracker } from '../../app/like-tracker';

test('ユーザーごとにいいねを累計し、区切りをまたいだときだけ通知する', () => {
  const tracker = new LikeTracker();
  assert.equal(tracker.consume('a', 'A', 3, 10), null);
  assert.equal(tracker.consume('a', 'A', 7, 10), 10);
  assert.equal(tracker.consume('a', 'A', 1, 10), null);
  assert.equal(tracker.consume('b', 'B', 10, 10), 10);
});

test('一度に区切りを複数またいだときは最大値だけ返す', () => {
  const tracker = new LikeTracker();
  assert.equal(tracker.consume('a', 'A', 25, 10), 20);
  assert.equal(tracker.consume('a', 'A', 4, 10), null);
  assert.equal(tracker.consume('a', 'A', 1, 10), 30);
});

test('reset すると累計が消える', () => {
  const tracker = new LikeTracker();
  tracker.consume('a', 'A', 10, 10);
  tracker.reset();
  assert.equal(tracker.consume('a', 'A', 9, 10), null);
});

test('ユーザー数が上限を超えたら古い累計を捨てる', () => {
  const tracker = new LikeTracker(2);
  assert.equal(tracker.consume('a', 'A', 9, 10), null);
  assert.equal(tracker.consume('b', 'B', 9, 10), null);
  assert.equal(tracker.consume('c', 'C', 10, 10), 10);
  assert.equal(tracker.consume('a', 'A', 9, 10), null);
  assert.equal(tracker.consume('a', 'A', 1, 10), 10);
});

test('top は累計の多い順で返し、ニックネームを残す', () => {
  const tracker = new LikeTracker();
  tracker.consume('low', '少', 3, 100);
  tracker.consume('high', '多', 20, 100);
  tracker.consume('mid', '中', 10, 100);
  assert.deepEqual(tracker.top(2), [
    { uniqueId: 'high', nickname: '多', count: 20, avatarUrl: '' },
    { uniqueId: 'mid', nickname: '中', count: 10, avatarUrl: '' },
  ]);
});

test('consume は新しい avatarUrl を残し、空なら前回を保つ', () => {
  const tracker = new LikeTracker();
  tracker.consume('a', 'A', 5, 100, 'https://example.com/a.png');
  tracker.consume('a', 'A', 5, 100, '');
  assert.deepEqual(tracker.top(1), [
    {
      uniqueId: 'a',
      nickname: 'A',
      count: 10,
      avatarUrl: 'https://example.com/a.png',
    },
  ]);
  tracker.consume('a', 'A', 1, 100, 'https://example.com/b.png');
  assert.equal(tracker.top(1)[0]?.avatarUrl, 'https://example.com/b.png');
});
