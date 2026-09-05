import { MSG } from '../shared/messages';

export function formatVoicevoxCredit(speakerName: string): string {
  const name = speakerName.trim();
  if (!name) {
    return '';
  }
  if (name.startsWith('VOICEVOX:')) {
    return name;
  }
  return `VOICEVOX:${name}`;
}

export function formatVoicevoxDescriptionCredit(speakerName: string): string {
  const credit = formatVoicevoxCredit(speakerName);
  if (!credit) {
    return '';
  }
  return MSG.tts.voicevoxDescription(credit);
}
