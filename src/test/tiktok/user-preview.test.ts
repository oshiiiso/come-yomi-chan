import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fanClubNameFromRoom, parseTikTokUserPreview } from '../../tiktok/user-preview';

test('部屋情報の owner から名前とアイコンを取る', () => {
  const parsed = parseTikTokUserPreview(
    {
      owner: {
        unique_id: 'my_live',
        nickname: '配信者A',
        avatar_thumb: {
          url_list: ['https://p16-sign-va.tiktokcdn.com/avatar.png'],
        },
      },
    },
    'my_live',
  );
  assert.ok(parsed);
  assert.equal(parsed.uniqueId, 'my_live');
  assert.equal(parsed.nickname, '配信者A');
  assert.equal(parsed.avatarUrl, 'https://p16-sign-va.tiktokcdn.com/avatar.png');
});

test('API live の data.user からも取る', () => {
  const parsed = parseTikTokUserPreview(
    {
      data: {
        user: {
          uniqueId: 'other_user',
          nickname: '別人',
          avatarThumb: 'https://p16-sign-sg.tiktokcdn.com/face.jpg',
        },
      },
    },
    'typo_id',
  );
  assert.ok(parsed);
  assert.equal(parsed.uniqueId, 'other_user');
  assert.equal(parsed.nickname, '別人');
});

test('liveRoomUserInfo からも取る', () => {
  const parsed = parseTikTokUserPreview(
    {
      liveRoomUserInfo: {
        user: {
          uniqueId: 'html_user',
          nick_name: 'HTML名前',
          avatarMedium: { url_list: ['https://p16.tiktokcdn.com/m.png'] },
        },
      },
    },
    'html_user',
  );
  assert.ok(parsed);
  assert.equal(parsed.nickname, 'HTML名前');
  assert.equal(parsed.avatarUrl, 'https://p16.tiktokcdn.com/m.png');
});

test('名前もアイコンも無い応答は確認に使わない', () => {
  assert.equal(parseTikTokUserPreview({ status: 1 }, 'someone'), null);
  assert.equal(parseTikTokUserPreview({}, 'someone'), null);
});

test('確認用の部屋情報でなくてもクラブ名だけは取れる', () => {
  assert.equal(
    fanClubNameFromRoom({
      data: {
        fansClub: { data: { clubName: '桃団' } },
      },
    }),
    '桃団',
  );
});

test('部屋の owner からファンクラブ名も取る', () => {
  const parsed = parseTikTokUserPreview(
    {
      owner: {
        uniqueId: 'my_live',
        nickname: '配信者A',
        fans_club: {
          data: { club_name: 'いちご団' },
        },
      },
    },
    'my_live',
  );
  assert.ok(parsed);
  assert.equal(parsed.fanClubName, 'いちご団');
});

test('深い階層の fans_club_name も部屋情報から取る', () => {
  assert.equal(
    fanClubNameFromRoom({
      data: {
        liveRoom: {
          owner: {
            fansClubInfo: { fans_club_name: 'フタ推し' },
          },
        },
      },
    }),
    'フタ推し',
  );
});

test('IDだけ取れたときはそのIDを名前代わりにする', () => {
  const parsed = parseTikTokUserPreview(
    {
      owner: {
        uniqueId: 'id_only',
      },
    },
    'id_only',
  );
  assert.ok(parsed);
  assert.equal(parsed.uniqueId, 'id_only');
  assert.equal(parsed.nickname, 'id_only');
  assert.equal(parsed.avatarUrl, '');
});
