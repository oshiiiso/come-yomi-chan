import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstImageUrl, giftIdFromEvent, giftImageUrlFromEvent, giftNameFromEvent, catalogGiftsFromList, normalizeCatalogGifts, mergeCatalogGift, mergeCatalogGiftsFromFetch, catalogGiftNameById, resolveGiftNameWithCatalog } from '../../tiktok/gift-fields';

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

test('ギフトIDを取る', () => {
  assert.equal(giftIdFromEvent({ giftId: '5655' }), '5655');
  assert.equal(giftIdFromEvent({ gift: { id: 12 } }), '12');
  assert.equal(giftIdFromEvent({ giftDetails: { gift_id: '99' } }), '99');
  assert.equal(giftIdFromEvent({}), '');
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

test('Eulerカタログ形式の giftId / giftName も取る', () => {
  const gifts = catalogGiftsFromList({
    gifts: [
      {
        giftId: 5655,
        giftName: 'Rose',
        diamondCount: 1,
        imageUri: 'https://p16-webcast.tiktokcdn.com/rose.png',
      },
    ],
  });
  assert.equal(gifts.length, 1);
  assert.equal(gifts[0].id, '5655');
  assert.equal(gifts[0].name, 'Rose');
  assert.equal(gifts[0].imageUrl, 'https://p16-webcast.tiktokcdn.com/rose.png');
});

test('gift/list の配列レスポンスも取る', () => {
  const gifts = catalogGiftsFromList([
    { id: 1, name: 'Ice Cream Cone', diamond_count: 1 },
    { id: 2, giftName: 'GG', diamondCount: 99 },
  ]);
  assert.equal(gifts.length, 2);
  assert.equal(gifts[0].name, 'Ice Cream Cone');
  assert.equal(gifts[1].name, 'GG');
});

test('プロトコル相対の画像URLはhttpsにする', () => {
  assert.equal(
    firstImageUrl('//p16-webcast.tiktokcdn.com/rose.png'),
    'https://p16-webcast.tiktokcdn.com/rose.png',
  );
});

test('Eulerカタログの画像URLはTikTok CDNへ寄せる', () => {
  assert.equal(
    firstImageUrl(
      'https://assets.cdn.eulerstream.com/gifts/images/eba3a9bb85c33e017f3648eaf88d7189?fpsig=v1.x',
    ),
    'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.png',
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

test('配信で届いたギフトを一覧へ足す', () => {
  const first = mergeCatalogGift([], {
    id: '1',
    name: 'Rose',
    imageUrl: '',
    diamondCount: 1,
  });
  assert.equal(first.length, 1);
  const same = mergeCatalogGift(first, {
    id: '1',
    name: 'Rose',
    imageUrl: '',
    diamondCount: 1,
  });
  assert.equal(same, first);
  const richer = mergeCatalogGift(first, {
    id: '1',
    name: 'Rose',
    imageUrl: 'https://p16-webcast.tiktokcdn.com/rose.png',
    diamondCount: 1,
  });
  assert.equal(richer.length, 1);
  assert.equal(richer[0].imageUrl, 'https://p16-webcast.tiktokcdn.com/rose.png');
  const keptJa = mergeCatalogGift(
    [{ id: '1', name: 'バラ', imageUrl: '', diamondCount: 1 }],
    { id: '1', name: 'Rose', imageUrl: '', diamondCount: 1 },
  );
  assert.equal(keptJa[0].name, 'バラ');
  const upgradeJa = mergeCatalogGift(
    [{ id: '1', name: 'Rose', imageUrl: '', diamondCount: 1 }],
    { id: '1', name: 'バラ', imageUrl: '', diamondCount: 1 },
  );
  assert.equal(upgradeJa[0].name, 'バラ');
  const preferIncoming = mergeCatalogGift(
    [{ id: '1', name: 'バラ', imageUrl: '', diamondCount: 1 }],
    { id: '1', name: 'Rose', imageUrl: '', diamondCount: 1 },
    { preferIncomingName: true },
  );
  assert.equal(preferIncoming[0].name, 'Rose');
  const two = mergeCatalogGift(richer, {
    id: '2',
    name: 'GG',
    imageUrl: '',
    diamondCount: 100,
  });
  assert.equal(two.length, 2);
  assert.equal(two[0].id, '1');
  assert.equal(two[1].id, '2');
});

test('カタログにあれば日本語名を優先する', () => {
  const catalog = [{ id: '5655', name: 'バラ', imageUrl: '', diamondCount: 1 }];
  assert.equal(catalogGiftNameById(catalog, '5655'), 'バラ');
  assert.equal(catalogGiftNameById(catalog, '9'), '');
  assert.equal(
    resolveGiftNameWithCatalog({ giftId: '5655', gift: { name: 'Rose' } }, catalog),
    'バラ',
  );
  assert.equal(
    resolveGiftNameWithCatalog({ gift: { name: 'Universe' } }, catalog),
    'Universe',
  );
});

test('常設英→日はカタログが無くてもダイヤ一致で直す', () => {
  assert.equal(
    resolveGiftNameWithCatalog(
      { gift: { name: 'Heart Me' }, diamondCount: 1 },
      [],
    ),
    'ハートミー',
  );
  assert.equal(
    resolveGiftNameWithCatalog(
      { gift: { name: 'Heart Me' }, diamondCount: 10 },
      [],
    ),
    'Heart Me',
  );
});

test('配信の日本語名は英語の初期一覧名を上書きする', () => {
  const catalog = [{ id: '5655', name: 'Rose', imageUrl: '', diamondCount: 1 }];
  assert.equal(
    resolveGiftNameWithCatalog({ giftId: '5655', gift: { name: 'バラ' } }, catalog),
    'バラ',
  );
});

test('再取得分は既存一覧へマージし、日本語名を優先する', () => {
  const current = [
    { id: '1', name: '旧バラ', imageUrl: '', diamondCount: 1 },
    { id: 'live', name: '配信だけ', imageUrl: '', diamondCount: 5 },
    { id: '3', name: 'バラ', imageUrl: '', diamondCount: 1 },
  ];
  const fetched = [
    { id: '1', name: 'バラ', imageUrl: 'https://p16-webcast.tiktokcdn.com/rose.png', diamondCount: 1 },
    { id: '2', name: '宇宙', imageUrl: '', diamondCount: 100 },
    { id: '3', name: 'Rose', imageUrl: '', diamondCount: 1 },
  ];
  const merged = mergeCatalogGiftsFromFetch(current, fetched);
  assert.equal(merged.length, 4);
  assert.equal(merged.find((g) => g.id === '1')?.name, 'バラ');
  assert.equal(merged.find((g) => g.id === 'live')?.name, '配信だけ');
  assert.equal(merged.find((g) => g.id === '2')?.name, '宇宙');
  assert.equal(merged.find((g) => g.id === '3')?.name, 'バラ');
});
