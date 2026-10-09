import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAlertSamplePlan,
  buildLikeRankingSample,
  buildOverlaySamplePlan,
} from '../../app/overlay-sample-plan';
import { DEFAULT_CONFIG } from '../../shared/config-store';

test('配信ソースサンプルはコメント候補と固定枠候補を分ける', () => {
  const plan = buildOverlaySamplePlan(DEFAULT_CONFIG, {
    id: 'rose',
    name: 'バラ',
    imageUrl: '/overlay/gift-rose.svg',
    diamondCount: 1,
  });
  assert.ok(plan.chatSamples.length >= 6);
  assert.ok(plan.pinSamples.length >= 2);
  assert.ok(plan.chatSamples.every((row) => row.type === 'comment' || row.displayText.length > 0));
  assert.ok(plan.pinSamples.some((row) => row.type === 'gift'));
});

test('配信ソースサンプルは名前・コメントの長さバリエーションを含む', () => {
  const plan = buildOverlaySamplePlan(DEFAULT_CONFIG, null);
  const comments = plan.chatSamples.filter((row) => row.type === 'comment');
  const nicknames = comments.map((row) => row.user.nickname);
  const bodies = comments.map((row) => row.comment);
  assert.ok(nicknames.some((name) => name.length === 1));
  assert.ok(nicknames.some((name) => name.length >= 20));
  assert.ok(nicknames.some((name) => /[\u{1F300}-\u{1FAFF}]/u.test(name)));
  assert.ok(bodies.some((text) => text.length <= 3));
  assert.ok(bodies.some((text) => text.length >= 40));
});

test('名前を出さない設定はサンプル文言にも効く', () => {
  const hidden = buildOverlaySamplePlan(
    { ...DEFAULT_CONFIG, hideUserName: true },
    null,
  );
  const shown = buildOverlaySamplePlan(
    { ...DEFAULT_CONFIG, hideUserName: false },
    null,
  );
  const hiddenFollow = hidden.pinSamples.find((row) => row.type === 'follow');
  const shownFollow = shown.pinSamples.find((row) => row.type === 'follow');
  assert.ok(hiddenFollow);
  assert.ok(shownFollow);
  assert.notEqual(hiddenFollow.displayText, shownFollow.displayText);
});

test('固定枠サンプルは表示テンプレと差し込み色パーツを持つ', () => {
  const plan = buildOverlaySamplePlan(
    {
      ...DEFAULT_CONFIG,
      giftDisplayTemplate: '{user}さんから{gift}{count}**おまけ**',
      templateAccentColors: {
        ...DEFAULT_CONFIG.templateAccentColors,
        gift: '#112233',
        emphasis: '#445566',
      },
    },
    {
      id: 'rose',
      name: 'バラ',
      imageUrl: '/overlay/gift-rose.svg',
      diamondCount: 1,
    },
  );
  const gift = plan.pinSamples.find((row) => row.type === 'gift');
  assert.ok(gift);
  assert.match(gift.displayText, /バラ/);
  assert.match(gift.displayText, /おまけ/);
  assert.ok(Array.isArray(gift.displayParts));
  assert.ok(gift.displayParts.some((part) => part.kind === 'name'));
  assert.ok(
    gift.displayParts.some(
      (part) => part.kind === 'accent' && part.value === 'バラ' && part.color === '#112233',
    ),
  );
  assert.ok(
    gift.displayParts.some(
      (part) =>
        part.kind === 'accent' && part.value === 'おまけ' && part.color === '#445566',
    ),
  );
});

test('アラートサンプルは同梱テンプレ画像付きで数件返す', () => {
  const samples = buildAlertSamplePlan(DEFAULT_CONFIG, {
    id: 'rose',
    name: 'バラ',
    imageUrl: '/overlay/gift-rose.svg',
    diamondCount: 1,
  });
  assert.ok(samples.length >= 2);
  assert.ok(samples.every((row) => row.imageUrl && row.displayText));
  assert.ok(samples.some((row) => row.type === 'gift'));
  const gift = samples.find((row) => row.type === 'gift');
  assert.equal(gift?.imageUrl, '/overlay/gift-rose.svg');
  assert.ok(samples.some((row) => row.type === 'follow' && row.imageUrl.includes('follow.gif')));
  const plan = buildOverlaySamplePlan(DEFAULT_CONFIG, {
    id: 'rose',
    name: 'バラ',
    imageUrl: '/overlay/gift-rose.svg',
    diamondCount: 1,
  });
  assert.ok(plan.alertSamples.length >= 2);
  assert.equal(plan.alertSamples.find((row) => row.type === 'gift')?.imageUrl, '/overlay/gift-rose.svg');
  const names = samples.map((row) => row.user.nickname);
  assert.ok(names.some((name) => name.length === 1));
  assert.ok(names.some((name) => name.length >= 20));
  assert.ok(names.some((name) => /[\u{1F300}-\u{1FAFF}]/u.test(name)));
});

test('ランキングサンプルは表示人数ぶん返す', () => {
  const sample = buildLikeRankingSample({
    ...DEFAULT_CONFIG,
    overlayLikeRankingMax: 3,
  });
  assert.equal(sample.enabled, true);
  assert.equal(sample.max, 3);
  assert.equal(sample.mode, 'likes');
  assert.equal(sample.entries.length, 3);
  assert.ok(sample.entries.every((row) => row.count > 0 && row.nickname));
  assert.ok(sample.entries.every((row) => typeof row.avatarUrl === 'string' && row.avatarUrl.length > 0));
});

test('ランキングサンプルはダイヤモードでも返す', () => {
  const sample = buildLikeRankingSample({
    ...DEFAULT_CONFIG,
    overlayLikeRankingMax: 2,
    overlayRankingMode: 'diamonds',
  });
  assert.equal(sample.mode, 'diamonds');
  assert.equal(sample.entries.length, 2);
  assert.ok(sample.entries.every((row) => row.count > 0));
});

test('ランキングサンプルは短い名前と長い名前と絵文字名を含む', () => {
  const sample = buildLikeRankingSample({
    ...DEFAULT_CONFIG,
    overlayLikeRankingMax: 4,
  });
  const names = sample.entries.map((row) => row.nickname);
  assert.ok(names.some((name) => name.length === 1));
  assert.ok(names.some((name) => name.length >= 20));
  assert.ok(names.some((name) => /[\u{1F300}-\u{1FAFF}]/u.test(name)));
});

test('ランキングサンプルは出すたびに同じ人のまま順位が動く', () => {
  const config = { ...DEFAULT_CONFIG, overlayLikeRankingMax: 4 };
  const first = buildLikeRankingSample(config);
  const second = buildLikeRankingSample(config);
  const firstIds = first.entries.map((row) => row.uniqueId).sort();
  const secondIds = second.entries.map((row) => row.uniqueId).sort();
  assert.deepEqual(secondIds, firstIds);
  assert.ok(first.entries.every((row) => row.uniqueId.startsWith('ranking_sample_')));
  const firstOrder = first.entries.map((row) => row.uniqueId).join(',');
  const secondOrder = second.entries.map((row) => row.uniqueId).join(',');
  assert.notEqual(firstOrder, secondOrder);
});

test('ランキングサンプルは表示人数1でも数値だけ変わる', () => {
  const config = { ...DEFAULT_CONFIG, overlayLikeRankingMax: 1 };
  const first = buildLikeRankingSample(config);
  const second = buildLikeRankingSample(config);
  assert.equal(first.entries.length, 1);
  assert.equal(second.entries.length, 1);
  assert.equal(first.entries[0]?.uniqueId, second.entries[0]?.uniqueId);
  assert.notEqual(first.entries[0]?.count, second.entries[0]?.count);
});
