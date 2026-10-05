import { OverlayUser } from '../shared/types';
import { firstImageUrl } from './gift-fields';
import { userLiveBadgesFromEvent } from './user-badges';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function firstRecord(...values: unknown[]): Record<string, unknown> {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) {
      return record;
    }
  }
  return {};
}

/** TikTok uniqueId（英数字のハンドル）っぽいときだけ返す。数字だけの userId や表示名は除外。 */
function asHandleId(value: unknown): string {
  const text = asText(value).replace(/^@/, '');
  if (!text || /^\d+$/.test(text) || /\s/.test(text) || /[^\w.]/.test(text)) {
    return '';
  }
  return text;
}

/** common.displayText.pieces[].userValue.user などからユーザーを拾う（宝箱など user が無い通知用）。 */
function usersFromDisplayText(text: unknown): Record<string, unknown>[] {
  const record = asRecord(text);
  const pieces = Array.isArray(record.pieces) ? record.pieces : [];
  const out: Record<string, unknown>[] = [];
  for (const piece of pieces) {
    const userValue = asRecord(asRecord(piece).userValue);
    const user = asRecord(userValue.user);
    if (Object.keys(user).length > 0) {
      out.push(user);
    }
  }
  return out;
}

function usersFromEventTexts(raw: Record<string, unknown>): Record<string, unknown>[] {
  const common = asRecord(raw.common);
  const publicArea = asRecord(raw.publicAreaMsgCommon ?? raw.publicAreaMessageCommon);
  return [
    ...usersFromDisplayText(common.displayText),
    ...usersFromDisplayText(raw.displayText),
    ...usersFromDisplayText(publicArea.dynamicDisplayText),
  ];
}

function pickAvatarUrl(user: Record<string, unknown>, raw: Record<string, unknown>): string {
  const envelope = asRecord(raw.envelopeInfo);
  return (
    firstImageUrl(user.avatarThumb) ||
    firstImageUrl(user.avatar_thumb) ||
    firstImageUrl(user.avatarMedium) ||
    firstImageUrl(user.avatar_medium) ||
    firstImageUrl(user.avatarLarger) ||
    firstImageUrl(user.avatar_larger) ||
    firstImageUrl(user.profilePictureUrl) ||
    firstImageUrl(user.profilePicture) ||
    firstImageUrl(user.avatarUrl) ||
    firstImageUrl(user.avatar) ||
    firstImageUrl(raw.profilePicture) ||
    firstImageUrl(envelope.sendUserAvatar)
  );
}

export function userFromEvent(
  raw: Record<string, unknown>,
  options: { streamerId?: string } = {},
): OverlayUser {
  const identity = asRecord(raw.userIdentity);
  const common = asRecord(raw.common);
  const envelope = asRecord(raw.envelopeInfo);
  const textUsers = usersFromEventTexts(raw);
  const user = firstRecord(
    raw.user,
    raw.fromUser,
    raw.sender,
    raw.userInfo,
    identity.user,
    common.user,
    ...textUsers,
  );

  // ハンドル（displayId / uniqueId）を数字の userId より先に取る
  const uniqueId = (
    asText(user.uniqueId) ||
    asText(user.unique_id) ||
    asText(user.displayId) ||
    asText(user.display_id) ||
    asText(raw.uniqueId) ||
    asText(raw.unique_id) ||
    asHandleId(envelope.sendUserName) ||
    asText(user.id) ||
    asText(user.userId) ||
    asText(raw.userId) ||
    asText(envelope.sendUserId)
  ).replace(/^@/, '');

  const nickname =
    asText(user.nickname) ||
    asText(user.nickName) ||
    asText(user.nick_name) ||
    asText(user.displayName) ||
    asText(raw.nickname) ||
    asText(envelope.sendUserName) ||
    uniqueId;

  const badges = userLiveBadgesFromEvent(raw, user);
  const streamerId = asText(options.streamerId).replace(/^@/, '').toLowerCase();
  const resolvedId = uniqueId || nickname;
  const isAnchor =
    badges.isAnchor ||
    (Boolean(streamerId) && resolvedId.replace(/^@/, '').toLowerCase() === streamerId);
  return {
    uniqueId: resolvedId,
    nickname,
    avatarUrl: pickAvatarUrl(user, raw),
    isFanClub: badges.isFanClub,
    fanClubStatus: badges.fanClubStatus,
    isSuperFan: badges.isSuperFan,
    fanClubLevel: badges.fanClubLevel,
    fanClubName: badges.fanClubName,
    isModerator: badges.isModerator,
    isAnchor,
  };
}
