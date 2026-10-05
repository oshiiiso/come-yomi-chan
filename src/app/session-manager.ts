import { EventEmitter } from 'events';
import { clipboard } from 'electron';
import { APP_CONFIG } from '../shared/app-config';
import { ConfigStore, getOverlayUrl } from '../shared/config-store';
import { buildOverlaySamplePlan } from './overlay-sample-plan';
import { overlayLookFromConfig } from '../shared/overlay-look';
import { overlayPinFromConfig } from '../shared/overlay-pin';
import {
  overlayAlertsPreviewUrl,
  overlayAlertsPublicUrl,
  overlayAlertsStudioUrl,
  overlayPreviewUrl,
  overlayStudioUrl,
} from '../shared/overlay-url';
import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';
import { MSG } from '../shared/messages';
import {
  AppConfig,
  AppConfigSaveInput,
  LiveConnectionState,
  LiveStatus,
  NormalizedLiveEvent,
  OverlayEventType,
  OverlayPayload,
  canonicalOverlayType,
  TtsVoiceInfo,
  CatalogGift,
} from '../shared/types';
import { LikeTracker } from './like-tracker';
import { OverlayServer } from '../overlay-server/overlay-server';
import { TikTokLiveWatcher } from '../tiktok/tiktok-client';
import { catalogGiftsWithIcons, normalizeCatalogGifts } from '../tiktok/gift-fields';
import { finalizeCatalogGifts, dedupeAndSortCatalogGifts } from '../shared/permanent-gifts';
import { japaneseNameForGift } from '../shared/permanent-gift-names';
import {
  clipText,
  renderDisplayTemplate,
  renderSpeechParts,
  varsFromEvent,
} from '../template/render-template';
import { containsNgWord, isListedUser } from '../shared/comment-filters';
import { pickEventTemplates } from '../shared/event-templates';
import { resolveEventSpeech, resolveShowDisplay } from '../shared/event-pipeline';
import { isEventSoundType, resolveEventSoundVolume } from '../shared/event-notify';
import {
  buildAlertDisplayParts,
  canonicalEventAlertType,
  resolveEventAlertDisplayMs,
  resolveEventAlertImageUrl,
  shouldEmitEventAlert,
} from '../shared/event-alert';
import { pruneUnreferencedAlertMediaFiles } from '../shared/alert-media-files';
import { pruneUnreferencedSoundFiles } from '../shared/sound-files';
import {
  nameColorForUser,
  normalizeOverlayNameColors,
} from '../shared/overlay-name-colors';
import { resolveDisplayName } from '../shared/nickname-map';
import {
  DEFAULT_GIFT_CHIME_VOLUME,
  findGiftChimeDiamondBand,
  normalizeGiftChimeVolume,
  resolveGiftChimeVolume,
  resolveGiftChimeBandSound,
  resolveGiftChimeSound,
  shouldPlayGiftChime,
  shouldSpeakGiftById,
} from '../shared/gift-notify';
import {
  resolveWatcherDisconnect,
  shouldClearSpeechQueueOnConfigChange,
} from '../shared/live-disconnect';
import { normalizeGiftSoundRef, normalizeSoundRef, type SoundRef } from '../shared/sound-ref';
import { soundFilePath } from '../shared/sound-files';
import fs from 'fs';
import { FallbackTtsEngine } from '../tts/fallback-tts-engine';
import { TtsEngine } from '../tts/tts-engine';
import { TtsQueue } from '../tts/tts-queue';
import { formatVoicevoxDescriptionCredit } from '../tts/voicevox-credit';
import { speakerNameForVoice } from '../tts/voicevox-speakers';
import { voicevoxBaseUrl } from '../tts/voicevox-url';
import {
  ensureVoicevoxRunning,
  VoicevoxLaunchStatus,
} from '../tts/voicevox-launcher';
import { VoicevoxTtsEngine } from '../tts/voicevox-tts-engine';
import { WindowsTtsEngine } from '../tts/windows-tts-engine';
import { overlayGiftImagePath } from '../overlay-server/gift-image-proxy';
import { EMPTY_USER_LIVE_BADGES } from '../tiktok/user-badges';
import {
  shouldShowInViewer,
  VIEWER_MAX_CHARS,
  ViewerEvent,
} from '../shared/viewer-event';
import { buildViewerStatusEvent, pickViewerStatusNotice } from '../shared/viewer-status-line';
import { sameViewerRoomStats, ViewerRoomStats } from '../shared/viewer-room-stats';
import { RepeatSpeechGuard, speechUserKey } from '../shared/speech-filters';
import { SuperFanJoinDedupe, isSuperFanBoxEvent } from '../shared/super-fan-event';
import { pushSessionLog, SessionLogRow } from '../shared/session-log';
import {
  applySpeechReplaceMap,
} from '../shared/speech-replace-map';
import {
  tikTokRetryMessage,
  tikTokStatusMessage,
  tikTokStatusState,
} from '../tiktok/connection-error';

const logger = getLogger('session');

export class SessionManager extends EventEmitter {
  private readonly watcher = new TikTokLiveWatcher();
  private readonly engines = new Map<string, TtsEngine>();
  private ttsQueue: TtsQueue;
  private overlay: OverlayServer;
  private status: LiveStatus;
  private connectToken = 0;
  private lastConnectError = '';
  private readonly noticeAt = new Map<string, number>();
  private voicevoxLaunchPromise: Promise<{
    ok: boolean;
    message: string;
    alreadyRunning: boolean;
  }> | null = null;
  private readonly likeTracker = new LikeTracker();
  private readonly repeatSpeech = new RepeatSpeechGuard();
  private readonly superFanJoinDedupe = new SuperFanJoinDedupe();
  private readonly memberJoinDedupe = new SuperFanJoinDedupe();
  private sessionLog: SessionLogRow[] = [];
  private overlayListenRetryAt = 0;
  private streamStartedAtMs: number | null = null;
  private roomStats: ViewerRoomStats | null = null;
  private commentSoundMuted = false;
  private commentSoundAt = 0;
  private eventSoundAt: Partial<Record<string, number>> = {};
  private giftChimeAt = 0;

  constructor(
    private readonly configStore: ConfigStore,
    overlayDir: string,
  ) {
    super();
    const windows = new WindowsTtsEngine();
    this.engines.set(windows.id, windows);
    this.engines.set(
      'voicevox',
      new VoicevoxTtsEngine(() => {
        const config = this.configStore.get();
        return voicevoxBaseUrl(config.voicevoxHost, config.voicevoxPort);
      }),
    );
    this.overlay = new OverlayServer(
      APP_CONFIG.overlayHost,
      overlayDir,
      APP_CONFIG.ttsAudioTtlMs,
    );
    const fallbackEngine = new FallbackTtsEngine(
      () => this.getEngine(),
      () => {
        const windows = this.engines.get('windows');
        if (!windows) {
          throw new Error(MSG.tts.engineMissing);
        }
        return windows;
      },
      (message) => this.notifyLimited('tts-fallback', true, message),
    );
    this.ttsQueue = new TtsQueue(
      () => fallbackEngine,
      () => this.configStore.get().maxQueue,
      () => this.configStore.get().beatMs,
      () => {
        const config = this.configStore.get();
        return {
          voiceId: config.ttsVoice,
          rate: config.ttsRate,
          volume: config.ttsVolume,
        };
      },
    );
    this.status = this.buildStatus('disconnected', MSG.connection.disconnected);
    this.overlay.setClientChangeHandler(() => {
      this.touchStatus();
    });
    this.bindWatcher();
    this.watcher.primeGifts(this.configStore.get().cachedTestGifts);
  }

  getStatus(): LiveStatus {
    return this.status;
  }

  async startOverlay(): Promise<void> {
    this.pruneUnusedMediaFiles(this.configStore.get());
    const config = this.configStore.get();
    this.syncOverlayOptions(config);
    const ok = await this.ensureOverlayListening({ force: true });
    if (!ok) {
      throw new Error(MSG.errors.overlayPortBusy);
    }
    this.setStatus(this.status.state, this.status.message);
  }

  async connect(): Promise<void> {
    const uniqueId = this.configStore.get().uniqueId.trim();
    if (!uniqueId) {
      this.setStatus('error', MSG.connection.uniqueIdRequired);
      return;
    }

    const token = ++this.connectToken;
    this.lastConnectError = '';
    this.likeTracker.reset();
    this.repeatSpeech.clear();
    this.superFanJoinDedupe.clear();
    this.memberJoinDedupe.clear();
    this.setStatus('connecting', MSG.connection.connecting);
    try {
      await this.watcher.start(uniqueId);
      if (token !== this.connectToken) {
        return;
      }
    } catch (error) {
      if (token !== this.connectToken) {
        return;
      }
      logger.error(`接続開始に失敗しました: ${getErrorMessage(error)}`);
      this.setStatus('error', MSG.connection.connectFailed);
    }
  }

  async disconnect(): Promise<void> {
    this.connectToken += 1;
    this.lastConnectError = '';
    await this.watcher.stop();
    this.likeTracker.reset();
    this.repeatSpeech.clear();
    this.superFanJoinDedupe.clear();
    this.memberJoinDedupe.clear();
    this.streamStartedAtMs = null;
    this.roomStats = null;
    this.setStatus('disconnected', MSG.connection.disconnected);
  }

  async lookupUser(uniqueId?: string): Promise<{
    ok: boolean;
    message: string;
    user?: {
      uniqueId: string;
      nickname: string;
      avatarUrl: string;
      avatarDisplayUrl: string;
    };
  }> {
    const id = (uniqueId || this.configStore.get().uniqueId).replace(/^@/, '').trim();
    if (!id) {
      return { ok: false, message: MSG.connection.uniqueIdRequired };
    }

    try {
      const preview = await this.watcher.fetchUserPreview(id);
      const avatarPath = overlayGiftImagePath(preview.avatarUrl);
      const port = this.overlay.listeningPort() ?? this.configStore.get().overlayPort;
      const origin = overlayPreviewUrl(port).replace(/\/overlay\/?$/, '');
      return {
        ok: true,
        message: MSG.connection.confirmUser,
        user: {
          uniqueId: preview.uniqueId,
          nickname: preview.nickname,
          avatarUrl: preview.avatarUrl,
          avatarDisplayUrl: avatarPath ? `${origin}${avatarPath}` : '',
        },
      };
    } catch (error) {
      const message = getErrorMessage(error);
      if (
        message === MSG.connection.uniqueIdRequired ||
        message === MSG.connection.userNotFound ||
        message === MSG.connection.lookupFailed
      ) {
        return { ok: false, message };
      }
      logger.warning(`アカウント確認に失敗しました: ${message}`);
      return { ok: false, message: tikTokStatusMessage(message) };
    }
  }

  async applyConfig(previousPort: number, previousUniqueId: string, previousConfig?: AppConfig): Promise<void> {
    const previousState = this.status.state;
    const wasWatching =
      previousState === 'live' ||
      previousState === 'waiting_live' ||
      previousState === 'connecting' ||
      Boolean(this.lastConnectError);
    const config = this.configStore.get();
    if (previousConfig && shouldClearSpeechQueueOnConfigChange(previousConfig, config)) {
      this.ttsQueue.clearUnplayed();
      this.overlay.clearPendingAudio();
    }
    this.syncOverlayOptions(config);
    await this.ensureOverlayListening({ force: true, throwIfBound: true });
    this.refreshStatusAfterOverlayChange();
    this.pruneUnusedMediaFiles(config);

    const uniqueIdChanged = config.uniqueId.trim() !== previousUniqueId.trim();
    if (uniqueIdChanged && wasWatching) {
      await this.disconnect();
      this.notify(true, MSG.connection.idChangedNeedConfirm);
    }
  }

  /** 設定から外れたアラート画像・効果音を data から消す。 */
  private pruneUnusedMediaFiles(config: AppConfig): void {
    try {
      pruneUnreferencedAlertMediaFiles(config.eventAlertMedia);
      pruneUnreferencedSoundFiles(config);
    } catch (error) {
      logger.warning(`未使用メディアの削除に失敗しました: ${getErrorMessage(error)}`);
    }
  }

  async listVoices(): Promise<TtsVoiceInfo[]> {
    try {
      return await this.getEngine().listVoices();
    } catch (error) {
      logger.error(`声一覧の取得に失敗しました: ${getErrorMessage(error)}`);
      return [];
    }
  }

  async launchVoicevoxOnStart(): Promise<{ ok: boolean; message: string } | null> {
    if (!this.configStore.get().voicevoxLaunchOnStart) {
      return null;
    }

    const result = await this.launchVoicevox();
    if (result.ok && result.alreadyRunning) {
      return null;
    }
    return { ok: result.ok, message: result.message };
  }

  async launchVoicevox(): Promise<{
    ok: boolean;
    message: string;
    alreadyRunning: boolean;
  }> {
    if (!this.voicevoxLaunchPromise) {
      this.voicevoxLaunchPromise = this.runVoicevoxLaunch().finally(() => {
        this.voicevoxLaunchPromise = null;
      });
    }
    return this.voicevoxLaunchPromise;
  }

  private async runVoicevoxLaunch(): Promise<{
    ok: boolean;
    message: string;
    alreadyRunning: boolean;
  }> {
    const config = this.configStore.get();
    const result = await ensureVoicevoxRunning({
      configuredPath: config.voicevoxExePath,
      baseUrl: voicevoxBaseUrl(config.voicevoxHost, config.voicevoxPort),
    });

    if (
      result.exePath &&
      !config.voicevoxExePath.trim() &&
      (result.status === 'launched' ||
        result.status === 'already-running' ||
        result.status === 'timeout')
    ) {
      this.configStore.save({ voicevoxExePath: result.exePath });
    }

    return {
      ok: result.status === 'already-running' || result.status === 'launched',
      alreadyRunning: result.status === 'already-running',
      message: this.messageForVoicevoxLaunch(result.status),
    };
  }

  private messageForVoicevoxLaunch(status: VoicevoxLaunchStatus): string {
    switch (status) {
      case 'already-running':
        return MSG.tts.voicevoxAlreadyRunning;
      case 'launched':
        return MSG.tts.voicevoxLaunched;
      case 'missing':
        return MSG.tts.voicevoxExeMissing;
      case 'invalid':
        return MSG.tts.voicevoxExeInvalid;
      case 'timeout':
        return MSG.tts.voicevoxLaunchTimeout;
      default:
        return MSG.tts.voicevoxLaunchFailed;
    }
  }

  async pingTtsEngine(): Promise<{ ok: boolean; message: string }> {
    let engine: TtsEngine;
    try {
      engine = this.getEngine();
    } catch (error) {
      logger.error(`読み上げエンジンの確認に失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.tts.engineMissing };
    }

    try {
      const available = await engine.isAvailable();
      if (!available) {
        return {
          ok: false,
          message:
            engine.id === 'voicevox' ? MSG.tts.voicevoxNotRunning : MSG.tts.engineMissing,
        };
      }
      return {
        ok: true,
        message: engine.id === 'voicevox' ? MSG.tts.voicevoxReady : MSG.tts.windowsReady,
      };
    } catch (error) {
      logger.error(`読み上げエンジンの確認に失敗しました: ${getErrorMessage(error)}`);
      return {
        ok: false,
        message:
          engine.id === 'voicevox' ? MSG.tts.voicevoxNotRunning : MSG.tts.engineMissing,
      };
    }
  }

  copyVoicevoxCredit(): { ok: boolean; message: string } {
    const config = this.configStore.get();
    if (config.ttsEngineId !== 'voicevox') {
      return { ok: false, message: MSG.ui.creditNotNeeded };
    }

    const text = formatVoicevoxDescriptionCredit(config.ttsVoicevoxSpeakerName);
    if (!text) {
      return { ok: false, message: MSG.ui.creditMissing };
    }

    try {
      clipboard.writeText(text);
      return { ok: true, message: MSG.ui.creditCopied };
    } catch (error) {
      logger.error(`クレジットコピーに失敗しました: ${getErrorMessage(error)}`);
      return { ok: false, message: MSG.ui.copyFailed };
    }
  }

  async refreshVoicevoxSpeakerName(): Promise<string> {
    const config = this.configStore.get();
    if (config.ttsEngineId !== 'voicevox' || !config.ttsVoice) {
      return config.ttsVoicevoxSpeakerName;
    }

    try {
      const voices = await this.getEngine().listVoices();
      const speakerName = speakerNameForVoice(
        voices.map((voice) => ({
          id: voice.id,
          name: voice.name,
          speakerName: voice.speakerName ?? '',
        })),
        config.ttsVoice,
      );
      if (speakerName && speakerName !== config.ttsVoicevoxSpeakerName) {
        this.configStore.save({ ttsVoicevoxSpeakerName: speakerName });
        return speakerName;
      }
      return speakerName || config.ttsVoicevoxSpeakerName;
    } catch (error) {
      logger.warning(`VOICEVOXの声情報を更新できませんでした: ${getErrorMessage(error)}`);
      return config.ttsVoicevoxSpeakerName;
    }
  }

  async previewSpeech(): Promise<void> {
    const config = this.configStore.get();
    const text = config.ttsTestText.trim() || MSG.tester.speechDefault;
    const spoken = clipText(text, config.maxSpeechChars);

    this.overlay.broadcast({
      type: 'comment',
      user: {
        uniqueId: 'test_user',
        nickname: MSG.tester.user,
        avatarUrl: '',
        ...EMPTY_USER_LIVE_BADGES,
      },
      displayText: clipText(text, config.maxDisplayChars),
      comment: '',
      commentEmotes: [],
      giftImageUrl: '',
      audioUrl: null,
      receivedAt: new Date().toISOString(),
    });

    const wavResult = await this.ttsQueue.enqueue([{ kind: 'text', value: spoken }]);
    if (wavResult.status === 'full') {
      throw new Error(MSG.ui.speechQueueFull);
    }
    if (wavResult.status !== 'ok') {
      throw new Error(MSG.tts.synthesizeFailed);
    }

    await this.playSynthesizedSpeech(wavResult.wav);
  }

  async previewSound(
    rawSound: unknown,
    rawVolume?: unknown,
  ): Promise<{ soundUrl: string | null; volume: number }> {
    const sound = normalizeGiftSoundRef(rawSound);
    const volume = normalizeGiftChimeVolume(rawVolume);
    if (sound.kind === 'file') {
      const ok = await this.ensureOverlayListening({ force: true });
      if (!ok) {
        throw new Error(MSG.errors.overlayPortBusy);
      }
      const full = soundFilePath(sound.fileName);
      if (!full || !fs.existsSync(full)) {
        throw new Error(MSG.ui.giftChimeTestFailed);
      }
    }
    const soundUrl = await this.resolvePlayableSoundUrl(sound);
    return { soundUrl, volume };
  }

  async sendTestEvent(
    type: OverlayEventType,
    giftCount: number,
    options: {
      silent?: boolean;
      viewerOnly?: boolean;
      overlayOnly?: boolean;
      giftId?: string;
      isFanClub?: boolean;
      fanClubStatus?: number;
      isSuperFan?: boolean;
      fanClubLevel?: number;
      isModerator?: boolean;
      isAnchor?: boolean;
      diamondCount?: number;
      superFanBox?: boolean;
      portalJoin?: boolean;
    } = {},
  ): Promise<void> {
    const config = this.configStore.get();
    const count =
      type === 'like' && giftCount < 1 ? config.likeMilestone : giftCount;
    const catalogGift = type === 'gift' ? this.pickTestGift(options.giftId) : null;
    const fanClubStatus =
      options.fanClubStatus === 2 ? 2 : options.isFanClub === true || options.fanClubStatus === 1 ? 1 : 0;
    const isFanClub = fanClubStatus === 1 || fanClubStatus === 2;
    const isSuperFan = options.isSuperFan === true;
    const isModerator = options.isModerator === true;
    const isAnchor = options.isAnchor === true;
    const fanClubLevel = isFanClub
      ? Math.max(1, Math.trunc(options.fanClubLevel || 4))
      : 0;
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
    const comment =
      isAnchor
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
    const diamondCount =
      typeof options.diamondCount === 'number' && Number.isFinite(options.diamondCount)
        ? Math.max(0, Math.trunc(options.diamondCount))
        : catalogGift?.diamondCount ?? 1;
    const event: NormalizedLiveEvent = {
      type: canonicalOverlayType(options.portalJoin ? 'member' : type),
      user: {
        uniqueId,
        nickname: MSG.tester.user,
        avatarUrl: '',
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
      giftName: options.superFanBox
        ? MSG.ui.superFanBox
        : options.portalJoin
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
        type !== 'gift' ? '' : catalogGift ? catalogGift.imageUrl : '/overlay/gift-rose.svg',
      diamondCount,
      receivedAt: new Date().toISOString(),
    };
    await this.dispatchEvent(event, config, {
      silent: options.silent,
      forceDisplay: true,
      skipFilters: true,
      viewerOnly: options.viewerOnly,
      overlayOnly: options.overlayOnly,
    });
  }

  listTestGifts(): CatalogGift[] {
    return catalogGiftsWithIcons(dedupeAndSortCatalogGifts(this.watcher.listGifts()));
  }

  async refreshTestGifts(uniqueId?: string): Promise<CatalogGift[]> {
    const id = (uniqueId || this.configStore.get().uniqueId).replace(/^@/, '').trim();
    if (!id) {
      throw new Error(MSG.ui.giftsNeedId);
    }

    const fetched =
      this.status.state === 'live'
        ? await this.watcher.refreshGifts()
        : await this.watcher.fetchGiftsForUser(id);
    const gifts = finalizeCatalogGifts(fetched);
    this.watcher.primeGifts(gifts);
    this.persistTestGifts(gifts);
    const visible = this.listTestGifts();
    if (visible.length === 0) {
      throw new Error(
        this.status.state === 'live' ? MSG.ui.giftsNeedBusinessPlan : MSG.ui.giftsEmpty,
      );
    }
    return visible;
  }

  private persistTestGifts(gifts: CatalogGift[]): void {
    const config = this.configStore.get();
    const preferIds = [
      ...Object.keys(config.giftSpeakByGiftId ?? {}),
      ...Object.keys(config.giftChimeByGiftId ?? {}),
      ...Object.keys(config.giftChimeVolumeByGiftId ?? {}),
    ];
    const next = normalizeCatalogGifts(
      dedupeAndSortCatalogGifts(gifts, { preferIds }),
    );
    if (next.length === 0) {
      return;
    }
    this.configStore.save({ cachedTestGifts: next });
  }

  private pickTestGift(giftId?: string): CatalogGift | null {
    const gifts = this.listTestGifts();
    if (gifts.length === 0) {
      return null;
    }
    return gifts.find((gift) => gift.id === giftId) ?? gifts[0];
  }

  previewOverlaySamples(): void {
    this.queueSampleEvents({ silent: true, viewerOnly: true });
  }

  previewStreamSamples(streamSettings?: AppConfigSaveInput): void {
    const config = streamSettings
      ? { ...this.configStore.get(), ...streamSettings }
      : this.configStore.get();
    this.syncOverlayOptions(config);
    this.clearOverlay();
    this.overlay.showSampleDisplay(
      buildOverlaySamplePlan(config, this.pickTestGift(undefined)),
    );
  }

  private syncOverlayOptions(config: AppConfig): void {
    this.overlay.setOverlayOptions(
      config.chatMaxRows,
      config.chatDisplayMs,
      config.overlayCustomCss,
      overlayLookFromConfig(config),
      overlayPinFromConfig(config),
      config.hideUserName,
      config.overlayNameColorEnabled !== false,
      Array.isArray(config.overlayNameColors) ? config.overlayNameColors : [],
      config.eventAlertDisplayMs,
    );
  }

  private queueSampleEvents(flags: {
    silent?: boolean;
    viewerOnly?: boolean;
    overlayOnly?: boolean;
  }): void {
    const jobs: Array<{
      type: OverlayEventType;
      count: number;
      extra: {
        isFanClub?: boolean;
        isSuperFan?: boolean;
        fanClubLevel?: number;
        isModerator?: boolean;
        isAnchor?: boolean;
      };
    }> = [
      { type: 'comment', count: 1, extra: {} },
      { type: 'comment', count: 1, extra: { isFanClub: true, fanClubLevel: 4 } },
      { type: 'comment', count: 1, extra: { isSuperFan: true } },
      {
        type: 'comment',
        count: 1,
        extra: { isFanClub: true, isSuperFan: true, fanClubLevel: 4 },
      },
      { type: 'comment', count: 1, extra: { isModerator: true } },
      { type: 'comment', count: 1, extra: { isAnchor: true } },
      { type: 'gift', count: 100, extra: {} },
      { type: 'follow', count: 1, extra: {} },
    ];
    for (const job of jobs) {
      void this.sendTestEvent(job.type, job.count, { ...job.extra, ...flags }).catch((error) => {
        logger.error(`サンプル表示に失敗しました: ${getErrorMessage(error)}`);
      });
    }
  }

  clearOverlay(): void {
    this.overlay.clearChat();
  }

  clearOverlayPin(): void {
    this.overlay.clearPin();
  }

  getSessionLog(): SessionLogRow[] {
    return [...this.sessionLog];
  }

  skipSpeech(): void {
    this.emit('speech-audio-control', { action: 'skip' });
    this.overlay.skipPlayback();
  }

  clearSpeechQueue(): void {
    this.ttsQueue.clearUnplayed();
    this.emit('speech-audio-control', { action: 'clear-pending' });
    this.overlay.clearPendingAudio();
  }

  isSpeechPaused(): boolean {
    return this.ttsQueue.isPaused();
  }

  setSpeechPaused(paused: boolean): boolean {
    this.ttsQueue.setPaused(paused);
    return this.ttsQueue.isPaused();
  }

  toggleSpeechPaused(): boolean {
    const paused = this.setSpeechPaused(!this.ttsQueue.isPaused());
    this.touchStatus();
    return paused;
  }

  isCommentSoundMuted(): boolean {
    return this.commentSoundMuted;
  }

  toggleCommentSoundMuted(): boolean {
    this.commentSoundMuted = !this.commentSoundMuted;
    this.touchStatus();
    return this.commentSoundMuted;
  }

  async connectOnStart(): Promise<{ ok: boolean; message: string } | null> {
    const config = this.configStore.get();
    if (!config.autoConnectOnStart) {
      return null;
    }
    if (!config.uniqueId.trim()) {
      return { ok: false, message: MSG.connection.uniqueIdRequired };
    }
    if (config.uniqueId.trim().toLowerCase() !== config.confirmedUniqueId.trim().toLowerCase()) {
      return { ok: false, message: MSG.connection.needConfirmOnce };
    }
    await this.connect();
    return null;
  }

  overlayClientCount(): number {
    return this.overlay.clientCount();
  }

  overlayListeningPort(): number | null {
    return this.overlay.listeningPort();
  }

  async waitForOverlayClient(timeoutMs: number): Promise<boolean> {
    const started = Date.now();
    const hasClient = () =>
      this.overlay.clientCount() > 0 || this.overlay.alertClientCount() > 0;
    while (Date.now() - started < timeoutMs) {
      if (hasClient()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return hasClient();
  }

  copyOverlayUrl(kind = 'default'): boolean {
    try {
      const port = this.configStore.get().overlayPort;
      const url =
        kind === 'studio'
          ? overlayStudioUrl(port)
          : kind === 'local'
            ? overlayPreviewUrl(port)
            : kind === 'alerts'
              ? overlayAlertsPublicUrl(port)
              : kind === 'alerts-studio'
                ? overlayAlertsStudioUrl(port)
                : kind === 'alerts-local'
                  ? overlayAlertsPreviewUrl(port)
                  : getOverlayUrl(port);
      clipboard.writeText(url);
      return true;
    } catch (error) {
      logger.error(`URLコピーに失敗しました: ${getErrorMessage(error)}`);
      return false;
    }
  }

  async dispose(): Promise<void> {
    this.connectToken += 1;
    this.ttsQueue.clearUnplayed();
    try {
      await this.watcher.stop();
    } catch (error) {
      logger.error(`TikTok切断に失敗しました: ${getErrorMessage(error)}`);
    }
    try {
      await this.overlay.close();
    } catch (error) {
      logger.error(`オーバーレイ停止に失敗しました: ${getErrorMessage(error)}`);
    }
    for (const engine of this.engines.values()) {
      try {
        await engine.dispose();
      } catch (error) {
        logger.error(`読み上げエンジンの停止に失敗しました: ${getErrorMessage(error)}`);
      }
    }
  }

  private getEngine(): TtsEngine {
    const id = this.configStore.get().ttsEngineId;
    const engine = this.engines.get(id) ?? this.engines.get('windows');
    if (!engine) {
      throw new Error(MSG.tts.engineMissing);
    }
    return engine;
  }

  private bindWatcher(): void {
    this.watcher.on('waiting', () => {
      if (this.status.state === 'disconnected') {
        return;
      }
      if (this.lastConnectError && tikTokStatusState(this.lastConnectError) === 'error') {
        this.setStatus('error', tikTokStatusMessage(this.lastConnectError));
        return;
      }
      this.setStatus('waiting_live', MSG.connection.waitingLive);
    });
    this.watcher.on('connected', (_uniqueId, streamStartedAtMs) => {
      this.lastConnectError = '';
      this.streamStartedAtMs = streamStartedAtMs ?? null;
      this.roomStats = null;
      this.setStatus('live', MSG.connection.live);
      this.persistTestGifts(this.watcher.listGifts());
      void this.ensureOverlayListening({ force: true }).catch((error) => {
        logger.error(`オーバーレイサーバー起動失敗: ${getErrorMessage(error)}`);
      });
    });
    this.watcher.on('disconnected', (reason: string) => {
      this.streamStartedAtMs = null;
      this.updateRoomStats(null);
      const next = resolveWatcherDisconnect(this.status.state, reason || '');
      if (!next) {
        return;
      }
      if (next.fullStop) {
        this.connectToken += 1;
        this.lastConnectError = '';
        this.likeTracker.reset();
        this.repeatSpeech.clear();
        this.superFanJoinDedupe.clear();
        this.memberJoinDedupe.clear();
        this.roomStats = null;
      }
      this.setStatus(next.state, next.message);
    });
    this.watcher.on('retry', (delayMs, lastError) => {
      if (this.status.state === 'disconnected') {
        return;
      }
      this.lastConnectError = lastError;
      this.setStatus(tikTokStatusState(lastError), tikTokRetryMessage(lastError, delayMs));
    });
    this.watcher.on('error', (message) => {
      logger.warning(message);
      if (this.status.state === 'disconnected') {
        return;
      }
      this.lastConnectError = message;
      this.setStatus(tikTokStatusState(message), tikTokStatusMessage(message));
    });
    this.watcher.on('event', (event) => {
      void this.handleEvent(event, this.configStore.get()).catch((error) => {
        logger.error(`コメント処理に失敗しました: ${getErrorMessage(error)}`);
      });
    });
    this.watcher.on('roomStats', (stats) => {
      this.updateRoomStats(stats);
    });
  }

  private updateRoomStats(stats: ViewerRoomStats | null): void {
    if (sameViewerRoomStats(this.roomStats, stats)) {
      return;
    }
    this.roomStats = stats;
    if (this.status.state === 'live') {
      this.touchStatus();
    }
  }

  private notify(ok: boolean, message: string): void {
    this.emit('notice', { ok, message });
  }

  private notifyLimited(key: string, ok: boolean, message: string): void {
    const now = Date.now();
    if (now - (this.noticeAt.get(key) ?? 0) < APP_CONFIG.noticeIntervalMs) {
      return;
    }
    this.noticeAt.set(key, now);
    this.notify(ok, message);
  }

  private async ensureOverlayListening(
    options: { force?: boolean; throwIfBound?: boolean } = {},
  ): Promise<boolean> {
    const config = this.configStore.get();
    const bound = this.overlay.listeningPort();
    if (bound === config.overlayPort) {
      return true;
    }

    const now = Date.now();
    if (!options.force && now - this.overlayListenRetryAt < APP_CONFIG.noticeIntervalMs) {
      return false;
    }
    this.overlayListenRetryAt = now;

    try {
      await this.overlay.listen(config.overlayPort);
      this.refreshStatusAfterOverlayChange();
      return true;
    } catch (error) {
      logger.error(`オーバーレイサーバー起動失敗: ${getErrorMessage(error)}`);
      this.noteOverlayPortBusy();
      if (options.throwIfBound && bound != null) {
        throw error;
      }
      return false;
    }
  }

  private noteOverlayPortBusy(): void {
    if (
      this.status.state === 'live' ||
      this.status.state === 'waiting_live' ||
      this.status.state === 'connecting'
    ) {
      this.touchStatus();
      return;
    }
    this.setStatus('error', MSG.errors.overlayPortBusy);
  }

  private refreshStatusAfterOverlayChange(): void {
    if (
      this.status.state === 'error' &&
      this.status.message === MSG.errors.overlayPortBusy &&
      this.overlay.listeningPort() != null
    ) {
      this.setStatus('disconnected', MSG.connection.disconnected);
      return;
    }
    this.touchStatus();
  }

  private touchStatus(): void {
    this.status = this.buildStatus(this.status.state, this.status.message);
    this.emit('status', this.status);
  }

  private async handleEvent(
    event: NormalizedLiveEvent,
    config: AppConfig,
    options: {
      silent?: boolean;
      forceDisplay?: boolean;
      forceSpeak?: boolean;
      skipFilters?: boolean;
      viewerOnly?: boolean;
      overlayOnly?: boolean;
    } = {},
  ): Promise<void> {
    try {
      await this.dispatchEvent(event, config, options);
    } catch (error) {
      logger.error(`コメント処理に失敗しました: ${getErrorMessage(error)}`);
    }
  }

  private async dispatchEvent(
    event: NormalizedLiveEvent,
    config: AppConfig,
    options: {
      silent?: boolean;
      forceDisplay?: boolean;
      forceSpeak?: boolean;
      skipFilters?: boolean;
      viewerOnly?: boolean;
      overlayOnly?: boolean;
    },
  ): Promise<void> {
    const currentType = canonicalOverlayType(event.type);
    const toggle = config.events[currentType] ?? {
      display: false,
      speak: false,
    };

    let current = currentType === event.type ? event : { ...event, type: currentType };
    if (
      (current.type === 'gift' || current.type === 'portal') &&
      current.giftId &&
      current.giftName &&
      !options.skipFilters
    ) {
      if (
        this.watcher.rememberGift({
          id: current.giftId,
          name: japaneseNameForGift(current.giftName, current.diamondCount),
          imageUrl: current.giftImageUrl || '',
          diamondCount: Math.max(0, current.diamondCount || 0),
        })
      ) {
        this.persistTestGifts(this.watcher.listGifts());
      }
    }
    if (
      !options.skipFilters &&
      isListedUser(current.user, config.blockedUsers ?? [])
    ) {
      return;
    }

    const sourceUser = current.user;
    const displayNickname = resolveDisplayName(
      sourceUser.uniqueId,
      sourceUser.nickname,
      config.nicknameMap,
    );
    current = {
      ...current,
      user: {
        ...sourceUser,
        nickname: displayNickname,
        sourceNickname: sourceUser.nickname || sourceUser.sourceNickname || '',
      },
    };
    if (current.type === 'like' && !options.skipFilters) {
      if (
        !toggle.display &&
        !toggle.speak &&
        !shouldEmitEventAlert({
          type: current.type,
          enabled: config.eventAlertEnabled,
          media: config.eventAlertMedia,
          giftImageUrl: current.giftImageUrl,
        })
      ) {
        return;
      }
      const reached = this.likeTracker.consume(
        current.user.uniqueId,
        Math.max(1, current.likeCount || current.giftCount || 1),
        config.likeMilestone,
      );
      if (reached === null) {
        return;
      }
      current = { ...current, giftCount: reached };
    }

    if (
      current.type === 'superFan' &&
      !isSuperFanBoxEvent(current) &&
      !options.skipFilters &&
      this.superFanJoinDedupe.shouldSkip(current.user, Date.now())
    ) {
      return;
    }

    if (
      current.type === 'member' &&
      !options.skipFilters &&
      this.memberJoinDedupe.shouldSkip(current.user, Date.now())
    ) {
      return;
    }

    const vars = varsFromEvent(
      current.type,
      current.user.nickname,
      current.comment,
      current.giftName,
      current.giftCount,
    );
    const templates = pickEventTemplates(config, current);
    const displayText = renderDisplayTemplate(templates.display, vars, {
      hideUserName: config.hideUserName,
      maxChars: config.maxDisplayChars,
    });
    const inspect = `${displayText} ${current.comment} ${current.user.nickname}`;
    if (containsNgWord(inspect, config.ngWords)) {
      return;
    }

    const showDisplay = resolveShowDisplay(options, toggle.display);
    const repeatWouldSkip =
      Boolean(config.skipRepeatSpeech && !options.skipFilters) &&
      this.repeatSpeech.shouldSkip(
        speechUserKey(current.user),
        Date.now(),
        config.repeatSpeechSec * 1000,
      );
    const speech = resolveEventSpeech({
      event: {
        ...current,
        user: sourceUser,
        giftId: current.giftId,
      },
      config,
      options,
      toggleSpeak: toggle.speak,
      repeatWouldSkip,
      varsComment: vars.comment,
    });
    const shouldSpeak = speech.shouldSpeak;
    const rawSpeechComment = speech.speechComment;
    const speechComment =
      current.type === 'comment' && config.speechReplaceMap?.length
        ? applySpeechReplaceMap(rawSpeechComment, config.speechReplaceMap)
        : rawSpeechComment;
    const speechVars =
      speechComment === vars.comment ? vars : { ...vars, comment: speechComment };

    if (
      !options.viewerOnly &&
      !options.silent &&
      config.giftNotifyMode === 'chime' &&
      current.type === 'gift' &&
      toggle.speak
    ) {
      try {
        let sound: SoundRef | null = null;
        let volume = DEFAULT_GIFT_CHIME_VOLUME;
        if (config.giftChimeMatchMode === 'diamond') {
          const band = findGiftChimeDiamondBand(
            current.diamondCount,
            config.giftChimeDiamondBands,
          );
          sound = resolveGiftChimeBandSound(band);
          if (band) {
            volume = normalizeGiftChimeVolume(band.volume);
          }
        } else if (shouldSpeakGiftById(current.giftId, config.giftSpeakByGiftId)) {
          sound = resolveGiftChimeSound(
            current.giftId,
            config.giftChimeByGiftId,
            config.giftChimeSound,
          );
          volume = resolveGiftChimeVolume({
            giftId: current.giftId,
            byGiftIdSound: config.giftChimeByGiftId,
            byGiftIdVolume: config.giftChimeVolumeByGiftId,
            commonVolume: config.giftChimeVolume,
          });
        }
        if (sound) {
          const chime = shouldPlayGiftChime({
            playApp: config.giftChimePlayApp,
            playOverlay: config.giftChimePlayOverlay,
          });
          if (chime.playApp || chime.playOverlay) {
            const now = Date.now();
            if (now - this.giftChimeAt >= 300) {
              this.giftChimeAt = now;
              const soundPath = this.soundFileHttpPath(sound);
              const soundUrl = soundPath ? await this.resolvePlayableSoundUrl(sound) : null;
              if (chime.playOverlay) {
                await this.ensureOverlayListening();
                // TTS と同様、配信ソース側はルート相対パスで解決する
                this.overlay.broadcastChime(soundPath ?? soundUrl, volume);
              }
              if (chime.playApp) {
                this.emit('sound', { kind: 'gift-chime', soundUrl, sound, volume });
              }
            }
          }
        }
      } catch (error) {
        logger.warning(`ギフトサウンドの再生に失敗しました: ${getErrorMessage(error)}`);
      }
    }

    if (
      !options.viewerOnly &&
      !options.silent &&
      current.type === 'comment' &&
      config.commentNotifyMode === 'sound' &&
      config.events.comment?.speak === true &&
      !this.commentSoundMuted
    ) {
      const now = Date.now();
      if (now - this.commentSoundAt >= 300) {
        try {
          const soundUrl = await this.resolvePlayableSoundUrl(config.commentSound);
          this.emit('sound', {
            kind: 'comment',
            soundUrl,
            sound: config.commentSound,
            volume: normalizeGiftChimeVolume(config.commentSoundVolume),
          });
          this.commentSoundAt = now;
        } catch (error) {
          logger.warning(`コメント新着音の再生に失敗しました: ${getErrorMessage(error)}`);
        }
      }
    }

    if (
      !options.viewerOnly &&
      !options.silent &&
      isEventSoundType(current.type) &&
      config.eventNotifyMode?.[current.type] === 'sound' &&
      toggle.speak
    ) {
      const now = Date.now();
      const lastAt = this.eventSoundAt[current.type] ?? 0;
      if (now - lastAt >= 300) {
        const sound = config.eventSound?.[current.type];
        if (sound) {
          try {
            const soundUrl = await this.resolvePlayableSoundUrl(sound);
            this.emit('sound', {
              kind: 'event',
              type: current.type,
              soundUrl,
              sound,
              volume: resolveEventSoundVolume(current.type, config.eventSoundVolume),
            });
            this.eventSoundAt[current.type] = now;
          } catch (error) {
            logger.warning(`イベントサウンドの再生に失敗しました: ${getErrorMessage(error)}`);
          }
        }
      }
    }

    const giftImageUrl = overlayGiftImagePath(current.giftImageUrl);
    const commentEmotes = (current.commentEmotes || [])
      .map((emote) => ({
        index: emote.index,
        imageUrl: overlayGiftImagePath(emote.imageUrl),
      }))
      .filter((emote) => Boolean(emote.imageUrl));
    const user = {
      ...current.user,
      avatarUrl: overlayGiftImagePath(current.user.avatarUrl),
    };
    if (
      !options.overlayOnly &&
      (options.viewerOnly || shouldShowInViewer(current.type, config.viewerDisplay))
    ) {
      const viewerEvent: ViewerEvent = {
        type: current.type,
        user,
        displayText: renderDisplayTemplate(templates.display, vars, {
          hideUserName: false,
          maxChars: VIEWER_MAX_CHARS,
        }),
        comment: current.comment,
        commentEmotes,
        giftImageUrl,
        giftName: current.giftName,
        giftCount: current.giftCount,
        diamondCount: current.diamondCount,
        receivedAt: current.receivedAt,
        sample: options.viewerOnly === true,
      };
      this.sessionLog = pushSessionLog(this.sessionLog, {
        receivedAt: current.receivedAt,
        type: current.type,
        uniqueId: current.user.uniqueId,
        nickname: current.user.nickname,
        comment: current.comment,
        displayText: viewerEvent.displayText,
        giftName: current.giftName,
        giftCount: current.giftCount,
        diamondCount: current.diamondCount,
      });
      this.emit('viewer', viewerEvent);
    }

    if (options.viewerOnly) {
      return;
    }

    const shouldAlert =
      !options.silent &&
      shouldEmitEventAlert({
        type: current.type,
        enabled: config.eventAlertEnabled,
        media: config.eventAlertMedia,
        giftImageUrl,
      });

    if (!showDisplay && !shouldSpeak && !shouldAlert) {
      return;
    }

    if (showDisplay || shouldSpeak || shouldAlert) {
      await this.ensureOverlayListening();
    }

    const payload: OverlayPayload = {
      type: current.type,
      user,
      displayText: showDisplay ? displayText : '',
      comment: current.comment,
      commentEmotes,
      giftImageUrl,
      audioUrl: null,
      receivedAt: current.receivedAt,
    };

    if (showDisplay) {
      this.overlay.broadcast(payload);
    }

    if (shouldAlert) {
      const alertType = canonicalEventAlertType(current.type);
      const imageUrl = resolveEventAlertImageUrl({
        type: current.type,
        media: alertType ? config.eventAlertMedia?.[alertType] : undefined,
        giftImageUrl,
      });
      if (imageUrl) {
        const nameColor =
          config.overlayNameColorEnabled !== false && user.nickname
            ? nameColorForUser(
                user.uniqueId,
                user.nickname,
                normalizeOverlayNameColors(config.overlayNameColors),
              )
            : null;
        const displayParts = buildAlertDisplayParts(displayText, user.nickname, nameColor);
        this.overlay.broadcastAlert({
          type: current.type,
          displayText,
          displayParts,
          imageUrl,
          displayMs: resolveEventAlertDisplayMs(
            current.type,
            config.eventAlertDisplayMsByType,
            config.eventAlertDisplayMs,
          ),
          user,
          nameColor,
        });
      }
    }

    if (!shouldSpeak) {
      return;
    }

    const parts = renderSpeechParts(
      templates.speech,
      speechVars,
      config.maxSpeechChars,
    );
    if (!parts.some((part) => part.kind === 'text')) {
      return;
    }
    if (current.type === 'comment') {
      this.repeatSpeech.markSpoken(speechUserKey(current.user), Date.now());
    }
    const wavResult = await this.ttsQueue.enqueue(parts);
    if (wavResult.status === 'full') {
      this.notifyLimited('speech-full', false, MSG.ui.speechQueueFull);
      return;
    }
    if (wavResult.status !== 'ok') {
      if (wavResult.status === 'failed') {
        logger.warning(
          `読み上げ音声を生成できませんでした: エンジン=${this.getEngine().id}`,
        );
        this.notifyLimited('tts-fail', false, MSG.tts.synthesizeFailed);
      }
      return;
    }

    this.noticeAt.delete('tts-fail');
    await this.playSynthesizedSpeech(wavResult.wav);
  }

  private soundFileHttpPath(sound: SoundRef): string | null {
    if (sound.kind !== 'file') {
      return null;
    }
    return `/sounds/${encodeURIComponent(sound.fileName)}`;
  }

  /** 読み上げ音声をアプリ本体へ送る（配信ソースでは鳴らさない）。 */
  private async playSynthesizedSpeech(wav: Buffer): Promise<void> {
    const id = this.overlay.storeAudio(wav);
    const soundUrl = await this.resolveStoredAudioUrl(id);
    this.emit('sound', { kind: 'tts', soundUrl });
  }

  private async resolveStoredAudioUrl(id: string): Promise<string> {
    await this.ensureOverlayListening();
    const port = this.overlay.listeningPort() ?? this.configStore.get().overlayPort;
    return `http://${APP_CONFIG.overlayHost}:${port}/tts/${encodeURIComponent(id)}.wav`;
  }

  /** アプリ本体再生用。配信ソースの /overlay 付き URL は使わない。 */
  private async resolvePlayableSoundUrl(sound: SoundRef): Promise<string | null> {
    const soundPath = this.soundFileHttpPath(sound);
    if (!soundPath) {
      return null;
    }
    await this.ensureOverlayListening();
    const port = this.overlay.listeningPort() ?? this.configStore.get().overlayPort;
    return `http://${APP_CONFIG.overlayHost}:${port}${soundPath}`;
  }

  private buildStatus(state: LiveConnectionState, message: string): LiveStatus {
    const config = this.configStore.get();
    const listeningPort = this.overlay.listeningPort();
    return {
      state,
      uniqueId: config.uniqueId,
      message,
      overlayUrl: getOverlayUrl(config.overlayPort),
      overlayListening: listeningPort === config.overlayPort,
      overlayClients: this.overlay.clientCount(),
      lastUpdated: new Date().toISOString(),
      roomStats: state === 'live' ? this.roomStats : null,
      streamStartedAtMs: state === 'live' ? this.streamStartedAtMs : null,
      speechPaused: this.ttsQueue.isPaused(),
      commentSoundMuted: this.commentSoundMuted,
    };
  }

  private setStatus(state: LiveConnectionState, message: string): void {
    const previous = this.status.state;
    this.status = this.buildStatus(state, message);
    const notice = pickViewerStatusNotice(previous, state, {
      connected: MSG.ui.viewerStatusConnected,
      disconnected: MSG.ui.viewerStatusDisconnected,
      disconnectedFromLive: MSG.ui.viewerStatusDisconnectedFromLive,
    });
    if (notice) {
      this.emit(
        'viewer',
        buildViewerStatusEvent(notice, this.status.lastUpdated),
      );
    }
    this.emit('status', this.status);
  }
}
