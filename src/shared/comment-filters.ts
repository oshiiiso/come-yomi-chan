import { MSG } from './messages';

const COMMENT_URL_RE = /(?:https?:\/\/|www\.|discord\.gg\/)[^\s　<>"]+/gi;
const EMOJI_TOKEN_RE =
  /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*|\p{Emoji_Presentation}/gu;

export function containsNgWord(text: string, ngWords: string[]): boolean {
  const haystack = text.toLowerCase();
  return ngWords.some((word) => haystack.includes(word.toLowerCase()));
}

export function isMentionComment(comment: string): boolean {
  const trimmed = comment.trimStart();
  return trimmed.startsWith('@') || trimmed.startsWith('＠');
}

export function hasCommentUrl(comment: string): boolean {
  return /(?:https?:\/\/|www\.|discord\.gg\/)/i.test(comment);
}

export function isEmoteOnlyComment(comment: string): boolean {
  const trimmed = String(comment || '').trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed === MSG.ui.emoteComment) {
    return true;
  }
  const leftover = trimmed
    .replace(EMOJI_TOKEN_RE, '')
    .replace(/[\s\uFE0F\u200D]/g, '');
  return leftover === '';
}

export function stripCommentUrls(comment: string): string {
  if (!hasCommentUrl(comment)) {
    return comment;
  }
  COMMENT_URL_RE.lastIndex = 0;
  return comment
    .replace(COMMENT_URL_RE, ' ')
    .replace(/[ \t　]+/g, ' ')
    .replace(/[ \t　]+([、。．，!！?？])/g, '$1')
    .trim();
}

export function normalizeUserList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const users: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const id = item.replace(/^@/, '').trim();
    const key = id.toLowerCase();
    if (!id || seen.has(key)) {
      continue;
    }
    seen.add(key);
    users.push(id);
  }
  return users;
}

export function listedUserId(user: { uniqueId: string; nickname: string }): string {
  const id = user.uniqueId.replace(/^@/, '').trim();
  return id || user.nickname.trim();
}

function userMatchesEntry(
  user: { uniqueId: string; nickname: string },
  entry: string,
): boolean {
  const id = entry.replace(/^@/, '').trim().toLowerCase();
  if (!id) {
    return false;
  }
  const uniqueId = user.uniqueId.replace(/^@/, '').trim().toLowerCase();
  const nickname = user.nickname.trim().toLowerCase();
  return id === uniqueId || id === nickname;
}

export function isListedUser(
  user: { uniqueId: string; nickname: string },
  users: string[],
): boolean {
  if (!users || users.length === 0) {
    return false;
  }
  return users.some((entry) => userMatchesEntry(user, entry));
}

export function isMutedUser(
  user: { uniqueId: string; nickname: string },
  mutedUsers: string[],
): boolean {
  return isListedUser(user, mutedUsers);
}

export function addListedUser(list: string[], id: string): string[] {
  return normalizeUserList([...list, id]);
}

export function removeListedUser(
  list: string[],
  user: { uniqueId: string; nickname: string },
): string[] {
  return list.filter((entry) => !userMatchesEntry(user, entry));
}

export function resolveBlockedAndMutedUsers(raw: {
  blockedUsers?: unknown;
  mutedUsers?: unknown;
  configVersion?: number;
}): { blockedUsers: string[]; mutedUsers: string[] } {
  const version = typeof raw.configVersion === 'number' ? raw.configVersion : 0;
  const hasBlocked = Object.prototype.hasOwnProperty.call(raw, 'blockedUsers');
  if (!hasBlocked && version < 3) {
    return {
      blockedUsers: normalizeUserList(raw.mutedUsers),
      mutedUsers: [],
    };
  }
  return {
    blockedUsers: normalizeUserList(raw.blockedUsers),
    mutedUsers: normalizeUserList(raw.mutedUsers),
  };
}
