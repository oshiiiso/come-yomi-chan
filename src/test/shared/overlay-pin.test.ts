import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_PIN,
  DEFAULT_OVERLAY_PIN_MS,
  OVERLAY_PIN_QUEUE_MAX,
  canHoldOverlayPin,
  normalizeOverlayPin,
  normalizeOverlayPinMs,
  normalizeOverlayPinTypes,
  overlayPinFromConfig,
  shouldPinOverlayType,
  splitOverlayPinQueue,
  takeOverlayPinQueue,
} from '../../shared/overlay-pin';

test('壊れた秒数は4秒に戻し、範囲外は端に寄せる', () => {
  assert.equal(normalizeOverlayPinMs(undefined), DEFAULT_OVERLAY_PIN_MS);
  assert.equal(normalizeOverlayPinMs(Number.NaN), DEFAULT_OVERLAY_PIN_MS);
  assert.equal(normalizeOverlayPinMs('4000'), 4000);
  assert.equal(normalizeOverlayPinMs(500), 1000);
  assert.equal(normalizeOverlayPinMs(200_000), 120_000);
});

test('種類の欠けと型違いは初期の固定枠に戻す', () => {
  assert.deepEqual(normalizeOverlayPinTypes(undefined), DEFAULT_OVERLAY_PIN.types);
  assert.deepEqual(normalizeOverlayPinTypes('gift'), DEFAULT_OVERLAY_PIN.types);
  assert.equal(normalizeOverlayPinTypes({ gift: false, follow: 1 }).gift, false);
  assert.equal(normalizeOverlayPinTypes({ gift: false, follow: 1 }).follow, true);
});

test('コメントは固定枠にしない。旧 subscribe はスパファンに寄せる', () => {
  assert.equal(shouldPinOverlayType('comment'), false);
  assert.equal(shouldPinOverlayType('gift'), true);
  assert.equal(shouldPinOverlayType('subscribe'), true);
  assert.equal(shouldPinOverlayType('gift', { ...DEFAULT_OVERLAY_PIN.types, gift: false }), false);
  assert.equal(
    shouldPinOverlayType('gift', DEFAULT_OVERLAY_PIN.types, { preview: true, previewPinned: false }),
    false,
  );
  assert.equal(shouldPinOverlayType('unknown'), false);
  assert.equal(shouldPinOverlayType('gift', DEFAULT_OVERLAY_PIN.types, { enabled: false }), false);
});

test('出しっぱなしは固定枠が使えるときだけ', () => {
  assert.equal(canHoldOverlayPin(false), false);
  assert.equal(canHoldOverlayPin(true), true);
  assert.equal(canHoldOverlayPin(true, DEFAULT_OVERLAY_PIN.types, { enabled: false }), false);
  const none = Object.fromEntries(
    Object.keys(DEFAULT_OVERLAY_PIN.types).map((type) => [type, false]),
  ) as typeof DEFAULT_OVERLAY_PIN.types;
  assert.equal(canHoldOverlayPin(true, none), false);
  assert.equal(canHoldOverlayPin(true, { ...DEFAULT_OVERLAY_PIN.types, gift: false }), true);
  assert.equal(
    canHoldOverlayPin(true, DEFAULT_OVERLAY_PIN.types, { preview: true, previewPinned: false }),
    false,
  );
});

test('待ちが上限を超えたら古い方を捨てる', () => {
  const filled = takeOverlayPinQueue(
    Array.from({ length: OVERLAY_PIN_QUEUE_MAX }, (_, index) => index),
    OVERLAY_PIN_QUEUE_MAX,
  );
  assert.equal(filled.length, OVERLAY_PIN_QUEUE_MAX);
  assert.equal(filled[0], 1);
  assert.equal(filled[filled.length - 1], OVERLAY_PIN_QUEUE_MAX);
});

test('種類を外したら待ちのその種類は固定枠から外す', () => {
  const split = splitOverlayPinQueue(
    [{ type: 'gift' }, { type: 'follow' }, { type: 'gift' }],
    { ...DEFAULT_OVERLAY_PIN.types, gift: false },
  );
  assert.deepEqual(split.pinned.map((item) => item.type), ['follow']);
  assert.deepEqual(split.rest.map((item) => item.type), ['gift', 'gift']);
  const off = splitOverlayPinQueue(
    [{ type: 'gift' }, { type: 'follow' }],
    DEFAULT_OVERLAY_PIN.types,
    { enabled: false },
  );
  assert.deepEqual(off.pinned, []);
  assert.deepEqual(off.rest.map((item) => item.type), ['gift', 'follow']);
});

test('設定からの固定枠は hold 以外を初期値で埋める', () => {
  const pin = overlayPinFromConfig({
    overlayPinMs: '8000',
    overlayPinHold: true,
    overlayPinPreview: false,
  });
  assert.equal(pin.displayMs, 8000);
  assert.equal(pin.hold, true);
  assert.equal(pin.previewPinned, false);
  assert.equal(pin.enabled, true);
  assert.equal(pin.types.member, true);
  assert.equal(overlayPinFromConfig({ overlayPinEnabled: false }).enabled, false);
  assert.deepEqual(normalizeOverlayPin(undefined), DEFAULT_OVERLAY_PIN);
});
