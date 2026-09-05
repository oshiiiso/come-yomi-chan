import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import net from 'node:net';
import path from 'node:path';
import { WebSocket } from 'ws';
import { OverlayPayload } from '../../shared/types';
import { isPreviewOverlayRequest, OverlayServer } from '../../overlay-server/overlay-server';

const overlayDir = path.join(process.cwd(), 'ui', 'overlay');
const server = new OverlayServer('127.0.0.1', overlayDir, 30_000);

async function fetchPath(
  pathname: string,
  redirect: 'manual' | 'follow' | 'error' = 'manual',
): Promise<Response> {
  return fetch(`http://127.0.0.1:${server.getPort()}${pathname}`, { redirect });
}

function samplePayload(displayText: string): OverlayPayload {
  return {
    type: 'comment',
    user: {
      uniqueId: 'test',
      nickname: 'テスト',
      avatarUrl: '',
      isFanClub: false,
      fanClubStatus: 0,
      isSuperFan: false,
      fanClubLevel: 0,
      fanClubName: '',
      isModerator: false,
      isAnchor: false,
    },
    displayText,
    giftImageUrl: '',
    audioUrl: null,
    receivedAt: new Date().toISOString(),
  };
}

before(async () => {
  await server.listen(0);
});

after(async () => {
  await server.close();
});

test('/overlay は末尾スラッシュへリダイレクトする', async () => {
  const response = await fetchPath('/overlay?preview=1');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/overlay/?preview=1');
});

test('/overlay/ はスクリプトを絶対パスで含む', async () => {
  const response = await fetchPath('/overlay/', 'follow');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /src="\/overlay\/overlay\.js(?:\?[^"]*)?"/);
  assert.match(html, /href="\/overlay\/overlay\.css"/);
  assert.match(html, /id="pin"/);
  assert.match(html, /id="chat"/);
});

test('オーバーレイの JS と CSS を返す', async () => {
  const script = await fetchPath('/overlay/overlay.js', 'follow');
  const fallback = await fetchPath('/overlay.js', 'follow');
  const css = await fetchPath('/overlay/overlay.css', 'follow');
  assert.equal(script.status, 200);
  assert.equal(fallback.status, 200);
  assert.equal(css.status, 200);
  const body = await script.text();
  assert.match(body, /function connect/);
});

test('イベントを WebSocket で配信する', async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${server.getPort()}/overlay/ws`);
  const messages: unknown[] = [];

  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });

  socket.on('message', (raw) => {
    messages.push(JSON.parse(String(raw)));
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  server.broadcast(samplePayload('テストコメントです'));
  await new Promise((resolve) => setTimeout(resolve, 50));

  socket.close();

  const event = messages.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      item.kind === 'event',
  ) as { kind: string; payload: OverlayPayload } | undefined;

  assert.ok(event);
  assert.equal(event.payload.displayText, 'テストコメントです');
});

test('クリアは WebSocket でコメント列を空にする合図を送る', async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${server.getPort()}/overlay/ws`);
  const messages: unknown[] = [];

  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });

  socket.on('message', (raw) => {
    messages.push(JSON.parse(String(raw)));
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  server.clearChat();
  await new Promise((resolve) => setTimeout(resolve, 50));
  socket.close();

  const cleared = messages.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      item.kind === 'clear',
  );
  assert.ok(cleared);
});

test('初期通知に固定枠の設定を含む', async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${server.getPort()}/overlay/ws`);
  const messages: unknown[] = [];
  socket.on('message', (raw) => {
    messages.push(JSON.parse(String(raw)));
  });

  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  socket.close();

  const hello = messages.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      item.kind === 'hello',
  ) as { pin?: { enabled?: boolean; displayMs?: number; hold?: boolean; previewPinned?: boolean; types?: { gift?: boolean } } } | undefined;
  assert.ok(hello);
  assert.equal(hello.pin?.enabled, true);
  assert.equal(hello.pin?.displayMs, 4000);
  assert.equal(hello.pin?.hold, false);
  assert.equal(hello.pin?.previewPinned, true);
  assert.equal(hello.pin?.types?.gift, true);
});

test('固定枠クリアは WebSocket で合図を送る', async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${server.getPort()}/overlay/ws`);
  const messages: unknown[] = [];

  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });

  socket.on('message', (raw) => {
    messages.push(JSON.parse(String(raw)));
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  server.clearPin();
  await new Promise((resolve) => setTimeout(resolve, 50));
  socket.close();

  const cleared = messages.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      item.kind === 'pin-control' &&
      'action' in item &&
      item.action === 'clear',
  );
  assert.ok(cleared);
});

test('高いギフトのチャイム合図を送る', async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${server.getPort()}/overlay/ws`);
  const messages: unknown[] = [];

  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });

  socket.on('message', (raw) => {
    messages.push(JSON.parse(String(raw)));
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  server.broadcastChime();
  await new Promise((resolve) => setTimeout(resolve, 50));
  socket.close();

  const chime = messages.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      item.kind === 'chime',
  );
  assert.ok(chime);
});

test('読み上げスキップと待ちクリアの合図を送る', async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${server.getPort()}/overlay/ws`);
  const messages: unknown[] = [];

  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });

  socket.on('message', (raw) => {
    messages.push(JSON.parse(String(raw)));
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  server.skipPlayback();
  server.clearPendingAudio();
  await new Promise((resolve) => setTimeout(resolve, 50));
  socket.close();

  const skip = messages.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      item.kind === 'audio-control' &&
      'action' in item &&
      item.action === 'skip',
  );
  const pending = messages.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      item.kind === 'audio-control' &&
      'action' in item &&
      item.action === 'clear-pending',
  );
  assert.ok(skip);
  assert.ok(pending);
});

test('保存した wav を HTTP で返す', async () => {
  const id = server.storeAudio(Buffer.from('RIFFTEST'));
  const response = await fetchPath(`/tts/${id}.wav`, 'follow');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'audio/wav');
  const body = Buffer.from(await response.arrayBuffer());
  assert.equal(body.toString(), 'RIFFTEST');
});

test('期限切れの wav は 404 になる', async () => {
  const shortLived = new OverlayServer('127.0.0.1', overlayDir, 1);
  await shortLived.listen(0);
  try {
    const id = shortLived.storeAudio(Buffer.from('RIFFTEST'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    const response = await fetch(
      `http://127.0.0.1:${shortLived.getPort()}/tts/${id}.wav`,
    );
    assert.equal(response.status, 404);
  } finally {
    await shortLived.close();
  }
});

test('テスト用ギフトアイコンを返す', async () => {
  const response = await fetchPath('/overlay/gift-rose.svg', 'follow');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /svg/);
});

test('見た目プレビュー用の仮アイコンを返す', async () => {
  const response = await fetchPath('/overlay/preview-avatar.svg', 'follow');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /svg/);
});

test('見た目プレビューの接続は本番クライアントに数えない', async () => {
  assert.equal(isPreviewOverlayRequest('/overlay/ws?preview=1'), true);
  assert.equal(isPreviewOverlayRequest('/overlay/ws'), false);

  const isolated = new OverlayServer('127.0.0.1', overlayDir, 30_000);
  await isolated.listen(0);
  const preview = new WebSocket(`ws://127.0.0.1:${isolated.getPort()}/overlay/ws?preview=1`);
  const live = new WebSocket(`ws://127.0.0.1:${isolated.getPort()}/overlay/ws`);
  try {
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        preview.once('open', () => resolve());
        preview.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        live.once('open', () => resolve());
        live.once('error', reject);
      }),
    ]);
    assert.equal(isolated.clientCount(), 1);
  } finally {
    preview.close();
    live.close();
    await isolated.close();
  }
});

test('ギフト画像プロキシは許可していないURLを返さない', async () => {
  const response = await fetchPath(
    `/media/gift?u=${encodeURIComponent('https://evil.example/x.png')}`,
  );
  assert.equal(response.status, 404);
});

test('同じポートへの再listenは今の待ち受けを使う', async () => {
  const port = server.getPort();
  await server.listen(port);
  assert.equal(server.getPort(), port);
  const health = await fetchPath('/health', 'follow');
  assert.equal(health.status, 200);
});

test('ポート変更に失敗しても既存の待ち受けは残る', async () => {
  const original = server.getPort();
  const blocker = net.createServer();
  await new Promise<void>((resolve, reject) => {
    blocker.once('error', reject);
    blocker.listen(0, '127.0.0.1', () => resolve());
  });
  const busyAddress = blocker.address();
  assert.ok(busyAddress && typeof busyAddress !== 'string');

  await assert.rejects(() => server.listen(busyAddress.port));
  assert.equal(server.getPort(), original);

  const health = await fetchPath('/health', 'follow');
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');

  await new Promise<void>((resolve) => blocker.close(() => resolve()));
});
