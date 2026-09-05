import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addListedUser,
  containsNgWord,
  hasCommentUrl,
  isListedUser,
  isEmoteOnlyComment,
  isMentionComment,
  isMutedUser,
  listedUserId,
  normalizeUserList,
  removeListedUser,
  resolveBlockedAndMutedUsers,
  stripCommentUrls,
} from '../../shared/comment-filters';

test('NGワードは本文の一部でも落とす', () => {
  assert.equal(containsNgWord('今日は配信', ['配信']), true);
  assert.equal(containsNgWord('今日は配信', ['スパム']), false);
});

test('半角@で始まるコメントをメンションと判定する', () => {
  assert.equal(isMentionComment('@user こんにちは'), true);
  assert.equal(isMentionComment('  @user'), true);
});

test('全角＠で始まるコメントをメンションと判定する', () => {
  assert.equal(isMentionComment('＠user こんにちは'), true);
});

test('通常コメントはメンションではない', () => {
  assert.equal(isMentionComment('こんにちは @user'), false);
  assert.equal(isMentionComment(''), false);
});

test('スタンプ代替文言と絵文字だけを絵文字コメントと判定する', () => {
  assert.equal(isEmoteOnlyComment('絵文字'), true);
  assert.equal(isEmoteOnlyComment('😂'), true);
  assert.equal(isEmoteOnlyComment('😂😂 ✨'), true);
  assert.equal(isEmoteOnlyComment('草'), false);
  assert.equal(isEmoteOnlyComment('草😂'), false);
  assert.equal(isEmoteOnlyComment(''), false);
});

test('コメント内のURLを検出する', () => {
  assert.equal(hasCommentUrl('https://example.com/a'), true);
  assert.equal(hasCommentUrl('見て www.example.com/a'), true);
  assert.equal(hasCommentUrl('discord.gg/abcd'), true);
  assert.equal(hasCommentUrl('こんにちは'), false);
});

test('読み上げ用にURLだけ取り除く', () => {
  assert.equal(stripCommentUrls('https://example.com/live'), '');
  assert.equal(stripCommentUrls('見て https://example.com/a ね'), '見て ね');
  assert.equal(stripCommentUrls('www.example.jp/x。'), '');
  assert.equal(stripCommentUrls('こんにちは'), 'こんにちは');
});

test('ミュートは TikTok ID と表示名の両方で見る', () => {
  assert.equal(
    isMutedUser({ uniqueId: 'noisy_user', nickname: 'うるさい人' }, ['noisy_user']),
    true,
  );
  assert.equal(
    isMutedUser({ uniqueId: 'abc', nickname: 'うるさい人' }, ['うるさい人']),
    true,
  );
  assert.equal(
    isMutedUser({ uniqueId: '@Noisy_User', nickname: 'x' }, ['noisy_user']),
    true,
  );
  assert.equal(
    isMutedUser({ uniqueId: 'ok_user', nickname: '普通' }, ['noisy_user']),
    false,
  );
});

test('ミュート一覧は @ を外して重複を除く', () => {
  assert.deepEqual(normalizeUserList(['@Aaa', 'aaa', ' bbb ', '', 1]), ['Aaa', 'bbb']);
  assert.deepEqual(normalizeUserList(null), []);
});

test('ユーザー一覧の追加と削除', () => {
  const user = { uniqueId: 'noisy_user', nickname: 'うるさい人' };
  assert.equal(listedUserId(user), 'noisy_user');
  const added = addListedUser(['other'], '@noisy_user');
  assert.deepEqual(added, ['other', 'noisy_user']);
  assert.equal(isListedUser(user, added), true);
  assert.deepEqual(removeListedUser(added, user), ['other']);
});

test('古いミュート一覧はブロックへ移す', () => {
  assert.deepEqual(
    resolveBlockedAndMutedUsers({ mutedUsers: ['old_mute'], configVersion: 2 }),
    { blockedUsers: ['old_mute'], mutedUsers: [] },
  );
  assert.deepEqual(
    resolveBlockedAndMutedUsers({
      blockedUsers: ['blocked'],
      mutedUsers: ['muted'],
      configVersion: 3,
    }),
    { blockedUsers: ['blocked'], mutedUsers: ['muted'] },
  );
});
