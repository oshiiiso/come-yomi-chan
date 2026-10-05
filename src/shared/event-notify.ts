import { DEFAULT_SOUND_REF, normalizeSoundRef, type SoundRef } from './sound-ref';

export const EVENT_SOUND_TYPES = [
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
] as const;

export type EventSoundType = (typeof EVENT_SOUND_TYPES)[number];
export type EventNotifyMode = 'speak' | 'sound';
export type EventNotifyModeMap = Record<EventSoundType, EventNotifyMode>;
export type EventSoundMap = Record<EventSoundType, SoundRef>;

export const DEFAULT_EVENT_NOTIFY_MODE: EventNotifyModeMap = {
  follow: 'speak',
  share: 'speak',
  superFan: 'speak',
  envelope: 'speak',
  portal: 'speak',
  like: 'speak',
  member: 'speak',
};

export function defaultEventSoundMap(): EventSoundMap {
  return {
    follow: { ...DEFAULT_SOUND_REF },
    share: { ...DEFAULT_SOUND_REF },
    superFan: { ...DEFAULT_SOUND_REF },
    envelope: { ...DEFAULT_SOUND_REF },
    portal: { ...DEFAULT_SOUND_REF },
    like: { ...DEFAULT_SOUND_REF },
    member: { ...DEFAULT_SOUND_REF },
  };
}

export function isEventSoundType(type: string): type is EventSoundType {
  return (EVENT_SOUND_TYPES as readonly string[]).includes(type);
}

export function normalizeEventNotifyMode(raw: unknown): EventNotifyMode {
  if (raw === 'sound' || raw === 'chime') {
    return 'sound';
  }
  return 'speak';
}

export function normalizeEventNotifyModeMap(raw: unknown): EventNotifyModeMap {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: EventNotifyModeMap = { ...DEFAULT_EVENT_NOTIFY_MODE };
  for (const type of EVENT_SOUND_TYPES) {
    if (Object.prototype.hasOwnProperty.call(record, type)) {
      out[type] = normalizeEventNotifyMode(record[type]);
    }
  }
  return out;
}

export function normalizeEventSoundMap(raw: unknown): EventSoundMap {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = defaultEventSoundMap();
  for (const type of EVENT_SOUND_TYPES) {
    if (Object.prototype.hasOwnProperty.call(record, type)) {
      out[type] = normalizeSoundRef(record[type], DEFAULT_SOUND_REF);
    }
  }
  return out;
}
