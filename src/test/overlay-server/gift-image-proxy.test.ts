import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fetchAllowedGiftImage,
  GiftImageCache,
  isAllowedGiftImageUrl,
  overlayGiftImagePath,
} from '../../overlay-server/gift-image-proxy';

test('TikTokのCDNだけギフト画像として許可する', () => {
  assert.equal(
    isAllowedGiftImageUrl('https://p16-webcast.tiktokcdn.com/img/rose.png'),
    true,
  );
  assert.equal(isAllowedGiftImageUrl('https://evil.example/rose.png'), false);
  assert.equal(isAllowedGiftImageUrl('http://p16-webcast.tiktokcdn.com/img/rose.png'), false);
});

test('オーバーレイ用パスはローカル画像をそのまま通し、CDNはプロキシにする', () => {
  assert.equal(overlayGiftImagePath('/overlay/gift-rose.svg'), '/overlay/gift-rose.svg');
  assert.equal(
    overlayGiftImagePath('https://p16-webcast.tiktokcdn.com/img/rose.png'),
    `/media/gift?u=${encodeURIComponent('https://p16-webcast.tiktokcdn.com/img/rose.png')}`,
  );
  assert.equal(
    overlayGiftImagePath('http://p16-webcast.tiktokcdn.com/img/rose.png'),
    `/media/gift?u=${encodeURIComponent('https://p16-webcast.tiktokcdn.com/img/rose.png')}`,
  );
  const signed =
    'https://p16-sign-va.tiktokcdn.com/face.jpeg?x-expires=1&x-signature=abc%2Bdef';
  assert.equal(
    overlayGiftImagePath(signed),
    `/media/gift?u=${encodeURIComponent(signed)}`,
  );
  assert.equal(
    overlayGiftImagePath(
      'http://p16-sign-va.tiktokcdn.com/face.jpeg?x-signature=abc%2Bdef',
    ),
    `/media/gift?u=${encodeURIComponent(
      'https://p16-sign-va.tiktokcdn.com/face.jpeg?x-signature=abc%2Bdef',
    )}`,
  );
  assert.equal(overlayGiftImagePath('https://evil.example/x.png'), '');
});

test('許可していないURLは取得しない', async () => {
  const result = await fetchAllowedGiftImage('https://evil.example/x.png', async () => {
    throw new Error('should not fetch');
  });
  assert.equal(result, null);
});

test('Content-Type が octet-stream でも JPEG なら通す', async () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x00, 0x01]);
  const signed =
    'https://p16-webcast.tiktokcdn.com/face.jpg?x-signature=abc%2Bdef';
  let fetchedUrl = '';
  const result = await fetchAllowedGiftImage(
    signed,
    async (url) => {
      fetchedUrl = String(url);
      return {
        ok: true,
        url: signed,
        headers: { get: () => 'application/octet-stream' },
        arrayBuffer: async () => jpeg,
      } as unknown as Response;
    },
  );
  assert.ok(result);
  assert.equal(fetchedUrl, signed);
  assert.equal(result.contentType, 'image/jpeg');
  assert.equal(result.buffer.equals(jpeg), true);
});

test('画像ではない応答は Content-Type が image でも捨てる', async () => {
  const html = Buffer.from('<html>not an image</html>');
  const result = await fetchAllowedGiftImage(
    'https://p16-webcast.tiktokcdn.com/face.jpg',
    async () =>
      ({
        ok: true,
        url: 'https://p16-webcast.tiktokcdn.com/face.jpg',
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => html,
      }) as unknown as Response,
  );
  assert.equal(result, null);
});

test('ギフト画像キャッシュは上限を超えた古い画像を捨てる', () => {
  const cache = new GiftImageCache(2);
  cache.set('a', Buffer.from('a'), 'image/png');
  cache.set('b', Buffer.from('b'), 'image/png');
  cache.set('c', Buffer.from('c'), 'image/png');
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b')?.buffer.toString(), 'b');
  assert.equal(cache.get('c')?.buffer.toString(), 'c');
});
