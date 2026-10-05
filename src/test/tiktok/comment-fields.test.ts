import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MSG } from '../../shared/messages';
import { commentEmotesFromEvent, commentFromEvent } from '../../tiktok/comment-fields';

test('v3 の content からコメント本文を取る', () => {
  assert.equal(
    commentFromEvent({
      content: 'こんにちは',
      user: { nickname: 'test' },
    }),
    'こんにちは',
  );
});

test('古い comment 形式でも本文を取る', () => {
  assert.equal(commentFromEvent({ comment: '旧形式' }), '旧形式');
});

test('comment が空のときは content を使う', () => {
  assert.equal(
    commentFromEvent({ comment: '', content: '本文はこちら' }),
    '本文はこちら',
  );
});

test('ネストした文字列オブジェクトからも取る', () => {
  assert.equal(commentFromEvent({ content: { text: 'ネスト' } }), 'ネスト');
});

test('本文がなく絵文字だけのときは代替文言を使う', () => {
  assert.equal(
    commentFromEvent({
      content: '',
      emotes: [{ index: 0, emote: { emoteId: '1' } }],
    }),
    MSG.ui.emoteComment,
  );
});

test('本文も絵文字もなければ空文字', () => {
  assert.equal(commentFromEvent({ user: { nickname: 'test' } }), '');
});

test('emoteWithIndexList だけのときも絵文字として出す', () => {
  assert.equal(
    commentFromEvent({
      content: '',
      emoteWithIndexList: [{ index: 0 }],
    }),
    MSG.ui.emoteComment,
  );
});

test('コネクタ簡略形の emoteImageUrl と placeInComment を取る', () => {
  assert.deepEqual(
    commentEmotesFromEvent({
      content: 'あ',
      emotes: [
        {
          emoteId: '1',
          emoteImageUrl: 'https://p16-webcast.tiktokcdn.com/img/a.png',
          placeInComment: 1,
        },
      ],
    }),
    [{ index: 1, imageUrl: 'https://p16-webcast.tiktokcdn.com/img/a.png' }],
  );
});

test('raw の emote.image.urlList からも画像 URL を取る', () => {
  assert.deepEqual(
    commentEmotesFromEvent({
      emotes: [
        {
          index: 0,
          emote: {
            emoteId: '9',
            image: { urlList: ['https://p16-webcast.tiktokcdn.com/img/b.png'] },
          },
        },
      ],
    }),
    [{ index: 0, imageUrl: 'https://p16-webcast.tiktokcdn.com/img/b.png' }],
  );
});

test('画像 URL が無い emote は落とす', () => {
  assert.deepEqual(
    commentEmotesFromEvent({
      emotes: [{ placeInComment: 0, emote: { emoteId: '1' } }],
    }),
    [],
  );
});
