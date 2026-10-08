import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_LIKES_LOOK,
  MAX_OVERLAY_LIKES_FONT_SIZE,
  MIN_OVERLAY_LIKES_AVATAR_SIZE,
  MIN_OVERLAY_LIKES_FONT_SIZE,
  MIN_OVERLAY_LIKES_PANEL_WIDTH,
  OVERLAY_LIKES_LOOK_PRESETS,
  OVERLAY_LIKES_THEMES,
  normalizeOverlayLikesLook,
  overlayLikesLookFromConfig,
} from '../../shared/overlay-likes-look';

test('いいねランキング見た目プリセットは5種類', () => {
  assert.deepEqual([...OVERLAY_LIKES_THEMES], [
    'standard',
    'luxury',
    'compact',
    'neon',
    'minimal',
  ]);
  for (const theme of OVERLAY_LIKES_THEMES) {
    assert.equal(OVERLAY_LIKES_LOOK_PRESETS[theme]?.theme, theme);
  }
  assert.equal(DEFAULT_OVERLAY_LIKES_LOOK.theme, 'standard');
  assert.equal(DEFAULT_OVERLAY_LIKES_LOOK.showAvatar, true);
  assert.equal(DEFAULT_OVERLAY_LIKES_LOOK.showUnit, true);
  assert.equal(OVERLAY_LIKES_LOOK_PRESETS.luxury.fontSize, 26);
  assert.equal(OVERLAY_LIKES_LOOK_PRESETS.minimal.bgOpacity, 0);
});

test('壊れたいいねランキング見た目は初期値に戻す', () => {
  const look = normalizeOverlayLikesLook({
    theme: 'unknown' as never,
    fontFamily: 'comic' as never,
    fontSize: 999,
    bgOpacity: -3,
    avatarSize: 2,
    panelWidth: 10,
    neonHue: 400,
  });
  assert.equal(look.theme, DEFAULT_OVERLAY_LIKES_LOOK.theme);
  assert.equal(look.fontFamily, DEFAULT_OVERLAY_LIKES_LOOK.fontFamily);
  assert.equal(look.fontSize, MAX_OVERLAY_LIKES_FONT_SIZE);
  assert.equal(look.bgOpacity, 0);
  assert.equal(look.avatarSize, MIN_OVERLAY_LIKES_AVATAR_SIZE);
  assert.equal(look.panelWidth, MIN_OVERLAY_LIKES_PANEL_WIDTH);
  assert.equal(look.neonHue, 360);
});

test('設定オブジェクトからいいねランキング見た目を復元する', () => {
  const look = overlayLikesLookFromConfig({
    overlayLikesTheme: 'neon',
    overlayLikesFontFamily: 'meiryo',
    overlayLikesFontSize: 24,
    overlayLikesBgOpacity: 50,
    overlayLikesShowAvatar: false,
    overlayLikesAvatarSize: 40,
    overlayLikesItemRadius: 8,
    overlayLikesRowGap: 4,
    overlayLikesPanelWidth: 500,
    overlayLikesShowUnit: false,
    overlayLikesNeonHue: 200,
  });
  assert.equal(look.theme, 'neon');
  assert.equal(look.fontFamily, 'meiryo');
  assert.equal(look.showAvatar, false);
  assert.equal(look.showUnit, false);
  assert.equal(look.neonHue, 200);
  assert.equal(look.panelWidth, 500);
  assert.equal(look.fontSize, 24);
  assert.ok(look.fontSize >= MIN_OVERLAY_LIKES_FONT_SIZE);
});
