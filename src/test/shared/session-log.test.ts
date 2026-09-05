import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  pushSessionLog,
  SESSION_LOG_MAX_ROWS,
  sessionLogFileName,
  sessionLogTsv,
  SessionLogRow,
} from '../../shared/session-log';

function sampleRow(comment: string): SessionLogRow {
  return {
    receivedAt: '2026-09-06T01:24:00.000+09:00',
    type: 'comment',
    uniqueId: 'viewer_a',
    nickname: '視聴者',
    comment,
    displayText: comment,
    giftName: '',
    giftCount: 0,
    diamondCount: 0,
  };
}

test('ログはタブ区切りで保存でき、改行は潰す', () => {
  const tsv = sessionLogTsv(
    [
      {
        ...sampleRow('こんにちは\t改行\nなし'),
        type: 'gift',
        giftName: 'バラ',
        giftCount: 2,
        diamondCount: 2,
      },
    ],
    { gift: 'ギフト' },
  );
  assert.ok(tsv.startsWith('時刻\t種類\tID\t名前\t本文\t表示\tギフト\t個数\tダイヤ'));
  assert.ok(tsv.includes('ギフト'));
  assert.ok(tsv.includes('こんにちは 改行 なし'));
  assert.ok(!tsv.includes('\t改行'));
});

test('古い行は上限を超えたら捨てる', () => {
  const rows: SessionLogRow[] = [];
  for (let index = 0; index < SESSION_LOG_MAX_ROWS + 3; index += 1) {
    pushSessionLog(rows, sampleRow(`行${index}`));
  }
  assert.equal(rows.length, SESSION_LOG_MAX_ROWS);
  assert.equal(rows[0].comment, '行3');
});

test('保存ファイル名は日付と時刻を入れる', () => {
  assert.equal(
    sessionLogFileName(new Date(2026, 8, 6, 1, 24, 0)),
    'コメントログ_2026-09-06_0124.txt',
  );
});
