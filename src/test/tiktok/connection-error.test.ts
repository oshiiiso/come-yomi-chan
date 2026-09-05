import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MSG } from '../../shared/messages';
import {
  classifyTikTokConnectError,
  tikTokRetryMessage,
  tikTokStatusMessage,
  tikTokStatusState,
} from '../../tiktok/connection-error';

test('配信前・終了は待ちとして扱う', () => {
  assert.equal(classifyTikTokConnectError(''), 'not-live');
  assert.equal(classifyTikTokConnectError('User is not live'), 'not-live');
  assert.equal(classifyTikTokConnectError('Failed to retrieve room_id'), 'not-live');
  assert.equal(tikTokStatusState('offline'), 'waiting_live');
  assert.equal(tikTokStatusMessage('not live'), MSG.connection.notLive);
});

test('ID誤りはエラーにする', () => {
  assert.equal(classifyTikTokConnectError('User not found'), 'user');
  assert.equal(classifyTikTokConnectError('invalid uniqueId'), 'user');
  assert.equal(tikTokStatusState('unknown user'), 'error');
  assert.equal(tikTokStatusMessage('user not found'), MSG.connection.userNotFound);
});

test('通信失敗はエラーにして再試行する', () => {
  assert.equal(classifyTikTokConnectError('ECONNREFUSED'), 'network');
  assert.equal(classifyTikTokConnectError('fetch failed'), 'network');
  assert.equal(classifyTikTokConnectError('接続が時間切れになりました'), 'network');
  assert.equal(tikTokStatusMessage('ENOTFOUND'), MSG.connection.networkFailed);
});

test('署名サービスの拒否は専用の案内にする', () => {
  assert.equal(
    classifyTikTokConnectError(
      'Failed to sign a request: This endpoint requires a Business plan',
    ),
    'sign',
  );
  assert.equal(
    classifyTikTokConnectError('[Empty Payload] [fetchWebcastSignatureFromEulerRoute]'),
    'sign',
  );
  assert.equal(tikTokStatusState('eulerstream.com/pricing'), 'error');
  assert.equal(
    tikTokStatusMessage('This endpoint requires a Business plan'),
    MSG.connection.signFailed,
  );
});

test('再試行メッセージに秒数を含める', () => {
  assert.equal(
    tikTokRetryMessage('User is not live', 5_000),
    MSG.connection.retrying(MSG.connection.notLive, 5),
  );
});
