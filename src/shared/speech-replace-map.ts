export interface SpeechReplaceEntry {
  from: string;
  to: string;
}

export const MAX_SPEECH_REPLACE_MAP = 2000;

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isAsciiLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function asciiLower(code: number): number {
  return code >= 65 && code <= 90 ? code + 32 : code;
}

function charsMatch(textChar: string, fromChar: string): boolean {
  const tc = textChar.charCodeAt(0);
  const fc = fromChar.charCodeAt(0);
  if (isAsciiLetter(tc) && isAsciiLetter(fc)) {
    return asciiLower(tc) === asciiLower(fc);
  }
  return textChar === fromChar;
}

function matchesAt(text: string, start: number, from: string): boolean {
  if (!from || start + from.length > text.length) {
    return false;
  }
  for (let index = 0; index < from.length; index += 1) {
    if (!charsMatch(text[start + index], from[index])) {
      return false;
    }
  }
  return true;
}

export function normalizeSpeechReplaceMap(raw: unknown): SpeechReplaceEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const entries: SpeechReplaceEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const from = asText(record.from).trim();
    if (!from) {
      continue;
    }
    const to = asText(record.to);
    const existing = entries.findIndex((entry) => entry.from === from);
    if (existing >= 0) {
      entries.splice(existing, 1);
    }
    entries.push({ from, to });
    if (entries.length >= MAX_SPEECH_REPLACE_MAP) {
      break;
    }
  }
  return entries;
}

export function applySpeechReplaceMap(text: string, map: SpeechReplaceEntry[]): string {
  if (!text || !map.length) {
    return text;
  }
  const sorted = [...map]
    .filter((entry) => entry.from)
    .sort((left, right) => right.from.length - left.from.length);
  if (!sorted.length) {
    return text;
  }
  let out = '';
  let index = 0;
  while (index < text.length) {
    let matched = false;
    for (const entry of sorted) {
      if (matchesAt(text, index, entry.from)) {
        out += entry.to;
        index += entry.from.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += text[index];
      index += 1;
    }
  }
  return out;
}

function splitReplaceLine(line: string): { from: string; to: string } | null {
  const tab = line.indexOf('\t');
  if (tab >= 0) {
    return { from: line.slice(0, tab), to: line.slice(tab + 1) };
  }
  const comma = line.indexOf(',');
  if (comma >= 0) {
    return { from: line.slice(0, comma), to: line.slice(comma + 1) };
  }
  return null;
}

export function parseSpeechReplaceText(text: string): {
  entries: SpeechReplaceEntry[];
  skippedLineNumbers: number[];
  overLimit: boolean;
} {
  const skippedLineNumbers: number[] = [];
  const parsed: SpeechReplaceEntry[] = [];
  const lines = String(text ?? '').split(/\r\n|\n|\r/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line.trim()) {
      continue;
    }
    const parts = splitReplaceLine(line);
    if (!parts) {
      skippedLineNumbers.push(lineIndex + 1);
      continue;
    }
    const from = parts.from.trim();
    if (!from) {
      skippedLineNumbers.push(lineIndex + 1);
      continue;
    }
    parsed.push({ from, to: parts.to });
  }
  if (parsed.length > MAX_SPEECH_REPLACE_MAP) {
    return { entries: [], skippedLineNumbers, overLimit: true };
  }
  const entries: SpeechReplaceEntry[] = [];
  for (const entry of parsed) {
    const existing = entries.findIndex((item) => item.from === entry.from);
    if (existing >= 0) {
      entries.splice(existing, 1);
    }
    entries.push(entry);
  }
  return { entries, skippedLineNumbers, overLimit: false };
}

export function formatSpeechReplaceText(entries: SpeechReplaceEntry[]): string {
  if (!entries.length) {
    return '';
  }
  return entries.map((entry) => `${entry.from}\t${entry.to}`).join('\n');
}

export function formatSkipLineSummary(lineNumbers: number[]): string {
  if (!lineNumbers.length) {
    return '';
  }
  const sorted = [...lineNumbers].sort((left, right) => left - right);
  if (sorted.length < 10) {
    return sorted.join(', ');
  }
  const head = sorted.slice(0, 3).join(', ');
  const rest = sorted.length - 3;
  return `${head} ほか${rest}行`;
}
