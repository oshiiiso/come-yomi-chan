import assert from 'node:assert/strict';
import { test } from 'node:test';
import { concatPcmWav, makeSilentWav, parseWav } from '../../tts/wav-utils';

test('無音 WAV を生成して読める', () => {
  const wav = makeSilentWav(100, {
    channels: 1,
    sampleRate: 22050,
    bitsPerSample: 16,
    data: Buffer.alloc(0),
  });
  const parsed = parseWav(wav);
  assert.equal(parsed.channels, 1);
  assert.equal(parsed.sampleRate, 22050);
  assert.equal(parsed.bitsPerSample, 16);
  assert.ok(parsed.data.length > 0);
});

test('同じ形式の WAV を結合できる', () => {
  const format = {
    channels: 1,
    sampleRate: 22050,
    bitsPerSample: 16,
    data: Buffer.alloc(0),
  };
  const first = makeSilentWav(50, format);
  const second = makeSilentWav(50, format);
  const merged = concatPcmWav([first, second]);
  const parsed = parseWav(merged);
  const expected = parseWav(first).data.length + parseWav(second).data.length;
  assert.equal(parsed.data.length, expected);
});
