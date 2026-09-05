import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  readTikTokSessionConfig,
  tikTokSessionConnectionOptions,
} from '../../tiktok/session-options';

test('セッション未設定は null', () => {
  assert.equal(readTikTokSessionConfig({}), null);
});

test('片方だけ設定は null', () => {
  assert.equal(readTikTokSessionConfig({ TIKTOK_SESSION_ID: 'abc' }), null);
  assert.equal(readTikTokSessionConfig({ TIKTOK_TARGET_IDC: 'useast5' }), null);
});

test('両方設定で authenticateWs は明示時だけ true', () => {
  assert.deepEqual(readTikTokSessionConfig({
    TIKTOK_SESSION_ID: 'sid',
    TIKTOK_TARGET_IDC: 'useast5',
  }), {
    sessionId: 'sid',
    ttTargetIdc: 'useast5',
    authenticateWs: false,
  });
  assert.equal(
    readTikTokSessionConfig({
      TIKTOK_SESSION_ID: 'sid',
      TIKTOK_TARGET_IDC: 'useast5',
      TIKTOK_AUTHENTICATE_WS: '1',
    })?.authenticateWs,
    true,
  );
});

test('接続オプションに cookie を載せる', () => {
  const options = tikTokSessionConnectionOptions({
    sessionId: 'sid',
    ttTargetIdc: 'useast5',
    authenticateWs: true,
  });
  assert.equal(options.authenticateWs, true);
  const session = options.session as {
    cookie: { type: string; value: { sessionId: string; ttTargetIdc: string } };
  };
  assert.equal(session.cookie.type, 'cookie');
  assert.deepEqual(session.cookie.value, {
    sessionId: 'sid',
    ttTargetIdc: 'useast5',
  });
});
