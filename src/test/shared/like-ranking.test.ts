import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_LIKE_RANKING_MAX,
  DEFAULT_OVERLAY_RANKING_LIKE_POLL_SEC,
  DEFAULT_OVERLAY_RANKING_LIKE_SYNC_MODE,
  DEFAULT_OVERLAY_RANKING_MODE,
  OVERLAY_LIKE_RANKING_MAX,
  OVERLAY_LIKE_RANKING_MIN,
  OVERLAY_RANKING_LIKE_POLL_SEC_MAX,
  OVERLAY_RANKING_LIKE_POLL_SEC_MIN,
  formatLikeCount,
  giftDiamondDelta,
  normalizeOverlayLikeRankingMax,
  normalizeOverlayRankingLikePollSec,
  normalizeOverlayRankingLikeSyncMode,
  normalizeOverlayRankingMode,
  sameRanking,
} from '../../shared/like-ranking';

test('ランキング件数は 1〜10・初期5', () => {
  assert.equal(OVERLAY_LIKE_RANKING_MIN, 1);
  assert.equal(OVERLAY_LIKE_RANKING_MAX, 10);
  assert.equal(DEFAULT_OVERLAY_LIKE_RANKING_MAX, 5);
  assert.equal(normalizeOverlayLikeRankingMax(undefined), 5);
  assert.equal(normalizeOverlayLikeRankingMax(0), 1);
  assert.equal(normalizeOverlayLikeRankingMax(11), 10);
  assert.equal(normalizeOverlayLikeRankingMax(3.9), 3);
});

test('ランキングモードは likes / diamonds・初期 likes', () => {
  assert.equal(DEFAULT_OVERLAY_RANKING_MODE, 'likes');
  assert.equal(normalizeOverlayRankingMode(undefined), 'likes');
  assert.equal(normalizeOverlayRankingMode('diamonds'), 'diamonds');
  assert.equal(normalizeOverlayRankingMode('other'), 'likes');
});

test('いいね更新は live / poll・初期 live', () => {
  assert.equal(DEFAULT_OVERLAY_RANKING_LIKE_SYNC_MODE, 'live');
  assert.equal(normalizeOverlayRankingLikeSyncMode(undefined), 'live');
  assert.equal(normalizeOverlayRankingLikeSyncMode('poll'), 'poll');
  assert.equal(normalizeOverlayRankingLikeSyncMode('other'), 'live');
});

test('いいねポーリング間隔は 1〜300・初期 30', () => {
  assert.equal(OVERLAY_RANKING_LIKE_POLL_SEC_MIN, 1);
  assert.equal(OVERLAY_RANKING_LIKE_POLL_SEC_MAX, 300);
  assert.equal(DEFAULT_OVERLAY_RANKING_LIKE_POLL_SEC, 30);
  assert.equal(normalizeOverlayRankingLikePollSec(undefined), 30);
  assert.equal(normalizeOverlayRankingLikePollSec(0), 1);
  assert.equal(normalizeOverlayRankingLikePollSec(301), 300);
  assert.equal(normalizeOverlayRankingLikePollSec(45.9), 45);
});

test('ランキングの同一判定', () => {
  const a = [{ uniqueId: 'u1', nickname: '太郎', count: 10, avatarUrl: '' }];
  assert.equal(sameRanking(a, a), true);
  assert.equal(sameRanking(a, [{ ...a[0], count: 11 }]), false);
  assert.equal(sameRanking(a, [{ ...a[0], avatarUrl: '/a.png' }]), false);
  assert.equal(sameRanking(null, []), false);
  assert.equal(sameRanking(null, null), true);
});

test('ランキング数は千の位ごとにシングルクォート区切り', () => {
  assert.equal(formatLikeCount(0), '0');
  assert.equal(formatLikeCount(12), '12');
  assert.equal(formatLikeCount(1200), "1'200");
  assert.equal(formatLikeCount(12_500), "12'500");
  assert.equal(formatLikeCount(1_234_567), "1'234'567");
  assert.equal(formatLikeCount(-9), '9');
  assert.equal(formatLikeCount(Number.NaN), '0');
});

test('ギフトダイヤ加算は個数×ダイヤ', () => {
  assert.equal(giftDiamondDelta(5, 3), 15);
  assert.equal(giftDiamondDelta(0, 2), 0);
  assert.equal(giftDiamondDelta(10, undefined), 10);
});
