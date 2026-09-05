import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_SETTINGS_PREVIEW_PX,
  MIN_SETTINGS_PREVIEW_PX,
  clampSettingsPreviewPx,
} from '../../shared/settings-layout';

test('プレビュー幅の初期値と範囲', () => {
  assert.equal(clampSettingsPreviewPx(undefined), DEFAULT_SETTINGS_PREVIEW_PX);
  assert.equal(clampSettingsPreviewPx(380), 380);
  assert.equal(clampSettingsPreviewPx(10), MIN_SETTINGS_PREVIEW_PX);
  assert.equal(clampSettingsPreviewPx(9000), 720);
});

test('ウィンドウが狭いときは設定側の幅を残す', () => {
  assert.equal(clampSettingsPreviewPx(500, 600), 320);
  assert.equal(clampSettingsPreviewPx(240, 600), 240);
});
