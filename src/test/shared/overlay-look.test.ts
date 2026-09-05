import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_LOOK,
  MAX_OVERLAY_FONT_SIZE,
  MIN_OVERLAY_FONT_SIZE,
  OVERLAY_LOOK_PRESETS,
  normalizeOverlayLook,
  overlayLookFromConfig,
} from '../../shared/overlay-look';

test('見た目プリセットは標準から派生する', () => {
  assert.equal(OVERLAY_LOOK_PRESETS.dark.theme, 'dark');
  assert.equal(
    DEFAULT_OVERLAY_LOOK.fontSize,
    (MIN_OVERLAY_FONT_SIZE + MAX_OVERLAY_FONT_SIZE) / 2,
  );
  assert.equal(OVERLAY_LOOK_PRESETS.dark.fontSize, 20);
  assert.equal(OVERLAY_LOOK_PRESETS.minimal.bgOpacity, 0);
  assert.equal(OVERLAY_LOOK_PRESETS.minimal.showAvatar, false);
  assert.equal(OVERLAY_LOOK_PRESETS.light.theme, 'light');
});

test('壊れた見た目設定は初期値に戻す', () => {
  const look = normalizeOverlayLook({
    theme: 'unknown' as never,
    fontFamily: 'comic' as never,
    fontSize: 999,
    bgOpacity: -3,
    align: 'center' as never,
  });
  assert.equal(look.theme, DEFAULT_OVERLAY_LOOK.theme);
  assert.equal(look.fontFamily, DEFAULT_OVERLAY_LOOK.fontFamily);
  assert.equal(look.fontSize, MAX_OVERLAY_FONT_SIZE);
  assert.equal(look.bgOpacity, 0);
  assert.equal(look.align, DEFAULT_OVERLAY_LOOK.align);
});

test('設定オブジェクトから見た目を復元する', () => {
  const look = overlayLookFromConfig({
    overlayTheme: 'neon',
    overlayFontFamily: 'meiryo',
    overlayFontSize: 20,
    overlayBgOpacity: 50,
    overlayShowAvatar: false,
    overlayGiftIconSize: 48,
    overlayItemRadius: 8,
    overlayNeonHue: 200,
    overlayAlign: 'right',
    overlayPreviewBackdrop: 'green',
    overlayMotion: 'fade',
    overlayMotionSpeed: 5,
  });
  assert.equal(look.theme, 'neon');
  assert.equal(look.fontFamily, 'meiryo');
  assert.equal(look.showAvatar, false);
  assert.equal(look.neonHue, 200);
  assert.equal(look.align, 'right');
  assert.equal(look.previewBackdrop, 'green');
  assert.equal(look.motion, 'fade');
  assert.equal(look.motionSpeed, 5);
});

test('ネオンの色相は0から360に収める', () => {
  assert.equal(OVERLAY_LOOK_PRESETS.neon.neonHue, DEFAULT_OVERLAY_LOOK.neonHue);
  assert.equal(normalizeOverlayLook({ neonHue: 400 }).neonHue, 360);
  assert.equal(normalizeOverlayLook({ neonHue: -8 }).neonHue, 0);
  assert.equal(overlayLookFromConfig({}).neonHue, DEFAULT_OVERLAY_LOOK.neonHue);
  assert.equal(overlayLookFromConfig({}).motion, DEFAULT_OVERLAY_LOOK.motion);
  assert.equal(overlayLookFromConfig({}).motionSpeed, DEFAULT_OVERLAY_LOOK.motionSpeed);
});
