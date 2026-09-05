import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeVoicevoxHost, voicevoxBaseUrl } from '../../tts/voicevox-url';

test('VOICEVOXの接続先はローカルのみにする', () => {
  assert.equal(normalizeVoicevoxHost('127.0.0.1'), '127.0.0.1');
  assert.equal(normalizeVoicevoxHost('localhost'), 'localhost');
  assert.equal(normalizeVoicevoxHost('example.com'), '127.0.0.1');
  assert.equal(voicevoxBaseUrl('127.0.0.1', 50021), 'http://127.0.0.1:50021');
});
