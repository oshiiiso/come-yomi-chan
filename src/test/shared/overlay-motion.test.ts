import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_MOTION,
  DEFAULT_OVERLAY_MOTION_SPEED,
  OVERLAY_MOTION_MS,
  normalizeOverlayMotion,
  normalizeOverlayMotionSpeed,
  overlayMotionMs,
} from '../../shared/overlay-motion';

test('壊れた動きはふわっととふつうに戻す', () => {
  assert.equal(normalizeOverlayMotion('unknown'), DEFAULT_OVERLAY_MOTION);
  assert.equal(normalizeOverlayMotion(undefined), DEFAULT_OVERLAY_MOTION);
  assert.equal(normalizeOverlayMotion('slide-up'), 'slide-up');
  assert.equal(normalizeOverlayMotionSpeed(0), DEFAULT_OVERLAY_MOTION_SPEED);
  assert.equal(normalizeOverlayMotionSpeed(9), DEFAULT_OVERLAY_MOTION_SPEED);
  assert.equal(normalizeOverlayMotionSpeed('4'), 4);
});

test('速さはふつうが480ms', () => {
  assert.equal(overlayMotionMs(DEFAULT_OVERLAY_MOTION_SPEED), 480);
  assert.equal(overlayMotionMs(1), OVERLAY_MOTION_MS[1]);
  assert.equal(overlayMotionMs(5), OVERLAY_MOTION_MS[5]);
});
