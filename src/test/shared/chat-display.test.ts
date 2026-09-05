import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeChatDisplayMs } from '../../shared/chat-display';

test('表示時間 0 は無制限として残す', () => {
  assert.equal(normalizeChatDisplayMs(0), 0);
  assert.equal(normalizeChatDisplayMs(-8), 0);
});

test('表示時間は 1秒〜120秒に収める', () => {
  assert.equal(normalizeChatDisplayMs(500), 1000);
  assert.equal(normalizeChatDisplayMs(12_000), 12_000);
  assert.equal(normalizeChatDisplayMs(200_000), 120_000);
  assert.equal(normalizeChatDisplayMs('x'), 12_000);
});
