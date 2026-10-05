import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, resetConfigKeepingIdentity } from '../../shared/config-store';
import { MSG } from '../../shared/messages';

test('初期化は TikTok ID・ポート・窓位置だけ残す', () => {
  const bounds = {
    x: 40,
    y: 60,
    width: 1000,
    height: 720,
    isMaximized: false,
  };
  const reset = resetConfigKeepingIdentity({
    uniqueId: 'sample_user',
    confirmedUniqueId: 'sample_user',
    overlayPort: 9123,
    mainWindowBounds: bounds,
  });
  assert.equal(reset.uniqueId, 'sample_user');
  assert.equal(reset.confirmedUniqueId, 'sample_user');
  assert.equal(reset.overlayPort, 9123);
  assert.deepEqual(reset.mainWindowBounds, bounds);
  assert.equal(reset.memberDisplayTemplate, MSG.template.memberDisplayDefault);
  assert.equal(reset.likeMilestone, DEFAULT_CONFIG.likeMilestone);
  assert.deepEqual(reset.events, DEFAULT_CONFIG.events);
  assert.equal(reset.ttsEngineId, DEFAULT_CONFIG.ttsEngineId);
  assert.equal(reset.overlayPinMs, DEFAULT_CONFIG.overlayPinMs);
  assert.equal(reset.clearPinHotkey, DEFAULT_CONFIG.clearPinHotkey);
  assert.equal(reset.commentSoundVolume, DEFAULT_CONFIG.commentSoundVolume);
  assert.equal(DEFAULT_CONFIG.commentSoundVolume, 100);
});
