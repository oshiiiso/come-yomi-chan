import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EVENT_NOTIFY_MODE,
  isEventSoundType,
  normalizeEventNotifyMode,
  normalizeEventNotifyModeMap,
  normalizeEventSoundMap,
  normalizeEventSoundVolumeMap,
  resolveEventSoundVolume,
} from '../../shared/event-notify';
import { DEFAULT_SOUND_REF } from '../../shared/sound-ref';

test('イベント通知モードは speak / sound（旧 chime も sound）', () => {
  assert.equal(normalizeEventNotifyMode('sound'), 'sound');
  assert.equal(normalizeEventNotifyMode('chime'), 'sound');
  assert.equal(normalizeEventNotifyMode('speak'), 'speak');
  assert.equal(normalizeEventNotifyMode(''), 'speak');
  assert.equal(normalizeEventNotifyMode(null), 'speak');
});

test('イベント通知モードのマップは欠けを初期値で埋める', () => {
  assert.deepEqual(normalizeEventNotifyModeMap(undefined), DEFAULT_EVENT_NOTIFY_MODE);
  assert.equal(normalizeEventNotifyModeMap({ follow: 'sound', bad: 'x' }).follow, 'sound');
  assert.equal(normalizeEventNotifyModeMap({ follow: 'sound' }).share, 'speak');
});

test('イベントサウンドのマップはテンプレで埋める', () => {
  const map = normalizeEventSoundMap({
    follow: { kind: 'file', fileName: 'a.wav' },
  });
  assert.deepEqual(map.follow, { kind: 'file', fileName: 'a.wav' });
  assert.deepEqual(map.like, DEFAULT_SOUND_REF);
});

test('サウンド対象のイベント種別を判定する', () => {
  assert.equal(isEventSoundType('follow'), true);
  assert.equal(isEventSoundType('member'), true);
  assert.equal(isEventSoundType('gift'), false);
  assert.equal(isEventSoundType('comment'), false);
});

test('イベントサウンド音量は 0〜500・欠けは100', () => {
  const map = normalizeEventSoundVolumeMap({ follow: 250, like: -1, share: 999 });
  assert.equal(map.follow, 250);
  assert.equal(map.like, 0);
  assert.equal(map.share, 500);
  assert.equal(map.member, 100);
  assert.equal(resolveEventSoundVolume('follow', map), 250);
  assert.equal(resolveEventSoundVolume('portal', undefined), 100);
});
