import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allocateSoundFileName, collectReferencedSoundFiles } from '../../shared/sound-files';

test('取り込み名は元のファイル名を優先する', () => {
  assert.equal(allocateSoundFileName('Cat Paws.mp3', 'mp3'), 'Cat Paws.mp3');
});

test('同名があっても上書き用に同じ名前を返す', () => {
  assert.equal(allocateSoundFileName('cat.mp3', 'mp3'), 'cat.mp3');
});

test('危険なパスはタイムスタンプ名に落とす', () => {
  const name = allocateSoundFileName('../x.mp3', 'mp3');
  assert.match(name, /^[a-z0-9]+\.mp3$/i);
});

test('参照中の効果音だけ集める', () => {
  const keep = collectReferencedSoundFiles({
    giftChimeSound: { kind: 'file', fileName: 'common.mp3' },
    commentSound: { kind: 'template', id: 'default' },
    giftChimeByGiftId: {
      '1': { kind: 'file', fileName: 'rose.wav' },
      '2': { kind: 'template', id: 'gift' },
    },
    giftChimeDiamondBands: [
      {
        minDiamonds: 1,
        maxDiamonds: 10,
        sound: { kind: 'file', fileName: 'band.ogg' },
        volume: 100,
      },
    ],
    eventSound: {
      follow: { kind: 'file', fileName: 'follow.mp3' },
      share: { kind: 'template', id: 'default' },
      superFan: { kind: 'template', id: 'default' },
      envelope: { kind: 'template', id: 'default' },
      portal: { kind: 'template', id: 'default' },
      like: { kind: 'template', id: 'default' },
      member: { kind: 'template', id: 'default' },
    },
  });
  assert.deepEqual([...keep].sort(), ['band.ogg', 'common.mp3', 'follow.mp3', 'rose.wav']);
});
