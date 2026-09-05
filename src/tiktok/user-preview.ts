import { firstImageUrl } from './gift-fields';
import { fanClubNameFromUser } from './user-badges';
import { scanFanClubNameDeep } from '../shared/fan-club-name';

export interface TikTokUserPreview {
  uniqueId: string;
  nickname: string;
  avatarUrl: string;
  fanClubName: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

function pickOwner(raw: Record<string, unknown>): Record<string, unknown> {
  const data = asRecord(raw.data);
  const liveRoomUserInfo = firstRecord(raw.liveRoomUserInfo, data.liveRoomUserInfo);
  const liveRoom = firstRecord(raw.liveRoom, data.liveRoom);
  return firstRecord(
    raw.owner,
    raw.owner_user_info,
    raw.anchor,
    data.owner,
    data.user,
    liveRoomUserInfo.user,
    liveRoom.owner,
    raw.user,
  );
}

function pickAvatarUrl(owner: Record<string, unknown>): string {
  return (
    firstImageUrl(owner.avatarThumb) ||
    firstImageUrl(owner.avatar_thumb) ||
    firstImageUrl(owner.avatarMedium) ||
    firstImageUrl(owner.avatar_medium) ||
    firstImageUrl(owner.avatarLarger) ||
    firstImageUrl(owner.avatar_larger) ||
    firstImageUrl(owner.profilePicture) ||
    firstImageUrl(owner.profilePictureUrl) ||
    firstImageUrl(owner.avatarUrl) ||
    firstImageUrl(owner.avatar)
  );
}

export function fanClubNameFromRoom(raw: unknown): string {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const owner = pickOwner(root);
  return (
    fanClubNameFromUser(owner) ||
    fanClubNameFromUser(data) ||
    fanClubNameFromUser(root) ||
    scanFanClubNameDeep(owner) ||
    scanFanClubNameDeep(data) ||
    scanFanClubNameDeep(root)
  );
}

export function parseTikTokUserPreview(
  raw: unknown,
  requestedUniqueId: string,
): TikTokUserPreview | null {
  const requested = requestedUniqueId.replace(/^@/, '').trim();
  const root = asRecord(raw);
  const owner = pickOwner(root);
  const uniqueId = (
    asString(owner.uniqueId) ||
    asString(owner.unique_id) ||
    asString(owner.displayId) ||
    asString(owner.display_id) ||
    requested
  ).replace(/^@/, '');
  const nickname =
    asString(owner.nickname) ||
    asString(owner.nick_name) ||
    asString(owner.nickName) ||
    uniqueId;
  const avatarUrl = pickAvatarUrl(owner);

  if (!asString(owner.nickname) && !asString(owner.nick_name) && !asString(owner.nickName) && !pickAvatarUrl(owner)) {
    const hasIdentity =
      asString(owner.uniqueId) ||
      asString(owner.unique_id) ||
      asString(owner.displayId) ||
      asString(owner.display_id);
    if (!hasIdentity) {
      return null;
    }
  }

  if (!uniqueId) {
    return null;
  }

  return {
    uniqueId,
    nickname: nickname || uniqueId,
    avatarUrl,
    fanClubName: fanClubNameFromRoom(root),
  };
}
