import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatViewerCountJa,
  normalizeTopGifters,
  normalizeViewerCount,
  parseConcurrentViewerCount,
  parseViewerRoomStats,
  sameViewerRoomStats,
} from '../../shared/viewer-room-stats';

test('視聴者数を0以上の整数に収める', () => {
  assert.equal(normalizeViewerCount(1234.8), 1234);
  assert.equal(normalizeViewerCount('567'), 567);
  assert.equal(normalizeViewerCount(-1), 0);
  assert.equal(normalizeViewerCount('abc'), 0);
});

test('ROOM_USER から視聴者数と上位ギフトを取る', () => {
  const stats = parseViewerRoomStats({
    viewerCount: 1200,
    ranksList: [
      { user: { uniqueId: 'fan_a', nickname: 'Aさん' }, coinCount: 500 },
      { user: { uniqueId: 'fan_b', nickname: 'Bさん' }, coin_count: 300 },
    ],
  });
  assert.deepEqual(stats, {
    viewerCount: 1200,
    topGifters: [
      { uniqueId: 'fan_a', nickname: 'Aさん', coinCount: 500 },
      { uniqueId: 'fan_b', nickname: 'Bさん', coinCount: 300 },
    ],
  });
});

test('新しい protobuf 形式の ranks と total も取る', () => {
  const stats = parseViewerRoomStats({
    total: '842',
    totalUser: '12000',
    popularity: '0',
    ranks: [
      { user: { displayId: 'fan_c', nickname: 'Cさん' }, score: '1200' },
      { user: { displayId: 'fan_d', nickname: 'Dさん' }, score: '800' },
    ],
  });
  assert.deepEqual(stats, {
    viewerCount: 842,
    topGifters: [
      { uniqueId: 'fan_c', nickname: 'Cさん', coinCount: 1200 },
      { uniqueId: 'fan_d', nickname: 'Dさん', coinCount: 800 },
    ],
  });
});

test('累計の totalUser だけでは同時視聴者数にしない', () => {
  assert.equal(parseConcurrentViewerCount({ totalUser: '12000' }), 0);
  assert.equal(parseViewerRoomStats({ totalUser: '12000', ranks: [] }), null);
  assert.equal(parseConcurrentViewerCount({ totalUser: '12000', total: '842' }), 842);
});

test('legacy topViewers 形式も取る', () => {
  const stats = parseViewerRoomStats({
    viewerCount: 50,
    topViewers: [
      { user: { uniqueId: 'legacy_a', nickname: 'Legacy', userId: '999' }, coinCount: 10 },
    ],
  });
  assert.deepEqual(stats?.topGifters[0], {
    uniqueId: 'legacy_a',
    nickname: 'Legacy',
    coinCount: 10,
  });
});

test('空の ROOM_USER は null', () => {
  assert.equal(parseViewerRoomStats(null), null);
  assert.equal(parseViewerRoomStats({ viewerCount: 0, ranksList: [] }), null);
});

test('上位ギフトは上限と重複を除く', () => {
  const list = normalizeTopGifters(
    [
      { user: { uniqueId: 'a', nickname: 'A' }, coinCount: 10 },
      { user: { uniqueId: 'a', nickname: 'A' }, coinCount: 20 },
      { user: { uniqueId: 'b', nickname: 'B' }, coinCount: 5 },
      { user: { uniqueId: 'c', nickname: 'C' }, coinCount: 4 },
      { user: { uniqueId: 'd', nickname: 'D' }, coinCount: 3 },
      { user: { uniqueId: 'e', nickname: 'E' }, coinCount: 2 },
      { user: { uniqueId: 'f', nickname: 'F' }, coinCount: 1 },
    ],
    5,
  );
  assert.equal(list.length, 5);
  assert.deepEqual(
    list.map((entry) => entry.uniqueId),
    ['a', 'b', 'c', 'd', 'e'],
  );
});

test('同じ統計なら更新不要と判定できる', () => {
  const stats = parseViewerRoomStats({ viewerCount: 10, ranksList: [] });
  assert.equal(sameViewerRoomStats(stats, stats), true);
  assert.equal(sameViewerRoomStats(stats, { viewerCount: 11, topGifters: [] }), false);
});

test('視聴者数を日本語の桁区切りで返す', () => {
  assert.equal(formatViewerCountJa(1234), '1,234');
});
