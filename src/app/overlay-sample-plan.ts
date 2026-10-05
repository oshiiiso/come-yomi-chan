import { overlayGiftImagePath } from '../overlay-server/gift-image-proxy';
import { pickEventTemplates } from '../shared/event-templates';
import { MSG } from '../shared/messages';
import {
  normalizeOverlayPinTypes,
  OVERLAY_PIN_TYPES,
  shouldPinOverlayType,
  type OverlayPinType,
} from '../shared/overlay-pin';
import {
  canonicalOverlayType,
  type AppConfig,
  type CatalogGift,
  type NormalizedLiveEvent,
  type OverlayEventType,
  type OverlayPayload,
} from '../shared/types';
import { renderDisplayTemplate, varsFromEvent } from '../template/render-template';
import { EMPTY_USER_LIVE_BADGES } from '../tiktok/user-badges';

export interface OverlaySamplePlan {
  chatSamples: OverlayPayload[];
  pinSamples: OverlayPayload[];
}

interface SampleJob {
  type: OverlayEventType;
  giftCount?: number;
  portalJoin?: boolean;
  superFanBox?: boolean;
  isFanClub?: boolean;
  fanClubLevel?: number;
  isSuperFan?: boolean;
  isModerator?: boolean;
  isAnchor?: boolean;
}

const CHAT_ROTATION_JOBS: SampleJob[] = [
  { type: 'comment' },
  { type: 'comment', isFanClub: true, fanClubLevel: 4 },
  { type: 'comment', isSuperFan: true },
  { type: 'comment', isFanClub: true, isSuperFan: true, fanClubLevel: 4 },
  { type: 'comment', isModerator: true },
  { type: 'comment', isAnchor: true },
];

const PIN_TYPE_JOBS: SampleJob[] = [
  { type: 'gift', giftCount: 100 },
  { type: 'follow', giftCount: 1 },
  { type: 'share', giftCount: 1 },
  { type: 'superFan', giftCount: 1 },
  { type: 'envelope', giftCount: 1 },
  { type: 'portal', giftCount: 1 },
  { type: 'like', giftCount: 100 },
  { type: 'member', giftCount: 1, portalJoin: true },
];

function buildSampleEvent(
  job: SampleJob,
  config: AppConfig,
  catalogGift: CatalogGift | null,
): NormalizedLiveEvent | null {
  const type = canonicalOverlayType(job.portalJoin ? 'member' : job.type);
  const count =
    type === 'like' && (job.giftCount ?? 1) < 1 ? config.likeMilestone : (job.giftCount ?? 1);
  const fanClubStatus =
    job.isFanClub === true ? 1 : 0;
  const isFanClub = fanClubStatus === 1;
  const isSuperFan = job.isSuperFan === true;
  const isModerator = job.isModerator === true;
  const isAnchor = job.isAnchor === true;
  const fanClubLevel = isFanClub ? Math.max(1, Math.trunc(job.fanClubLevel || 4)) : 0;
  const uniqueId = isAnchor
    ? 'test_anchor'
    : isModerator
      ? 'test_mod'
      : isFanClub && isSuperFan
        ? 'test_fan_super'
        : isSuperFan
          ? 'test_super'
          : isFanClub
            ? `test_fan_${fanClubLevel}`
            : 'test_user';
  const comment = isAnchor
    ? MSG.tester.comment
    : isModerator
      ? MSG.tester.comment
      : isFanClub && isSuperFan
        ? MSG.tester.commentFanSuper
        : isSuperFan
          ? MSG.tester.commentSuperFan
          : isFanClub
            ? MSG.tester.commentFan
            : MSG.tester.comment;
  const diamondCount = catalogGift?.diamondCount ?? 1;
  return {
    type,
    user: {
      uniqueId,
      nickname: MSG.tester.user,
      avatarUrl: '/overlay/preview-avatar.svg',
      ...EMPTY_USER_LIVE_BADGES,
      isFanClub,
      fanClubStatus,
      isSuperFan,
      fanClubLevel,
      fanClubName: '',
      isModerator,
      isAnchor,
    },
    comment,
    commentEmotes: [],
    likeCount: type === 'like' ? count : 0,
    giftId: type === 'gift' ? catalogGift?.id || '' : '',
    giftName: job.superFanBox
      ? MSG.ui.superFanBox
      : job.portalJoin
        ? MSG.ui.portalGift
        : type === 'gift'
          ? catalogGift?.name || MSG.tester.gift
          : type === 'envelope'
            ? MSG.ui.treasureBox
            : type === 'portal'
              ? MSG.ui.portalGift
              : '',
    giftCount: count,
    giftImageUrl:
      type === 'gift' || type === 'portal'
        ? catalogGift?.imageUrl || '/overlay/gift-rose.svg'
        : '',
    diamondCount,
    receivedAt: new Date(0).toISOString(),
  };
}

function toOverlayPayload(event: NormalizedLiveEvent, config: AppConfig): OverlayPayload {
  const vars = varsFromEvent(
    event.type,
    event.user.nickname,
    event.comment,
    event.giftName,
    event.giftCount,
  );
  const templates = pickEventTemplates(config, event);
  const displayText = renderDisplayTemplate(templates.display, vars, {
    hideUserName: config.hideUserName,
    maxChars: config.maxDisplayChars,
  });
  return {
    type: event.type,
    user: {
      ...event.user,
      avatarUrl: overlayGiftImagePath(event.user.avatarUrl),
    },
    displayText,
    comment: event.comment,
    commentEmotes: [],
    giftImageUrl: overlayGiftImagePath(event.giftImageUrl),
    audioUrl: null,
    receivedAt: event.receivedAt,
  };
}

export function buildOverlaySamplePlan(
  config: AppConfig,
  catalogGift: CatalogGift | null = null,
): OverlaySamplePlan {
  const pinTypes = normalizeOverlayPinTypes(config.overlayPinTypes);
  const pinOptions = {
    enabled: config.overlayPinEnabled !== false,
    preview: false,
  };
  const chatSamples: OverlayPayload[] = [];
  const pinSamples: OverlayPayload[] = [];
  const chatTypes = new Set<OverlayEventType>();

  for (const job of CHAT_ROTATION_JOBS) {
    const event = buildSampleEvent(job, config, catalogGift);
    if (!event) {
      continue;
    }
    chatSamples.push(toOverlayPayload(event, config));
  }

  for (const job of PIN_TYPE_JOBS) {
    const event = buildSampleEvent(job, config, catalogGift);
    if (!event) {
      continue;
    }
    const payload = toOverlayPayload(event, config);
    const pinType = canonicalOverlayType(payload.type) as OverlayPinType;
    if (
      (OVERLAY_PIN_TYPES as readonly string[]).includes(pinType) &&
      shouldPinOverlayType(pinType, pinTypes, pinOptions)
    ) {
      pinSamples.push(payload);
      continue;
    }
    if (!chatTypes.has(payload.type)) {
      chatSamples.push(payload);
      chatTypes.add(payload.type);
    }
  }

  return { chatSamples, pinSamples };
}
