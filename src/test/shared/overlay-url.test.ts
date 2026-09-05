import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeOverlayPublicHost,
  overlayPathUrl,
  overlayPreviewUrl,
  overlayPublicUrl,
  overlayStudioUrl,
} from '../../shared/overlay-url';

test('LIVE Studio向けURLはIPではなくホスト名にする', () => {
  assert.equal(overlayPathUrl('overlay.localhost', 8787), 'http://overlay.localhost:8787/overlay/');
  assert.doesNotMatch(overlayPublicUrl(8787), /127\.0\.0\.1/);
  assert.match(overlayPublicUrl(8787), /lvh\.me/);
  assert.match(overlayStudioUrl(8787), /overlay\.localhost/);
  assert.match(overlayPreviewUrl(8787), /127\.0\.0\.1/);
});

test('公開ホストはループバック向けだけ通す', () => {
  assert.equal(normalizeOverlayPublicHost('overlay.localhost'), 'overlay.localhost');
  assert.equal(normalizeOverlayPublicHost('lvh.me'), 'lvh.me');
  assert.equal(normalizeOverlayPublicHost('evil.example'), 'overlay.localhost');
});
