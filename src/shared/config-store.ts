import Store from 'electron-store';
import { APP_CONFIG } from './app-config';
import { overlayPreviewUrl, overlayPublicUrl, overlayStudioUrl } from './overlay-url';
import { DEFAULT_OVERLAY_LOOK, overlayLookFromConfig, OVERLAY_FONTS, OVERLAY_LOOK_PRESETS } from './overlay-look';
import { normalizeChatDisplayMs } from './chat-display';
import { MSG } from './messages';
import { normalizeVoicevoxHost } from '../tts/voicevox-url';
import { formatVoicevoxDescriptionCredit } from '../tts/voicevox-credit';
import { resolveVoicevoxExecutable } from '../tts/voicevox-launcher';
import {
  AppConfig,
  AppConfigSaveInput,
  AppConfigView,
  DEFAULT_EVENT_TOGGLES,
  EventToggleMap,
} from './types';
import { normalizeCatalogGifts } from '../tiktok/gift-fields';
import { resolveBlockedAndMutedUsers } from './comment-filters';
import { DEFAULT_UI_THEME, normalizeUiTheme } from './ui-theme';
import { clampSettingsPreviewPx, DEFAULT_SETTINGS_PREVIEW_PX } from './settings-layout';
import {
  clampViewerEventPanePx,
  clampViewerFontSize,
  DEFAULT_VIEWER_EVENT_PANE_PX,
  DEFAULT_VIEWER_FONT_SIZE,
  DEFAULT_VIEWER_LAYOUT,
  normalizeViewerLayout,
} from './viewer-layout';
import { DEFAULT_VIEWER_DISPLAY, normalizeViewerDisplay } from './viewer-event';
import {
  clampRepeatSpeechSec,
  clampSpeakFanMinLevel,
  DEFAULT_REPEAT_SPEECH_SEC,
  DEFAULT_SPEAK_FAN_MIN_LEVEL,
} from './speech-filters';
import { DEFAULT_FAN_LEVEL_LOOK, normalizeFanLevelLook } from './fan-level-look';
import { parseConfigExport } from './config-transfer';
import {
  DEFAULT_CLEAR_PIN_HOTKEY,
  DEFAULT_CLEAR_SPEECH_HOTKEY,
  DEFAULT_SKIP_SPEECH_HOTKEY,
  normalizeHotkey,
} from './hotkeys';
import {
  DEFAULT_OVERLAY_PIN,
  normalizeOverlayPinMs,
  normalizeOverlayPinTypes,
} from './overlay-pin';
import { DEFAULT_VIEWER_DOCK, normalizeViewerDock } from './viewer-dock';

type StoredConfig = AppConfig & { configVersion?: number };

type StoreSchema = {
  config: StoredConfig;
};

const CONFIG_VERSION = 3;

function overlayUrlFrom(port: number): string {
  return overlayPublicUrl(port);
}

function normalizeNgWords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeToggle(
  raw: unknown,
  fallback: { display: boolean; speak: boolean },
): { display: boolean; speak: boolean } {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback };
  }

  const record = raw as { display?: unknown; speak?: unknown };
  return {
    display: typeof record.display === 'boolean' ? record.display : fallback.display,
    speak: typeof record.speak === 'boolean' ? record.speak : fallback.speak,
  };
}

function normalizeEvents(raw: unknown): EventToggleMap {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    comment: normalizeToggle(record.comment, DEFAULT_EVENT_TOGGLES.comment),
    gift: normalizeToggle(record.gift, DEFAULT_EVENT_TOGGLES.gift),
    follow: normalizeToggle(record.follow, DEFAULT_EVENT_TOGGLES.follow),
    share: normalizeToggle(record.share, DEFAULT_EVENT_TOGGLES.share),
    subscribe: normalizeToggle(record.subscribe, DEFAULT_EVENT_TOGGLES.subscribe),
    superFan: normalizeToggle(record.superFan, DEFAULT_EVENT_TOGGLES.superFan),
    envelope: normalizeToggle(record.envelope, DEFAULT_EVENT_TOGGLES.envelope),
    portal: normalizeToggle(record.portal, DEFAULT_EVENT_TOGGLES.portal),
    like: normalizeToggle(record.like, DEFAULT_EVENT_TOGGLES.like),
    member: normalizeToggle(record.member, DEFAULT_EVENT_TOGGLES.member),
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  uniqueId: '',
  confirmedUniqueId: '',
  overlayPort: APP_CONFIG.overlayPort,
  minimizeToTray: false,
  autoConnectOnStart: false,
  alwaysOnTop: false,
  compactViewer: false,
  ttsEngineId: 'windows',
  ttsVoice: '',
  ttsTestText: MSG.tester.speechDefault,
  ttsVoicevoxSpeakerName: '',
  voicevoxHost: APP_CONFIG.voicevoxHost,
  voicevoxPort: APP_CONFIG.voicevoxPort,
  voicevoxExePath: '',
  voicevoxLaunchOnStart: false,
  ttsRate: 0,
  ttsVolume: 100,
  beatMs: APP_CONFIG.beatMs,
  maxSpeechChars: 80,
  maxDisplayChars: 80,
  maxQueue: 20,
  skipSpeechHotkey: DEFAULT_SKIP_SPEECH_HOTKEY,
  clearSpeechHotkey: DEFAULT_CLEAR_SPEECH_HOTKEY,
  clearPinHotkey: DEFAULT_CLEAR_PIN_HOTKEY,
  ngWords: [],
  mutedUsers: [],
  blockedUsers: [],
  skipMentionSpeech: true,
  skipUrlSpeech: true,
  skipAnchorSpeech: false,
  skipEmoteSpeech: false,
  speakFanSubOnly: false,
  speakFanMinLevel: DEFAULT_SPEAK_FAN_MIN_LEVEL,
  speakSubscriberComments: true,
  skipRepeatSpeech: false,
  repeatSpeechSec: DEFAULT_REPEAT_SPEECH_SEC,
  hideUserName: false,
  minGiftDiamonds: 0,
  giftChimeDiamonds: 0,
  likeMilestone: 100,
  chatMaxRows: 8,
  chatDisplayMs: 12000,
  overlayCustomCss: '',
  overlayTheme: DEFAULT_OVERLAY_LOOK.theme,
  overlayFontFamily: DEFAULT_OVERLAY_LOOK.fontFamily,
  overlayFontSize: DEFAULT_OVERLAY_LOOK.fontSize,
  overlayBgOpacity: DEFAULT_OVERLAY_LOOK.bgOpacity,
  overlayShowAvatar: DEFAULT_OVERLAY_LOOK.showAvatar,
  overlayGiftIconSize: DEFAULT_OVERLAY_LOOK.giftIconSize,
  overlayItemRadius: DEFAULT_OVERLAY_LOOK.itemRadius,
  overlayNeonHue: DEFAULT_OVERLAY_LOOK.neonHue,
  overlayAlign: DEFAULT_OVERLAY_LOOK.align,
  overlayPreviewBackdrop: DEFAULT_OVERLAY_LOOK.previewBackdrop,
  overlayMotion: DEFAULT_OVERLAY_LOOK.motion,
  overlayMotionSpeed: DEFAULT_OVERLAY_LOOK.motionSpeed,
  overlayPinEnabled: DEFAULT_OVERLAY_PIN.enabled,
  overlayPinMs: DEFAULT_OVERLAY_PIN.displayMs,
  overlayPinHold: DEFAULT_OVERLAY_PIN.hold,
  overlayPinTypes: { ...DEFAULT_OVERLAY_PIN.types },
  overlayPinPreview: DEFAULT_OVERLAY_PIN.previewPinned,
  uiTheme: DEFAULT_UI_THEME,
  settingsPreviewPx: DEFAULT_SETTINGS_PREVIEW_PX,
  viewerEventPanePx: DEFAULT_VIEWER_EVENT_PANE_PX,
  viewerLayout: DEFAULT_VIEWER_LAYOUT,
  viewerDock: DEFAULT_VIEWER_DOCK,
  viewerFontSize: DEFAULT_VIEWER_FONT_SIZE,
  viewerDisplay: DEFAULT_VIEWER_DISPLAY,
  fanLevelLook: DEFAULT_FAN_LEVEL_LOOK,
  commentDisplayTemplate: MSG.template.commentDisplayDefault,
  commentSpeechTemplate: MSG.template.commentSpeechDefault,
  giftDisplayTemplate: MSG.template.giftDisplayDefault,
  giftSpeechTemplate: MSG.template.giftSpeechDefault,
  followDisplayTemplate: MSG.template.followDisplayDefault,
  followSpeechTemplate: MSG.template.followSpeechDefault,
  shareDisplayTemplate: MSG.template.shareDisplayDefault,
  shareSpeechTemplate: MSG.template.shareSpeechDefault,
  subscribeDisplayTemplate: MSG.template.subscribeDisplayDefault,
  subscribeSpeechTemplate: MSG.template.subscribeSpeechDefault,
  superFanDisplayTemplate: MSG.template.superFanDisplayDefault,
  superFanSpeechTemplate: MSG.template.superFanSpeechDefault,
  superFanBoxDisplayTemplate: MSG.template.superFanBoxDisplayDefault,
  superFanBoxSpeechTemplate: MSG.template.superFanBoxSpeechDefault,
  envelopeDisplayTemplate: MSG.template.envelopeDisplayDefault,
  envelopeSpeechTemplate: MSG.template.envelopeSpeechDefault,
  portalDisplayTemplate: MSG.template.portalDisplayDefault,
  portalSpeechTemplate: MSG.template.portalSpeechDefault,
  portalJoinDisplayTemplate: MSG.template.portalJoinDisplayDefault,
  portalJoinSpeechTemplate: MSG.template.portalJoinSpeechDefault,
  likeDisplayTemplate: MSG.template.likeDisplayDefault,
  likeSpeechTemplate: MSG.template.likeSpeechDefault,
  memberDisplayTemplate: MSG.template.memberDisplayDefault,
  memberSpeechTemplate: MSG.template.memberSpeechDefault,
  events: DEFAULT_EVENT_TOGGLES,
  cachedTestGifts: [],
};

export function resetConfigKeepingIdentity(
  current: Pick<AppConfig, 'uniqueId' | 'confirmedUniqueId' | 'overlayPort'>,
): AppConfig {
  return {
    ...DEFAULT_CONFIG,
    uniqueId: current.uniqueId,
    confirmedUniqueId: current.confirmedUniqueId,
    overlayPort: current.overlayPort,
  };
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export class ConfigStore {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'config',
      defaults: {
        config: DEFAULT_CONFIG,
      },
    });
  }

  private persist(config: AppConfig): void {
    const stored: StoredConfig = {
      ...config,
      configVersion: CONFIG_VERSION,
    };
    this.store.set('config', stored);
  }

  private normalize(raw: Partial<StoredConfig> | undefined): AppConfig {
    const merged = {
      ...DEFAULT_CONFIG,
      ...raw,
    };
    const version = typeof raw?.configVersion === 'number' ? raw.configVersion : 0;
    const minimizeToTray = version >= 2 ? Boolean(merged.minimizeToTray) : false;
    const look = overlayLookFromConfig(merged);
    const userLists = resolveBlockedAndMutedUsers(raw ?? {});

    return {
      uniqueId: asString(merged.uniqueId, '').replace(/^@/, '').trim(),
      confirmedUniqueId: asString(merged.confirmedUniqueId, '').replace(/^@/, '').trim(),
      overlayPort: clampInt(merged.overlayPort, DEFAULT_CONFIG.overlayPort, 1024, 65535),
      minimizeToTray,
      autoConnectOnStart: asBoolean(merged.autoConnectOnStart, DEFAULT_CONFIG.autoConnectOnStart),
      alwaysOnTop: asBoolean(merged.alwaysOnTop, DEFAULT_CONFIG.alwaysOnTop),
      compactViewer: asBoolean(merged.compactViewer, DEFAULT_CONFIG.compactViewer),
      ttsEngineId: merged.ttsEngineId === 'voicevox' ? 'voicevox' : 'windows',
      ttsVoice: asString(merged.ttsVoice, ''),
      ttsTestText: asString(merged.ttsTestText, DEFAULT_CONFIG.ttsTestText).slice(0, 400),
      ttsVoicevoxSpeakerName: asString(merged.ttsVoicevoxSpeakerName, '').slice(0, 80),
      voicevoxHost: normalizeVoicevoxHost(asString(merged.voicevoxHost, DEFAULT_CONFIG.voicevoxHost)),
      voicevoxPort: clampInt(merged.voicevoxPort, DEFAULT_CONFIG.voicevoxPort, 1024, 65535),
      voicevoxExePath: asString(merged.voicevoxExePath, '').slice(0, 500),
      voicevoxLaunchOnStart: asBoolean(
        merged.voicevoxLaunchOnStart,
        DEFAULT_CONFIG.voicevoxLaunchOnStart,
      ),
      ttsRate: clampInt(merged.ttsRate, 0, -10, 10),
      ttsVolume: clampInt(merged.ttsVolume, 100, 0, 100),
      beatMs: clampInt(merged.beatMs, DEFAULT_CONFIG.beatMs, 50, 2000),
      maxSpeechChars: clampInt(merged.maxSpeechChars, 80, 10, 400),
      maxDisplayChars: clampInt(merged.maxDisplayChars, 80, 10, 400),
      maxQueue: clampInt(merged.maxQueue, 20, 1, 100),
      skipSpeechHotkey: normalizeHotkey(merged.skipSpeechHotkey, DEFAULT_SKIP_SPEECH_HOTKEY),
      clearSpeechHotkey: normalizeHotkey(merged.clearSpeechHotkey, DEFAULT_CLEAR_SPEECH_HOTKEY),
      clearPinHotkey: normalizeHotkey(merged.clearPinHotkey, DEFAULT_CLEAR_PIN_HOTKEY),
      ngWords: normalizeNgWords(merged.ngWords),
      mutedUsers: userLists.mutedUsers,
      blockedUsers: userLists.blockedUsers,
      skipMentionSpeech: asBoolean(merged.skipMentionSpeech, DEFAULT_CONFIG.skipMentionSpeech),
      skipUrlSpeech: asBoolean(merged.skipUrlSpeech, DEFAULT_CONFIG.skipUrlSpeech),
      skipAnchorSpeech: asBoolean(merged.skipAnchorSpeech, DEFAULT_CONFIG.skipAnchorSpeech),
      skipEmoteSpeech: asBoolean(merged.skipEmoteSpeech, DEFAULT_CONFIG.skipEmoteSpeech),
      speakFanSubOnly: asBoolean(merged.speakFanSubOnly, DEFAULT_CONFIG.speakFanSubOnly),
      speakFanMinLevel: clampSpeakFanMinLevel(merged.speakFanMinLevel),
      speakSubscriberComments: asBoolean(
        merged.speakSubscriberComments,
        DEFAULT_CONFIG.speakSubscriberComments,
      ),
      skipRepeatSpeech: asBoolean(merged.skipRepeatSpeech, DEFAULT_CONFIG.skipRepeatSpeech),
      repeatSpeechSec: clampRepeatSpeechSec(merged.repeatSpeechSec),
      hideUserName: asBoolean(merged.hideUserName, DEFAULT_CONFIG.hideUserName),
      minGiftDiamonds: clampInt(merged.minGiftDiamonds, 0, 0, 100000),
      giftChimeDiamonds: clampInt(merged.giftChimeDiamonds, 0, 0, 100000),
      likeMilestone: clampInt(merged.likeMilestone, DEFAULT_CONFIG.likeMilestone, 1, 100000),
      chatMaxRows: clampInt(merged.chatMaxRows, 8, 1, 50),
      chatDisplayMs: normalizeChatDisplayMs(merged.chatDisplayMs, DEFAULT_CONFIG.chatDisplayMs),
      overlayCustomCss: asString(merged.overlayCustomCss, '').slice(0, 80_000),
      overlayTheme: look.theme,
      overlayFontFamily: look.fontFamily,
      overlayFontSize: look.fontSize,
      overlayBgOpacity: look.bgOpacity,
      overlayShowAvatar: look.showAvatar,
      overlayGiftIconSize: look.giftIconSize,
      overlayItemRadius: look.itemRadius,
      overlayNeonHue: look.neonHue,
      overlayAlign: look.align,
      overlayPreviewBackdrop: look.previewBackdrop,
      overlayMotion: look.motion,
      overlayMotionSpeed: look.motionSpeed,
      overlayPinEnabled: asBoolean(merged.overlayPinEnabled, DEFAULT_CONFIG.overlayPinEnabled),
      overlayPinMs: normalizeOverlayPinMs(merged.overlayPinMs),
      overlayPinHold: asBoolean(merged.overlayPinHold, DEFAULT_CONFIG.overlayPinHold),
      overlayPinTypes: normalizeOverlayPinTypes(merged.overlayPinTypes),
      overlayPinPreview: asBoolean(merged.overlayPinPreview, DEFAULT_CONFIG.overlayPinPreview),
      uiTheme: normalizeUiTheme(merged.uiTheme),
      settingsPreviewPx: clampSettingsPreviewPx(merged.settingsPreviewPx),
      viewerEventPanePx: clampViewerEventPanePx(merged.viewerEventPanePx),
      viewerLayout: normalizeViewerLayout(merged.viewerLayout),
      viewerDock: normalizeViewerDock(merged.viewerDock),
      viewerFontSize: clampViewerFontSize(merged.viewerFontSize),
      viewerDisplay: normalizeViewerDisplay(merged.viewerDisplay),
      fanLevelLook: normalizeFanLevelLook(merged.fanLevelLook),
      commentDisplayTemplate: asString(
        merged.commentDisplayTemplate,
        DEFAULT_CONFIG.commentDisplayTemplate,
      ),
      commentSpeechTemplate: asString(
        merged.commentSpeechTemplate,
        DEFAULT_CONFIG.commentSpeechTemplate,
      ),
      giftDisplayTemplate: asString(
        merged.giftDisplayTemplate,
        DEFAULT_CONFIG.giftDisplayTemplate,
      ),
      giftSpeechTemplate: asString(
        merged.giftSpeechTemplate,
        DEFAULT_CONFIG.giftSpeechTemplate,
      ),
      followDisplayTemplate: asString(
        merged.followDisplayTemplate,
        DEFAULT_CONFIG.followDisplayTemplate,
      ),
      followSpeechTemplate: asString(
        merged.followSpeechTemplate,
        DEFAULT_CONFIG.followSpeechTemplate,
      ),
      shareDisplayTemplate: asString(
        merged.shareDisplayTemplate,
        DEFAULT_CONFIG.shareDisplayTemplate,
      ),
      shareSpeechTemplate: asString(
        merged.shareSpeechTemplate,
        DEFAULT_CONFIG.shareSpeechTemplate,
      ),
      subscribeDisplayTemplate: asString(
        merged.subscribeDisplayTemplate,
        DEFAULT_CONFIG.subscribeDisplayTemplate,
      ),
      subscribeSpeechTemplate: asString(
        merged.subscribeSpeechTemplate,
        DEFAULT_CONFIG.subscribeSpeechTemplate,
      ),
      superFanDisplayTemplate: asString(
        merged.superFanDisplayTemplate,
        DEFAULT_CONFIG.superFanDisplayTemplate,
      ),
      superFanSpeechTemplate: asString(
        merged.superFanSpeechTemplate,
        DEFAULT_CONFIG.superFanSpeechTemplate,
      ),
      superFanBoxDisplayTemplate: asString(
        merged.superFanBoxDisplayTemplate,
        DEFAULT_CONFIG.superFanBoxDisplayTemplate,
      ),
      superFanBoxSpeechTemplate: asString(
        merged.superFanBoxSpeechTemplate,
        DEFAULT_CONFIG.superFanBoxSpeechTemplate,
      ),
      envelopeDisplayTemplate: asString(
        merged.envelopeDisplayTemplate,
        DEFAULT_CONFIG.envelopeDisplayTemplate,
      ),
      envelopeSpeechTemplate: asString(
        merged.envelopeSpeechTemplate,
        DEFAULT_CONFIG.envelopeSpeechTemplate,
      ),
      portalDisplayTemplate: asString(
        merged.portalDisplayTemplate,
        DEFAULT_CONFIG.portalDisplayTemplate,
      ),
      portalSpeechTemplate: asString(
        merged.portalSpeechTemplate,
        DEFAULT_CONFIG.portalSpeechTemplate,
      ),
      portalJoinDisplayTemplate: asString(
        merged.portalJoinDisplayTemplate,
        DEFAULT_CONFIG.portalJoinDisplayTemplate,
      ),
      portalJoinSpeechTemplate: asString(
        merged.portalJoinSpeechTemplate,
        DEFAULT_CONFIG.portalJoinSpeechTemplate,
      ),
      likeDisplayTemplate: asString(
        merged.likeDisplayTemplate,
        DEFAULT_CONFIG.likeDisplayTemplate,
      ),
      likeSpeechTemplate: asString(
        merged.likeSpeechTemplate,
        DEFAULT_CONFIG.likeSpeechTemplate,
      ),
      memberDisplayTemplate: asString(
        merged.memberDisplayTemplate,
        DEFAULT_CONFIG.memberDisplayTemplate,
      ),
      memberSpeechTemplate: asString(
        merged.memberSpeechTemplate,
        DEFAULT_CONFIG.memberSpeechTemplate,
      ),
      events: normalizeEvents(merged.events),
      cachedTestGifts: normalizeCatalogGifts(merged.cachedTestGifts),
    };
  }

  get(): AppConfig {
    const stored = this.store.get('config');
    const normalized = this.normalize(stored);
    if ((stored?.configVersion ?? 0) < CONFIG_VERSION) {
      this.persist(normalized);
    }
    return normalized;
  }

  toView(): AppConfigView {
    const config = this.get();
    return {
      ...config,
      overlayUrl: overlayUrlFrom(config.overlayPort),
      overlayStudioUrl: overlayStudioUrl(config.overlayPort),
      overlayPreviewUrl: overlayPreviewUrl(config.overlayPort),
      overlayLookPresets: OVERLAY_LOOK_PRESETS,
      overlayFonts: OVERLAY_FONTS.map((font) => ({
        id: font.id,
        label: font.label,
        css: font.css,
      })),
      voicevoxCreditText:
        config.ttsEngineId === 'voicevox'
          ? formatVoicevoxDescriptionCredit(config.ttsVoicevoxSpeakerName)
          : '',
      voicevoxExeSuggested: resolveVoicevoxExecutable(config.voicevoxExePath),
    };
  }

  save(partial: AppConfigSaveInput): AppConfig {
    const current = this.get();
    const next = this.normalize({
      ...current,
      ...partial,
      events: partial.events ?? current.events,
      ngWords: partial.ngWords ?? current.ngWords,
      mutedUsers: partial.mutedUsers ?? current.mutedUsers,
      blockedUsers: partial.blockedUsers ?? current.blockedUsers,
      viewerDisplay: partial.viewerDisplay ?? current.viewerDisplay,
      viewerDock: partial.viewerDock ?? current.viewerDock,
      fanLevelLook: partial.fanLevelLook ?? current.fanLevelLook,
      configVersion: CONFIG_VERSION,
    });
    if (
      next.uniqueId !== current.uniqueId &&
      next.uniqueId.toLowerCase() !== next.confirmedUniqueId.toLowerCase()
    ) {
      next.confirmedUniqueId = '';
    }
    this.persist(next);
    return this.get();
  }

  reset(): AppConfig {
    const current = this.get();
    const next = this.normalize({
      ...resetConfigKeepingIdentity(current),
      configVersion: CONFIG_VERSION,
    });
    this.persist(next);
    return this.get();
  }

  replaceFromExport(raw: unknown): AppConfig | null {
    const parsed = parseConfigExport(raw);
    if (!parsed) {
      return null;
    }
    const next = this.normalize({
      ...parsed,
      configVersion: CONFIG_VERSION,
    });
    this.persist(next);
    return this.get();
  }
}

export function getOverlayUrl(port: number): string {
  return overlayUrlFrom(port);
}
