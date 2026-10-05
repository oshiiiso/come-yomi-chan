import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_SPEECH_REPLACE_MAP,
  applySpeechReplaceMap,
  formatSkipLineSummary,
  formatSpeechReplaceText,
  normalizeSpeechReplaceMap,
  parseSpeechReplaceText,
} from '../../shared/speech-replace-map';

test('正規化は空 from を捨て、同じ from は後勝ち', () => {
  assert.deepEqual(normalizeSpeechReplaceMap(null), []);
  assert.deepEqual(
    normalizeSpeechReplaceMap([
      { from: 'a', to: '1' },
      { from: '  ', to: 'x' },
      { from: 'a', to: '2' },
    ]),
    [{ from: 'a', to: '2' }],
  );
});

test('長い from を先に、英字は大文字小文字を無視して置換', () => {
  const map = normalizeSpeechReplaceMap([
    { from: 'abc', to: '長' },
    { from: 'ab', to: '短' },
    { from: 'test', to: 'テスト' },
  ]);
  assert.equal(applySpeechReplaceMap('xxabcyy', map), 'xx長yy');
  assert.equal(applySpeechReplaceMap('abのみ', map), '短のみ');
  assert.equal(applySpeechReplaceMap('TeSt!', map), 'テスト!');
});

test('日本語は完全一致', () => {
  const map = [{ from: '草', to: 'くさ' }];
  assert.equal(applySpeechReplaceMap('草', map), 'くさ');
  assert.equal(applySpeechReplaceMap('草', [{ from: '草', to: 'くさ' }]), 'くさ');
  assert.equal(applySpeechReplaceMap('くさ', map), 'くさ');
});

test('テキスト解析は空行を無視し、区切りはタブ優先', () => {
  const parsed = parseSpeechReplaceText('a\t1\n\nb,2\nbadline\nc\t3');
  assert.deepEqual(parsed.entries, [
    { from: 'a', to: '1' },
    { from: 'b', to: '2' },
    { from: 'c', to: '3' },
  ]);
  assert.deepEqual(parsed.skippedLineNumbers, [4]);
  assert.equal(parsed.overLimit, false);
});

test('重複行は後勝ち。上限超えは entries を空にする', () => {
  const text = 'x\ta\nx\tb';
  assert.deepEqual(parseSpeechReplaceText(text).entries, [{ from: 'x', to: 'b' }]);
  const lines = Array.from({ length: MAX_SPEECH_REPLACE_MAP + 1 }, (_, index) => `k${index}\tv`);
  const over = parseSpeechReplaceText(lines.join('\n'));
  assert.equal(over.overLimit, true);
  assert.deepEqual(over.entries, []);
});

test('書式とスキップ行の要約', () => {
  assert.equal(
    formatSpeechReplaceText([
      { from: 'a', to: '1' },
      { from: 'b', to: '2' },
    ]),
    'a\t1\nb\t2',
  );
  assert.equal(formatSkipLineSummary([2, 1]), '1, 2');
  assert.equal(formatSkipLineSummary([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), '1, 2, 3 ほか7行');
});
