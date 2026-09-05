import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPortalJoinEvent, isPortalSendEvent } from '../../shared/portal-event';

test('種別 portal は投げ', () => {
  assert.equal(isPortalSendEvent({ type: 'portal' }), true);
  assert.equal(isPortalSendEvent({ type: 'member' }), false);
  assert.equal(isPortalSendEvent({ type: 'gift' }), false);
});

test('ギフト名がある入室はポータル経由', () => {
  assert.equal(isPortalJoinEvent({ type: 'member', giftName: 'ポータル' }), true);
  assert.equal(isPortalJoinEvent({ type: 'member', giftName: '' }), false);
  assert.equal(isPortalJoinEvent({ type: 'member' }), false);
  assert.equal(isPortalJoinEvent({ type: 'portal', giftName: 'ポータル' }), false);
});
