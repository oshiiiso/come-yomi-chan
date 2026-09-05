import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';
import { MSG } from '../shared/messages';
import { TtsEngine, TtsOptions, TtsVoice } from './tts-engine';
import { voicesFromSpeakers } from './voicevox-speakers';

const logger = getLogger('voicevox-tts');

export class VoicevoxTtsEngine implements TtsEngine {
  readonly id = 'voicevox';
  readonly label = 'VOICEVOX';

  constructor(private readonly getBaseUrl: () => string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.request('/version', { method: 'GET' }, 2_000);
      return response.ok;
    } catch (error) {
      logger.warning(`VOICEVOXに接続できません: ${getErrorMessage(error)}`);
      return false;
    }
  }

  async listVoices(): Promise<TtsVoice[]> {
    const response = await this.request('/speakers', { method: 'GET' });
    if (!response.ok) {
      throw new Error(MSG.tts.voicevoxNotRunning);
    }
    const parsed: unknown = await response.json();
    return voicesFromSpeakers(parsed);
  }

  async synthesize(text: string, options: TtsOptions): Promise<Buffer> {
    const speaker = options.voiceId.trim();
    if (!speaker) {
      throw new Error(MSG.tts.voiceMissing);
    }

    const queryUrl = `/audio_query?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(speaker)}`;
    const queryResponse = await this.request(queryUrl, { method: 'POST' });
    if (!queryResponse.ok) {
      throw new Error(MSG.tts.synthesizeFailed);
    }

    const query = (await queryResponse.json()) as Record<string, unknown>;
    query.speedScale = mapSpeed(options.rate);
    query.volumeScale = Math.max(0, Math.min(2, options.volume / 100));

    const synthResponse = await this.request(
      `/synthesis?speaker=${encodeURIComponent(speaker)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      },
    );
    if (!synthResponse.ok) {
      throw new Error(MSG.tts.synthesizeFailed);
    }

    const bytes = Buffer.from(await synthResponse.arrayBuffer());
    if (bytes.length < 44) {
      throw new Error(MSG.tts.synthesizeFailed);
    }
    return bytes;
  }

  async dispose(): Promise<void> {
    return;
  }

  private async request(
    path: string,
    init: RequestInit,
    timeoutMs = 30_000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${this.getBaseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      logger.warning(`VOICEVOXリクエスト失敗: ${getErrorMessage(error)}`);
      throw new Error(MSG.tts.voicevoxNotRunning);
    } finally {
      clearTimeout(timer);
    }
  }
}

function mapSpeed(rate: number): number {
  return Math.max(0.5, Math.min(2, 1 + rate / 10));
}
