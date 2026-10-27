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
	assert.equal(japaneseNameForGift('Love you', 1), 'Love you');
	assert.equal(japaneseNameForGift('Love you', 199), '愛してる');
	assert.equal(japaneseNameForGift("Cupid's Bow", 99), 'キューピッドの矢');
	assert.equal(japaneseNameForGift('Cupid’s Bow', 99), 'キューピッドの矢');
	assert.equal(japaneseNameForGift('Love you so much', 1), '大好き');
	assert.equal(japaneseNameForGift('Ao Oni', 20), '青鬼');
	assert.equal(japaneseNameForGift('Ao Oni', 900), 'ランダム青鬼');
	assert.equal(japaneseNameForGift('Masquerade', 149), 'ミステリーマスク');
	assert.equal(japaneseNameForGift('Masquerade', 19999), 'Masquerade');
	assert.equal(japaneseNameForGift('Party Bus', 2999), 'パーティーバス');
	assert.equal(japaneseNameForGift('Funky Hatter', 900), 'ファンキーハッター');
	assert.equal(japaneseNameForGift("Rosie's Concert", 399), 'ロージーのサックス');
	assert.equal(japaneseNameForGift('Hi! Rosie!', 299), 'ロージーのスタイル');
	assert.equal(japaneseNameForGift('Enjoy Music', 1), 'メロディポップ');
	assert.equal(japaneseNameForGift('Nice to meet you', 1), '初見です');
	assert.equal(japaneseNameForGift('Nice to meet you', 5), 'Nice to meet you');
	assert.equal(japaneseNameForGift('Heart', 1), 'ハート');
	assert.equal(japaneseNameForGift('Heart', 10), 'ハート');
	assert.equal(japaneseNameForGift('Heart', 25), 'ハート');
	assert.equal(japaneseNameForGift('Heart', 200), 'Heart');
	assert.equal(japaneseNameForGift('New Year Protection', 5), 'おまもり');
	assert.equal(japaneseNameForGift('Level-up Sparks', 99), 'ファンケーキ');
	assert.equal(japaneseNameForGift('Boxing Gloves', 299), '進撃グローブ');
	assert.equal(japaneseNameForGift('Boxing Gloves', 1999), 'ボクシンググローブ');
	assert.equal(japaneseNameForGift("Galaxy's Bestest", 300), 'きゅんジェット');
	assert.equal(japaneseNameForGift('Dream Team', 299), '団結');
	assert.equal(japaneseNameForGift('Autumn Leaves', 500), '紅葉');
	assert.equal(japaneseNameForGift('Forever Rosa', 399), '永遠のバラ');
	assert.equal(japaneseNameForGift('Autumn Picnic', 1300), '秋のピクニック');
	assert.equal(japaneseNameForGift('Ice Cream Truck', 2988), 'アイスクリームトラック');
	assert.equal(japaneseNameForGift('Devoted Heart', 5999), 'ハートの絆');
	assert.equal(japaneseNameForGift('Balloon Crown', 149), 'ハートの風船');
	assert.equal(japaneseNameForGift('Marked with Love', 349), 'カラフルな軌跡');
	assert.equal(japaneseNameForGift('Join Butterflies', 600), '輝く翼');
	assert.equal(japaneseNameForGift('Future City', 6000), '未来からの抱擁');
	assert.equal(japaneseNameForGift('Groove Straw', 450), 'グルーヴハット');
	assert.equal(japaneseNameForGift('Talking Heartbeat', 199), '思いを伝えるビート');
	assert.equal(japaneseNameForGift('Spin Seal', 349), 'DJアザラシ');
	assert.equal(japaneseNameForGift('New Year Protection', 1), 'New Year Protection');
	assert.equal(japaneseNameForGift('Midsummer Hair', 249), '女神の花冠');
  assert.equal(japaneseNameForGift('Love you so much', 199), 'Love you so much');
  assert.equal(japaneseNameForGift('Journey Pass', 10), 'ジャーニーバス');
  assert.equal(japaneseNameForGift('Tiny Diny Mic', 5), '一曲どうぞ');
  assert.equal(japaneseNameForGift('Premium Shuttle', 20000), 'プレミアムロケット');
  assert.equal(japaneseNameForGift('Music Bubbles', 100), '音色のしずく');
  assert.equal(japaneseNameForGift('Music Bubbles', 249), 'シャボン玉のヘッドホン');
  assert.equal(japaneseNameForGift('VR Goggles', 500), 'タイムゴーグル');
  assert.equal(japaneseNameForGift('Heart It Out', 500), 'マイクに想いをのせよう');
  assert.equal(japaneseNameForGift('Autumn Dog Camp', 500), '紅葉キャンプ');
  assert.equal(japaneseNameForGift('Pinch Face', 249), '顔をつねる');
  assert.equal(japaneseNameForGift('Vocal Bear', 399), 'マイクベア');
  assert.equal(japaneseNameForGift('Autumn Heart', 1), '秋のハート');
  assert.equal(japaneseNameForGift("You're awesome", 1), '素晴らしい');
  assert.equal(japaneseNameForGift('Shaved ice', 10), 'かき氷');
  assert.equal(japaneseNameForGift('Ice Lolly', 10), 'アイスバー');
  assert.equal(japaneseNameForGift('Travel', 10), 'ジャーニーパス');
  assert.equal(japaneseNameForGift('Hand Heart', 100), 'ハンドハート');
  assert.equal(japaneseNameForGift('Castle', 20000), 'キャッスル');
  assert.equal(japaneseNameForGift('Cruise Ship', 20000), 'クルーズ船');
  assert.equal(japaneseNameForGift('Suprised Fish', 1), 'びっくりした魚');
  assert.equal(japaneseNameForGift('Surprised Fish', 1), 'びっくりした魚');
  assert.equal(japaneseNameForGift('Udon-nou', 10), 'うどん脳');
  assert.equal(japaneseNameForGift('Udon-nou', 1), 'Udon-nou');
  assert.equal(japaneseNameForGift('Fukkachan', 10), 'ふっかちゃん');
  assert.equal(japaneseNameForGift('Nebaarukun', 10), 'ねば〜る君');
  assert.equal(japaneseNameForGift('Paper Crane', 99), '折り鶴');
  assert.equal(japaneseNameForGift('Paper Crane', 10), 'Paper Crane');
  assert.equal(japaneseNameForGift('Leon and Lion', 34000), 'レオンとライオン');
  assert.equal(japaneseNameForGift('Leon and Lion', 1), 'Leon and Lion');
  assert.equal(japaneseNameForGift('Phoenix', 25999), 'フェニックス');
  assert.equal(japaneseNameForGift('Rust vs World', 18999), '眠れる戦士 vs 世界');
  assert.equal(japaneseNameForGift('Party On&On', 15000), 'パーティーは続く');
  assert.equal(japaneseNameForGift('Under Control', 1500), 'すべてOK');
  assert.equal(japaneseNameForGift('Friendship Necklace', 10), '友情ネックレス');
  assert.equal(japaneseNameForGift('Friendship Necklace', 1), 'Friendship Necklace');
  assert.equal(japaneseNameForGift('Future Journey', 15000), '未来への旅');
  assert.equal(japaneseNameForGift('Baby Dragon', 2000), 'ベビードラゴン');
  assert.equal(japaneseNameForGift('Baby Dragon', 10), 'Baby Dragon');
  assert.equal(japaneseNameForGift('DJ Set', 399), 'DJセット');
  assert.equal(japaneseNameForGift('DJ Set', 20), 'ビートドロップ');
  assert.equal(japaneseNameForGift("Adam's Dream", 25999), 'アダムの夢');
  assert.equal(japaneseNameForGift('You’re Amazing', 500), 'すばらしい！');
  assert.equal(japaneseNameForGift('Travel with You', 999), 'travel with me');
  assert.equal(japaneseNameForGift('Super Popular', 9), 'スーパー人気');
  assert.equal(japaneseNameForGift('Level Ship', 1500), 'レベルシップ');
  assert.equal(japaneseNameForGift('Animal Band', 2500), 'アニマルバンド');
  assert.equal(japaneseNameForGift('Surfing Penguin', 249), '波乗りペンギン');
  assert.equal(japaneseNameForGift('Surfing Penguin', 10), 'Surfing Penguin');
  assert.equal(japaneseNameForGift('Fox Legend', 1800), '尻尾が9本あるキツネ');
  assert.equal(japaneseNameForGift('Candy Bouquet', 349), 'キャンディーのブーケ');
  assert.equal(japaneseNameForGift('TikTok Stars', 39999), 'TikTok Stars');
  assert.equal(japaneseNameForGift('Cute Cat', 5), 'ニャオ');
  assert.equal(japaneseNameForGift('Seriously', 5), '本気');
  assert.equal(japaneseNameForGift('Go Popular', 1), '人気アップ');
  assert.equal(japaneseNameForGift('Go Popular', 9), 'Go Popular');
  assert.equal(japaneseNameForGift('Popular Vote', 1), '人気UP');
  assert.equal(japaneseNameForGift('Popular Vote', 9), 'Popular Vote');
  assert.equal(japaneseNameForGift('Sent シーソ猫カップ', 1), 'シーソ猫カップ');
  assert.equal(japaneseNameForGift('Sent Rose', 1), 'バラ');
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

test('ユーザーが変えた名前は辞書で戻さない', () => {
  const gifts = applyKnownJapaneseGiftNames([
    { id: '1', name: 'Rose', diamondCount: 1, sourceName: 'バラ' },
  ]);
  assert.equal(gifts[0].name, 'Rose');
  assert.equal(gifts[0].sourceName, 'バラ');
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

test('重複まとめでもユーザーが変えた名前を残す', () => {
  const icon =
    'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/cccccccccccccccccccccccccccccccc~tplv-obj.png';
  const gifts = dedupeAndSortCatalogGifts([
    { id: '100', name: 'バラ', imageUrl: icon, diamondCount: 1 },
    { id: '200', name: 'Flower', imageUrl: icon, diamondCount: 1, sourceName: 'バラ' },
  ]);
  assert.equal(gifts.length, 1);
  assert.equal(gifts[0].name, 'Flower');
  assert.equal(gifts[0].sourceName, 'バラ');
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
  assert.ok(seed.some((gift) => gift.id === '15564' && gift.name === 'びっくりした魚' && gift.diamondCount === 1));
  assert.ok(seed.some((gift) => gift.id === '12898' && gift.name === 'うどん脳' && gift.diamondCount === 10));
  assert.ok(seed.some((gift) => gift.id === '13864' && gift.name === 'ふっかちゃん' && gift.diamondCount === 10));
  assert.equal(seed.some((gift) => gift.name === 'Love you so much'), false);
  assert.ok(seed.some((gift) => gift.id === '6247' && gift.name === 'ハート' && gift.diamondCount === 1));
  assert.ok(seed.some((gift) => gift.id === '14113' && gift.name === 'ラブレター' && gift.diamondCount === 1));
  assert.ok(seed.some((gift) => gift.id === '6090' && gift.name === '花火' && gift.diamondCount === 1088));
  const droppedFromInitial = new Set([
    '5333',
    '7036',
    '134531',
    '1272044',
    '12877',
    '15318',
    '1189599',
    '158501',
    '62837',
    '5282',
    '5740',
    '5738',
    '756924',
    '7963',
    '16069',
    '170600',
  ]);
  assert.equal(seed.some((gift) => droppedFromInitial.has(gift.id)), false);
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
