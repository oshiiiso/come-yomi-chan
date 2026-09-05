import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';
import { SpeechPart } from '../template/render-template';
import { TtsEngine, TtsOptions } from './tts-engine';
import { concatPcmWav, makeSilentWav, parseWav, WavFormat } from './wav-utils';

const logger = getLogger('tts-queue');

export type TtsEnqueueResult =
  | { status: 'ok'; wav: Buffer }
  | { status: 'full' }
  | { status: 'cancelled' }
  | { status: 'failed' };

export interface TtsEnqueueOptions {
  priority?: boolean;
}

interface QueueJob {
  abort: AbortController;
  parts: SpeechPart[];
  priority: boolean;
  resolve: (result: TtsEnqueueResult) => void;
  settled: boolean;
}

export class TtsQueue {
  private queued = 0;
  private pumping = false;
  private readonly pending: QueueJob[] = [];
  private current: QueueJob | null = null;

  constructor(
    private readonly getEngine: () => TtsEngine,
    private readonly getMaxQueue: () => number,
    private readonly getBeatMs: () => number,
    private readonly getOptions: () => TtsOptions,
  ) {}

  size(): number {
    return this.queued;
  }

  enqueue(parts: SpeechPart[], options: TtsEnqueueOptions = {}): Promise<TtsEnqueueResult> {
    if (this.queued >= this.getMaxQueue()) {
      logger.warning('読み上げキューが上限に達したため、新しいコメントを捨てました');
      return Promise.resolve({ status: 'full' });
    }

    return new Promise((resolve) => {
      const job: QueueJob = {
        abort: new AbortController(),
        parts,
        priority: options.priority === true,
        resolve,
        settled: false,
      };
      this.insertJob(job);
      this.queued += 1;
      void this.pump();
    });
  }

  clearUnplayed(): void {
    this.current?.abort.abort();
    const waiting = this.pending.splice(0);
    for (const job of waiting) {
      job.abort.abort();
      this.settle(job, { status: 'cancelled' });
    }
  }

  private insertJob(job: QueueJob): void {
    if (!job.priority) {
      this.pending.push(job);
      return;
    }
    const index = this.pending.findIndex((item) => !item.priority);
    if (index === -1) {
      this.pending.push(job);
      return;
    }
    this.pending.splice(index, 0, job);
  }

  private settle(job: QueueJob, result: TtsEnqueueResult): void {
    if (job.settled) {
      return;
    }
    job.settled = true;
    job.resolve(result);
    this.queued = Math.max(0, this.queued - 1);
  }

  private async pump(): Promise<void> {
    if (this.pumping) {
      return;
    }
    this.pumping = true;
    try {
      while (this.pending.length > 0) {
        const job = this.pending.shift();
        if (!job) {
          break;
        }
        this.current = job;
        const result = await this.runJob(job);
        this.settle(job, result);
        if (this.current === job) {
          this.current = null;
        }
      }
    } finally {
      this.pumping = false;
      if (this.pending.length > 0) {
        void this.pump();
      }
    }
  }

  private async runJob(job: QueueJob): Promise<TtsEnqueueResult> {
    if (job.abort.signal.aborted) {
      return { status: 'cancelled' };
    }

    const wav = await this.synthesize(job.parts, job.abort.signal);
    if (job.abort.signal.aborted) {
      return { status: 'cancelled' };
    }
    if (!wav) {
      return { status: 'failed' };
    }
    return { status: 'ok', wav };
  }

  private async synthesize(
    parts: SpeechPart[],
    signal: AbortSignal,
  ): Promise<Buffer | null> {
    const texts = parts.filter((part) => part.kind === 'text');
    if (texts.length === 0) {
      return null;
    }

    const engine = this.getEngine();
    const options = this.getOptions();
    const beatMs = this.getBeatMs();
    const wavs: Buffer[] = [];
    let format: WavFormat | null = null;

    try {
      for (const part of parts) {
        if (signal.aborted) {
          return null;
        }
        if (part.kind === 'beat') {
          if (!format) {
            continue;
          }
          wavs.push(makeSilentWav(beatMs * part.count, format));
          continue;
        }

        const wav = await engine.synthesize(part.value, options);
        if (signal.aborted) {
          return null;
        }
        if (!format) {
          format = parseWav(wav);
        }
        wavs.push(wav);
      }

      if (wavs.length === 0) {
        return null;
      }

      return concatPcmWav(wavs);
    } catch (error) {
      logger.error(`読み上げ音声の生成に失敗しました: ${getErrorMessage(error)}`);
      return null;
    }
  }
}
