import { normalizeFanClubName, scanFanClubNameDeep } from '../shared/fan-club-name';

export const FAN_CLUB_STATUS_NONE = 0;
export const FAN_CLUB_STATUS_ACTIVE = 1;
export const FAN_CLUB_STATUS_INACTIVE = 2;

export type FanClubStatus =
  | typeof FAN_CLUB_STATUS_NONE
  | typeof FAN_CLUB_STATUS_ACTIVE
  | typeof FAN_CLUB_STATUS_INACTIVE;

export interface UserLiveBadges {
  isFanClub: boolean;
  fanClubStatus: FanClubStatus;
  isSuperFan: boolean;
  fanClubLevel: number;
  fanClubName: string;
  isModerator: boolean;
  isAnchor: boolean;
}

export const EMPTY_USER_LIVE_BADGES: UserLiveBadges = {
  isFanClub: false,
  fanClubStatus: FAN_CLUB_STATUS_NONE,
  isSuperFan: false,
  fanClubLevel: 0,
  fanClubName: '',
  isModerator: false,
  isAnchor: false,
};

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

function asInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function parseFanClubStatus(value: unknown): FanClubStatus {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'ACTIVE' || normalized === '1') {
      return FAN_CLUB_STATUS_ACTIVE;
    }
    if (normalized === 'INACTIVE' || normalized === '2') {
      return FAN_CLUB_STATUS_INACTIVE;
    }
    return FAN_CLUB_STATUS_NONE;
  }
  const parsed = asInt(value);
  if (parsed === FAN_CLUB_STATUS_ACTIVE) {
    return FAN_CLUB_STATUS_ACTIVE;
  }
  if (parsed === FAN_CLUB_STATUS_INACTIVE) {
    return FAN_CLUB_STATUS_INACTIVE;
  }
  return FAN_CLUB_STATUS_NONE;
}

export function resolveFanClubStatus(status: FanClubStatus, level: number): FanClubStatus {
  if (status === FAN_CLUB_STATUS_ACTIVE || status === FAN_CLUB_STATUS_INACTIVE) {
    return status;
  }
  return level > 0 ? FAN_CLUB_STATUS_ACTIVE : FAN_CLUB_STATUS_NONE;
}

function badgeScenes(user: Record<string, unknown>): Array<string | number> {
  const lists = [user.badgeList, user.badge_list, user.badges];
  const scenes: Array<string | number> = [];
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const item of list) {
      const badge = asRecord(item);
      const scene = badge.sceneType ?? badge.scene_type;
      if (typeof scene === 'number' || typeof scene === 'string') {
        scenes.push(scene);
      }
      const name = asText(badge.name) || asText(badge.type);
      if (name) {
        scenes.push(name);
      }
    }
  }
  return scenes;
}

function hasScene(scenes: Array<string | number>, wanted: Array<string | number>): boolean {
  return scenes.some((scene) => {
    if (typeof scene === 'string') {
      const normalized = scene.trim().toUpperCase().replace(/[\s-]+/g, '_');
      return wanted.some((item) => String(item).toUpperCase() === normalized);
    }
    return wanted.includes(scene);
  });
}

function isFansBadgeScene(scene: unknown): boolean {
  if (typeof scene === 'number') {
    return scene === 10;
  }
  const normalized = asText(scene).toUpperCase().replace(/[\s-]+/g, '_');
  if (!normalized) {
    return false;
  }
  return (
    normalized === '10' ||
    normalized === 'FANS' ||
    normalized === 'FAN' ||
    normalized.endsWith('_FANS') ||
    normalized.includes('FANSCLUB')
  );
}

function preferFansClubEntries(fansClub: Record<string, unknown>): Record<string, unknown>[] {
  const prefer = fansClub.preferData ?? fansClub.prefer_data;
  if (!prefer || typeof prefer !== 'object' || Array.isArray(prefer)) {
    return [];
  }
  return Object.values(prefer as Record<string, unknown>)
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0);
}

function pickBestFansClubData(...candidates: Record<string, unknown>[]): Record<string, unknown> {
  let best: Record<string, unknown> = {};
  let bestScore = -1;
  for (const entry of candidates) {
    if (Object.keys(entry).length === 0) {
      continue;
    }
    const level = asInt(entry.level);
    const status = parseFanClubStatus(
      entry.userFansClubStatus ?? entry.user_fans_club_status,
    );
    const score =
      level * 10 +
      (status === FAN_CLUB_STATUS_ACTIVE
        ? 2
        : status === FAN_CLUB_STATUS_INACTIVE
          ? 1
          : 0);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

function fanClubNameFromBadgeLabel(raw: string): string {
  const text = raw.trim();
  if (!text || /^\d+$/.test(text)) {
    return '';
  }
  const withoutLevel = text.replace(/\d+$/, '').trim();
  if (!withoutLevel || /^lv\.?$/i.test(withoutLevel)) {
    return '';
  }
  return normalizeFanClubName(withoutLevel);
}

function fanClubNameFromBadges(lists: unknown[]): string {
  for (const item of lists) {
    const badge = asRecord(item);
    const scene = badge.sceneType ?? badge.scene_type;
    if (!isFansBadgeScene(scene)) {
      continue;
    }
    const extra = asRecord(badge.privilegeLogExtra ?? badge.privilege_log_extra);
    const fromExtra = normalizeFanClubName(
      asText(extra.fansClubName ?? extra.fans_club_name ?? extra.clubName ?? extra.club_name),
    );
    if (fromExtra) {
      return fromExtra;
    }
    const text = asRecord(badge.text);
    const fromText = fanClubNameFromBadgeLabel(
      asText(text.defaultPattern ?? text.default_pattern ?? text.key),
    );
    if (fromText) {
      return fromText;
    }
    const combine = asRecord(badge.combine);
    const fromCombine = fanClubNameFromBadgeLabel(asText(combine.str));
    if (fromCombine) {
      return fromCombine;
    }
  }
  return '';
}

function fanClubFromBadges(lists: unknown[]): { hinted: boolean; level: number } {
  let hinted = false;
  let level = 0;
  for (const item of lists) {
    const badge = asRecord(item);
    const scene = badge.sceneType ?? badge.scene_type;
    if (!isFansBadgeScene(scene)) {
      continue;
    }
    hinted = true;
    const extra = asRecord(badge.privilegeLogExtra ?? badge.privilege_log_extra);
    level = Math.max(level, asInt(extra.level ?? extra.Level));
    const combine = asRecord(badge.combine);
    const match = asText(combine.str).match(/(\d+)/);
    if (match) {
      level = Math.max(level, asInt(match[1]));
    }
  }
  return { hinted, level };
}

function badgeListEntries(...sources: Record<string, unknown>[]): unknown[] {
  const lists: unknown[] = [];
  for (const source of sources) {
    for (const key of ['badgeList', 'badge_list', 'badges']) {
      const list = source[key];
      if (Array.isArray(list)) {
        lists.push(...list);
      }
    }
  }
  return lists;
}

export function fanClubNameFromUser(user: Record<string, unknown>): string {
  const fansClub = asRecord(user.fansClub ?? user.fans_club ?? user.fanClub ?? user.fan_club);
  const fansData = pickBestFansClubData(
    asRecord(fansClub.data),
    ...preferFansClubEntries(fansClub),
  );
  const fansInfo = asRecord(
    user.fansClubInfo ?? user.fans_club_info ?? user.fanClubInfo ?? user.fan_club_info,
  );
  return normalizeFanClubName(
    asText(fansData.clubName ?? fansData.club_name ?? fansData.fansClubName ?? fansData.name) ||
      asText(fansClub.clubName ?? fansClub.club_name ?? fansClub.fansClubName ?? fansClub.name) ||
      asText(
        fansInfo.fansClubName ??
          fansInfo.fans_club_name ??
          fansInfo.clubName ??
          fansInfo.club_name ??
          fansInfo.name,
      ) ||
      asText(user.fansClubName ?? user.fans_club_name ?? user.clubName ?? user.club_name),
  );
}

export function userLiveBadgesFromEvent(
  raw: Record<string, unknown>,
  user: Record<string, unknown> = {},
): UserLiveBadges {
  const identity = asRecord(
    raw.userIdentity ?? raw.user_identity ?? user.userIdentity ?? user.user_identity,
  );
  const fansClub = asRecord(user.fansClub ?? user.fans_club ?? user.fanClub ?? user.fan_club);
  const fansData = pickBestFansClubData(
    asRecord(fansClub.data),
    ...preferFansClubEntries(fansClub),
  );
  const fansInfo = asRecord(
    user.fansClubInfo ??
      user.fans_club_info ??
      user.fanClubInfo ??
      user.fan_club_info,
  );
  const subscribe = asRecord(user.subscribeInfo ?? user.subscribe_info);
  const scenes = badgeScenes(user);
  const badgeLists = badgeListEntries(raw, user);
  const badgeHint = fanClubFromBadges(badgeLists);

  const fanClubLevel = Math.max(
    asInt(fansData.level),
    asInt(fansInfo.fansLevel ?? fansInfo.fans_level),
    badgeHint.level,
  );
  const fanClubName =
    fanClubNameFromUser(user) || fanClubNameFromBadges(badgeLists) || scanFanClubNameDeep(user, 0, 4);
  let fanClubStatus = resolveFanClubStatus(
    parseFanClubStatus(
      fansData.userFansClubStatus ??
        fansData.user_fans_club_status ??
        fansInfo.userFansClubStatus ??
        fansInfo.user_fans_club_status,
    ),
    fanClubLevel,
  );
  if (badgeHint.hinted && fanClubStatus === FAN_CLUB_STATUS_NONE) {
    fanClubStatus = FAN_CLUB_STATUS_ACTIVE;
  }
  const isFanClub =
    fanClubStatus === FAN_CLUB_STATUS_ACTIVE || fanClubStatus === FAN_CLUB_STATUS_INACTIVE;

  const isSuperFan =
    asBoolean(identity.isSubscriberOfAnchor ?? identity.is_subscriber_of_anchor) ||
    asBoolean(subscribe.isSubscribedToAnchor ?? subscribe.is_subscribed_to_anchor) ||
    hasScene(scenes, [4, 7, 'SUBSCRIBER', 'NEW_SUBSCRIBER', 'SUPER_FAN', 'SUPERFAN']);
  const isModerator =
    asBoolean(identity.isModeratorOfAnchor ?? identity.is_moderator_of_anchor) ||
    hasScene(scenes, ['MODERATOR', 'MOD']);
  const isAnchor = asBoolean(identity.isAnchor ?? identity.is_anchor);

  return {
    isFanClub,
    fanClubStatus,
    isSuperFan,
    fanClubLevel,
    fanClubName,
    isModerator,
    isAnchor,
  };
}
