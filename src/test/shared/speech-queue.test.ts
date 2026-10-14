import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { MSG } from '../../shared/messages';
import {
  DEFAULT_SPEECH_QUEUE,
  SPEECH_QUEUE_MAX,
  SPEECH_QUEUE_MIN,
  normalizeSpeechQueue,
} from '../../shared/speech-queue';

test('読み上げ待ちは 1〜300、初期 100', () => {
  assert.equal(SPEECH_QUEUE_MIN, 1);
  assert.equal(SPEECH_QUEUE_MAX, 300);
  assert.equal(DEFAULT_SPEECH_QUEUE, 100);
  assert.equal(normalizeSpeechQueue(undefined), 100);
  assert.equal(normalizeSpeechQueue(0), 1);
  assert.equal(normalizeSpeechQueue(301), 300);
  assert.equal(normalizeSpeechQueue(20.9), 20);
  assert.equal(normalizeSpeechQueue(Number.NaN), 100);
  assert.equal(MSG.ui.invalidMaxQueue, '待ちの上限は 1〜300 にしてください');
});

test('読み上げ待ちの入力上限と効果音の待ち件数は画面と揃う', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
  const form = fs.readFileSync(path.join(process.cwd(), 'ui', 'js', 'settings-form.js'), 'utf8');
  const chime = fs.readFileSync(path.join(process.cwd(), 'ui', 'js', 'feature-batch-ui.js'), 'utf8');
  assert.match(html, /id="max-queue"[^>]*max="300"/);
  assert.match(form, /maxQueue > 300/);
  assert.match(form, /maxQueue \?\? 100/);
  assert.match(chime, /const APP_CHIME_QUEUE_MAX = 50/);
});
