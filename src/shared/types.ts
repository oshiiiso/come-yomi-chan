import type { UiTheme } from './ui-theme';
import type { FanLevelStep } from './fan-level-look';
import type { ViewerDockNode } from './viewer-dock';
import type { ViewerLayoutMode } from './viewer-layout';
import type { ViewerRoomStats } from './viewer-room-stats';
import type {
  CommentNotifyMode,
  GiftChimeDiamondBand,
  GiftChimeMatchMode,
  GiftNotifyMode,
} from './gift-notify';
import type { EventNotifyModeMap, EventSoundMap } from './event-notify';
import type {
  EventAlertDisplayMsMap,
  EventAlertEnabledMap,
  EventAlertMediaMap,
} from './event-alert';
import type { NicknameMapEntry } from './nickname-map';
import type { SoundRef } from './sound-ref';
import type { ConfigProfile } from './config-profiles';
import type { SpeechReplaceEntry } from './speech-replace-map';
import type { CommentEmote } from './comment-emotes';
import type { MainWindowBounds } from './window-bounds';

export type LiveConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'waiting_live'
  | 'live'
  | 'error';

export type OverlayEventType =
  | 'comment'
  | 'gift'
  | 'follow'
  | 'share'
  | 'subscribe'
  | 'superFan'
  | 'envelope'
  | 'portal'
  | 'like'
  | 'member';

/** 配信の月額加入はスーパーファン。旧 subscribe 通知もここに寄せる。 */
export function canonicalOverlayType(type: OverlayEventType): OverlayEventType {
  return type === 'subscribe' ? 'superFan' : type;
}

export interface EventToggle {
  display: boolean;
  speak: boolean;
}

export interface EventToggleMap {
  comment: EventToggle;
  gift: EventToggle;
  follow: EventToggle;
  share: EventToggle;
  subscribe: EventToggle;
  superFan: EventToggle;
  envelope: EventToggle;
  portal: EventToggle;
  like: EventToggle;
  member: EventToggle;
}

export interface CatalogGift {
  id: string;
  name: string;
  imageUrl: string;
  diamondCount: number;
}

export interface AppConfig {
  uniqueId: string;
  confirmedUniqueId: string;
  overlayPort: number;
  minimizeToTray: boolean;
  autoConnectOnStart: boolean;
  alwaysOnTop: boolean;
  compactViewer: boolean;
  /** メイン窓の位置・サイズ。未保存は null。 */
  mainWindowBounds: MainWindowBounds | null;
  ttsEngineId: string;
  ttsVoice: string;
  ttsTestText: string;
  ttsVoicevoxSpeakerName: string;
  voicevoxHost: string;
  voicevoxPort: number;
  voicevoxExePath: string;
  voicevoxLaunchOnStart: boolean;
  ttsRate: number;
  ttsVolume: number;
  beatMs: number;
  maxSpeechChars: number;
  maxDisplayChars: number;
  maxQueue: number;
  skipSpeechHotkey: string;
  clearSpeechHotkey: string;
  clearPinHotkey: string;
  pauseSpeechHotkey: string;
  muteCommentSoundHotkey: string;
  ngWords: string[];
  mutedUsers: string[];
  blockedUsers: string[];
  nicknameMap: NicknameMapEntry[];
  skipMentionSpeech: boolean;
  skipUrlSpeech: boolean;
  skipAnchorSpeech: boolean;
  skipEmoteSpeech: boolean;
  speakFanSubOnly: boolean;
  speakFanMinLevel: number;
  speakFanClubComments: boolean;
  speakSubscriberComments: boolean;
  skipRepeatSpeech: boolean;
  repeatSpeechSec: number;
  hideUserName: boolean;
  minGiftDiamonds: number;
  giftNotifyMode: GiftNotifyMode;
  giftChimePlayApp: boolean;
  giftChimePlayOverlay: boolean;
  giftChimeMatchMode: GiftChimeMatchMode;
  giftChimeSound: SoundRef;
  /** 共通／テンプレ音の音量。個別ファイル音は giftChimeVolumeByGiftId。 */
  giftChimeVolume: number;
  giftChimeByGiftId: Record<string, SoundRef>;
  giftChimeVolumeByGiftId: Record<string, number>;
  giftSpeakByGiftId: Record<string, boolean>;
  giftChimeDiamondBands: GiftChimeDiamondBand[];
  commentNotifyMode: CommentNotifyMode;
  commentSoundEnabled: boolean;
  commentSound: SoundRef;
  /** フォローなどイベント種別ごとの読み上げ／サウンド。 */
  eventNotifyMode: EventNotifyModeMap;
  eventSound: EventSoundMap;
  /** イベントアラート配信ソースに出すか。欠けは読み上げ（speak）と同じ。 */
  eventAlertEnabled: EventAlertEnabledMap;
  eventAlertMedia: EventAlertMediaMap;
  /** @deprecated 種類別の eventAlertDisplayMsByType を使う。無いときの移行用。 */
  eventAlertDisplayMs: number;
  eventAlertDisplayMsByType: EventAlertDisplayMsMap;
  configProfiles: ConfigProfile[];
  activeConfigProfileId: string;
  likeMilestone: number;
  chatMaxRows: number;
  chatDisplayMs: number;
  overlayCustomCss: string;
  overlayTheme: string;
  overlayFontFamily: string;
  overlayFontSize: number;
  overlayBgOpacity: number;
  overlayShowAvatar: boolean;
  overlayGiftIconSize: number;
  overlayItemRadius: number;
  overlayNeonHue: number;
  overlayAlign: string;
  overlayPreviewBackdrop: string;
  overlayMotion: string;
  overlayMotionSpeed: number;
  overlayPinEnabled: boolean;
  overlayPinMs: number;
  overlayPinMsByType: Record<string, number>;
  overlayPinHold: boolean;
  overlayPinTypes: Record<string, boolean>;
  overlayPinPreview: boolean;
  overlayNameColorEnabled: boolean;
  overlayNameColors: string[];
  uiTheme: UiTheme;
  settingsPreviewPx: number;
  viewerEventPanePx: number;
  viewerLayout: ViewerLayoutMode;
  viewerDock: ViewerDockNode;
  viewerFontSize: number;
  viewerDisplay: Record<OverlayEventType, boolean>;
  fanLevelLook: FanLevelStep[];
  speechReplaceMap: SpeechReplaceEntry[];
  viewerLogMaxRows: number;
  commentDisplayTemplate: string;
  commentSpeechTemplate: string;
  giftDisplayTemplate: string;
  giftSpeechTemplate: string;
  followDisplayTemplate: string;
  followSpeechTemplate: string;
  shareDisplayTemplate: string;
  shareSpeechTemplate: string;
  subscribeDisplayTemplate: string;
  subscribeSpeechTemplate: string;
  superFanDisplayTemplate: string;
  superFanSpeechTemplate: string;
  superFanBoxDisplayTemplate: string;
  superFanBoxSpeechTemplate: string;
  envelopeDisplayTemplate: string;
  envelopeSpeechTemplate: string;
  portalDisplayTemplate: string;
  portalSpeechTemplate: string;
  portalJoinDisplayTemplate: string;
  portalJoinSpeechTemplate: string;
  likeDisplayTemplate: string;
  likeSpeechTemplate: string;
  memberDisplayTemplate: string;
  memberSpeechTemplate: string;
  events: EventToggleMap;
  cachedTestGifts: CatalogGift[];
}

export interface AppConfigView extends AppConfig {
  overlayUrl: string;
  overlayStudioUrl: string;
  overlayPreviewUrl: string;
  overlayAlertsUrl: string;
  overlayAlertsStudioUrl: string;
  overlayAlertsPreviewUrl: string;
  overlayLookPresets: Record<string, {
    theme: string;
    fontFamily: string;
    fontSize: number;
    bgOpacity: number;
    showAvatar: boolean;
    giftIconSize: number;
    itemRadius: number;
    neonHue: number;
    align: string;
    previewBackdrop: string;
  }>;
  /** かんたん見た目プリセット ID → 名前色5色 */
  overlayNameColorPresets: Record<string, [string, string, string, string, string]>;
  overlayFonts: Array<{ id: string; label: string; css: string }>;
  voicevoxCreditText: string;
  voicevoxExeSuggested: string;
}

export type AppConfigSaveInput = Partial<AppConfig>;

export interface LiveStatus {
  state: LiveConnectionState;
  uniqueId: string;
  message: string;
  overlayUrl: string;
  overlayListening: boolean;
  overlayClients: number;
  lastUpdated: string;
  roomStats: ViewerRoomStats | null;
  streamStartedAtMs: number | null;
  speechPaused: boolean;
  commentSoundMuted: boolean;
}

export interface TtsVoiceInfo {
  id: string;
  name: string;
  speakerName?: string;
}

export interface OverlayUser {
  uniqueId: string;
  nickname: string;
  /** 呼び方を差し替える前の TikTok 上の名前。無いときは nickname と同じ扱い。 */
  sourceNickname?: string;
  avatarUrl: string;
  isFanClub: boolean;
  fanClubStatus: number;
  isSuperFan: boolean;
  fanClubLevel: number;
  fanClubName: string;
  isModerator: boolean;
  isAnchor: boolean;
}

export interface NormalizedLiveEvent {
  type: OverlayEventType;
  user: OverlayUser;
  comment: string;
  commentEmotes: CommentEmote[];
  likeCount: number;
  giftId: string;
  giftName: string;
  giftCount: number;
  giftImageUrl: string;
  diamondCount: number;
  receivedAt: string;
}

export interface OverlayPayload {
  type: OverlayEventType;
  user: OverlayUser;
  displayText: string;
  comment: string;
  commentEmotes: CommentEmote[];
  giftImageUrl: string;
  audioUrl: string | null;
  receivedAt: string;
}

export const DEFAULT_EVENT_TOGGLES: EventToggleMap = {
  comment: { display: true, speak: true },
  gift: { display: true, speak: true },
  follow: { display: true, speak: true },
  share: { display: true, speak: true },
  subscribe: { display: true, speak: true },
  superFan: { display: true, speak: true },
  envelope: { display: true, speak: true },
  portal: { display: true, speak: true },
  like: { display: false, speak: false },
  member: { display: false, speak: false },
};
