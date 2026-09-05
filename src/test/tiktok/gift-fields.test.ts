import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstImageUrl, giftImageUrlFromEvent, giftNameFromEvent, catalogGiftsFromList, normalizeCatalogGifts } from '../../tiktok/gift-fields';

test('ギフト画像は urlList から取る', () => {
  assert.equal(
    firstImageUrl({ urlList: ['https://p16-webcast.tiktokcdn.com/rose.png'] }),
    'https://p16-webcast.tiktokcdn.com/rose.png',
  );
  assert.equal(
    firstImageUrl({ url_list: ['https://example.tiktokcdn.com/rose.png'] }),
    'https://example.tiktokcdn.com/rose.png',
  );
});

test('ギフトイベントからアイコンURLと名前を取る', () => {
  const raw = {
    gift: {
      name: 'Rose',
      image: { urlList: ['https://p16-webcast.tiktokcdn.com/img/rose.png'] },
      icon: { urlList: ['https://p16-webcast.tiktokcdn.com/img/rose-icon.png'] },
    },
  };
  assert.equal(
    giftImageUrlFromEvent(raw),
    'https://p16-webcast.tiktokcdn.com/img/rose.png',
  );
  assert.equal(giftNameFromEvent(raw), 'Rose');
});

test('古い giftDetails 形式でも画像を取る', () => {
  const raw = {
    giftDetails: {
      giftName: 'バラ',
      giftImage: { url_list: ['https://p16-webcast.tiktokcdn.com/bara.png'] },
    },
  };
  assert.equal(giftImageUrlFromEvent(raw), 'https://p16-webcast.tiktokcdn.com/bara.png');
  assert.equal(giftNameFromEvent(raw), 'バラ');
});

test('部屋のギフト一覧から名前と画像を取る', () => {
  const gifts = catalogGiftsFromList({
    gifts: [
      {
        id: 2,
        name: 'Universe',
        diamond_count: 100,
        image: { urlList: ['https://p16-webcast.tiktokcdn.com/universe.png'] },
      },
      {
        id: 1,
        name: 'Rose',
        diamond_count: 1,
        icon: { url_list: ['https://p16-webcast.tiktokcdn.com/rose.png'] },
      },
    ],
  });
  assert.equal(gifts.length, 2);
  assert.equal(gifts[0].name, 'Rose');
  assert.equal(gifts[0].diamondCount, 1);
  assert.equal(gifts[0].imageUrl, 'https://p16-webcast.tiktokcdn.com/rose.png');
  assert.equal(gifts[1].name, 'Universe');
});

test('プロトコル相対の画像URLはhttpsにする', () => {
  assert.equal(
    firstImageUrl('//p16-webcast.tiktokcdn.com/rose.png'),
    'https://p16-webcast.tiktokcdn.com/rose.png',
  );
});

test('javascriptスキームは画像URLにしない', () => {
  assert.equal(firstImageUrl('javascript:alert(1)'), '');
  assert.equal(firstImageUrl({ url: 'javascript:alert(1)' }), '');
});

test('保存済みのギフト一覧を復元する', () => {
  const gifts = normalizeCatalogGifts([
    { id: '1', name: 'Rose', imageUrl: 'https://p16-webcast.tiktokcdn.com/rose.png', diamondCount: 1 },
    { id: '', name: 'invalid' },
    { id: '2', name: 'Universe', imageUrl: 'javascript:alert(1)', diamondCount: 100 },
  ]);
  assert.equal(gifts.length, 2);
  assert.equal(gifts[0].name, 'Rose');
  assert.equal(gifts[0].imageUrl, 'https://p16-webcast.tiktokcdn.com/rose.png');
  assert.equal(gifts[1].imageUrl, '');
  assert.equal(normalizeCatalogGifts(null).length, 0);
});

test('名前が無いお楽しみ袋とボックスは種別名にする', () => {
  assert.equal(giftNameFromEvent({ gift: { isRandomGift: true } }), 'お楽しみ袋');
  assert.equal(giftNameFromEvent({ gift: { isBoxGift: true } }), 'ギフトボックス');
});
