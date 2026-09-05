import assert from 'node:assert/strict';
import { test } from 'node:test';
import { userFromEvent } from '../../tiktok/event-user';

test('v3 の avatarThumb からアイコンを取る', () => {
  const user = userFromEvent({
    user: {
      uniqueId: 'viewer_a',
      nickname: '視聴者A',
      avatarThumb: { urlList: ['https://p16-sign-va.tiktokcdn.com/face.png'] },
    },
  });
  assert.equal(user.uniqueId, 'viewer_a');
  assert.equal(user.nickname, '視聴者A');
  assert.equal(user.avatarUrl, 'https://p16-sign-va.tiktokcdn.com/face.png');
});

test('profilePicture だけの古い形式でもアイコンを取る', () => {
  const user = userFromEvent({
    user: {
      uniqueId: 'old',
      nickname: '旧形式',
      profilePictureUrl: 'https://p16-webcast.tiktokcdn.com/old.png',
    },
  });
  assert.equal(user.avatarUrl, 'https://p16-webcast.tiktokcdn.com/old.png');
});

test('user が空でも fromUser から取る', () => {
  const user = userFromEvent({
    fromUser: {
      unique_id: 'from_id',
      nickName: '送信者',
      avatar_thumb: { url_list: ['https://p16.tiktokcdn.com/a.png'] },
    },
  });
  assert.equal(user.uniqueId, 'from_id');
  assert.equal(user.nickname, '送信者');
  assert.equal(user.avatarUrl, 'https://p16.tiktokcdn.com/a.png');
});

test('ニックネームが無いときは ID を名前にする', () => {
  const user = userFromEvent({
    user: { uniqueId: 'only_id' },
  });
  assert.equal(user.nickname, 'only_id');
  assert.equal(user.uniqueId, 'only_id');
  assert.equal(user.avatarUrl, '');
});

test('uniqueId が無くても userId から取る', () => {
  const user = userFromEvent({
    user: { userId: 123456, nickName: '番号だけ' },
  });
  assert.equal(user.uniqueId, '123456');
  assert.equal(user.nickname, '番号だけ');
});

test('ファンクラブとスパファンの印をユーザーに載せる', () => {
  const user = userFromEvent({
    userIdentity: { isSubscriberOfAnchor: true },
    user: {
      uniqueId: 'fan_user',
      nickname: 'ファンの人',
      fansClub: { data: { level: 2, userFansClubStatus: 1, clubName: 'いちご団' } },
    },
  });
  assert.equal(user.isFanClub, true);
  assert.equal(user.fanClubStatus, 1);
  assert.equal(user.isSuperFan, true);
  assert.equal(user.fanClubLevel, 2);
  assert.equal(user.fanClubName, 'いちご団');
});

test('配信者の ID と一致したら配信者印を付ける', () => {
  const user = userFromEvent(
    { user: { uniqueId: 'my_live', nickname: '本人' } },
    { streamerId: 'my_live' },
  );
  assert.equal(user.isAnchor, true);
  assert.equal(user.isModerator, false);
});

test('モデは userIdentity から載せる', () => {
  const user = userFromEvent({
    userIdentity: { isModeratorOfAnchor: true },
    user: { uniqueId: 'mod_user', nickname: 'モデの人' },
  });
  assert.equal(user.isModerator, true);
  assert.equal(user.isAnchor, false);
});
