import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../../shared/config-store';
import {
  resolveWatcherDisconnect,
  shouldClearSpeechQueueOnConfigChange,
} from '../../shared/live-disconnect';
import { MSG } from '../../shared/messages';

test('配信終了は切断状態にする', () => {
  const next = resolveWatcherDisconnect('live', MSG.connection.streamEnded);
  assert.deepEqual(next, {
    state: 'disconnected',
    message: MSG.connection.streamEnded,
    fullStop: true,
  });
});

test('配信からの一時切断は待機に戻す', () => {
  const next = resolveWatcherDisconnect('live', MSG.connection.disconnectedFromLive);
  assert.deepEqual(next, {
    state: 'waiting_live',
    message: MSG.connection.disconnectedFromLive,
    fullStop: false,
  });
});

test('すでに切断済みなら何もしない', () => {
  assert.equal(resolveWatcherDisconnect('disconnected', MSG.connection.streamEnded), null);
});

test('読み上げ判定に関わる設定変更で待ちを捨てる', () => {
  assert.equal(
    shouldClearSpeechQueueOnConfigChange(DEFAULT_CONFIG, {
      ...DEFAULT_CONFIG,
      giftNotifyMode: 'chime',
    }),
    true,
  );
  assert.equal(
    shouldClearSpeechQueueOnConfigChange(DEFAULT_CONFIG, {
      ...DEFAULT_CONFIG,
      giftSpeakByGiftId: { rose: false },
    }),
    true,
  );
  assert.equal(
    shouldClearSpeechQueueOnConfigChange(DEFAULT_CONFIG, {
      ...DEFAULT_CONFIG,
      blockedUsers: ['blocked'],
    }),
    true,
  );
  assert.equal(
    shouldClearSpeechQueueOnConfigChange(DEFAULT_CONFIG, {
      ...DEFAULT_CONFIG,
      events: {
        ...DEFAULT_CONFIG.events,
        gift: { ...DEFAULT_CONFIG.events.gift, speak: false },
      },
    }),
    true,
  );
  assert.equal(
    shouldClearSpeechQueueOnConfigChange(DEFAULT_CONFIG, {
      ...DEFAULT_CONFIG,
      events: {
        ...DEFAULT_CONFIG.events,
        gift: { ...DEFAULT_CONFIG.events.gift, display: false },
      },
    }),
    false,
  );
  assert.equal(shouldClearSpeechQueueOnConfigChange(DEFAULT_CONFIG, DEFAULT_CONFIG), false);
});
