import { EventEmitter } from 'events';
import { APP_CONFIG } from '../shared/app-config';
import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';
import { MSG } from '../shared/messages';
import { withTimeout } from '../shared/with-timeout';
import { NormalizedLiveEvent, OverlayUser, CatalogGift } from '../shared/types';
import { commentFromEvent } from './comment-fields';
import { userFromEvent } from './event-user';
import {
  envelopeDiamondCount,
  isHiddenEnvelope,
  isSuperFanEnvelope,
} from './envelope-fields';
import { socialEventType } from './social-fields';
import {
  catalogGiftsFromList,
  giftImageUrlFromEvent,
  giftNameFromEvent,
} from './gift-fields';
import { isPortalGiftEvent, isPortalMemberJoin } from './portal-fields';
import { classifyTikTokConnectError } from './connection-error';
import {
  fanClubNameForBadge,
  rememberStreamerFanClubName,
} from '../shared/fan-club-name';
import { fanClubNameFromRoom, parseTikTokUserPreview, TikTokUserPreview } from './user-preview';
import { parseStreamStartedAtMs } from '../shared/live-duration';
import { parseViewerRoomStats, ViewerRoomStats } from '../shared/viewer-room-stats';
import {
  readTikTokSessionConfig,
  tikTokSessionConnectionOptions,
} from './session-options';

const logger = getLogger('tiktok-client');

export interface TikTokClientEvents {
  event: (event: NormalizedLiveEvent) => void;
  connected: (uniqueId: string, streamStartedAtMs: number | null) => void;
  disconnected: (reason: string) => void;
  roomStats: (stats: ViewerRoomStats) => void;
  waiting: (uniqueId: string) => void;
  retry: (delayMs: number, lastError: string) => void;
  error: (message: string) => void;
}

type ConnectorModule = {
  TikTokLiveConnection: new (uniqueId: string, options?: Record<string, unknown>) => TikTokConnection;
  WebcastEvent: Record<string, string>;
};

function tikTokSignApiKey(): string {
  return process.env.EULER_API_KEY?.trim() || process.env.TIKTOK_SIGN_API_KEY?.trim() || '';
}

function liveConnectionOptions(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const signApiKey = tikTokSignApiKey();
  const session = readTikTokSessionConfig();
  return {
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: Boolean(signApiKey),
    ...(signApiKey ? { signApiKey } : {}),
    ...tikTokSessionConnectionOptions(session),
    ...extra,
  };
}

interface TikTokConnection {
  connect: () => Promise<unknown>;
  disconnect: () => Promise<unknown> | void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  availableGifts?: unknown;
  fetchRoomId?: (uniqueId?: string) => Promise<string>;
  fetchRoomInfo?: (roomId?: string) => Promise<unknown>;
  fetchAvailableGifts?: () => Promise<unknown>;
  roomInfo?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function pickUser(raw: Record<string, unknown>, streamerId = ''): OverlayUser {
  return userFromEvent(raw, { streamerId });
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildEvent(
  type: NormalizedLiveEvent['type'],
  raw: Record<string, unknown>,
  extra: Partial<NormalizedLiveEvent> = {},
  streamerId = '',
): NormalizedLiveEvent {
  return {
    type,
    user: pickUser(raw, streamerId),
    comment: '',
    likeCount: 0,
    giftName: '',
    giftCount: 1,
    giftImageUrl: '',
    diamondCount: 0,
    receivedAt: nowIso(),
    ...extra,
  };
}

export class TikTokLiveWatcher extends EventEmitter {
  private connection: TikTokConnection | null = null;
  private running = false;
  private uniqueId = '';
  private gifts: CatalogGift[] = [];
  private streamerFanClubName = '';
  private sessionToken = 0;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private sleepResolve: (() => void) | null = null;

  async start(uniqueId: string): Promise<void> {
    const token = ++this.sessionToken;
    this.wakeSleep();
    await this.teardownConnection();
    if (token !== this.sessionToken) {
      return;
    }

    this.uniqueId = uniqueId.replace(/^@/, '').trim();
    this.streamerFanClubName = '';
    this.running = true;
    void this.loop(token).catch((error) => {
      logger.error(`TikTok接続ループが止まりました: ${getErrorMessage(error)}`);
      this.emit('error', getErrorMessage(error));
    });
  }

  async stop(): Promise<void> {
    this.sessionToken += 1;
    this.running = false;
    this.streamerFanClubName = '';
    this.wakeSleep();
    await this.teardownConnection();
  }

  private async teardownConnection(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    await disconnectQuiet(connection);
  }

  private isCurrent(token: number): boolean {
    return this.running && this.sessionToken === token;
  }

  listGifts(): CatalogGift[] {
    return this.gifts;
  }

  primeGifts(gifts: CatalogGift[]): void {
    if (gifts.length === 0) {
      return;
    }
    this.gifts = gifts;
  }

  async fetchUserPreview(uniqueId: string): Promise<TikTokUserPreview> {
    const id = uniqueId.replace(/^@/, '').trim();
    if (!id) {
      throw new Error(MSG.connection.uniqueIdRequired);
    }

    const mod = (await import('tiktok-live-connector')) as unknown as ConnectorModule;
    const connection = new mod.TikTokLiveConnection(id, liveConnectionOptions({
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false,
    }));

    try {
      try {
        if (typeof connection.fetchRoomId === 'function') {
          await withTimeout(
            connection.fetchRoomId(id),
            APP_CONFIG.connectTimeoutMs,
            MSG.connection.connectTimeout,
          );
        }
      } catch (error) {
        const message = getErrorMessage(error);
        if (classifyTikTokConnectError(message) === 'user') {
          throw new Error(MSG.connection.userNotFound);
        }
        logger.warning(`部屋IDの取得に失敗しました(@${id}): ${message}`);
      }

      if (typeof connection.fetchRoomInfo !== 'function') {
        throw new Error(MSG.connection.lookupFailed);
      }

      const roomInfo = await withTimeout(
        connection.fetchRoomInfo(),
        APP_CONFIG.connectTimeoutMs,
        MSG.connection.connectTimeout,
      );
      const parsed = parseTikTokUserPreview(roomInfo, id);
      if (!parsed) {
        throw new Error(MSG.connection.lookupFailed);
      }
      return parsed;
    } finally {
      await disconnectQuiet(connection);
    }
  }

  async fetchGiftsForUser(uniqueId: string): Promise<CatalogGift[]> {
    const id = uniqueId.replace(/^@/, '').trim();
    if (!id) {
      return this.gifts;
    }

    const mod = (await import('tiktok-live-connector')) as unknown as ConnectorModule;
    const connection = new mod.TikTokLiveConnection(id, liveConnectionOptions({
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false,
    }));

    try {
      if (typeof connection.fetchRoomId === 'function') {
        await withTimeout(
          connection.fetchRoomId(id),
          APP_CONFIG.connectTimeoutMs,
          MSG.connection.connectTimeout,
        );
      }
      if (!tikTokSignApiKey() || typeof connection.fetchAvailableGifts !== 'function') {
        return this.gifts;
      }
      const parsed = catalogGiftsFromList(
        await withTimeout(
          connection.fetchAvailableGifts(),
          APP_CONFIG.connectTimeoutMs,
          MSG.connection.connectTimeout,
        ),
      );
      if (parsed.length > 0) {
        this.gifts = parsed;
      }
      return this.gifts;
    } finally {
      await disconnectQuiet(connection);
    }
  }

  async refreshGifts(connection: TikTokConnection | null = this.connection): Promise<CatalogGift[]> {
    if (!connection) {
      return this.gifts;
    }

    try {
      let raw = connection.availableGifts;
      if (
        raw == null &&
        tikTokSignApiKey() &&
        typeof connection.fetchAvailableGifts === 'function'
      ) {
        raw = await connection.fetchAvailableGifts();
      }
      let parsed = catalogGiftsFromList(raw);
      if (
        parsed.length === 0 &&
        raw != null &&
        tikTokSignApiKey() &&
        typeof connection.fetchAvailableGifts === 'function'
      ) {
        parsed = catalogGiftsFromList(await connection.fetchAvailableGifts());
      }
      if (parsed.length > 0) {
        this.gifts = parsed;
      }
    } catch (error) {
      logger.warning(`ギフト一覧の取得に失敗しました: ${getErrorMessage(error)}`);
    }
    return this.gifts;
  }

  private async loop(token: number): Promise<void> {
    let delayMs = APP_CONFIG.reconnectInitialMs;
    let lastError = '';

    while (this.isCurrent(token)) {
      let connection: TikTokConnection | null = null;
      try {
        this.emit('waiting', this.uniqueId);
        connection = await this.createConnection();
        if (!this.isCurrent(token)) {
          await disconnectQuiet(connection);
          return;
        }

        this.connection = connection;
        await withTimeout(
          Promise.resolve(connection.connect()),
          APP_CONFIG.connectTimeoutMs,
          MSG.connection.connectTimeout,
        );
        if (!this.isCurrent(token)) {
          return;
        }
        delayMs = APP_CONFIG.reconnectInitialMs;
        lastError = '';
        await this.refreshGifts(connection);
        const streamStartedAtMs = parseStreamStartedAtMs(connection.roomInfo);
        this.emit('connected', this.uniqueId, streamStartedAtMs);
        logger.info(`TikTok LIVE に接続しました (@${this.uniqueId})`);
        void this.captureRoomFanClubName(connection);
        await this.waitDisconnect(connection, token);
        if (this.isCurrent(token)) {
          lastError = MSG.connection.disconnectedFromLive;
          this.emit('disconnected', lastError);
        }
      } catch (error) {
        const message = getErrorMessage(error);
        lastError = message;
        logger.warning(`TikTok接続に失敗しました(@${this.uniqueId}): ${message}`);
        if (this.isCurrent(token)) {
          this.emit('error', message);
        }
      } finally {
        if (this.connection === connection) {
          this.connection = null;
        }
        await disconnectQuiet(connection);
      }

      if (!this.isCurrent(token)) {
        return;
      }

      this.emit('retry', delayMs, lastError);
      await this.sleep(delayMs);
      delayMs = Math.min(delayMs * 2, APP_CONFIG.reconnectMaxMs);
    }
  }

  private waitDisconnect(watched: TikTokConnection, token: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (!this.isCurrent(token) || this.connection !== watched) {
          clearInterval(timer);
          resolve();
        }
      }, 250);
    });
  }

  private async createConnection(): Promise<TikTokConnection> {
    const mod = (await import('tiktok-live-connector')) as unknown as ConnectorModule;
    const session = readTikTokSessionConfig();
    if (session) {
      logger.info(
        session.authenticateWs
          ? 'TikTok セッション認証付きで接続します'
          : 'TikTok セッション cookie を設定しました（WebSocket 認証はオフ。LIVE Studio に見えるコメントがログに無いときは TIKTOK_AUTHENTICATE_WS=1 を試してください）',
      );
    }
    const connection = new mod.TikTokLiveConnection(
      this.uniqueId,
      liveConnectionOptions(),
    );
    const events = mod.WebcastEvent;
    const toEvent = (
      type: NormalizedLiveEvent['type'],
      raw: Record<string, unknown>,
      extra: Partial<NormalizedLiveEvent> = {},
    ) => buildEvent(type, raw, extra, this.uniqueId);

    const emitComment = (data: unknown) => {
      const raw = asRecord(data);
      this.emitLiveEvent(
        toEvent('comment', raw, {
          comment: commentFromEvent(raw),
        }),
      );
    };
    this.bind(connection, events.CHAT ?? 'chat', emitComment);
    this.bind(connection, events.EMOTE ?? 'emote', emitComment);

    this.bind(connection, events.GIFT ?? 'gift', (data) => {
      const raw = asRecord(data);
      const giftType =
        asNumber(raw.giftType) ||
        asNumber(asRecord(raw.gift).gift_type) ||
        asNumber(asRecord(raw.gift).type);
      const repeatEnd =
        asBoolean(raw.repeatEnd) ||
        asBoolean(raw.repeat_end) ||
        asBoolean(asRecord(raw.gift).repeat_end) ||
        asBoolean(asRecord(raw.gift).repeatEnd);

      const repeatCount = Math.max(
        1,
        asNumber(raw.repeatCount) ||
          asNumber(raw.repeat_count) ||
          asNumber(raw.comboCount) ||
          asNumber(asRecord(raw.gift).repeat_count) ||
          1,
      );

      if (giftType === 1 && !repeatEnd) {
        return;
      }

      const gift = asRecord(raw.giftDetails || raw.extendedGiftInfo || raw.gift);
      const giftName = giftNameFromEvent(raw);
      this.emitLiveEvent(
        toEvent(isPortalGiftEvent(raw) ? 'portal' : 'gift', raw, {
          giftName,
          giftCount: repeatCount,
          giftImageUrl: giftImageUrlFromEvent(raw),
          diamondCount:
            asNumber(raw.diamondCount) ||
            asNumber(raw.diamond_count) ||
            asNumber(gift.diamondCount) ||
            asNumber(gift.diamond_count),
        }),
      );
    });

    this.bind(connection, events.FOLLOW ?? 'follow', (data) => {
      this.emitLiveEvent(toEvent('follow', asRecord(data)));
    });
    this.bind(connection, events.SHARE ?? 'share', (data) => {
      this.emitLiveEvent(toEvent('share', asRecord(data)));
    });
    this.bind(connection, events.SOCIAL ?? 'social', (data) => {
      const raw = asRecord(data);
      const kind = socialEventType(raw);
      if (kind) {
        this.emitLiveEvent(toEvent(kind, raw));
        return;
      }
      if (isPortalMemberJoin(raw)) {
        this.emitLiveEvent(toEvent('member', raw, { giftName: MSG.ui.portalGift }));
      }
    });

    this.bind(connection, events.SUB_NOTIFY ?? 'subNotify', (data) => {
      this.emitLiveEvent(toEvent('superFan', asRecord(data)));
    });
    const subscribeEvent = events.SUBSCRIBE;
    if (subscribeEvent && subscribeEvent !== (events.SUB_NOTIFY ?? 'subNotify')) {
      this.bind(connection, subscribeEvent, (data) => {
        this.emitLiveEvent(toEvent('superFan', asRecord(data)));
      });
    }

    const emitSuperFan = (data: unknown) => {
      this.emitLiveEvent(toEvent('superFan', asRecord(data)));
    };
    this.bind(connection, events.SUPER_FAN ?? 'superFan', emitSuperFan);
    // 既存スパファンの入室。加入通知（superFan）とは別イベント。
    this.bind(connection, events.SUPER_FAN_JOIN ?? 'superFanJoin', (data) => {
      this.emitLiveEvent(toEvent('member', asRecord(data)));
    });
    this.bind(connection, events.SUPER_FAN_BOX ?? 'superFanBox', (data) => {
      const raw = asRecord(data);
      this.emitLiveEvent(
        toEvent('superFan', raw, {
          giftName: MSG.ui.superFanBox,
          diamondCount: envelopeDiamondCount(raw),
        }),
      );
    });
    this.bind(connection, events.ENVELOPE ?? 'envelope', (data) => {
      const raw = asRecord(data);
      if (isHiddenEnvelope(raw) || isSuperFanEnvelope(raw)) {
        return;
      }
      this.emitLiveEvent(
        toEvent('envelope', raw, {
          giftName: MSG.ui.treasureBox,
          diamondCount: envelopeDiamondCount(raw),
        }),
      );
    });

    this.bind(connection, events.LIKE ?? 'like', (data) => {
      const raw = asRecord(data);
      const likeCount = Math.max(
        1,
        asNumber(raw.likeCount) ||
          asNumber(raw.like_count) ||
          asNumber(raw.count) ||
          1,
      );
      this.emitLiveEvent(
        toEvent('like', raw, {
          likeCount,
          giftCount: likeCount,
        }),
      );
    });

    this.bind(connection, events.MEMBER ?? 'member', (data) => {
      const raw = asRecord(data);
      this.emitLiveEvent(
        toEvent('member', raw, isPortalMemberJoin(raw) ? { giftName: MSG.ui.portalGift } : {}),
      );
    });

    const emitRoomStats = (data: unknown) => {
      const stats = parseViewerRoomStats(data);
      if (stats) {
        this.emit('roomStats', stats);
      }
    };
    this.bind(connection, events.ROOM_USER ?? 'roomUser', emitRoomStats);

    const drop = () => {
      if (this.connection === connection) {
        this.connection = null;
      }
      void disconnectQuiet(connection);
    };
    this.bind(connection, events.DISCONNECTED ?? 'disconnected', drop);
    this.bind(connection, events.STREAM_END ?? 'streamEnd', drop);
    this.bind(connection, events.WEBSOCKET_DISCONNECTED ?? 'websocketDisconnected', drop);
    this.bind(connection, events.ERROR ?? 'error', (data) => {
      logger.warning(`TikTok接続エラー: ${getErrorMessage(data)}`);
      drop();
    });

    return connection;
  }

  private emitLiveEvent(event: NormalizedLiveEvent): void {
    this.emit('event', this.applyStreamerFanClub(event));
  }

  private applyStreamerFanClub(event: NormalizedLiveEvent): NormalizedLiveEvent {
    this.streamerFanClubName = rememberStreamerFanClubName(
      this.streamerFanClubName,
      event.user.fanClubName,
    );
    const filled = fanClubNameForBadge(
      event.user.isFanClub,
      event.user.fanClubName,
      this.streamerFanClubName,
    );
    if (filled) {
      this.streamerFanClubName = rememberStreamerFanClubName(
        this.streamerFanClubName,
        filled,
      );
    }
    if (filled === event.user.fanClubName) {
      return event;
    }
    return {
      ...event,
      user: {
        ...event.user,
        fanClubName: filled,
      },
    };
  }

  private async captureRoomFanClubName(connection: TikTokConnection): Promise<void> {
    try {
      let raw: unknown = connection.roomInfo ?? null;
      if (raw == null && typeof connection.fetchRoomInfo === 'function') {
        raw = await withTimeout(
          Promise.resolve(connection.fetchRoomInfo()),
          Math.min(10_000, APP_CONFIG.connectTimeoutMs),
          MSG.connection.connectTimeout,
        );
      }
      const parsed = parseTikTokUserPreview(raw, this.uniqueId);
      const fanClubName = parsed?.fanClubName || fanClubNameFromRoom(raw);
      if (fanClubName) {
        this.streamerFanClubName = rememberStreamerFanClubName(
          this.streamerFanClubName,
          fanClubName,
        );
      }
    } catch (error) {
      logger.warning(`ファンクラブ名の取得に失敗しました: ${getErrorMessage(error)}`);
    }
  }

  private bind(
    connection: TikTokConnection,
    eventName: string,
    listener: (data: unknown) => void,
  ): void {
    connection.on(eventName, (...args: unknown[]) => {
      try {
        listener(args[0]);
      } catch (error) {
        logger.error(`イベント処理に失敗しました (${eventName}): ${getErrorMessage(error)}`);
      }
    });
  }

  private wakeSleep(): void {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
    if (this.sleepResolve) {
      const resolve = this.sleepResolve;
      this.sleepResolve = null;
      resolve();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.wakeSleep();
      this.sleepResolve = resolve;
      this.sleepTimer = setTimeout(() => {
        this.sleepTimer = null;
        this.sleepResolve = null;
        resolve();
      }, ms);
    });
  }
}

async function disconnectQuiet(connection: TikTokConnection | null): Promise<void> {
  if (!connection) {
    return;
  }
  try {
    await connection.disconnect();
  } catch (error) {
    logger.warning(`TikTok切断に失敗しました: ${getErrorMessage(error)}`);
  }
}

export declare interface TikTokLiveWatcher {
  on<U extends keyof TikTokClientEvents>(event: U, listener: TikTokClientEvents[U]): this;
  emit<U extends keyof TikTokClientEvents>(
    event: U,
    ...args: Parameters<TikTokClientEvents[U]>
  ): boolean;
}
