export interface TtsVoice {
  id: string;
  name: string;
  speakerName?: string;
}

export interface TtsOptions {
  voiceId: string;
  rate: number;
  volume: number;
}

export interface TtsEngine {
  readonly id: string;
  readonly label: string;
  isAvailable(): Promise<boolean>;
  listVoices(): Promise<TtsVoice[]>;
  synthesize(text: string, options: TtsOptions): Promise<Buffer>;
  dispose(): Promise<void>;
}
