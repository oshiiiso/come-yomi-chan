import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_GIFT_SOUND_REF,
  DEFAULT_SOUND_REF,
  normalizeGiftSoundRef,
  normalizeGiftSoundRefMap,
  normalizeSoundFileName,
  normalizeSoundRef,
  normalizeSoundRefMap,
} from '../../shared/sound-ref';

test('危険なファイル名は拒否する', () => {
  assert.equal(normalizeSoundFileName('../a.wav'), '');
  assert.equal(normalizeSoundFileName('a/b.wav'), '');
  assert.equal(normalizeSoundFileName('a\\b.wav'), '');
  assert.equal(normalizeSoundFileName('ok.mp3'), 'ok.mp3');
  assert.equal(normalizeSoundFileName('bad.txt'), '');
});

test('SoundRef の正規化', () => {
  assert.deepEqual(normalizeSoundRef({ kind: 'file', fileName: 'x.ogg' }), {
    kind: 'file',
    fileName: 'x.ogg',
  });
  assert.deepEqual(normalizeSoundRef({ kind: 'file', fileName: '../x.ogg' }), DEFAULT_SOUND_REF);
  assert.deepEqual(normalizeSoundRef(null), DEFAULT_SOUND_REF);
  assert.deepEqual(normalizeSoundRef({ kind: 'template', id: 'gift' }), DEFAULT_GIFT_SOUND_REF);
  assert.deepEqual(normalizeSoundRef({ kind: 'template', id: 'default' }), DEFAULT_SOUND_REF);
});

test('ギフト向け正規化は旧 default テンプレをチャリンへ寄せる', () => {
  assert.deepEqual(normalizeGiftSoundRef({ kind: 'template', id: 'default' }), DEFAULT_GIFT_SOUND_REF);
  assert.deepEqual(normalizeGiftSoundRef(null), DEFAULT_GIFT_SOUND_REF);
  assert.deepEqual(normalizeGiftSoundRef({ kind: 'file', fileName: 'a.wav' }), {
    kind: 'file',
    fileName: 'a.wav',
  });
  assert.deepEqual(
    normalizeGiftSoundRefMap({
      rose: { kind: 'template', id: 'default' },
      heart: { kind: 'file', fileName: 'h.wav' },
    }),
    {
      rose: DEFAULT_GIFT_SOUND_REF,
      heart: { kind: 'file', fileName: 'h.wav' },
    },
  );
});

test('マップの正規化', () => {
  assert.deepEqual(
    normalizeSoundRefMap({ '1': { kind: 'file', fileName: 'a.wav' }, '': { kind: 'template' } }),
    { '1': { kind: 'file', fileName: 'a.wav' } },
  );
});
