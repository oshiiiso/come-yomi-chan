import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SUPER_FAN_JOIN_DEDUPE_MS,
  SuperFanJoinDedupe,
  isSuperFanBoxEvent,
  shouldPlayGiftChime,
} from '../../shared/super-fan-event';

test('ギフト名があるスーパーファンはボックス', () => {
  assert.equal(isSuperFanBoxEvent({ type: 'superFan', giftName: 'スーパーファンボックス' }), true);
  assert.equal(isSuperFanBoxEvent({ type: 'superFan', giftName: '' }), false);
  assert.equal(isSuperFanBoxEvent({ type: 'superFan' }), false);
  assert.equal(isSuperFanBoxEvent({ type: 'gift', giftName: 'スーパーファンボックス' }), false);
});

test('同じ人の加入は短い間だけ捨てる', () => {
  const dedupe = new SuperFanJoinDedupe();
  const user = { uniqueId: 'alice' };
  assert.equal(dedupe.shouldSkip(user, 1_000), false);
  assert.equal(dedupe.shouldSkip(user, 1_000 + SUPER_FAN_JOIN_DEDUPE_MS - 1), true);
  assert.equal(dedupe.shouldSkip(user, 1_000 + SUPER_FAN_JOIN_DEDUPE_MS), false);
});

test('別人の加入は捨てない', () => {
  const dedupe = new SuperFanJoinDedupe();
  assert.equal(dedupe.shouldSkip({ uniqueId: 'alice' }, 1_000), false);
  assert.equal(dedupe.shouldSkip({ uniqueId: 'bob' }, 1_100), false);
});

test('高いギフトだけチャイムする', () => {
  assert.equal(shouldPlayGiftChime({ type: 'gift', diamondCount: 99 }, 100), false);
  assert.equal(shouldPlayGiftChime({ type: 'gift', diamondCount: 100 }, 100), true);
  assert.equal(shouldPlayGiftChime({ type: 'envelope', diamondCount: 120 }, 100), true);
  assert.equal(
    shouldPlayGiftChime({ type: 'superFan', giftName: 'スーパーファンボックス', diamondCount: 200 }, 100),
    true,
  );
  assert.equal(shouldPlayGiftChime({ type: 'superFan', giftName: '', diamondCount: 200 }, 100), false);
  assert.equal(shouldPlayGiftChime({ type: 'portal', giftName: 'ポータル', diamondCount: 200 }, 100), true);
  assert.equal(shouldPlayGiftChime({ type: 'member', giftName: 'ポータル', diamondCount: 200 }, 100), false);
  assert.equal(shouldPlayGiftChime({ type: 'gift', diamondCount: 999 }, 0), false);
});
