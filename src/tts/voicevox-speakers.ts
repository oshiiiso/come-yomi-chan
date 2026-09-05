export interface VoicevoxStyleInput {
  id?: unknown;
  name?: unknown;
}

export interface VoicevoxSpeakerInput {
  name?: unknown;
  styles?: unknown;
}

export interface VoicevoxVoice {
  id: string;
  name: string;
  speakerName: string;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asId(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return '';
}

export function voicesFromSpeakers(raw: unknown): VoicevoxVoice[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const voices: VoicevoxVoice[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const speaker = entry as VoicevoxSpeakerInput;
    const speakerName = asString(speaker.name).trim();
    if (!speakerName || !Array.isArray(speaker.styles)) {
      continue;
    }

    for (const styleRaw of speaker.styles) {
      if (!styleRaw || typeof styleRaw !== 'object') {
        continue;
      }
      const style = styleRaw as VoicevoxStyleInput;
      const id = asId(style.id);
      if (!id) {
        continue;
      }
      const styleName = asString(style.name).trim();
      const label =
        styleName && styleName !== 'ノーマル'
          ? `${speakerName}（${styleName}）`
          : speakerName;
      voices.push({
        id,
        name: label,
        speakerName,
      });
    }
  }

  return voices;
}

export function speakerNameForVoice(
  voices: VoicevoxVoice[],
  voiceId: string,
): string {
  const match = voices.find((voice) => voice.id === voiceId);
  return match?.speakerName ?? '';
}
