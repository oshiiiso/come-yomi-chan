import assert from 'node:assert/strict';
import { test } from 'node:test';
import { envelopeDiamondCount, isHiddenEnvelope, isSuperFanEnvelope } from '../../tiktok/envelope-fields';

test('スーパーファンボックスは businessType 19', () => {
  assert.equal(isSuperFanEnvelope({ envelopeInfo: { businessType: 19 } }), true);
  assert.equal(isSuperFanEnvelope({ envelopeInfo: { businessType: 1 } }), false);
});

test('非表示の宝箱は出さない', () => {
  assert.equal(isHiddenEnvelope({ display: 2 }), true);
  assert.equal(isHiddenEnvelope({ display: 1 }), false);
});

test('宝箱のダイヤ数を取る', () => {
  assert.equal(envelopeDiamondCount({ envelopeInfo: { diamondCount: 30 } }), 30);
});
