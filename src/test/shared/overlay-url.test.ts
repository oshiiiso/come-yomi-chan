import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeOverlayCopyKind,
  normalizeOverlayPublicHost,
  normalizeOverlayUrlKind,
  overlayAlertsPathUrl,
  overlayAlertsPreviewUrl,
  overlayAlertsPublicUrl,
  overlayAlertsStudioUrl,
  overlayCopyKindFrom,
  overlayLikesPathUrl,
  overlayLikesPreviewUrl,
  overlayLikesPublicUrl,
  overlayLikesStudioUrl,
  overlayPathUrl,
  overlayPreviewUrl,
  overlayPublicUrl,
  overlayStudioUrl,
  overlayUrlFieldsForPort,
  overlayUrlForCopyKind,
} from '../../shared/overlay-url';

test('LIVE Studio向けURLはIPではなくホスト名にする', () => {
  assert.equal(overlayPathUrl('overlay.localhost', 8787), 'http://overlay.localhost:8787/overlay/');
  assert.doesNotMatch(overlayPublicUrl(8787), /127\.0\.0\.1/);
  assert.match(overlayPublicUrl(8787), /lvh\.me/);
  assert.match(overlayStudioUrl(8787), /overlay\.localhost/);
  assert.match(overlayPreviewUrl(8787), /127\.0\.0\.1/);
});

test('イベントアラート用URLは /overlay/alerts/ になる', () => {
  assert.equal(
    overlayAlertsPathUrl('overlay.localhost', 8787),
    'http://overlay.localhost:8787/overlay/alerts/',
  );
  assert.match(overlayAlertsPublicUrl(8787), /\/overlay\/alerts\/$/);
  assert.match(overlayAlertsStudioUrl(8787), /overlay\.localhost.*\/overlay\/alerts\/$/);
  assert.match(overlayAlertsPreviewUrl(8787), /127\.0\.0\.1.*\/overlay\/alerts\/$/);
});

test('ランキング用URLは /overlay/ranking/ になる', () => {
  assert.equal(
    overlayLikesPathUrl('overlay.localhost', 8787),
    'http://overlay.localhost:8787/overlay/ranking/',
  );
  assert.match(overlayLikesPublicUrl(8787), /\/overlay\/ranking\/$/);
  assert.match(overlayLikesStudioUrl(8787), /overlay\.localhost.*\/overlay\/ranking\/$/);
  assert.match(overlayLikesPreviewUrl(8787), /127\.0\.0\.1.*\/overlay\/ranking\/$/);
});

test('公開ホストはループバック向けだけ通す', () => {
  assert.equal(normalizeOverlayPublicHost('overlay.localhost'), 'overlay.localhost');
  assert.equal(normalizeOverlayPublicHost('lvh.me'), 'lvh.me');
  assert.equal(normalizeOverlayPublicHost('evil.example'), 'overlay.localhost');
});

test('コピー kind の正規化と種類対応', () => {
  assert.equal(normalizeOverlayCopyKind('alerts-local'), 'alerts-local');
  assert.equal(normalizeOverlayCopyKind('likes'), 'ranking');
  assert.equal(normalizeOverlayCopyKind('likes-local'), 'ranking-local');
  assert.equal(normalizeOverlayCopyKind('nope'), 'default');
  assert.equal(overlayCopyKindFrom('alerts', 'obs'), 'alerts-local');
  assert.equal(overlayCopyKindFrom('ranking', 'live'), 'ranking');
  const fields = overlayUrlFieldsForPort(9000);
  assert.equal(overlayUrlForCopyKind(9000, 'alerts'), fields.overlayAlertsUrl);
  assert.match(fields.overlayPreviewUrl, /:9000\//);
});

test('配信ソース種類の正規化は未知をコメント列にする', () => {
  assert.equal(normalizeOverlayUrlKind('likes'), 'ranking');
  assert.equal(normalizeOverlayUrlKind('ranking'), 'ranking');
  assert.equal(normalizeOverlayUrlKind('alerts'), 'alerts');
  assert.equal(normalizeOverlayUrlKind('nope'), 'chat');
  assert.equal(normalizeOverlayUrlKind(undefined), 'chat');
});
