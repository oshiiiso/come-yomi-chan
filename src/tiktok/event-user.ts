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
  const user = firstRecord(
    raw.user,
    raw.fromUser,
    raw.sender,
    raw.userInfo,
    identity.user,
    common.user,
  );

  const uniqueId = (
    asText(user.uniqueId) ||
    asText(user.unique_id) ||
    asText(user.displayId) ||
    asText(user.display_id) ||
    asText(raw.uniqueId) ||
    asText(raw.unique_id) ||
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
