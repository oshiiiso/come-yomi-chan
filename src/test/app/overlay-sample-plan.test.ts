import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOverlaySamplePlan } from '../../app/overlay-sample-plan';
import { DEFAULT_CONFIG } from '../../shared/config-store';

test('配信ソースサンプルはコメント候補と固定枠候補を分ける', () => {
  const plan = buildOverlaySamplePlan(DEFAULT_CONFIG, {
    id: 'rose',
    name: 'バラ',
    imageUrl: '/overlay/gift-rose.svg',
    diamondCount: 1,
  });
  assert.ok(plan.chatSamples.length >= 6);
  assert.ok(plan.pinSamples.length >= 2);
  assert.ok(plan.chatSamples.every((row) => row.type === 'comment' || row.displayText.length > 0));
  assert.ok(plan.pinSamples.some((row) => row.type === 'gift'));
});

test('名前を出さない設定はサンプル文言にも効く', () => {
  const hidden = buildOverlaySamplePlan(
    { ...DEFAULT_CONFIG, hideUserName: true },
    null,
  );
  const shown = buildOverlaySamplePlan(
    { ...DEFAULT_CONFIG, hideUserName: false },
    null,
  );
  const hiddenFollow = hidden.pinSamples.find((row) => row.type === 'follow');
  const shownFollow = shown.pinSamples.find((row) => row.type === 'follow');
  assert.ok(hiddenFollow);
  assert.ok(shownFollow);
  assert.notEqual(hiddenFollow.displayText, shownFollow.displayText);
});
