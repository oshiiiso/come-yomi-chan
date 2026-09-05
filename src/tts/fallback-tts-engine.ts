import { MSG } from '../shared/messages';
import { TtsEngine, TtsOptions, TtsVoice } from './tts-engine';

const READY_CACHE_OK_MS = 15_000;
const READY_CACHE_NG_MS = 4_000;

export class FallbackTtsEngine implements TtsEngine {
  readonly id = 'fallback';
  readonly label = 'fallback';

  private preferredOk = false;
  private availableUntil = 0;

  constructor(
    private readonly getPreferred: () => TtsEngine,
    private readonly getFallback: () => TtsEngine,
    private readonly onFallback: (message: string) => void,
  ) {}

  async isAvailable(): Promise<boolean> {
    if (await this.preferredReady()) {
      return true;
    }
    return this.getFallback().isAvailable();
  }

  async listVoices(): Promise<TtsVoice[]> {
    const preferred = this.getPreferred();
    if (await this.preferredReady()) {
      return preferred.listVoices();
    }
    return this.getFallback().listVoices();
  }

  async synthesize(text: string, options: TtsOptions): Promise<Buffer> {
    const preferred = this.getPreferred();
    const fallback = this.getFallback();
    if (preferred.id === fallback.id) {
      return preferred.synthesize(text, options);
    }

    if (await this.preferredReady()) {
      try {
        return await preferred.synthesize(text, options);
      } catch {
        this.markPreferred(false);
        this.onFallback(MSG.tts.fallbackWindows);
        return fallback.synthesize(text, fallbackOptions(options));
      }
    }

    this.onFallback(MSG.tts.fallbackWindows);
    return fallback.synthesize(text, fallbackOptions(options));
  }

  async dispose(): Promise<void> {
    return;
  }

  private async preferredReady(): Promise<boolean> {
    const now = Date.now();
    if (now < this.availableUntil) {
      return this.preferredOk;
    }

    const preferred = this.getPreferred();
    const fallback = this.getFallback();
    if (preferred.id === fallback.id) {
      this.markPreferred(true);
      return true;
    }

    const ok = await preferred.isAvailable();
    this.markPreferred(ok);
    return ok;
  }

  private markPreferred(ok: boolean): void {
    this.preferredOk = ok;
    this.availableUntil = Date.now() + (ok ? READY_CACHE_OK_MS : READY_CACHE_NG_MS);
  }
}

function fallbackOptions(options: TtsOptions): TtsOptions {
  return {
    voiceId: '',
    rate: options.rate,
    volume: options.volume,
  };
}
