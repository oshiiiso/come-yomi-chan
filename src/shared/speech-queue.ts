/** 読み上げ待ち。あふれた新しい方は捨てる。 */
export const SPEECH_QUEUE_MIN = 1;
export const SPEECH_QUEUE_MAX = 300;
export const DEFAULT_SPEECH_QUEUE = 100;

export function normalizeSpeechQueue(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return DEFAULT_SPEECH_QUEUE;
  }
  return Math.min(SPEECH_QUEUE_MAX, Math.max(SPEECH_QUEUE_MIN, Math.trunc(num)));
}
