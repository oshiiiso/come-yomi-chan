import assert from 'node:assert/strict';
import { test } from 'node:test';
import { userLiveBadgesFromEvent } from '../../tiktok/user-badges';

test('Webcast のステータス1は加入中', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: { data: { userFansClubStatus: 1, clubName: 'ゆうれい' } },
    },
  );
  assert.equal(badges.fanClubStatus, 1);
  assert.equal(badges.isFanClub, true);
  assert.equal(badges.fanClubLevel, 0);
  assert.equal(badges.fanClubName, 'ゆうれい');
});

test('Webcast のステータス2は停止中', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: { data: { userFansClubStatus: 2, level: 8, clubName: 'ゆうれい' } },
    },
  );
  assert.equal(badges.fanClubStatus, 2);
  assert.equal(badges.isFanClub, true);
  assert.equal(badges.fanClubLevel, 8);
});

test('ステータス0でレベも無い人は印を出さない', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: { data: { userFansClubStatus: 0, clubName: 'ゆうれい' } },
    },
  );
  assert.equal(badges.fanClubStatus, 0);
  assert.equal(badges.isFanClub, false);
});

test('ステータスが無くてもレベがあれば加入中にする', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: { data: { level: 4 } },
    },
  );
  assert.equal(badges.fanClubStatus, 1);
  assert.equal(badges.isFanClub, true);
});

test('ファンクラブ加入中ならファン印を出す', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: {
        data: { level: 4, userFansClubStatus: 1 },
      },
    },
  );
  assert.equal(badges.isFanClub, true);
  assert.equal(badges.fanClubLevel, 4);
  assert.equal(badges.isSuperFan, false);
  assert.equal(badges.fanClubName, '');
});

test('fansClub 直下のクラブ名も取る', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: {
        clubName: '桃団',
        data: { level: 3, userFansClubStatus: 1 },
      },
    },
  );
  assert.equal(badges.fanClubName, '桃団');
});

test('長すぎるファンクラブ名は切る', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: {
        data: { level: 2, userFansClubStatus: 1, clubName: 'あ'.repeat(50) },
      },
    },
  );
  assert.equal(badges.fanClubName, 'ああああ');
});

test('ファンクラブ名があれば印用に残す', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: {
        data: { level: 2, userFansClubStatus: 1, clubName: 'いちご団' },
      },
    },
  );
  assert.equal(badges.fanClubName, 'いちご団');
});

test('スパファンは userIdentity の購読フラグで判定する', () => {
  const badges = userLiveBadgesFromEvent({
    userIdentity: { isSubscriberOfAnchor: true },
  });
  assert.equal(badges.isSuperFan, true);
  assert.equal(badges.isFanClub, false);
});

test('subscribeInfo とバッジ種別からも取る', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      subscribeInfo: { isSubscribedToAnchor: true },
      badgeList: [{ sceneType: 10 }],
    },
  );
  assert.equal(badges.isSuperFan, true);
  assert.equal(badges.isFanClub, true);
});

test('preferData からレベと加入状態を取る', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClub: {
        data: {},
        preferData: { 123: { level: 7, userFansClubStatus: 1, clubName: '桃' } },
      },
    },
  );
  assert.equal(badges.isFanClub, true);
  assert.equal(badges.fanClubLevel, 7);
  assert.equal(badges.fanClubName, '桃');
});

test('badgeList の FANS から加入とレベを取る', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      badgeList: [{ sceneType: 10, privilegeLogExtra: { level: '12' } }],
    },
  );
  assert.equal(badges.isFanClub, true);
  assert.equal(badges.fanClubLevel, 12);
});

test('未加入は印を出さない', () => {
  const badges = userLiveBadgesFromEvent({}, { fansClub: { data: { userFansClubStatus: 0 } } });
  assert.equal(badges.isFanClub, false);
  assert.equal(badges.isSuperFan, false);
  assert.equal(badges.fanClubLevel, 0);
});

test('ファンクラブ名だけでは加入扱いにしない', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      fansClubInfo: { fansClubName: 'いちご団', fansLevel: '0' },
    },
  );
  assert.equal(badges.isFanClub, false);
  assert.equal(badges.fanClubName, 'いちご団');
});

test('subscribe の機能フラグだけではスパファン扱いにしない', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      subscribeInfo: { isSubscribe: true, isSubscribedToAnchor: false },
    },
  );
  assert.equal(badges.isSuperFan, false);
});

test('モデと配信者は identity から取る', () => {
  const badges = userLiveBadgesFromEvent({
    userIdentity: { isModeratorOfAnchor: true, isAnchor: true },
  });
  assert.equal(badges.isModerator, true);
  assert.equal(badges.isAnchor, true);
});

test('未設定ならモデでも配信者でもない', () => {
  const badges = userLiveBadgesFromEvent({}, { uniqueId: 'viewer' });
  assert.equal(badges.isModerator, false);
  assert.equal(badges.isAnchor, false);
});

test('FANS バッジの combine からクラブ名を取る', () => {
  const badges = userLiveBadgesFromEvent(
    {},
    {
      badgeList: [
        {
          sceneType: 10,
          combine: { str: 'フタ推し12' },
        },
      ],
      fansClub: { data: { userFansClubStatus: 1, level: 12 } },
    },
  );
  assert.equal(badges.fanClubName, 'フタ推し');
  assert.equal(badges.fanClubLevel, 12);
});
