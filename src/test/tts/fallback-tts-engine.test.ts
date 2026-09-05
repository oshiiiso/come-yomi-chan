import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FallbackTtsEngine } from '../../tts/fallback-tts-engine';
import { TtsEngine, TtsOptions, TtsVoice } from '../../tts/tts-engine';
import { makeSilentWav, WavFormat } from '../../tts/wav-utils';

const FORMAT: WavFormat = {
  channels: 1,
  sampleRate: 22050,
  bitsPerSample: 16,
  data: Buffer.alloc(0),
};

class FakeEngine implements TtsEngine {
  readonly label: string;
  available = true;
  synthesizeCalls = 0;
  lastVoice = '';

  constructor(
    readonly id: string,
    private readonly failSynthesize = false,
  ) {
    this.label = id;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async listVoices(): Promise<TtsVoice[]> {
    return [{ id: this.id, name: this.id }];
  }

  async synthesize(_text: string, options: TtsOptions): Promise<Buffer> {
    this.synthesizeCalls += 1;
    this.lastVoice = options.voiceId;
    if (this.failSynthesize) {
      throw new Error('合成失敗');
    }
    return makeSilentWav(20, FORMAT);
  }

  async dispose(): Promise<void> {
    return;
  }
}

const options: TtsOptions = { voiceId: '23', rate: 3, volume: 100 };

test('優先エンジンが使えなければ内蔵TTSに切り替える', async () => {
  const voicevox = new FakeEngine('voicevox');
  voicevox.available = false;
  const windows = new FakeEngine('windows');
  const notices: string[] = [];
  const engine = new FallbackTtsEngine(
    () => voicevox,
    () => windows,
    (message) => notices.push(message),
  );

  const wav = await engine.synthesize('テスト', options);
  assert.ok(wav.length > 44);
  assert.equal(voicevox.synthesizeCalls, 0);
  assert.equal(windows.synthesizeCalls, 1);
  assert.equal(windows.lastVoice, '');
  assert.equal(notices.length, 1);
});

test('優先エンジンの合成に失敗しても内蔵TTSで読み上げる', async () => {
  const voicevox = new FakeEngine('voicevox', true);
  const windows = new FakeEngine('windows');
  const engine = new FallbackTtsEngine(
    () => voicevox,
    () => windows,
    () => undefined,
  );

  await engine.synthesize('テスト', options);
  assert.equal(voicevox.synthesizeCalls, 1);
  assert.equal(windows.synthesizeCalls, 1);
});

test('優先エンジンが使えるときは切り替えない', async () => {
  const voicevox = new FakeEngine('voicevox');
  const windows = new FakeEngine('windows');
  const engine = new FallbackTtsEngine(
    () => voicevox,
    () => windows,
    () => {
      throw new Error('切り替えない');
    },
  );

  await engine.synthesize('テスト', options);
  assert.equal(voicevox.synthesizeCalls, 1);
  assert.equal(windows.synthesizeCalls, 0);
  assert.equal(voicevox.lastVoice, '23');
});
