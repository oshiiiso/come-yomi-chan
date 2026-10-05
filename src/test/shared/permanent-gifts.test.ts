import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyKnownJapaneseGiftNames,
  compareCatalogGiftOrder,
  japaneseNameForGift,
  matchesPermanentEnglishName,
  preferPermanentCatalogGifts,
} from '../../shared/permanent-gift-names';
import {
  bundledPermanentGifts,
  dedupeAndSortCatalogGifts,
  resolveCachedTestGifts,
} from '../../shared/permanent-gifts';
import {
  catalogGiftHasIcon,
  catalogGiftsWithIcons,
} from '../../tiktok/gift-fields';

test('既知の英名はダイヤ一致のときだけ日本語に変換する', () => {
  assert.equal(japaneseNameForGift('Rose', 1), 'バラ');
  assert.equal(japaneseNameForGift('Rose', 99), 'Rose');
  assert.equal(japaneseNameForGift('Whale Diving', 2150), 'クジラのダイビング');
  assert.equal(japaneseNameForGift('Coffee', 1), 'Coffee');
  assert.equal(japaneseNameForGift('Coffee', 499), 'コーヒー');
  assert.equal(japaneseNameForGift('Unknown Gift', 1), 'Unknown Gift');
  assert.equal(japaneseNameForGift('バラ'), 'バラ');
  assert.equal(japaneseNameForGift('Heart Me', 1), 'ハートミー');
  assert.equal(japaneseNameForGift('Heart Me', 10), 'Heart Me');
  assert.equal(japaneseNameForGift('Cat Paws', 1), '猫の足');
  assert.equal(japaneseNameForGift('Ice Cream Cone', 1), 'ソフトクリーム');
  assert.equal(japaneseNameForGift('Love you', 1), '大好き');
  assert.equal(japaneseNameForGift('Autumn Heart', 1), '秋のハート');
  assert.equal(japaneseNameForGift("You're awesome", 1), '素晴らしい');
  assert.equal(japaneseNameForGift('Shaved ice', 10), 'かき氷');
  assert.equal(japaneseNameForGift('Ice Lolly', 10), 'アイスバー');
  assert.equal(japaneseNameForGift('Travel', 10), 'ジャーニーパス');
  assert.equal(japaneseNameForGift('Hand Heart', 100), 'ハンドハート');
  assert.equal(japaneseNameForGift('Castle', 20000), 'キャッスル');
  assert.equal(japaneseNameForGift('Cruise Ship', 20000), 'クルーズ船');
});

test('常設英名の判定は日本語名では誤爆しない', () => {
  assert.equal(matchesPermanentEnglishName('Rose', 1), true);
  assert.equal(matchesPermanentEnglishName('コーヒー', 499), false);
  assert.equal(matchesPermanentEnglishName('Coffee', 1), false);
  assert.equal(matchesPermanentEnglishName('Coffee', 499), true);
});

test('一覧へ既知の日本語名を当てる', () => {
  const gifts = applyKnownJapaneseGiftNames([
    { id: '1', name: 'Rose', diamondCount: 1 },
    { id: '2', name: 'Rose', diamondCount: 50 },
    { id: '3', name: 'Mystery', diamondCount: 1 },
  ]);
  assert.equal(gifts[0].name, 'バラ');
  assert.equal(gifts[1].name, 'Rose');
  assert.equal(gifts[2].name, 'Mystery');
});

test('常設英名を優先して上限内に残す', () => {
  const gifts = preferPermanentCatalogGifts(
    [
      { id: '1', name: 'Event A', diamondCount: 1 },
      { id: '2', name: 'Rose', diamondCount: 1 },
      { id: '3', name: 'Event B', diamondCount: 1 },
      { id: '4', name: 'Lion', diamondCount: 29999 },
      { id: '5', name: 'Coffee', diamondCount: 1 },
    ],
    3,
  );
  assert.deepEqual(
    gifts.map((gift) => gift.name),
    ['バラ', 'Coffee', 'ライオン'],
  );
});

test('同名・同ダイヤや英日・同アイコンは1件にまとめる', () => {
  const icon =
    'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa~tplv-obj.png';
  const gifts = dedupeAndSortCatalogGifts([
    { id: '200', name: 'ダイヤモンドツリー', imageUrl: icon, diamondCount: 1088 },
    { id: '100', name: 'Diamond Tree', imageUrl: icon, diamondCount: 1088 },
    { id: '300', name: 'ダイヤモンドツリー', imageUrl: icon, diamondCount: 1088 },
    { id: '9', name: 'Zebra', imageUrl: '', diamondCount: 1 },
    { id: '8', name: 'あひる', imageUrl: '', diamondCount: 1 },
  ]);
  assert.equal(gifts.length, 3);
  assert.equal(gifts[0].name, 'あひる');
  assert.equal(gifts[1].name, 'Zebra');
  assert.equal(gifts[2].name, 'ダイヤモンドツリー');
  assert.equal(gifts[2].id, '100');
});

test('記事由来のハンドハート表記にする', () => {
  assert.equal(japaneseNameForGift('Hand Hearts', 100), 'ハンドハート');
});

test('重複時は個別設定がある ID を残す', () => {
  const icon =
    'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb~tplv-obj.png';
  const gifts = dedupeAndSortCatalogGifts(
    [
      { id: '100', name: 'Diamond Tree', imageUrl: icon, diamondCount: 1088 },
      { id: '200', name: 'ダイヤモンドツリー', imageUrl: icon, diamondCount: 1088 },
    ],
    { preferIds: ['200'] },
  );
  assert.equal(gifts.length, 1);
  assert.equal(gifts[0].id, '200');
  assert.equal(gifts[0].name, 'ダイヤモンドツリー');
});

test('並びは安いダイヤ、日本語、英語の順', () => {
  assert.ok(
    compareCatalogGiftOrder({ name: 'バラ', diamondCount: 1 }, { name: 'バラ', diamondCount: 10 }) <
      0,
  );
  assert.ok(
    compareCatalogGiftOrder({ name: 'あ', diamondCount: 1 }, { name: 'Apple', diamondCount: 1 }) < 0,
  );
  assert.ok(
    compareCatalogGiftOrder({ name: 'Banana', diamondCount: 1 }, { name: 'Apple', diamondCount: 1 }) >
      0,
  );
});

test('プレースホルダや空のアイコンは一覧から除外する', () => {
  assert.equal(catalogGiftHasIcon({ imageUrl: '' }), false);
  assert.equal(catalogGiftHasIcon({ imageUrl: 'https://tiktokcdn.com' }), false);
  assert.equal(
    catalogGiftHasIcon({
      imageUrl:
        'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.png',
    }),
    true,
  );
  assert.equal(
    catalogGiftsWithIcons([
      {
        id: '1',
        name: 'バラ',
        imageUrl: 'https://tiktokcdn.com',
        diamondCount: 1,
      },
      {
        id: '2',
        name: 'GG',
        imageUrl:
          'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/3f02fa9594bd1495ff4e8aa5ae265eef~tplv-obj.png',
        diamondCount: 1,
      },
    ]).length,
    1,
  );
});

test('保存済みが少なくても同梱 seed を土台に足す', () => {
  const seed = bundledPermanentGifts();
  assert.ok(seed.length > 2);
  const names = seed.map((gift) => `${gift.diamondCount}|${gift.name}`);
  assert.equal(names.length, new Set(names).size);
  const merged = resolveCachedTestGifts([
    {
      id: '7934',
      name: 'Heart Me',
      imageUrl: 'https://p16-webcast.tiktokcdn.com/img/heart.png',
      diamondCount: 1,
    },
    {
      id: '13538',
      name: 'New Year Protect',
      imageUrl: 'https://p16-webcast.tiktokcdn.com/img/nye.png',
      diamondCount: 1,
    },
  ]);
  assert.ok(merged.length >= seed.length);
  assert.ok(merged.some((gift) => gift.id === '7934'));
  assert.ok(merged.some((gift) => gift.id === '6064'));
});
