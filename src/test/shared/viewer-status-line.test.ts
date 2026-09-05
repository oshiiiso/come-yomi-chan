import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildViewerStatusEvent, pickViewerStatusNotice } from '../../shared/viewer-status-line';

const copy = {
  connected: '配信に接続しました',
  disconnected: '切断しました',
  disconnectedFromLive: '配信から切断しました',
};

test('配信接続時だけ接続行を出す', () => {
  assert.deepEqual(pickViewerStatusNotice('connecting', 'live', copy), {
    kind: 'connected',
    text: copy.connected,
  });
  assert.equal(pickViewerStatusNotice('live', 'live', copy), null);
  assert.equal(pickViewerStatusNotice(null, 'live', copy), null);
});

test('配信接続中から外れたときだけ切断行を出す', () => {
  assert.deepEqual(pickViewerStatusNotice('live', 'disconnected', copy), {
    kind: 'disconnected',
    text: copy.disconnected,
  });
  assert.deepEqual(pickViewerStatusNotice('live', 'waiting_live', copy), {
    kind: 'disconnected',
    text: copy.disconnectedFromLive,
  });
  assert.equal(pickViewerStatusNotice('waiting_live', 'connecting', copy), null);
});

test('コメント画面向けの接続行イベントを作る', () => {
  const event = buildViewerStatusEvent(
    { kind: 'connected', text: copy.connected },
    '2026-09-07T00:00:00.000Z',
  );
  assert.equal(event.statusKind, 'connected');
  assert.equal(event.displayText, copy.connected);
  assert.equal(event.type, 'comment');
});
