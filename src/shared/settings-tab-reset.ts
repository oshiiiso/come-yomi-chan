import type { EventAlertType } from './event-alert';
import type { AppConfig, EventToggleMap } from './types';

export const SETTINGS_TAB_IDS = [
  'connect',
  'filter',
  'comment',
  'gift',
  'events',
  'look',
  'tts',
  'app',
] as const;

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

/** どのタブの初期化でも戻さない。ポートはオーバーレイタブにあるが、配信中の URL を変えない。 */
export const SETTINGS_TAB_RESET_KEPT_KEYS = [
  'overlayPort',
  'mainWindowBounds',
  'eventAlertDisplayMs',
  'configProfiles',
  'activeConfigProfileId',
  'settingsPreviewPx',
  'viewerEventPanePx',
  'viewerLayout',
  'viewerDock',
  'viewerFontSize',
  'viewerDisplay',
  'cachedTestGifts',
] as const satisfies readonly (keyof AppConfig)[];

const SCALAR_KEYS = {
  connect: ['uniqueId', 'confirmedUniqueId', 'autoConnectOnStart'],
  filter: ['ngWords', 'mutedUsers', 'blockedUsers', 'nicknameMap', 'speechReplaceMap'],
  comment: [
    'skipMentionSpeech',
    'skipUrlSpeech',
    'skipAnchorSpeech',
    'skipEmoteSpeech',
    'speakFanSubOnly',
    'speakFanMinLevel',
    'speakFanClubComments',
    'speakSubscriberComments',
    'skipRepeatSpeech',
    'repeatSpeechSec',
    'commentNotifyMode',
    'commentSoundEnabled',
    'commentSound',
    'commentSoundVolume',
    'fanLevelLook',
    'commentDisplayTemplate',
    'commentSpeechTemplate',
  ],
  gift: [
    'minGiftDiamonds',
    'giftNotifyMode',
    'giftChimePlayApp',
    'giftChimePlayOverlay',
    'giftChimeMatchMode',
    'giftChimeSound',
    'giftChimeVolume',
    'giftChimeByGiftId',
    'giftChimeVolumeByGiftId',
    'giftSpeakByGiftId',
    'giftChimeDiamondBands',
    'giftDisplayTemplate',
    'giftSpeechTemplate',
  ],
  events: [
    'eventNotifyMode',
    'eventSound',
    'eventSoundVolume',
    'likeMilestone',
    'followDisplayTemplate',
    'followSpeechTemplate',
    'shareDisplayTemplate',
    'shareSpeechTemplate',
    'subscribeDisplayTemplate',
    'subscribeSpeechTemplate',
    'superFanDisplayTemplate',
    'superFanSpeechTemplate',
    'superFanBoxDisplayTemplate',
    'superFanBoxSpeechTemplate',
    'envelopeDisplayTemplate',
    'envelopeSpeechTemplate',
    'portalDisplayTemplate',
    'portalSpeechTemplate',
    'portalJoinDisplayTemplate',
    'portalJoinSpeechTemplate',
    'likeDisplayTemplate',
    'likeSpeechTemplate',
    'memberDisplayTemplate',
    'memberSpeechTemplate',
  ],
  look: [
    'maxDisplayChars',
    'hideUserName',
    'overlayLikeRankingEnabled',
    'overlayLikeRankingMax',
    'overlayRankingMode',
    'overlayRankingLikeSyncMode',
    'overlayRankingLikePollSec',
    'overlayRankingMotion',
    'overlayRankingMotionSpeed',
    'overlayLikesTheme',
    'overlayLikesFontFamily',
    'overlayLikesFontSize',
    'overlayLikesBgOpacity',
    'overlayLikesShowAvatar',
    'overlayLikesAvatarSize',
    'overlayLikesItemRadius',
    'overlayLikesRowGap',
    'overlayLikesPanelWidth',
    'overlayLikesShowUnit',
    'overlayLikesNeonHue',
    'chatMaxRows',
    'chatDisplayMs',
    'overlayCustomCss',
    'overlayTheme',
    'overlayFontFamily',
    'overlayFontSize',
    'overlayBgOpacity',
    'overlayShowAvatar',
    'overlayGiftIconSize',
    'overlayItemRadius',
    'overlayNeonHue',
    'overlayAlign',
    'overlayPreviewBackdrop',
    'overlayMotion',
    'overlayMotionSpeed',
    'overlayPinEnabled',
    'overlayPinMs',
    'overlayPinMsByType',
    'overlayPinHold',
    'overlayPinTypes',
    'overlayPinPreview',
    'overlayNameColorEnabled',
    'overlayNameColors',
    'templateAccentColors',
    'overlayBoards',
  ],
  tts: [
    'ttsEngineId',
    'ttsVoice',
    'ttsTestText',
    'ttsVoicevoxSpeakerName',
    'voicevoxHost',
    'voicevoxPort',
    'voicevoxExePath',
    'voicevoxLaunchOnStart',
    'ttsRate',
    'ttsVolume',
    'beatMs',
    'maxSpeechChars',
    'maxQueue',
  ],
  app: [
    'minimizeToTray',
    'alwaysOnTop',
    'compactViewer',
    'uiTheme',
    'skipSpeechHotkey',
    'clearSpeechHotkey',
    'clearPinHotkey',
    'pauseSpeechHotkey',
    'muteCommentSoundHotkey',
    'viewerLogMaxRows',
  ],
} as const satisfies Record<SettingsTabId, readonly (keyof AppConfig)[]>;

const EVENT_TOGGLE_KEYS = {
  comment: ['comment'],
  gift: ['gift'],
  events: ['follow', 'share', 'subscribe', 'superFan', 'envelope', 'portal', 'like', 'member'],
} as const satisfies Partial<Record<SettingsTabId, readonly (keyof EventToggleMap)[]>>;

const ALERT_TYPES = {
  gift: ['gift'],
  events: ['follow', 'share', 'superFan', 'envelope', 'portal', 'like', 'member'],
} as const satisfies Partial<Record<SettingsTabId, readonly EventAlertType[]>>;

export function settingsTabScalarKeys(tab: SettingsTabId): readonly (keyof AppConfig)[] {
  return SCALAR_KEYS[tab];
}

export function isSettingsTabId(value: unknown): value is SettingsTabId {
  return typeof value === 'string' && (SETTINGS_TAB_IDS as readonly string[]).includes(value);
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function resetEventToggles(
  current: EventToggleMap,
  defaults: EventToggleMap,
  keys: readonly (keyof EventToggleMap)[],
): EventToggleMap {
  const next = { ...current };
  for (const key of keys) {
    next[key] = { ...defaults[key] };
  }
  return next;
}

export function resetSettingsTab(
  current: AppConfig,
  defaults: AppConfig,
  tab: SettingsTabId,
): AppConfig {
  const next: AppConfig = {
    ...current,
    events: { ...current.events },
    eventAlertEnabled: { ...current.eventAlertEnabled },
    eventAlertMedia: { ...current.eventAlertMedia },
    eventAlertDisplayMsByType: { ...current.eventAlertDisplayMsByType },
  };
  const record = next as unknown as Record<keyof AppConfig, AppConfig[keyof AppConfig]>;
  for (const key of SCALAR_KEYS[tab]) {
    record[key] = cloneValue(defaults[key]);
  }
  const eventKeys = EVENT_TOGGLE_KEYS[tab as keyof typeof EVENT_TOGGLE_KEYS];
  if (eventKeys) {
    next.events = resetEventToggles(next.events, defaults.events, eventKeys);
  }
  const alertTypes = ALERT_TYPES[tab as keyof typeof ALERT_TYPES];
  if (alertTypes) {
    for (const type of alertTypes) {
      next.eventAlertEnabled[type] = defaults.eventAlertEnabled[type];
      next.eventAlertMedia[type] = cloneValue(defaults.eventAlertMedia[type]);
      next.eventAlertDisplayMsByType[type] = defaults.eventAlertDisplayMsByType[type];
    }
  }
  return next;
}
