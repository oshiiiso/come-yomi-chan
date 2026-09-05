import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtsEngine, TtsOptions, TtsVoice } from '../../tts/tts-engine';
import { TtsQueue } from '../../tts/tts-queue';
import { makeSilentWav, WavFormat } from '../../tts/wav-utils';

const FORMAT: WavFormat = {
  channels: 1,
  sampleRate: 22050,
  bitsPerSample: 16,
  data: Buffer.alloc(0),
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class FakeEngine implements TtsEngine {
  readonly id = 'fake';
  readonly label = 'fake';
  started = 0;
  finished = 0;

  constructor(private readonly waitMs: number) {}

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async listVoices(): Promise<TtsVoice[]> {
    return [];
  }

  async synthesize(_text: string, _options: TtsOptions): Promise<Buffer> {
    this.started += 1;
    await delay(this.waitMs);
    this.finished += 1;
    return makeSilentWav(20, FORMAT);
  }

  async dispose(): Promise<void> {
    return;
  }
}

const options: TtsOptions = { voiceId: '', rate: 0, volume: 100 };

test('上限を超えた読み上げは full になる', async () => {
  const engine = new FakeEngine(30);
  const queue = new TtsQueue(
    () => engine,
    () => 1,
    () => 50,
    () => options,
  );
  const first = queue.enqueue([{ kind: 'text', value: 'one' }]);
  const second = await queue.enqueue([{ kind: 'text', value: 'two' }]);
  assert.equal(second.status, 'full');
  const result = await first;
  assert.equal(result.status, 'ok');
});

test('待ちを捨てると未再生の合成は cancelled になる', async () => {
  const engine = new FakeEngine(40);
  const queue = new TtsQueue(
    () => engine,
    () => 10,
    () => 50,
    () => options,
  );
  const first = queue.enqueue([{ kind: 'text', value: 'one' }]);
  const second = queue.enqueue([{ kind: 'text', value: 'two' }]);
  await delay(10);
  queue.clearUnplayed();
  const results = await Promise.all([first, second]);
  assert.equal(results[0].status, 'cancelled');
  assert.equal(results[1].status, 'cancelled');
  assert.equal(queue.size(), 0);
});

test('待ちを捨てたあとの新規は合成できる', async () => {
  const engine = new FakeEngine(10);
  const queue = new TtsQueue(
    () => engine,
    () => 10,
    () => 50,
    () => options,
  );
  const dropped = queue.enqueue([{ kind: 'text', value: 'old' }]);
  queue.clearUnplayed();
  await dropped;
  const next = await queue.enqueue([{ kind: 'text', value: 'new' }]);
  assert.equal(next.status, 'ok');
  if (next.status === 'ok') {
    assert.ok(next.wav.length > 44);
  }
});

test('優先の読み上げは待ちの後ろから先に合成する', async () => {
  const spoken: string[] = [];
  class OrderEngine extends FakeEngine {
    override async synthesize(text: string, options: TtsOptions): Promise<Buffer> {
      spoken.push(text);
      return super.synthesize(text, options);
    }
  }
  const engine = new OrderEngine(20);
  const queue = new TtsQueue(
    () => engine,
    () => 10,
    () => 50,
    () => options,
  );
  const first = queue.enqueue([{ kind: 'text', value: 'one' }]);
  const second = queue.enqueue([{ kind: 'text', value: 'two' }]);
  const third = queue.enqueue([{ kind: 'text', value: 'vip' }], { priority: true });
  await Promise.all([first, second, third]);
  assert.deepEqual(spoken, ['one', 'vip', 'two']);
});

test('複数パートの合成中に待ちを捨てると cancelled になる', async () => {
  const engine = new FakeEngine(40);
  const queue = new TtsQueue(
    () => engine,
    () => 10,
    () => 50,
    () => options,
  );
  const job = queue.enqueue([
    { kind: 'text', value: 'one' },
    { kind: 'text', value: 'two' },
  ]);
  await delay(10);
  queue.clearUnplayed();
  const result = await job;
  assert.equal(result.status, 'cancelled');
  assert.equal(queue.size(), 0);
});
