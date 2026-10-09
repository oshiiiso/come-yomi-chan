import fs from 'fs';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { APP_CONFIG } from '../shared/app-config';
import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';
import type { OverlaySamplePlan } from '../app/overlay-sample-plan';
import type { OverlayBoard } from '../shared/overlay-board';
import { OverlayLook, DEFAULT_OVERLAY_LOOK, overlayFontCss } from '../shared/overlay-look';
import { DEFAULT_OVERLAY_PIN, OverlayPinOptions } from '../shared/overlay-pin';
import { OverlayPayload } from '../shared/types';
import { MSG } from '../shared/messages';
import { closeWithTimeout } from '../shared/with-timeout';
import {
  fetchAllowedGiftImage,
  GiftImageCache,
  isAllowedGiftImageUrl,
} from './gift-image-proxy';
import { soundFilePath, getSoundsDir } from '../shared/sound-files';
import { alertMediaFilePath, getAlertMediaDir } from '../shared/alert-media-files';
import { DEFAULT_EVENT_ALERT_MS } from '../shared/event-alert';
import type { OverlayRankingPayload, RankEntry } from '../shared/like-ranking';
import {
  DEFAULT_OVERLAY_LIKE_RANKING_ENABLED,
  DEFAULT_OVERLAY_LIKE_RANKING_MAX,
  DEFAULT_OVERLAY_RANKING_MODE,
  normalizeOverlayRankingMode,
} from '../shared/like-ranking';
import {
  DEFAULT_OVERLAY_LIKES_LOOK,
  type OverlayLikesLook,
  overlayLikesFontCss,
} from '../shared/overlay-likes-look';
import {
  DEFAULT_OVERLAY_RANKING_MOTION,
  DEFAULT_OVERLAY_RANKING_MOTION_SPEED,
  normalizeOverlayRankingMotion,
  normalizeOverlayRankingMotionSpeed,
  overlayRankingMotionMs,
  type OverlayRankingMotion,
  type OverlayRankingMotionSpeed,
} from '../shared/overlay-ranking-motion';
import {
  DEFAULT_TEMPLATE_ACCENT_COLORS,
  normalizeTemplateAccentColors,
  type TemplateAccentColors,
} from '../shared/template-accent-colors';

const logger = getLogger('overlay-server');

export type OverlayClientRole = 'chat' | 'alerts' | 'ranking' | 'board';

export function isPreviewOverlayRequest(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false;
  }
  try {
    const url = new URL(rawUrl, 'http://overlay.local');
    return url.searchParams.get('preview') === '1';
  } catch {
    return false;
  }
}

export function overlayBoardIdFromUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    return '';
  }
  try {
    const url = new URL(rawUrl, 'http://overlay.local');
    const id = url.searchParams.get('board') ?? '';
    return /^[a-zA-Z0-9_-]{1,40}$/.test(id) ? id : '';
  } catch {
    return '';
  }
}

export function overlayClientRoleFromUrl(rawUrl: string | undefined): OverlayClientRole {
  if (!rawUrl) {
    return 'chat';
  }
  try {
    const url = new URL(rawUrl, 'http://overlay.local');
    const role = url.searchParams.get('role');
    if (role === 'alerts') {
      return 'alerts';
    }
    // 旧 likes ロールもランキングとして扱う
    if (role === 'ranking' || role === 'likes') {
      return 'ranking';
    }
    if (role === 'board') {
      return 'board';
    }
    return 'chat';
  } catch {
    return 'chat';
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

interface StoredAudio {
  buffer: Buffer;
  expiresAt: number;
}

export class OverlayServer {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private readonly audio = new Map<string, StoredAudio>();
  private chatMaxRows = 8;
  private chatDisplayMs = 12_000;
  private customCss = '';
  private look = DEFAULT_OVERLAY_LOOK;
  private likesLook = DEFAULT_OVERLAY_LIKES_LOOK;
  private rankingMotion: OverlayRankingMotion = DEFAULT_OVERLAY_RANKING_MOTION;
  private rankingMotionSpeed: OverlayRankingMotionSpeed = DEFAULT_OVERLAY_RANKING_MOTION_SPEED;
  private pin = DEFAULT_OVERLAY_PIN;
  private hideUserName = false;
  private nameColorEnabled = true;
  private nameColors: string[] = [];
  private templateAccentColors: TemplateAccentColors = { ...DEFAULT_TEMPLATE_ACCENT_COLORS };
  private eventAlertDisplayMs = DEFAULT_EVENT_ALERT_MS;
  private audioSeq = 0;
  private lastNoClientWarnAt = 0;
  private readonly giftImages = new GiftImageCache();
  private readonly previewClients = new WeakSet<WebSocket>();
  private readonly clientRoles = new WeakMap<WebSocket, OverlayClientRole>();
  private readonly clientBoardIds = new WeakMap<WebSocket, string>();
  private lastBoards: OverlayBoard[] = [];
  private readonly maxAudioEntries = 40;
  private clientChangeHandler: (() => void) | null = null;
  /** 表示を消すまで、新しく繋がった配信ソースへ出し直すサンプル */
  private readonly latchedSamples = new Map<'chat' | 'alerts', Record<string, unknown>>();
  private lastRanking: OverlayRankingPayload = {
    entries: [],
    max: DEFAULT_OVERLAY_LIKE_RANKING_MAX,
    enabled: DEFAULT_OVERLAY_LIKE_RANKING_ENABLED,
    mode: DEFAULT_OVERLAY_RANKING_MODE,
  };

  constructor(
    private readonly host: string,
    private readonly overlayDir: string,
    private readonly audioTtlMs: number,
  ) {}

  setOverlayOptions(
    chatMaxRows: number,
    chatDisplayMs: number,
    customCss = '',
    look: OverlayLook = DEFAULT_OVERLAY_LOOK,
    pin: OverlayPinOptions = DEFAULT_OVERLAY_PIN,
    hideUserName = false,
    nameColorEnabled = true,
    nameColors: string[] = [],
    eventAlertDisplayMs: number = DEFAULT_EVENT_ALERT_MS,
    likesLook: OverlayLikesLook = DEFAULT_OVERLAY_LIKES_LOOK,
    templateAccentColors: TemplateAccentColors | unknown = DEFAULT_TEMPLATE_ACCENT_COLORS,
    rankingMotion: OverlayRankingMotion | unknown = DEFAULT_OVERLAY_RANKING_MOTION,
    rankingMotionSpeed: OverlayRankingMotionSpeed | unknown = DEFAULT_OVERLAY_RANKING_MOTION_SPEED,
  ): void {
    this.chatMaxRows = chatMaxRows;
    this.chatDisplayMs = chatDisplayMs;
    this.customCss = customCss;
    this.look = look;
    this.likesLook = likesLook;
    this.rankingMotion = normalizeOverlayRankingMotion(rankingMotion);
    this.rankingMotionSpeed = normalizeOverlayRankingMotionSpeed(rankingMotionSpeed);
    this.pin = pin;
    this.hideUserName = hideUserName === true;
    this.nameColorEnabled = nameColorEnabled !== false;
    this.nameColors = Array.isArray(nameColors) ? nameColors : [];
    this.templateAccentColors = normalizeTemplateAccentColors(templateAccentColors);
    this.eventAlertDisplayMs =
      typeof eventAlertDisplayMs === 'number' && Number.isFinite(eventAlertDisplayMs)
        ? Math.trunc(eventAlertDisplayMs)
        : DEFAULT_EVENT_ALERT_MS;
    this.broadcastSettings();
  }

  async listen(port: number): Promise<void> {
    if (this.listeningPort() === port) {
      return;
    }
    const created = this.createHttpPair();
    try {
      await listenHttp(created.server, port, this.host);
    } catch (error) {
      await this.disposePair(created.wss, created.server);
      throw error;
    }

    created.server.on('error', (error: Error) => {
      logger.error(`オーバーレイサーバーエラー: ${getErrorMessage(error)}`);
    });

    const previousWss = this.wss;
    const previousServer = this.server;
    this.server = created.server;
    this.wss = created.wss;
    await this.disposePair(previousWss, previousServer);

    const bound = this.listeningPort() ?? port;
    logger.info(`オーバーレイサーバーを起動しました (${this.host}:${bound})`);
  }

  async close(): Promise<void> {
    const wss = this.wss;
    const server = this.server;
    this.wss = null;
    this.server = null;
    await this.disposePair(wss, server);
  }

  listeningPort(): number | null {
    const address = this.server?.address();
    if (!address || typeof address === 'string') {
      return null;
    }
    return address.port;
  }

  setClientChangeHandler(handler: (() => void) | null): void {
    this.clientChangeHandler = handler;
  }

  storeAudio(buffer: Buffer): string {
    this.cleanupAudio();
    this.evictAudio();
    this.audioSeq += 1;
    const id = `${Date.now()}-${this.audioSeq}`;
    this.audio.set(id, {
      buffer,
      expiresAt: Date.now() + this.audioTtlMs,
    });
    return id;
  }

  broadcast(payload: OverlayPayload): void {
    this.warnIfNoClients();
    this.sendAll({ kind: 'event', payload }, { roles: ['chat'] });
  }

  broadcastAlert(payload: {
    type: string;
    displayText: string;
    displayParts?: Array<
      | { kind: 'text'; value: string }
      | { kind: 'name'; value: string; color: string }
      | { kind: 'accent'; value: string; color: string; token?: string }
    >;
    imageUrl?: string | null;
    displayMs?: number;
    user?: OverlayPayload['user'];
    nameColor?: string | null;
  }): void {
    const nameColor =
      typeof payload.nameColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(payload.nameColor)
        ? payload.nameColor.toLowerCase()
        : null;
    const displayParts = Array.isArray(payload.displayParts) ? payload.displayParts : [];
    this.sendAll(
      {
        kind: 'alert',
        payload: {
          type: payload.type,
          displayText: payload.displayText,
          displayParts,
          imageUrl: typeof payload.imageUrl === 'string' && payload.imageUrl ? payload.imageUrl : null,
          displayMs:
            typeof payload.displayMs === 'number' && Number.isFinite(payload.displayMs)
              ? Math.trunc(payload.displayMs)
              : this.eventAlertDisplayMs,
          user: payload.user ?? null,
          nameColor,
        },
      },
      { roles: ['alerts'] },
    );
  }

  setBoards(boards: OverlayBoard[]): void {
    this.lastBoards = boards;
    this.broadcastBoards();
  }

  broadcastBoards(): void {
    this.wss?.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }
      if (this.clientRoles.get(client) !== 'board') {
        return;
      }
      const boardId = this.clientBoardIds.get(client) ?? '';
      const board = this.lastBoards.find((item) => item.id === boardId) ?? null;
      try {
        client.send(JSON.stringify({ kind: 'board', board }));
      } catch (error) {
        logger.warning(`配置の送信に失敗しました: ${getErrorMessage(error)}`);
      }
    });
  }

  broadcastRanking(payload: OverlayRankingPayload): void {
    const entries = Array.isArray(payload.entries)
      ? payload.entries.map((entry) => {
          const raw = entry as RankEntry & { likeCount?: unknown };
          const legacyCount =
            typeof raw.likeCount === 'number' && Number.isFinite(raw.likeCount)
              ? Math.max(0, Math.trunc(raw.likeCount))
              : 0;
          const count =
            typeof raw.count === 'number' && Number.isFinite(raw.count)
              ? Math.max(0, Math.trunc(raw.count))
              : legacyCount;
          const next: RankEntry = {
            uniqueId: typeof raw.uniqueId === 'string' ? raw.uniqueId : '',
            nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
            count,
            avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : '',
          };
          if (typeof raw.likes === 'number' && Number.isFinite(raw.likes)) {
            next.likes = Math.max(0, Math.trunc(raw.likes));
          }
          if (typeof raw.diamonds === 'number' && Number.isFinite(raw.diamonds)) {
            next.diamonds = Math.max(0, Math.trunc(raw.diamonds));
          }
          return next;
        })
      : [];
    const nextRanking: OverlayRankingPayload = {
      entries,
      max:
        typeof payload.max === 'number' && Number.isFinite(payload.max)
          ? Math.trunc(payload.max)
          : DEFAULT_OVERLAY_LIKE_RANKING_MAX,
      enabled: payload.enabled !== false,
      mode: normalizeOverlayRankingMode(payload.mode),
    };
    if (payload.likeSyncMode === 'live' || payload.likeSyncMode === 'poll') {
      nextRanking.likeSyncMode = payload.likeSyncMode;
    }
    if (typeof payload.likePollSec === 'number' && Number.isFinite(payload.likePollSec)) {
      nextRanking.likePollSec = Math.trunc(payload.likePollSec);
    }
    if (payload.previewMotion === true) {
      nextRanking.previewMotion = true;
    }
    this.lastRanking = nextRanking;
    this.sendAll(
      {
        kind: 'ranking',
        payload: this.lastRanking,
      },
      { roles: ['ranking'] },
    );
  }

  /** @deprecated broadcastRanking を使う */
  broadcastLikeRanking(payload: OverlayRankingPayload): void {
    this.broadcastRanking(payload);
  }

  broadcastAudio(audioUrl: string): void {
    this.warnIfNoClients();
    this.sendAll({ kind: 'audio', audioUrl }, { roles: ['chat'] });
  }

  broadcastChime(soundUrl?: string | null, volume?: number): void {
    this.sendAll(
      {
        kind: 'chime',
        soundUrl: typeof soundUrl === 'string' && soundUrl ? soundUrl : null,
        volume: typeof volume === 'number' && Number.isFinite(volume) ? volume : undefined,
      },
      { excludePreview: true, roles: ['chat'] },
    );
  }

  clearChat(): void {
    // 互換: コメント列とアラートを消す（ランキングはセッション側で戻す）
    this.clearRoles(['chat', 'alerts']);
  }

  clearRoles(roles: OverlayClientRole[]): void {
    if (roles.length === 0) {
      return;
    }
    for (const role of roles) {
      if (role === 'chat' || role === 'alerts') {
        this.latchedSamples.delete(role);
      }
    }
    // 見た目プレビューのサンプル周回は消さない
    this.sendAll({ kind: 'clear' }, { excludePreview: true, roles });
  }

  hasLatchedSample(role: 'chat' | 'alerts'): boolean {
    return this.latchedSamples.has(role);
  }

  showSampleDisplay(plan: OverlaySamplePlan): void {
    this.warnIfNoClients();
    const { kind: _kind, ...settings } = this.settingsPayload();
    const message = {
      kind: 'sample-display',
      ...settings,
      chatSamples: plan.chatSamples,
      pinSamples: plan.pinSamples,
    };
    this.latchedSamples.set('chat', message);
    this.sendAll(message, { excludePreview: true, roles: ['chat'] });
  }

  /** アラート配信ソースだけを、プレビューと同じサンプルで周回させる */
  showAlertSampleDisplay(samples: OverlaySamplePlan['alertSamples']): void {
    const { kind: _kind, ...settings } = this.settingsPayload();
    const message = {
      kind: 'sample-display',
      ...settings,
      alertSamples: samples,
    };
    this.latchedSamples.set('alerts', message);
    this.sendAll(message, { excludePreview: true, roles: ['alerts'] });
  }

  clearPin(): void {
    this.sendAll(
      { kind: 'pin-control', action: 'clear' },
      { excludePreview: true, roles: ['chat'] },
    );
  }

  skipPlayback(): void {
    this.sendAll({ kind: 'audio-control', action: 'skip' }, { roles: ['chat'] });
  }

  clearPendingAudio(): void {
    this.sendAll({ kind: 'audio-control', action: 'clear-pending' }, { roles: ['chat'] });
  }

  clientCountForRole(role: OverlayClientRole): number {
    if (!this.wss) {
      return 0;
    }
    return [...this.wss.clients].filter(
      (client) =>
        client.readyState === WebSocket.OPEN &&
        !this.previewClients.has(client) &&
        this.clientRoles.get(client) === role,
    ).length;
  }

  clientCount(): number {
    return this.clientCountForRole('chat');
  }

  alertClientCount(): number {
    return this.clientCountForRole('alerts');
  }

  likesClientCount(): number {
    return this.clientCountForRole('ranking');
  }

  rankingClientCount(): number {
    return this.clientCountForRole('ranking');
  }

  anyClientCount(): number {
    return this.clientCount() + this.alertClientCount() + this.rankingClientCount();
  }

  getPort(): number {
    const port = this.listeningPort();
    if (port == null) {
      throw new Error('オーバーレイサーバーが起動していません');
    }
    return port;
  }

  private broadcastSettings(): void {
    const settings = this.settingsPayload();
    this.sendAll(settings);
    const { kind: _kind, ...rest } = settings;
    for (const latched of this.latchedSamples.values()) {
      Object.assign(latched, rest);
    }
  }

  private settingsPayload(): Record<string, unknown> {
    return {
      kind: 'hello',
      chatMaxRows: this.chatMaxRows,
      chatDisplayMs: this.chatDisplayMs,
      customCss: this.customCss,
      hideUserName: this.hideUserName,
      nameColorEnabled: this.nameColorEnabled,
      nameColors: this.nameColors,
      templateAccentColors: this.templateAccentColors,
      eventAlertDisplayMs: this.eventAlertDisplayMs,
      look: {
        ...this.look,
        fontCss: overlayFontCss(this.look.fontFamily),
      },
      likesLook: {
        ...this.likesLook,
        fontCss: overlayLikesFontCss(this.likesLook.fontFamily),
      },
      rankingMotion: this.rankingMotion,
      rankingMotionSpeed: this.rankingMotionSpeed,
      rankingMotionMs: overlayRankingMotionMs(this.rankingMotionSpeed),
      pin: this.pin,
    };
  }

  private sendAll(
    message: Record<string, unknown>,
    options: { excludePreview?: boolean; roles?: OverlayClientRole[] } = {},
  ): void {
    let raw: string;
    try {
      raw = JSON.stringify(message);
    } catch (error) {
      logger.error(`オーバーレイ通知の作成に失敗しました: ${getErrorMessage(error)}`);
      return;
    }

    const roles = options.roles;
    this.wss?.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }
      if (options.excludePreview && this.previewClients.has(client)) {
        return;
      }
      if (roles && roles.length > 0) {
        const role = this.clientRoles.get(client) ?? 'chat';
        if (!roles.includes(role)) {
          return;
        }
      }
      try {
        client.send(raw);
      } catch (error) {
        logger.warning(`オーバーレイ通知の送信に失敗しました: ${getErrorMessage(error)}`);
      }
    });
  }

  private warnIfNoClients(): void {
    if (this.clientCount() !== 0) {
      return;
    }
    const now = Date.now();
    if (now - this.lastNoClientWarnAt < APP_CONFIG.noticeIntervalMs) {
      return;
    }
    this.lastNoClientWarnAt = now;
    logger.warning(MSG.ui.overlayNotConnected);
  }

  private sendHello(socket: WebSocket): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      socket.send(JSON.stringify(this.settingsPayload()));
      if (this.clientRoles.get(socket) === 'board') {
        const boardId = this.clientBoardIds.get(socket) ?? '';
        const board = this.lastBoards.find((item) => item.id === boardId) ?? null;
        socket.send(JSON.stringify({ kind: 'board', board }));
      }
      if (this.clientRoles.get(socket) === 'ranking') {
        socket.send(
          JSON.stringify({
            kind: 'ranking',
            payload: this.lastRanking,
          }),
        );
      }
      const role = this.clientRoles.get(socket);
      const latched = role === 'chat' || role === 'alerts' ? this.latchedSamples.get(role) : undefined;
      if (latched && !this.previewClients.has(socket)) {
        socket.send(JSON.stringify(latched));
      }
    } catch (error) {
      logger.warning(`オーバーレイ初期通知に失敗しました: ${getErrorMessage(error)}`);
    }
  }

  private notifyClientChange(): void {
    this.clientChangeHandler?.();
  }

  private createHttpPair(): { server: http.Server; wss: WebSocketServer } {
    const server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });
    const wss = new WebSocketServer({ server, path: '/overlay/ws' });
    wss.on('connection', (socket, req) => {
      this.clientRoles.set(socket, overlayClientRoleFromUrl(req.url));
      const boardId = overlayBoardIdFromUrl(req.url);
      if (boardId) {
        this.clientBoardIds.set(socket, boardId);
      }
      if (isPreviewOverlayRequest(req.url)) {
        this.previewClients.add(socket);
      }
      this.sendHello(socket);
      socket.on('close', () => {
        this.notifyClientChange();
      });
      this.notifyClientChange();
    });
    wss.on('error', (error) => {
      logger.error(`オーバーレイWebSocketエラー: ${getErrorMessage(error)}`);
    });
    return { server, wss };
  }

  private async disposePair(
    wss: WebSocketServer | null,
    server: http.Server | null,
  ): Promise<void> {
    if (wss) {
      for (const client of wss.clients) {
        try {
          client.terminate();
        } catch {
          // 切断済みでも落とさない
        }
      }
      await closeWithTimeout((done) => {
        wss.close(() => done());
      }, APP_CONFIG.overlayCloseTimeoutMs);
    }

    if (server) {
      await closeWithTimeout(
        (done) => {
          server.close(() => done());
        },
        APP_CONFIG.overlayCloseTimeoutMs,
        () => {
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
        },
      );
    }
  }

  private cleanupAudio(): void {
    const now = Date.now();
    for (const [id, entry] of this.audio) {
      if (entry.expiresAt <= now) {
        this.audio.delete(id);
      }
    }
  }

  private evictAudio(): void {
    while (this.audio.size >= this.maxAudioEntries) {
      const oldest = this.audio.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.audio.delete(oldest);
    }
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    try {
      const hostHeader = req.headers.host ?? `${this.host}`;
      const url = new URL(req.url ?? '/', `http://${hostHeader}`);

      if (url.pathname === '/overlay') {
        res.writeHead(302, { Location: `/overlay/${url.search}` });
        res.end();
        return;
      }

      if (url.pathname === '/overlay/') {
        this.serveFile(path.join(this.overlayDir, 'index.html'), res);
        return;
      }

      if (url.pathname === '/overlay/alerts') {
        res.writeHead(302, { Location: `/overlay/alerts/${url.search}` });
        res.end();
        return;
      }

      if (url.pathname === '/overlay/alerts/') {
        this.serveFile(path.join(this.overlayDir, 'alerts.html'), res);
        return;
      }

      if (url.pathname === '/overlay/ranking') {
        res.writeHead(302, { Location: `/overlay/ranking/${url.search}` });
        res.end();
        return;
      }

      if (url.pathname === '/overlay/ranking/') {
        this.serveFile(path.join(this.overlayDir, 'ranking.html'), res);
        return;
      }

      if (url.pathname === '/overlay/likes' || url.pathname === '/overlay/likes/') {
        res.writeHead(302, { Location: `/overlay/ranking/${url.search}` });
        res.end();
        return;
      }

      const boardMatch = /^\/overlay\/board\/([a-zA-Z0-9_-]+)\/?$/.exec(url.pathname);
      if (boardMatch) {
        if (!url.pathname.endsWith('/')) {
          res.writeHead(302, { Location: `/overlay/board/${boardMatch[1]}/${url.search}` });
          res.end();
          return;
        }
        this.serveFile(path.join(this.overlayDir, 'board.html'), res);
        return;
      }

      if (url.pathname === '/overlay.js' || url.pathname === '/overlay.css') {
        this.serveFile(path.join(this.overlayDir, path.basename(url.pathname)), res);
        return;
      }

      if (url.pathname.startsWith('/overlay/')) {
        const relative = url.pathname.slice('/overlay/'.length);
        if (relative === 'ws') {
          return;
        }
        if (relative === 'alerts' || relative === 'alerts/') {
          this.serveFile(path.join(this.overlayDir, 'alerts.html'), res);
          return;
        }
        if (relative === 'ranking' || relative === 'ranking/') {
          this.serveFile(path.join(this.overlayDir, 'ranking.html'), res);
          return;
        }
        if (relative === 'likes' || relative === 'likes/') {
          res.writeHead(302, { Location: `/overlay/ranking/${url.search}` });
          res.end();
          return;
        }
        const safe = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
        this.serveFile(path.join(this.overlayDir, safe), res);
        return;
      }

      if (url.pathname === '/media/gift') {
        await this.serveGiftImage(url.searchParams.get('u') ?? '', res);
        return;
      }

      if (url.pathname.startsWith('/media/alerts/')) {
        const name = decodeURIComponent(url.pathname.slice('/media/alerts/'.length));
        const full = alertMediaFilePath(name);
        if (!full || !fs.existsSync(full)) {
          res.writeHead(404);
          res.end();
          return;
        }
        this.serveAlertMediaFile(full, res);
        return;
      }

      if (url.pathname.startsWith('/tts/')) {
        const id = url.pathname.slice('/tts/'.length).replace(/\.wav$/i, '');
        const entry = this.audio.get(id);
        if (!entry || entry.expiresAt <= Date.now()) {
          this.audio.delete(id);
          res.writeHead(404);
          res.end();
          return;
        }
        entry.expiresAt = Date.now() + this.audioTtlMs;
        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-store',
          'Content-Length': entry.buffer.length,
        });
        res.end(entry.buffer);
        return;
      }

      if (url.pathname.startsWith('/sounds/')) {
        const name = decodeURIComponent(url.pathname.slice('/sounds/'.length));
        const full = soundFilePath(name);
        if (!full || !fs.existsSync(full)) {
          res.writeHead(404);
          res.end();
          return;
        }
        this.serveSoundFile(full, res);
        return;
      }

      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ok');
        return;
      }

      res.writeHead(404);
      res.end();
    } catch (error) {
      logger.error(`オーバーレイHTTPの処理に失敗しました: ${getErrorMessage(error)}`);
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end();
    }
  }

  private async serveGiftImage(
    imageUrl: string,
    res: http.ServerResponse,
  ): Promise<void> {
    if (!isAllowedGiftImageUrl(imageUrl)) {
      res.writeHead(404);
      res.end();
      return;
    }

    const cached = this.giftImages.get(imageUrl);
    if (cached) {
      res.writeHead(200, {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=300',
        'Content-Length': cached.buffer.length,
      });
      res.end(cached.buffer);
      return;
    }

    const fetched = await fetchAllowedGiftImage(imageUrl);
    if (!fetched) {
      res.writeHead(404);
      res.end();
      return;
    }

    this.giftImages.set(imageUrl, fetched.buffer, fetched.contentType);
    res.writeHead(200, {
      'Content-Type': fetched.contentType,
      'Cache-Control': 'public, max-age=300',
      'Content-Length': fetched.buffer.length,
    });
    res.end(fetched.buffer);
  }

  private serveSoundFile(filePath: string, res: http.ServerResponse): void {
    this.serveDataFile(filePath, getSoundsDir(), res, '効果音ファイルの読み込みに失敗しました');
  }

  private serveAlertMediaFile(filePath: string, res: http.ServerResponse): void {
    this.serveDataFile(
      filePath,
      getAlertMediaDir(),
      res,
      'アラート画像の読み込みに失敗しました',
    );
  }

  private serveDataFile(
    filePath: string,
    rootDir: string,
    res: http.ServerResponse,
    errorLabel: string,
  ): void {
    const resolved = path.resolve(filePath);
    const root = path.resolve(rootDir);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    const stream = fs.createReadStream(resolved);
    stream.on('error', (error) => {
      logger.error(`${errorLabel}: ${getErrorMessage(error)}`);
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end();
    });
    stream.pipe(res);
  }

  private serveFile(filePath: string, res: http.ServerResponse): void {
    const resolved = path.resolve(filePath);
    const root = path.resolve(this.overlayDir);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', (error) => {
      logger.error(`オーバーレイファイルの読み込みに失敗しました: ${getErrorMessage(error)}`);
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end();
    });
    stream.pipe(res);
  }
}

function listenHttp(server: http.Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.listen(port, host, onListening);
  });
}
