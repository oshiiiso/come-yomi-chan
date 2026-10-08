import { overlayGiftImagePath } from '../overlay-server/gift-image-proxy';
import {
  canonicalEventAlertType,
  resolveEventAlertDisplayMs,
  resolveEventAlertImageUrl,
} from '../shared/event-alert';
import { pickEventTemplates } from '../shared/event-templates';
import {
  normalizeOverlayLikeRankingMax,
  normalizeOverlayRankingMode,
  type OverlayRankingPayload,
} from '../shared/like-ranking';
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
import { nameColorForUser, normalizeOverlayNameColors } from '../shared/overlay-name-colors';
import { normalizeTemplateAccentColors } from '../shared/template-accent-colors';
import { renderOverlayDisplay, varsFromEvent } from '../template/render-template';
import { EMPTY_USER_LIVE_BADGES } from '../tiktok/user-badges';

export interface OverlaySamplePlan {
  chatSamples: OverlayPayload[];
  pinSamples: OverlayPayload[];
}

export interface OverlayAlertSample {
  type: string;
  displayText: string;
  displayParts: NonNullable<OverlayPayload['displayParts']>;
  imageUrl: string;
  displayMs: number;
  user: OverlayPayload['user'];
  nameColor: string | null;
}

/** レイアウト確認用の人物パターン */
export type SamplePersonaKind = 'normal' | 'short' | 'long' | 'emoji';

interface SamplePersona {
  kind: SamplePersonaKind;
  uniqueId: string;
  nickname: string;
  comment: string;
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
  persona?: SamplePersonaKind;
  nickname?: string;
  uniqueId?: string;
  comment?: string;
}

const SAMPLE_PERSONAS: Record<SamplePersonaKind, SamplePersona> = {
  normal: {
    kind: 'normal',
    uniqueId: 'sample_normal',
    nickname: 'テストユーザー',
    comment: 'テストコメントです',
  },
  short: {
    kind: 'short',
    uniqueId: 'sample_short',
    nickname: 'あ',
    comment: 'ok',
  },
  long: {
    kind: 'long',
    uniqueId: 'sample_long',
    nickname: 'すごく長いニックネームのテストユーザーさん一二三四五',
    comment:
      'これはかなり長いコメントのサンプルです。表示の折り返しや省略、吹き出しの幅が正しく見えるかを確認するための文を続けています。',
  },
  emoji: {
    kind: 'emoji',
    uniqueId: 'sample_emoji',
    nickname: '🐱✨',
    comment: '🎉',
  },
};

const PERSONA_ORDER: SamplePersonaKind[] = ['normal', 'short', 'long', 'emoji'];

function personaOf(kind: SamplePersonaKind | undefined): SamplePersona {
  return SAMPLE_PERSONAS[kind ?? 'normal'] ?? SAMPLE_PERSONAS.normal;
}

const CHAT_ROTATION_JOBS: SampleJob[] = [
  { type: 'comment', persona: 'normal' },
  { type: 'comment', persona: 'short', isFanClub: true, fanClubLevel: 4 },
  { type: 'comment', persona: 'long', isSuperFan: true },
  {
    type: 'comment',
    persona: 'emoji',
    isFanClub: true,
    isSuperFan: true,
    fanClubLevel: 4,
  },
  { type: 'comment', persona: 'normal', isModerator: true },
  { type: 'comment', persona: 'short', isAnchor: true },
  // コメント長の差をバッジ無しでも見る
  { type: 'comment', persona: 'long' },
  { type: 'comment', persona: 'emoji' },
];

const PIN_TYPE_JOBS: SampleJob[] = [
  { type: 'gift', giftCount: 100, persona: 'normal' },
  { type: 'follow', giftCount: 1, persona: 'short' },
  { type: 'share', giftCount: 1, persona: 'long' },
  { type: 'superFan', giftCount: 1, persona: 'emoji' },
  { type: 'superFan', giftCount: 1, superFanBox: true, persona: 'normal' },
  { type: 'envelope', giftCount: 1, persona: 'short' },
  { type: 'portal', giftCount: 1, persona: 'long' },
  { type: 'like', giftCount: 100, persona: 'emoji' },
  { type: 'member', giftCount: 1, persona: 'normal' },
  { type: 'member', giftCount: 1, portalJoin: true, persona: 'short' },
];

/** アラート用スモークテスト（設定のオン／オフに依存しない） */
const ALERT_SAMPLE_JOBS: SampleJob[] = [
  { type: 'gift', giftCount: 100, persona: 'normal' },
  { type: 'follow', giftCount: 1, persona: 'short' },
  { type: 'like', giftCount: 100, persona: 'long' },
  { type: 'share', giftCount: 1, persona: 'emoji' },
];

/** id は順位ではなく人の識別。サンプルを出すたびに数値だけ回して入れ替わりを見せる */
const RANKING_SAMPLE_ENTRIES: Array<{
  id: string;
  persona: SamplePersonaKind;
  likes: number;
  diamonds: number;
}> = [
  { id: 's1', persona: 'normal', likes: 12_500, diamonds: 8_800 },
  { id: 's2', persona: 'short', likes: 3_800, diamonds: 4_200 },
  { id: 's3', persona: 'long', likes: 1_450, diamonds: 2_150 },
  { id: 's4', persona: 'emoji', likes: 890, diamonds: 980 },
  { id: 's5', persona: 'normal', likes: 420, diamonds: 560 },
  { id: 's6', persona: 'short', likes: 220, diamonds: 310 },
  { id: 's7', persona: 'long', likes: 95, diamonds: 140 },
  { id: 's8', persona: 'emoji', likes: 60, diamonds: 75 },
  { id: 's9', persona: 'normal', likes: 35, diamonds: 40 },
  { id: 's10', persona: 'short', likes: 12, diamonds: 18 },
];

/** サンプルを出すたびに進めて、同じ顔ぶれで順位が動くようにする */
let rankingSamplePhase = 0;

function buildSampleEvent(
  job: SampleJob,
  config: AppConfig,
  catalogGift: CatalogGift | null,
): NormalizedLiveEvent | null {
  const type = canonicalOverlayType(job.portalJoin ? 'member' : job.type);
  const count =
    type === 'like' && (job.giftCount ?? 1) < 1 ? config.likeMilestone : (job.giftCount ?? 1);
  const fanClubStatus = job.isFanClub === true ? 1 : 0;
  const isFanClub = fanClubStatus === 1;
  const isSuperFan = job.isSuperFan === true;
  const isModerator = job.isModerator === true;
  const isAnchor = job.isAnchor === true;
  const fanClubLevel = isFanClub ? Math.max(1, Math.trunc(job.fanClubLevel || 4)) : 0;
  const persona = personaOf(job.persona);
  const uniqueId =
    (typeof job.uniqueId === 'string' && job.uniqueId.trim()) ||
    (isAnchor
      ? 'test_anchor'
      : isModerator
        ? 'test_mod'
        : isFanClub && isSuperFan
          ? `test_fan_super_${persona.kind}`
          : isSuperFan
            ? `test_super_${persona.kind}`
            : isFanClub
              ? `test_fan_${fanClubLevel}_${persona.kind}`
              : persona.uniqueId);
  const nickname =
    (typeof job.nickname === 'string' && job.nickname.trim()) || persona.nickname;
  const comment =
    (typeof job.comment === 'string' && job.comment) ||
    (type === 'comment' ? persona.comment : MSG.tester.comment);
  const diamondCount = catalogGift?.diamondCount ?? 1;
  return {
    type,
    user: {
      uniqueId,
      nickname,
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
  const nameColor =
    config.overlayNameColorEnabled !== false && event.user.nickname
      ? nameColorForUser(
          event.user.uniqueId,
          event.user.nickname,
          normalizeOverlayNameColors(config.overlayNameColors),
        )
      : null;
  const { displayText, displayParts } = renderOverlayDisplay(templates.display, vars, {
    hideUserName: config.hideUserName,
    maxChars: config.maxDisplayChars,
    nameColor,
    accentColors: normalizeTemplateAccentColors(config.templateAccentColors),
  });
  return {
    type: event.type,
    user: {
      ...event.user,
      avatarUrl: overlayGiftImagePath(event.user.avatarUrl),
    },
    displayText,
    displayParts,
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

/** イベントアラート用サンプル（同梱テンプレ画像で必ず出す） */
export function buildAlertSamplePlan(
  config: AppConfig,
  catalogGift: CatalogGift | null = null,
): OverlayAlertSample[] {
  const samples: OverlayAlertSample[] = [];
  for (const job of ALERT_SAMPLE_JOBS) {
    const event = buildSampleEvent(job, config, catalogGift);
    if (!event) {
      continue;
    }
    const alertType = canonicalEventAlertType(event.type);
    if (!alertType) {
      continue;
    }
    const payload = toOverlayPayload(event, config);
    const imageUrl = resolveEventAlertImageUrl({
      type: event.type,
      media: config.eventAlertMedia?.[alertType],
      giftImageUrl: payload.giftImageUrl,
      giftName: event.giftName,
    });
    if (!imageUrl) {
      continue;
    }
    const nameColor =
      config.overlayNameColorEnabled !== false && event.user.nickname
        ? nameColorForUser(
            event.user.uniqueId,
            event.user.nickname,
            normalizeOverlayNameColors(config.overlayNameColors),
          )
        : null;
    samples.push({
      type: event.type,
      displayText: payload.displayText,
      displayParts: payload.displayParts ?? [],
      imageUrl,
      displayMs: resolveEventAlertDisplayMs(
        event.type,
        config.eventAlertDisplayMsByType,
        config.eventAlertDisplayMs,
      ),
      user: payload.user,
      nameColor,
    });
  }
  return samples;
}

/** ランキング用サンプル（表示人数・モードに合わせる・名前バリエーション込み） */
export function buildRankingSample(config: AppConfig): OverlayRankingPayload {
  const max = normalizeOverlayLikeRankingMax(config.overlayLikeRankingMax);
  const mode = normalizeOverlayRankingMode(config.overlayRankingMode);
  const base = RANKING_SAMPLE_ENTRIES.slice(0, max);
  const countOf = (row: (typeof RANKING_SAMPLE_ENTRIES)[number]) =>
    mode === 'diamonds' ? row.diamonds : row.likes;
  // 1人のときは候補全体の長さで回し、数値変化でふわっと／強調を見せる
  const phaseMod =
    base.length <= 1 ? Math.max(1, RANKING_SAMPLE_ENTRIES.length) : Math.max(1, base.length);
  const phase = rankingSamplePhase % phaseMod;
  rankingSamplePhase += 1;

  let entries: OverlayRankingPayload['entries'];
  if (base.length === 1) {
    const row = base[0];
    const persona = personaOf(row.persona);
    const pool = RANKING_SAMPLE_ENTRIES.map(countOf);
    entries = [
      {
        uniqueId: `ranking_sample_${row.id}`,
        nickname: persona.nickname,
        count: pool[phase] ?? countOf(row),
        avatarUrl: '/overlay/preview-avatar.svg',
      },
    ];
  } else {
    // 数値だけ回し、同じ uniqueId のまま順位が入れ替わる（FLIP / ふわっと確認用）
    const baseCounts = base.map(countOf);
    const rotatedCounts = [...baseCounts.slice(phase), ...baseCounts.slice(0, phase)];
    entries = base
      .map((row, index) => {
        const persona = personaOf(row.persona);
        return {
          uniqueId: `ranking_sample_${row.id}`,
          nickname: persona.nickname,
          count: rotatedCounts[index] ?? 0,
          avatarUrl: '/overlay/preview-avatar.svg',
        };
      })
      .sort((left, right) => right.count - left.count || left.uniqueId.localeCompare(right.uniqueId));
  }
  return {
    enabled: true,
    max,
    mode,
    entries,
  };
}

/** @deprecated buildRankingSample を使う */
export const buildLikeRankingSample = buildRankingSample;

export function samplePersonaKinds(): SamplePersonaKind[] {
  return [...PERSONA_ORDER];
}
