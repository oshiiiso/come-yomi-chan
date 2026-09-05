import fs from 'fs';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { APP_CONFIG } from '../shared/app-config';
import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';
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

const logger = getLogger('overlay-server');

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

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
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
  private pin = DEFAULT_OVERLAY_PIN;
  private audioSeq = 0;
  private lastNoClientWarnAt = 0;
  private readonly giftImages = new GiftImageCache();
  private readonly previewClients = new WeakSet<WebSocket>();
  private readonly maxAudioEntries = 40;
  private clientChangeHandler: (() => void) | null = null;

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
  ): void {
    this.chatMaxRows = chatMaxRows;
    this.chatDisplayMs = chatDisplayMs;
    this.customCss = customCss;
    this.look = look;
    this.pin = pin;
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
    this.sendAll({ kind: 'event', payload });
  }

  broadcastAudio(audioUrl: string): void {
    this.warnIfNoClients();
    this.sendAll({ kind: 'audio', audioUrl });
  }

  broadcastChime(): void {
    this.sendAll({ kind: 'chime' });
  }

  clearChat(): void {
    this.sendAll({ kind: 'clear' });
  }

  clearPin(): void {
    this.sendAll({ kind: 'pin-control', action: 'clear' });
  }

  skipPlayback(): void {
    this.sendAll({ kind: 'audio-control', action: 'skip' });
  }

  clearPendingAudio(): void {
    this.sendAll({ kind: 'audio-control', action: 'clear-pending' });
  }

  clientCount(): number {
    if (!this.wss) {
      return 0;
    }
    return [...this.wss.clients].filter(
      (client) => client.readyState === WebSocket.OPEN && !this.previewClients.has(client),
    ).length;
  }

  getPort(): number {
    const port = this.listeningPort();
    if (port == null) {
      throw new Error('オーバーレイサーバーが起動していません');
    }
    return port;
  }

  private broadcastSettings(): void {
    this.sendAll(this.settingsPayload());
  }

  private settingsPayload(): Record<string, unknown> {
    return {
      kind: 'hello',
      chatMaxRows: this.chatMaxRows,
      chatDisplayMs: this.chatDisplayMs,
      customCss: this.customCss,
      look: {
        ...this.look,
        fontCss: overlayFontCss(this.look.fontFamily),
      },
      pin: this.pin,
    };
  }

  private sendAll(message: Record<string, unknown>): void {
    let raw: string;
    try {
      raw = JSON.stringify(message);
    } catch (error) {
      logger.error(`オーバーレイ通知の作成に失敗しました: ${getErrorMessage(error)}`);
      return;
    }

    this.wss?.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) {
        return;
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

      if (url.pathname === '/overlay.js' || url.pathname === '/overlay.css') {
        this.serveFile(path.join(this.overlayDir, path.basename(url.pathname)), res);
        return;
      }

      if (url.pathname.startsWith('/overlay/')) {
        const relative = url.pathname.slice('/overlay/'.length);
        if (relative === 'ws') {
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
