import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserAvatarCache } from '../../app/user-avatar-cache';

test('同じユーザーの空アイコンを、以前見たURLで埋める', () => {
  const cache = new UserAvatarCache();
  cache.remember('box_user', 'https://p16.tiktokcdn.com/face.png');
  const filled = cache.fill({ uniqueId: 'box_user', avatarUrl: '' });
  assert.equal(filled.avatarUrl, 'https://p16.tiktokcdn.com/face.png');
});

test('今回のURLがあるときはキャッシュよりそちらを使い、次に残す', () => {
  const cache = new UserAvatarCache();
  cache.remember('box_user', 'https://p16.tiktokcdn.com/old.png');
  const filled = cache.fill({
    uniqueId: 'box_user',
    avatarUrl: 'https://p16.tiktokcdn.com/new.png',
  });
  assert.equal(filled.avatarUrl, 'https://p16.tiktokcdn.com/new.png');
  assert.equal(cache.lookup('box_user'), 'https://p16.tiktokcdn.com/new.png');
});

test('知らないユーザーの空アイコンはそのまま', () => {
  const cache = new UserAvatarCache();
  const filled = cache.fill({ uniqueId: 'new_user', avatarUrl: '' });
  assert.equal(filled.avatarUrl, '');
});

test('上限を超えたら古いアイコンを捨てる', () => {
  const cache = new UserAvatarCache(2);
  cache.remember('a', 'https://p16.tiktokcdn.com/a.png');
  cache.remember('b', 'https://p16.tiktokcdn.com/b.png');
  cache.remember('c', 'https://p16.tiktokcdn.com/c.png');
  assert.equal(cache.lookup('a'), '');
  assert.equal(cache.lookup('b'), 'https://p16.tiktokcdn.com/b.png');
  assert.equal(cache.lookup('c'), 'https://p16.tiktokcdn.com/c.png');
});

test('reset すると覚えたアイコンが消える', () => {
  const cache = new UserAvatarCache();
  cache.remember('box_user', 'https://p16.tiktokcdn.com/face.png');
  cache.reset();
  assert.equal(cache.lookup('box_user'), '');
});
