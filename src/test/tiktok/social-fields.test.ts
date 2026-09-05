import assert from 'node:assert/strict';
import { test } from 'node:test';
import { socialEventType } from '../../tiktok/social-fields';

test('v3 の displayText.key からフォローを判定する', () => {
  assert.equal(
    socialEventType({
      common: { displayText: { key: 'pm_mt_live_follow' } },
    }),
    'follow',
  );
});

test('v3 の displayText.key からシェアを判定する', () => {
  assert.equal(
    socialEventType({
      common: { displayText: { key: 'pm_mt_msg_social_share' } },
    }),
    'share',
  );
});

test('古い displayType 文字列でも判定する', () => {
  assert.equal(socialEventType({ displayType: 'pm_main_follow_message' }), 'follow');
  assert.equal(socialEventType({ displayType: 'pm_main_share_message' }), 'share');
});

test('該当しなければ null', () => {
  assert.equal(socialEventType({ user: { nickname: 'test' } }), null);
});
