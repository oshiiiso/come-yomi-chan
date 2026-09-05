import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fanClubNameForBadge,
  normalizeFanClubName,
  rememberStreamerFanClubName,
  resolveFanClubName,
  scanFanClubNameDeep,
} from '../../shared/fan-club-name';

test('空や空白だけのファンクラブ名は捨てる', () => {
  assert.equal(normalizeFanClubName(''), '');
  assert.equal(normalizeFanClubName('   '), '');
  assert.equal(normalizeFanClubName(1), '');
});

test('ファンクラブ名は前後空白を落として4文字まで', () => {
  assert.equal(normalizeFanClubName('  ゆうれい  '), 'ゆうれい');
  assert.equal(normalizeFanClubName('あ'.repeat(6)), 'ああああ');
});

test('後から来たクラブ名を配信の名前として覚える', () => {
  assert.equal(rememberStreamerFanClubName('', 'いちご団'), 'いちご団');
  assert.equal(rememberStreamerFanClubName('いちご団', ''), 'いちご団');
  assert.equal(rememberStreamerFanClubName('いちご団', ' 桃団 '), '桃団');
});

test('本人のクラブ名が無ければ配信で覚えた名前を使う', () => {
  assert.equal(resolveFanClubName('いちご団', ''), 'いちご団');
  assert.equal(resolveFanClubName('', 'いちご団'), 'いちご団');
  assert.equal(resolveFanClubName('', ''), '');
});

test('加入者だけ配信のクラブ名を印に使う', () => {
  assert.equal(fanClubNameForBadge(true, '', 'いちご団'), 'いちご団');
  assert.equal(fanClubNameForBadge(false, '', 'いちご団'), '');
  assert.equal(fanClubNameForBadge(true, ' 桃団 ', 'いちご団'), '桃団');
});

test('部屋情報の深い階層からもクラブ名を拾う', () => {
  assert.equal(
    scanFanClubNameDeep({
      liveRoom: {
        stats: {
          anchor: {
            fans_club_info: { fans_club_name: 'フタ推し' },
          },
        },
      },
    }),
    'フタ推し',
  );
});
