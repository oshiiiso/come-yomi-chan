import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeNicknameMap,
  removeNicknameMap,
  resolveDisplayName,
  upsertNicknameMap,
} from '../../shared/nickname-map';

test('空・重複・長さを正規化する', () => {
  assert.deepEqual(normalizeNicknameMap(null), []);
  assert.deepEqual(
    normalizeNicknameMap([
      { uniqueId: '@Alice', displayName: 'ありす' },
      { uniqueId: 'alice', displayName: '重複' },
      { uniqueId: '', displayName: 'x' },
      { uniqueId: 'bob', displayName: '' },
    ]),
    [{ uniqueId: 'Alice', displayName: 'ありす' }],
  );
});

test('辞書があれば表示名を差し替える', () => {
  const map = [{ uniqueId: 'alice', displayName: 'ありす' }];
  assert.equal(resolveDisplayName('alice', '本名', map), 'ありす');
  assert.equal(resolveDisplayName('@alice', '本名', map), 'ありす');
  assert.equal(resolveDisplayName('bob', 'ボブ', map), 'ボブ');
  assert.equal(resolveDisplayName('bob', '', map), 'bob');
});

test('追加と削除', () => {
  let map = upsertNicknameMap([], 'alice', 'ありす');
  assert.deepEqual(map, [{ uniqueId: 'alice', displayName: 'ありす' }]);
  map = upsertNicknameMap(map, '@alice', 'ありす改');
  assert.deepEqual(map, [{ uniqueId: 'alice', displayName: 'ありす改' }]);
  map = removeNicknameMap(map, 'alice');
  assert.deepEqual(map, []);
});
