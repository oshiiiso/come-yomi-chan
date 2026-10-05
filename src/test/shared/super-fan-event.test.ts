import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SUPER_FAN_JOIN_DEDUPE_MS,
  SuperFanJoinDedupe,
  isSuperFanBoxEvent,
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
