import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatLiveDuration,
  liveDurationAtConnect,
  parseStreamStartedAtMs,
} from '../../shared/live-duration';

test('roomInfo の create_time を ms に変換する', () => {
  assert.equal(parseStreamStartedAtMs({ create_time: 1_700_000_000 }), 1_700_000_000_000);
  assert.equal(parseStreamStartedAtMs({ createTime: 1_700_000_000_000 }), 1_700_000_000_000);
  assert.equal(parseStreamStartedAtMs({ data: { create_time: 1_700_000_100 } }), 1_700_000_100_000);
});

test('不正な create_time は null', () => {
  assert.equal(parseStreamStartedAtMs(null), null);
  assert.equal(parseStreamStartedAtMs({ create_time: 0 }), null);
  assert.equal(parseStreamStartedAtMs({ create_time: 'abc' }), null);
});

test('経過時間を M:SS または H:MM:SS で返す', () => {
  const start = Date.parse('2026-09-07T00:00:00.000Z');
  assert.equal(formatLiveDuration(start, start + 45_000), '0:45');
  assert.equal(formatLiveDuration(start, start + 125_000), '2:05');
  assert.equal(formatLiveDuration(start, start + 3_725_000), '1:02:05');
});

test('接続時点の配信時間を作る', () => {
  const start = 1_700_000_000_000;
  assert.equal(liveDurationAtConnect(start, start + 90_000), '1:30');
  assert.equal(liveDurationAtConnect(null, start), '');
});
