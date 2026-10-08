import { EventEmitter } from 'events';
import { clipboard } from 'electron';
import { APP_CONFIG } from '../shared/app-config';
import { ConfigStore } from '../shared/config-store';
import {
  buildAlertSamplePlan,
  buildRankingSample,
  buildOverlaySamplePlan,
} from './overlay-sample-plan';
import { overlayLookFromConfig } from '../shared/overlay-look';
import { overlayLikesLookFromConfig } from '../shared/overlay-likes-look';
import { overlayPinFromConfig } from '../shared/overlay-pin';
import {
  normalizeOverlayUrlKind,
  overlayPreviewUrl,
  overlayUrlFieldsForPort,
  overlayUrlForCopyKind,
  type OverlayUrlKind,
} from '../shared/overlay-url';
import type { OverlayClientRole } from '../overlay-server/overlay-server';
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
import { DiamondTracker } from './diamond-tracker';
import { LikeTracker } from './like-tracker';
import { OverlayServer } from '../overlay-server/overlay-server';
import { TikTokLiveWatcher } from '../tiktok/tiktok-client';
import {
  catalogGiftImageById,
  catalogGiftsWithIcons,
  normalizeCatalogGifts,
} from '../tiktok/gift-fields';
import { finalizeCatalogGifts, dedupeAndSortCatalogGifts } from '../shared/permanent-gifts';
import { japaneseNameForGift } from '../shared/permanent-gift-names';
import {
  clipText,
  renderDisplayTemplate,
  renderOverlayDisplay,
  renderSpeechParts,
  varsFromEvent,
} from '../template/render-template';
import { containsNgWord, isListedUser } from '../shared/comment-filters';
import { pickEventTemplates } from '../shared/event-templates';
import { resolveEventSpeech, resolveShowDisplay } from '../shared/event-pipeline';
import { isEventSoundType, resolveEventSoundVolume } from '../shared/event-notify';
import {
  canonicalEventAlertType,
  resolveEventAlertDisplayMs,
  resolveEventAlertImageUrl,
  shouldEmitEventAlert,
  type AlertDisplayPart,
} from '../shared/event-alert';
import { pruneUnreferencedAlertMediaFiles } from '../shared/alert-media-files';
import { pruneUnreferencedSoundFiles } from '../shared/sound-files';
import {
  nameColorForUser,
  normalizeOverlayNameColors,
} from '../shared/overlay-name-colors';
import { normalizeTemplateAccentColors } from '../shared/template-accent-colors';
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
import {
  DEFAULT_OVERLAY_LIKE_RANKING_ENABLED,
  DEFAULT_OVERLAY_LIKE_RANKING_MAX,
  DEFAULT_OVERLAY_RANKING_MODE,
  giftDiamondDelta,
  normalizeOverlayLikeRankingEnabled,
  normalizeOverlayLikeRankingMax,
  normalizeOverlayRankingLikePollSec,
  normalizeOverlayRankingLikeSyncMode,
  normalizeOverlayRankingMode,
  sameRanking,
  type OverlayRankingLikeSyncMode,
  type OverlayRankingMode,
  type RankEntry,
} from '../shared/like-ranking';
import { overlayRankingMotionMs } from '../shared/overlay-ranking-motion';
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
  private readonly diamondTracker = new DiamondTracker();
  private readonly repeatSpeech = new RepeatSpeechGuard();
  private readonly superFanJoinDedupe = new SuperFanJoinDedupe();
  private readonly memberJoinDedupe = new SuperFanJoinDedupe();
  private sessionLog: SessionLogRow[] = [];
  private overlayListenRetryAt = 0;
  private streamStartedAtMs: number | null = null;
  private roomStats: ViewerRoomStats | null = null;
  private rankingEntries: RankEntry[] = [];
  private rankingEnabled = DEFAULT_OVERLAY_LIKE_RANKING_ENABLED;
  private rankingMax = DEFAULT_OVERLAY_LIKE_RANKING_MAX;
  private rankingMode: OverlayRankingMode = DEFAULT_OVERLAY_RANKING_MODE;
  private rankingLikeSyncMode: OverlayRankingLikeSyncMode = 'live';
  private rankingLikePollSec = 30;
  private rankingLikePollTimer: ReturnType<typeof setInterval> | null = null;
  /** 稼働中タイマーの間隔（秒）。未稼働は null */
  private rankingLikePollActiveSec: number | null = null;
  /** ランキングサンプルの入れ替わり周回（表示を消すまで） */
  private rankingSampleLoopTimer: ReturnType<typeof setTimeout> | null = null;
  private rankingSampleLoopActive = false;
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
    this.publishRankingIfChanged(true);
    this.syncRankingLikePollTimer();
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
    this.diamondTracker.reset();
    this.rankingEntries = [];
    this.publishRankingIfChanged(true);
    this.syncRankingLikePollTimer();
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
    this.diamondTracker.reset();
    this.rankingEntries = [];
    this.publishRankingIfChanged(true);
    this.syncRankingLikePollTimer();
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

  async applyConfig(
    previousPort: number,
    previousUniqueId: string,
    previousConfig?: AppConfig,
  ): Promise<{ idChangeDisconnected: boolean }> {
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
    // force しない。見た目だけの保存で接続タブのサンプルを潰さない。
    // 人数・出す／出さない・モードが変わったときだけ配信し直す。
    this.publishRankingIfChanged();
    this.syncRankingLikePollTimer();
    this.refreshStatusAfterOverlayChange();
    this.pruneUnusedMediaFiles(config);

    const uniqueIdChanged = config.uniqueId.trim() !== previousUniqueId.trim();
    if (uniqueIdChanged && wasWatching) {
      await this.disconnect();
      this.notify(true, MSG.connection.idChangedNeedConfirm);
      return { idChangeDisconnected: true };
    }
    return { idChangeDisconnected: false };
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
      nickname?: string;
      uniqueId?: string;
      comment?: string;
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
    const uniqueId =
      (typeof options.uniqueId === 'string' && options.uniqueId.trim()) ||
      (isAnchor
        ? 'test_anchor'
        : isModerator
          ? 'test_mod'
          : isFanClub && isSuperFan
            ? 'test_fan_super'
            : isSuperFan
              ? 'test_super'
              : isFanClub
                ? `test_fan_${fanClubLevel}`
                : 'test_user');
    const nickname =
      (typeof options.nickname === 'string' && options.nickname.trim()) || MSG.tester.user;
    const comment =
      typeof options.comment === 'string'
        ? options.comment
        : isAnchor
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
        nickname,
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

  /**
   * 配信ソースへ種類別サンプルを出す。
   * kind 省略時はコメント列（見た目タブ／メニュー互換）。
   */
  previewStreamSamples(
    streamSettings?: AppConfigSaveInput,
    kind: OverlayUrlKind = 'chat',
  ): void {
    const config = streamSettings
      ? { ...this.configStore.get(), ...streamSettings }
      : this.configStore.get();
    this.syncOverlayOptions(config);
    const safeKind = normalizeOverlayUrlKind(kind);
    if (safeKind === 'alerts') {
      this.overlay.clearRoles(['alerts']);
      for (const sample of buildAlertSamplePlan(config, this.pickTestGift(undefined))) {
        const displayParts: AlertDisplayPart[] = (sample.displayParts || []).map((part) => {
          if (part.kind === 'accent') {
            return {
              kind: 'accent',
              value: part.value,
              color: part.color || '',
              ...(typeof part.token === 'string' && part.token ? { token: part.token } : {}),
            };
          }
          if (part.kind === 'name') {
            return { kind: 'name', value: part.value, color: part.color || '' };
          }
          return { kind: 'text', value: part.value };
        });
        this.overlay.broadcastAlert({
          type: sample.type,
          displayText: sample.displayText,
          displayParts,
          imageUrl: sample.imageUrl,
          displayMs: sample.displayMs,
          user: sample.user,
          nameColor: sample.nameColor,
        });
      }
      return;
    }
    if (safeKind === 'ranking') {
      this.previewRankingSampleMotion(config);
      return;
    }
    this.overlay.clearRoles(['chat']);
    this.overlay.showSampleDisplay(
      buildOverlaySamplePlan(config, this.pickTestGift(undefined)),
    );
  }

  /** 見た目プレビュー用。OBS には送らず計画だけ返す */
  buildOverlaySamplePlan(streamSettings?: AppConfigSaveInput) {
    const config = streamSettings
      ? { ...this.configStore.get(), ...streamSettings }
      : this.configStore.get();
    return buildOverlaySamplePlan(config, this.pickTestGift(undefined));
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
      overlayLikesLookFromConfig(config),
      config.templateAccentColors,
      config.overlayRankingMotion,
      config.overlayRankingMotionSpeed,
    );
  }

  private clearRankingSampleLoopTimer(): void {
    this.rankingSampleLoopActive = false;
    if (this.rankingSampleLoopTimer) {
      clearTimeout(this.rankingSampleLoopTimer);
      this.rankingSampleLoopTimer = null;
    }
  }

  /** クライアント有無に関係なく入れ替わり周回を止める（クリア失敗時用） */
  cancelRankingSamplePreview(): void {
    this.clearRankingSampleLoopTimer();
  }

  /**
   * 動き・速さを配信ソースへ送り、サンプル周回中なら新しい設定でやり直す。
   * 未保存のフォーム値を streamSettings で渡せる。
   */
  pushOverlayRankingMotion(streamSettings?: AppConfigSaveInput): void {
    const config = streamSettings
      ? { ...this.configStore.get(), ...streamSettings }
      : this.configStore.get();
    this.syncOverlayOptions(config);
    if (this.rankingSampleLoopActive) {
      this.previewRankingSampleMotion(config);
    }
  }

  /**
   * 未保存の見た目・名前色・差し込み色を配信ソースへ送る。
   * プレビューはフォームを直接描くので、ここを通さないと色がずれる。
   */
  pushOverlayLook(streamSettings?: AppConfigSaveInput): void {
    const config = streamSettings
      ? { ...this.configStore.get(), ...streamSettings }
      : this.configStore.get();
    this.syncOverlayOptions(config);
  }

  /** 表示を消すまで入れ替わりを繰り返して動きを確認できるようにする */
  private previewRankingSampleMotion(config: AppConfig): void {
    this.clearRankingSampleLoopTimer();
    this.rankingSampleLoopActive = true;
    const intervalMs = Math.max(
      720,
      overlayRankingMotionMs(config.overlayRankingMotionSpeed) + 280,
    );
    const tick = () => {
      if (!this.rankingSampleLoopActive) {
        return;
      }
      this.overlay.broadcastRanking(buildRankingSample(config));
      if (!this.rankingSampleLoopActive) {
        return;
      }
      this.rankingSampleLoopTimer = setTimeout(tick, intervalMs);
    };
    tick();
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
        nickname?: string;
        uniqueId?: string;
        comment?: string;
      };
    }> = [
      {
        type: 'comment',
        count: 1,
        extra: {
          uniqueId: 'sample_normal',
          nickname: 'テストユーザー',
          comment: 'テストコメントです',
        },
      },
      {
        type: 'comment',
        count: 1,
        extra: {
          uniqueId: 'sample_short',
          nickname: 'あ',
          comment: 'ok',
          isFanClub: true,
          fanClubLevel: 4,
        },
      },
      {
        type: 'comment',
        count: 1,
        extra: {
          uniqueId: 'sample_long',
          nickname: 'すごく長いニックネームのテストユーザーさん一二三四五',
          comment:
            'これはかなり長いコメントのサンプルです。表示の折り返しや省略、吹き出しの幅が正しく見えるかを確認するための文を続けています。',
          isSuperFan: true,
        },
      },
      {
        type: 'comment',
        count: 1,
        extra: {
          uniqueId: 'sample_emoji',
          nickname: '🐱✨',
          comment: '🎉',
          isFanClub: true,
          isSuperFan: true,
          fanClubLevel: 4,
        },
      },
      {
        type: 'comment',
        count: 1,
        extra: {
          uniqueId: 'sample_mod',
          nickname: 'テストユーザー',
          comment: 'テストコメントです',
          isModerator: true,
        },
      },
      {
        type: 'comment',
        count: 1,
        extra: {
          uniqueId: 'sample_anchor',
          nickname: 'あ',
          comment: 'ok',
          isAnchor: true,
        },
      },
      {
        type: 'gift',
        count: 100,
        extra: {
          uniqueId: 'sample_gift',
          nickname: 'すごく長いニックネームのテストユーザーさん一二三四五',
        },
      },
      {
        type: 'follow',
        count: 1,
        extra: { uniqueId: 'sample_follow', nickname: '🐱✨' },
      },
    ];
    for (const job of jobs) {
      void this.sendTestEvent(job.type, job.count, { ...job.extra, ...flags }).catch((error) => {
        logger.error(`サンプル表示に失敗しました: ${getErrorMessage(error)}`);
      });
    }
  }

  /**
   * 配信ソースを消す。kind 省略または all なら全種類。
   * ランキングはサンプルを消したあとセッション累計へ戻す。
   */
  clearOverlay(kind: OverlayUrlKind | 'all' = 'all'): void {
    const target = kind === 'all' ? 'all' : normalizeOverlayUrlKind(kind);
    if (target === 'all' || target === 'chat') {
      this.overlay.clearRoles(['chat']);
    }
    if (target === 'all' || target === 'alerts') {
      this.overlay.clearRoles(['alerts']);
    }
    if (target === 'all' || target === 'ranking') {
      this.clearRankingSampleLoopTimer();
      this.publishRankingIfChanged(true);
    }
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

  overlayRoleClientCount(kind: OverlayUrlKind): number {
    const role = normalizeOverlayUrlKind(kind) as OverlayClientRole;
    return this.overlay.clientCountForRole(role);
  }

  hasAnyOverlayClient(): boolean {
    return this.overlay.anyClientCount() > 0;
  }

  overlayListeningPort(): number | null {
    return this.overlay.listeningPort();
  }

  async waitForOverlayClient(
    timeoutMs: number,
    kind: OverlayUrlKind | 'all' = 'all',
  ): Promise<boolean> {
    const started = Date.now();
    const hasClient = () => {
      if (kind === 'all') {
        return this.hasAnyOverlayClient();
      }
      return this.overlayRoleClientCount(kind) > 0;
    };
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
      clipboard.writeText(overlayUrlForCopyKind(port, kind));
      return true;
    } catch (error) {
      logger.error(`URLコピーに失敗しました: ${getErrorMessage(error)}`);
      return false;
    }
  }

  async dispose(): Promise<void> {
    this.connectToken += 1;
    this.ttsQueue.clearUnplayed();
    this.clearRankingSampleLoopTimer();
    if (this.rankingLikePollTimer) {
      clearInterval(this.rankingLikePollTimer);
      this.rankingLikePollTimer = null;
    }
    this.rankingLikePollActiveSec = null;
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
        this.diamondTracker.reset();
        this.rankingEntries = [];
        this.publishRankingIfChanged(true);
        this.syncRankingLikePollTimer();
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

  private publishRankingIfChanged(force = false): void {
    const config = this.configStore.get();
    const enabled = normalizeOverlayLikeRankingEnabled(config.overlayLikeRankingEnabled);
    const max = normalizeOverlayLikeRankingMax(config.overlayLikeRankingMax);
    const mode = normalizeOverlayRankingMode(config.overlayRankingMode);
    const likeSync = normalizeOverlayRankingLikeSyncMode(config.overlayRankingLikeSyncMode);
    const likePollSec = normalizeOverlayRankingLikePollSec(config.overlayRankingLikePollSec);
    const tracked = enabled
      ? mode === 'diamonds'
        ? this.diamondTracker.top(max)
        : this.likeTracker.top(max)
      : [];
    const next = tracked.map((entry) => ({
      ...entry,
      avatarUrl: overlayGiftImagePath(entry.avatarUrl) || entry.avatarUrl || '',
    }));
    if (
      !force &&
      this.rankingEnabled === enabled &&
      this.rankingMax === max &&
      this.rankingMode === mode &&
      this.rankingLikeSyncMode === likeSync &&
      this.rankingLikePollSec === likePollSec &&
      sameRanking(this.rankingEntries, next)
    ) {
      return;
    }
    this.rankingEntries = next;
    this.rankingEnabled = enabled;
    this.rankingMax = max;
    this.rankingMode = mode;
    this.rankingLikeSyncMode = likeSync;
    this.rankingLikePollSec = likePollSec;
    // サンプル周回中は本番の配信を被せない（累計は上で更新済み）
    if (this.rankingSampleLoopActive && !force) {
      return;
    }
    this.overlay.broadcastRanking({ entries: next, max, enabled, mode });
  }

  /** いいねランキングがポーリングのときだけ定周期で配信する */
  private syncRankingLikePollTimer(): void {
    const config = this.configStore.get();
    const enabled = normalizeOverlayLikeRankingEnabled(config.overlayLikeRankingEnabled);
    const mode = normalizeOverlayRankingMode(config.overlayRankingMode);
    const likeSync = normalizeOverlayRankingLikeSyncMode(config.overlayRankingLikeSyncMode);
    const likePollSec = normalizeOverlayRankingLikePollSec(config.overlayRankingLikePollSec);
    const shouldPoll = enabled && mode === 'likes' && likeSync === 'poll';
    if (!shouldPoll) {
      if (this.rankingLikePollTimer) {
        clearInterval(this.rankingLikePollTimer);
        this.rankingLikePollTimer = null;
      }
      this.rankingLikePollActiveSec = null;
      return;
    }
    // 間隔が同じなら作り直さない（無関係な設定保存で待ちをリセットしない）
    if (this.rankingLikePollTimer && this.rankingLikePollActiveSec === likePollSec) {
      return;
    }
    if (this.rankingLikePollTimer) {
      clearInterval(this.rankingLikePollTimer);
      this.rankingLikePollTimer = null;
    }
    this.rankingLikePollActiveSec = likePollSec;
    this.rankingLikePollTimer = setInterval(() => {
      try {
        this.publishRankingIfChanged();
      } catch (error) {
        logger.error(
          `いいねランキングのポーリング配信に失敗しました: ${getErrorMessage(error)}`,
        );
      }
    }, likePollSec * 1000);
  }

  private shouldPublishLikesRankingImmediately(): boolean {
    const config = this.configStore.get();
    if (!normalizeOverlayLikeRankingEnabled(config.overlayLikeRankingEnabled)) {
      return false;
    }
    if (normalizeOverlayRankingMode(config.overlayRankingMode) !== 'likes') {
      return false;
    }
    return normalizeOverlayRankingLikeSyncMode(config.overlayRankingLikeSyncMode) === 'live';
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
    if (current.type === 'gift') {
      // ランキング用にダイヤ累計は常に更新（表示オフ・テスト送信でも集計する）
      this.diamondTracker.consume(
        current.user.uniqueId,
        current.user.nickname,
        giftDiamondDelta(current.diamondCount, current.giftCount),
        current.user.avatarUrl || '',
      );
      // ダイヤモードのときだけ即時配信（いいねモードはポーリング／常時の対象外）
      if (normalizeOverlayRankingMode(config.overlayRankingMode) === 'diamonds') {
        this.publishRankingIfChanged();
      }
    }

    if (current.type === 'like') {
      // ランキング用に累計は常に更新（表示オフ・テスト送信でも集計する）
      const reached = this.likeTracker.consume(
        current.user.uniqueId,
        current.user.nickname,
        Math.max(1, current.likeCount || current.giftCount || 1),
        config.likeMilestone,
        current.user.avatarUrl || '',
      );
      if (this.shouldPublishLikesRankingImmediately()) {
        this.publishRankingIfChanged();
      }
      if (!options.skipFilters) {
        if (
          !toggle.display &&
          !toggle.speak &&
          !shouldEmitEventAlert({
            type: current.type,
            enabled: config.eventAlertEnabled,
            media: config.eventAlertMedia,
            giftImageUrl: current.giftImageUrl,
            giftName: current.giftName,
          })
        ) {
          return;
        }
        if (reached === null) {
          return;
        }
        current = { ...current, giftCount: reached };
      }
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
    const overlayNameColor =
      config.overlayNameColorEnabled !== false && current.user.nickname
        ? nameColorForUser(
            current.user.uniqueId,
            current.user.nickname,
            normalizeOverlayNameColors(config.overlayNameColors),
          )
        : null;
    const { displayText, displayParts } = renderOverlayDisplay(templates.display, vars, {
      hideUserName: config.hideUserName,
      maxChars: config.maxDisplayChars,
      nameColor: overlayNameColor,
      accentColors: normalizeTemplateAccentColors(config.templateAccentColors),
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

    const catalogGiftImage =
      current.giftId && (current.type === 'gift' || current.type === 'portal')
        ? catalogGiftImageById(this.watcher.listGifts(), current.giftId)
        : '';
    const giftImageUrl =
      overlayGiftImagePath(current.giftImageUrl) || overlayGiftImagePath(catalogGiftImage);
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
        giftName: current.giftName,
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
      displayParts: showDisplay ? displayParts : [],
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
        giftName: current.giftName,
      });
      if (imageUrl) {
        const nameColor = overlayNameColor;
        const alertDisplayParts: AlertDisplayPart[] = displayParts.map((part) => {
          if (part.kind === 'accent') {
            return {
              kind: 'accent',
              value: part.value,
              color: part.color || '',
              ...(typeof part.token === 'string' && part.token ? { token: part.token } : {}),
            };
          }
          if (part.kind === 'name') {
            return { kind: 'name', value: part.value, color: part.color || '' };
          }
          return { kind: 'text', value: part.value };
        });
        this.overlay.broadcastAlert({
          type: current.type,
          displayText,
          displayParts: alertDisplayParts,
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
      ...overlayUrlFieldsForPort(config.overlayPort),
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
