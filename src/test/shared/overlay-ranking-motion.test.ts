import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_RANKING_MOTION,
  DEFAULT_OVERLAY_RANKING_MOTION_SPEED,
  OVERLAY_RANKING_MOTION_MS,
  normalizeOverlayRankingMotion,
  normalizeOverlayRankingMotionSpeed,
  overlayRankingMotionMs,
} from '../../shared/overlay-ranking-motion';

test('ランキング動きは slide / soft / emphasis・初期 slide', () => {
  assert.equal(DEFAULT_OVERLAY_RANKING_MOTION, 'slide');
  assert.equal(normalizeOverlayRankingMotion(undefined), 'slide');
  assert.equal(normalizeOverlayRankingMotion('soft'), 'soft');
  assert.equal(normalizeOverlayRankingMotion('emphasis'), 'emphasis');
  assert.equal(normalizeOverlayRankingMotion('other'), 'slide');
});

test('ランキング速さは 1〜3・初期 2・ms は 720/480/320', () => {
  assert.equal(DEFAULT_OVERLAY_RANKING_MOTION_SPEED, 2);
  assert.equal(normalizeOverlayRankingMotionSpeed(undefined), 2);
  assert.equal(normalizeOverlayRankingMotionSpeed(1), 1);
  assert.equal(normalizeOverlayRankingMotionSpeed(3), 3);
  assert.equal(normalizeOverlayRankingMotionSpeed(9), 2);
  assert.equal(OVERLAY_RANKING_MOTION_MS[1], 720);
  assert.equal(OVERLAY_RANKING_MOTION_MS[2], 480);
  assert.equal(OVERLAY_RANKING_MOTION_MS[3], 320);
  assert.equal(overlayRankingMotionMs(2), 480);
});
