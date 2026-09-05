import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatVoicevoxCredit,
  formatVoicevoxDescriptionCredit,
} from '../../tts/voicevox-credit';

test('概要欄用クレジットをキャラ名から作る', () => {
  assert.equal(formatVoicevoxCredit('ずんだもん'), 'VOICEVOX:ずんだもん');
  assert.equal(formatVoicevoxCredit('VOICEVOX:四国めたん'), 'VOICEVOX:四国めたん');
  assert.equal(formatVoicevoxCredit('  '), '');
  assert.match(
    formatVoicevoxDescriptionCredit('ずんだもん'),
    /VOICEVOX:ずんだもん/,
  );
});
