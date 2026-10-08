import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import {
  buildAlertDisplayParts,
  defaultEventAlertEnabledFromSpeak,
  defaultEventAlertMediaMap,
  EVENT_ALERT_QUEUE_MAX,
  normalizeEventAlertDisplayMs,
  normalizeEventAlertDisplayMsMap,
  normalizeEventAlertEnabledMap,
  normalizeEventAlertMediaMap,
  resolveEventAlertDisplayMs,
  resolveEventAlertImageUrl,
  shouldEmitEventAlert,
  shouldShowEventAlert,
} from '../../shared/event-alert';
import { DEFAULT_EVENT_TOGGLES } from '../../shared/types';

test('アラート初期値は読み上げ（speak）と同じ（コメントは対象外）', () => {
  const enabled = defaultEventAlertEnabledFromSpeak(DEFAULT_EVENT_TOGGLES);
  assert.equal(enabled.gift, true);
  assert.equal(enabled.follow, true);
  assert.equal(enabled.like, false);
  assert.equal(enabled.member, false);
  assert.equal('comment' in enabled, false);
});

test('欠けたアラート設定は speak で埋める', () => {
  const enabled = normalizeEventAlertEnabledMap(undefined, {
    ...DEFAULT_EVENT_TOGGLES,
    follow: { display: true, speak: false },
  });
  assert.equal(enabled.follow, false);
  assert.equal(enabled.gift, true);
});

test('アラートONは speak と独立して残せる', () => {
  const enabled = normalizeEventAlertEnabledMap(
    { gift: true, follow: false },
    {
      ...DEFAULT_EVENT_TOGGLES,
      gift: { display: false, speak: false },
      follow: { display: true, speak: true },
    },
  );
  assert.equal(enabled.gift, true);
  assert.equal(enabled.follow, false);
});

test('メディアの正規化', () => {
  const media = normalizeEventAlertMediaMap({
    gift: { kind: 'file', fileName: 'spark.gif' },
    follow: { kind: 'none' },
    share: { kind: 'file', fileName: '../evil.png' },
  });
  assert.deepEqual(media.gift, { kind: 'file', fileName: 'spark.gif' });
  assert.deepEqual(media.follow, { kind: 'none' });
  assert.deepEqual(media.share, { kind: 'template', id: 'share' });
  assert.deepEqual(media.like, { kind: 'template', id: 'like' });
});

test('アラート画像の初期値はギフトが自動・他はテンプレ', () => {
  const media = defaultEventAlertMediaMap();
  assert.deepEqual(media.gift, { kind: 'auto' });
  assert.deepEqual(media.follow, { kind: 'template', id: 'follow' });
  assert.equal(
    shouldEmitEventAlert({
      type: 'gift',
      enabled: { ...defaultEventAlertEnabledFromSpeak(DEFAULT_EVENT_TOGGLES), gift: true },
      media,
    }),
    true,
  );
  assert.equal(
    resolveEventAlertImageUrl({ type: 'gift', media: media.gift, giftImageUrl: '' }),
    '/overlay/alert-templates/gift.gif',
  );
});

test('コメントはアラート対象外', () => {
  assert.equal(shouldShowEventAlert('comment', defaultEventAlertEnabledFromSpeak(DEFAULT_EVENT_TOGGLES)), false);
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'comment',
      media: { kind: 'template', id: 'gift' },
    }),
    null,
  );
});

test('表示秒数は 1〜120 秒に収める', () => {
  assert.equal(normalizeEventAlertDisplayMs(4000), 4000);
  assert.equal(normalizeEventAlertDisplayMs(500), 1000);
  assert.equal(normalizeEventAlertDisplayMs(999_999), 120_000);
  assert.equal(normalizeEventAlertDisplayMs('x'), 4000);
});

test('種類別表示時間は無いとき共通値で埋める', () => {
  const mapped = normalizeEventAlertDisplayMsMap(undefined, 8000);
  assert.equal(mapped.gift, 8000);
  assert.equal(mapped.follow, 8000);
  assert.equal(mapped.like, 8000);
});

test('種類別表示時間は一部だけ指定できる', () => {
  const mapped = normalizeEventAlertDisplayMsMap({ gift: 2000, follow: 10_000 }, 8000);
  assert.equal(mapped.gift, 2000);
  assert.equal(mapped.follow, 10_000);
  assert.equal(mapped.share, 4000);
});

test('種類別表示時間の旧 subscribe だけでも superFan に寄せる', () => {
  const mapped = normalizeEventAlertDisplayMsMap({ subscribe: 7000 }, 8000);
  assert.equal(mapped.superFan, 7000);
  assert.equal(mapped.gift, 4000);
});

test('種類別表示時間の解決', () => {
  const byType = normalizeEventAlertDisplayMsMap({ gift: 2000 });
  assert.equal(resolveEventAlertDisplayMs('gift', byType, 8000), 2000);
  assert.equal(resolveEventAlertDisplayMs('follow', byType, 8000), 4000);
  assert.equal(resolveEventAlertDisplayMs('subscribe', { superFan: 6000 } as never, 8000), 6000);
  assert.equal(resolveEventAlertDisplayMs('comment', byType, 8000), 8000);
});

test('アラート表示の判定', () => {
  assert.equal(
    shouldShowEventAlert('gift', { ...defaultEventAlertEnabledFromSpeak(DEFAULT_EVENT_TOGGLES), gift: true }),
    true,
  );
  assert.equal(
    shouldShowEventAlert('subscribe', {
      ...defaultEventAlertEnabledFromSpeak(DEFAULT_EVENT_TOGGLES),
      superFan: true,
    }),
    true,
  );
  assert.equal(
    shouldShowEventAlert('like', { ...defaultEventAlertEnabledFromSpeak(DEFAULT_EVENT_TOGGLES), like: false }),
    false,
  );
});

test('画像なし（none）のときはオンでもアラートを出さない', () => {
  const enabled = { ...defaultEventAlertEnabledFromSpeak(DEFAULT_EVENT_TOGGLES), follow: true };
  const media = defaultEventAlertMediaMap();
  media.follow = { kind: 'none' };
  assert.equal(
    shouldEmitEventAlert({ type: 'follow', enabled, media }),
    false,
  );
  media.follow = { kind: 'file', fileName: 'hello.gif' };
  assert.equal(
    shouldEmitEventAlert({ type: 'follow', enabled, media }),
    true,
  );
  media.gift = { kind: 'auto' };
  assert.equal(
    shouldEmitEventAlert({
      type: 'gift',
      enabled: { ...enabled, gift: true },
      media,
      giftImageUrl: '',
    }),
    true,
  );
  assert.equal(
    shouldEmitEventAlert({
      type: 'gift',
      enabled: { ...enabled, gift: true },
      media,
      giftImageUrl: '/media/gift?u=x',
    }),
    true,
  );
});

test('アラート画像の解決', () => {
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'gift',
      media: { kind: 'auto' },
      giftImageUrl: '/media/gift?u=https%3A%2F%2Fexample.com%2Fa.png',
    }),
    '/media/gift?u=https%3A%2F%2Fexample.com%2Fa.png',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'gift',
      media: { kind: 'auto' },
      giftImageUrl: '',
    }),
    '/overlay/alert-templates/gift.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'follow',
      media: { kind: 'auto' },
      giftImageUrl: '',
    }),
    null,
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'follow',
      media: { kind: 'file', fileName: 'hello.gif' },
    }),
    `/media/alerts/${encodeURIComponent('hello.gif')}`,
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'gift',
      media: { kind: 'none' },
      giftImageUrl: '/x.png',
    }),
    null,
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'follow',
      media: { kind: 'template', id: 'follow' },
    }),
    '/overlay/alert-templates/follow.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'gift',
      media: { kind: 'template', id: 'gift' },
      giftImageUrl: '/media/gift?u=x',
    }),
    '/overlay/alert-templates/gift.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'envelope',
      media: { kind: 'template', id: 'envelope' },
    }),
    '/overlay/alert-templates/chest.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'portal',
      media: { kind: 'template', id: 'portal' },
    }),
    '/overlay/alert-templates/portal.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'member',
      media: { kind: 'template', id: 'member' },
    }),
    '/overlay/alert-templates/door.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'member',
      media: { kind: 'template', id: 'member' },
      giftName: 'ポータル',
    }),
    '/overlay/alert-templates/portal_door.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'superFan',
      media: { kind: 'template', id: 'superFan' },
    }),
    '/overlay/alert-templates/superfan.gif',
  );
  assert.equal(
    resolveEventAlertImageUrl({
      type: 'superFan',
      media: { kind: 'template', id: 'superFan' },
      giftName: 'スーパーファンボックス',
    }),
    '/overlay/alert-templates/superfan_box.gif',
  );
});

test('テンプレ指定は正規化できる', () => {
  const media = normalizeEventAlertMediaMap({
    follow: { kind: 'template', id: 'follow' },
    gift: { kind: 'template', id: 'gift' },
  });
  assert.deepEqual(media.follow, { kind: 'template', id: 'follow' });
  assert.deepEqual(media.gift, { kind: 'template', id: 'gift' });
  const incompleteGift = normalizeEventAlertMediaMap({
    gift: { kind: 'template' },
  });
  assert.deepEqual(incompleteGift.gift, { kind: 'auto' });
});

test('アラート文言の名前色パーツを切り出す', () => {
  assert.deepEqual(
    buildAlertDisplayParts('テストユーザーさんがフォローしました', 'テストユーザー', '#ff0000'),
    [
      { kind: 'name', value: 'テストユーザー', color: '#ff0000' },
      { kind: 'text', value: 'さんがフォローしました' },
    ],
  );
  assert.deepEqual(
    buildAlertDisplayParts('ギフトです', 'テストユーザー', '#ff0000'),
    [{ kind: 'text', value: 'ギフトです' }],
  );
  assert.deepEqual(
    buildAlertDisplayParts('テストユーザーさん', 'テストユーザー', null),
    [{ kind: 'text', value: 'テストユーザーさん' }],
  );
});

test('alerts.js の待ち上限は EVENT_ALERT_QUEUE_MAX と揃える', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'ui', 'overlay', 'alerts.js'),
    'utf8',
  );
  const match = source.match(/const QUEUE_MAX = (\d+)/);
  assert.ok(match, 'QUEUE_MAX が見つからない');
  assert.equal(Number(match[1]), EVENT_ALERT_QUEUE_MAX);
});
