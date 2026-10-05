import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_COMMENT_EMOTES,
  buildCommentSegments,
  normalizeCommentEmotes,
} from '../../shared/comment-emotes';
import { MSG } from '../../shared/messages';

test('空 URL を落として件数上限で切る', () => {
  const withEmpty = [
    { index: 0, imageUrl: '' },
    { index: 1, imageUrl: 'https://example.com/1.png' },
    { index: 2, imageUrl: '   ' },
  ];
  assert.deepEqual(normalizeCommentEmotes(withEmpty), [
    { index: 1, imageUrl: 'https://example.com/1.png' },
  ]);

  const many = Array.from({ length: MAX_COMMENT_EMOTES + 10 }, (_, index) => ({
    index,
    imageUrl: `https://example.com/${index}.png`,
  }));
  assert.equal(normalizeCommentEmotes(many).length, MAX_COMMENT_EMOTES);
});

test('代替文言だけのときは画像だけ出す', () => {
  assert.deepEqual(
    buildCommentSegments(MSG.ui.emoteComment, [
      { index: 0, imageUrl: 'https://cdn.example/a.png' },
      { index: 3, imageUrl: 'https://cdn.example/b.png' },
    ]),
    [
      { kind: 'emote', imageUrl: 'https://cdn.example/a.png' },
      { kind: 'emote', imageUrl: 'https://cdn.example/b.png' },
    ],
  );
});

test('本文の先頭・途中・末尾にスタンプを差し込む', () => {
  assert.deepEqual(
    buildCommentSegments('あい', [
      { index: 0, imageUrl: 'https://cdn.example/0.png' },
      { index: 1, imageUrl: 'https://cdn.example/1.png' },
      { index: 2, imageUrl: 'https://cdn.example/2.png' },
    ]),
    [
      { kind: 'emote', imageUrl: 'https://cdn.example/0.png' },
      { kind: 'text', text: 'あ' },
      { kind: 'emote', imageUrl: 'https://cdn.example/1.png' },
      { kind: 'text', text: 'い' },
      { kind: 'emote', imageUrl: 'https://cdn.example/2.png' },
    ],
  );
});

test('範囲外の index は末尾扱い', () => {
  assert.deepEqual(
    buildCommentSegments('hi', [{ index: 99, imageUrl: 'https://cdn.example/x.png' }]),
    [
      { kind: 'text', text: 'hi' },
      { kind: 'emote', imageUrl: 'https://cdn.example/x.png' },
    ],
  );
});

test('emote が無いときは本文だけ', () => {
  assert.deepEqual(buildCommentSegments('こんにちは', []), [
    { kind: 'text', text: 'こんにちは' },
  ]);
  assert.deepEqual(buildCommentSegments('', []), []);
});
