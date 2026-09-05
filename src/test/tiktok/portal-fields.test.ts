import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPortalGiftEvent, isPortalMemberJoin, looksLikePortal } from '../../tiktok/portal-fields';

test('ギフト名のポータルを判定する', () => {
  assert.equal(looksLikePortal('ポータル'), true);
  assert.equal(looksLikePortal('Portal'), true);
  assert.equal(looksLikePortal('Live Portal'), true);
  assert.equal(looksLikePortal('バラ'), false);
  assert.equal(isPortalGiftEvent({ giftName: 'ポータル' }), true);
  assert.equal(isPortalGiftEvent({ gift: { name: 'Portal' } }), true);
  assert.equal(isPortalGiftEvent({ gift: { name: 'バラ' } }), false);
});

test('入室の displayType からポータル経由を判定する', () => {
  assert.equal(
    isPortalMemberJoin({
      common: { displayText: { key: 'pm_mt_msg_liveportal' } },
    }),
    true,
  );
  assert.equal(isPortalMemberJoin({ displayType: 'live_room_enter_toast_portal' }), true);
  assert.equal(isPortalMemberJoin({ entrySource: 'portal' }), true);
  assert.equal(isPortalMemberJoin({ displayType: 'pm_mt_join_message' }), false);
  assert.equal(isPortalMemberJoin({ user: { nickname: 'test' } }), false);
});
