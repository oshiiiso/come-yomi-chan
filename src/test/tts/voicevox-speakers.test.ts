import assert from 'node:assert/strict';
import { test } from 'node:test';
import { speakerNameForVoice, voicesFromSpeakers } from '../../tts/voicevox-speakers';

test('VOICEVOXのスピーカー一覧から声とクレジット用名前を取る', () => {
  const voices = voicesFromSpeakers([
    {
      name: 'ずんだもん',
      styles: [
        { id: 3, name: 'ノーマル' },
        { id: 22, name: 'あまあま' },
      ],
    },
    {
      name: '四国めたん',
      styles: [{ id: 2, name: 'ノーマル' }],
    },
  ]);

  assert.deepEqual(voices, [
    { id: '3', name: 'ずんだもん', speakerName: 'ずんだもん' },
    { id: '22', name: 'ずんだもん（あまあま）', speakerName: 'ずんだもん' },
    { id: '2', name: '四国めたん', speakerName: '四国めたん' },
  ]);
  assert.equal(speakerNameForVoice(voices, '22'), 'ずんだもん');
});

test('壊れたスピーカー一覧は空にする', () => {
  assert.deepEqual(voicesFromSpeakers(null), []);
  assert.deepEqual(voicesFromSpeakers([{ name: 'x' }]), []);
});
