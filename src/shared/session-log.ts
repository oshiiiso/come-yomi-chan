import { OverlayEventType } from './types';

export const SESSION_LOG_MAX_ROWS = 5000;

export interface SessionLogRow {
  receivedAt: string;
  type: OverlayEventType;
  uniqueId: string;
  nickname: string;
  comment: string;
  displayText: string;
  giftName: string;
  giftCount: number;
  diamondCount: number;
}

export function pushSessionLog(rows: SessionLogRow[], row: SessionLogRow): SessionLogRow[] {
  rows.push(row);
  if (rows.length > SESSION_LOG_MAX_ROWS) {
    rows.splice(0, rows.length - SESSION_LOG_MAX_ROWS);
  }
  return rows;
}

function tsvCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\t/g, ' ')
    .replace(/\r\n|\r|\n/g, ' ');
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function sessionLogTsv(
  rows: SessionLogRow[],
  typeLabels: Record<string, string>,
): string {
  const header = ['時刻', '種類', 'ID', '名前', '本文', '表示', 'ギフト', '個数', 'ダイヤ'];
  const lines = [header.join('\t')];
  for (const row of rows) {
    lines.push(
      [
        formatLogTime(row.receivedAt),
        typeLabels[row.type] || row.type,
        row.uniqueId.replace(/^@/, ''),
        row.nickname,
        row.comment,
        row.displayText,
        row.giftName,
        row.giftCount || '',
        row.diamondCount || '',
      ]
        .map(tsvCell)
        .join('\t'),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function sessionLogFileName(now = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `コメントログ_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
}
