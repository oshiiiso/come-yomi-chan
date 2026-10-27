import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_VIEWER_LOG_MAX_ROWS,
  clampViewerLogMaxRows,
  normalizeViewerPersistRows,
  trimViewerPersistRows,
  type ViewerPersistRow,
} from '../../shared/viewer-log-persist';

test('行数上限は 100〜5000、壊れた値は既定', () => {
  assert.equal(clampViewerLogMaxRows(undefined), DEFAULT_VIEWER_LOG_MAX_ROWS);
  assert.equal(clampViewerLogMaxRows(50), 100);
  assert.equal(clampViewerLogMaxRows(9999), 5000);
  assert.equal(clampViewerLogMaxRows('2000'), 2000);
});

test('正規化は型と時刻が無い行を捨て、subscribe は superFan に寄せる', () => {
  const rows = normalizeViewerPersistRows(
    [
      { receivedAt: '2026-01-01T00:00:00.000Z', type: 'comment', uniqueId: 'a', nickname: 'A' },
      { receivedAt: '', type: 'gift', uniqueId: 'b' },
      { receivedAt: '2026-01-01T00:00:01.000Z', type: 'subscribe', uniqueId: 'c', nickname: 'C' },
    ],
    1000,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].type, 'comment');
  assert.equal(rows[1].type, 'superFan');
});

test('上限を超えたら新しい方を残す', () => {
  const raw = Array.from({ length: 105 }, (_, index) => ({
    receivedAt: `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
    type: 'comment',
    uniqueId: `u${index}`,
    nickname: `n${index}`,
  }));
  const trimmed = normalizeViewerPersistRows(raw, 100);
  assert.equal(trimmed.length, 100);
  assert.equal(trimmed[0].uniqueId, 'u5');
  assert.equal(trimmed[99].uniqueId, 'u104');
  const base: ViewerPersistRow[] = trimmed;
  assert.equal(trimViewerPersistRows(base, 100).length, 100);
  assert.equal(trimViewerPersistRows(base, 50).length, 100);
});

test('任意項目と badges を残す', () => {
  const rows = normalizeViewerPersistRows(
    [
      {
        receivedAt: '2026-01-01T00:00:00.000Z',
        type: 'gift',
        uniqueId: 'g',
        nickname: 'G',
        avatarUrl: 'https://example.com/a.png',
        giftImageUrl: 'https://example.com/g.png',
        giftId: '5655',
        badges: { isFanClub: true, fanClubLevel: 3, fanClubName: '団' },
      },
    ],
    1000,
  );
  assert.equal(rows[0].avatarUrl, 'https://example.com/a.png');
  assert.equal(rows[0].giftId, '5655');
  assert.equal(rows[0].badges?.fanClubLevel, 3);
  assert.equal(rows[0].commentEmotes, undefined);
});

test('ギフト名などの表示パーツは復元用に残す', () => {
  const rows = normalizeViewerPersistRows(
    [
      {
        receivedAt: '2026-01-01T00:00:00.000Z',
        type: 'gift',
        uniqueId: 'a',
        nickname: 'A',
        displayText: 'Aさんからバラ',
        displayParts: [
          { kind: 'text', value: 'Aさんから' },
          { kind: 'accent', value: 'バラ', token: 'gift', color: '#ff0000' },
          { kind: 'nope', value: 'x' },
        ],
      },
    ],
    1000,
  );
  assert.deepEqual(rows[0].displayParts, [
    { kind: 'text', value: 'Aさんから' },
    { kind: 'accent', value: 'バラ', token: 'gift' },
  ]);
});

test('コメントの絵文字画像は復元用に残す', () => {
  const rows = normalizeViewerPersistRows(
    [
      {
        receivedAt: '2026-01-01T00:00:00.000Z',
        type: 'comment',
        uniqueId: 'a',
        nickname: 'A',
        comment: 'みてるよ[jolliespeechless]ガン見',
        commentEmotes: [
          { index: 4, imageUrl: 'https://p16-webcast.tiktokcdn.com/img/a.png' },
          { index: 0, imageUrl: '' },
        ],
      },
    ],
    1000,
  );
  assert.deepEqual(rows[0].commentEmotes, [
    { index: 4, imageUrl: 'https://p16-webcast.tiktokcdn.com/img/a.png' },
  ]);
});
