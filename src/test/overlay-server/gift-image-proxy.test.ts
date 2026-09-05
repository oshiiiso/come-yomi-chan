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
  assert.equal(overlayGiftImagePath('https://evil.example/x.png'), '');
});

test('許可していないURLは取得しない', async () => {
  const result = await fetchAllowedGiftImage('https://evil.example/x.png', async () => {
    throw new Error('should not fetch');
  });
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
