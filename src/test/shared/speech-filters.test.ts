import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampRepeatSpeechSec,
  clampSpeakFanMinLevel,
  RepeatSpeechGuard,
  shouldSkipRestrictedCommentSpeech,
  speechUserKey,
} from '../../shared/speech-filters';

test('オフのときはコメントを絞らない', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech('comment', { isFanClub: false }, {
      enabled: false,
      minFanLevel: 10,
      speakFanClub: true,
      speakSubscriber: true,
    }),
    false,
  );
});

test('レベが無い人はファンとして読まない', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech('comment', { isFanClub: true }, {
      enabled: true,
      minFanLevel: 1,
      speakFanClub: true,
      speakSubscriber: false,
    }),
    true,
  );
});

test('指定レベ以上のファンは読む', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech('comment', { isFanClub: true, fanClubLevel: 10 }, {
      enabled: true,
      minFanLevel: 10,
      speakFanClub: true,
      speakSubscriber: false,
    }),
    false,
  );
});

test('スーパーファンはファン未加入でも読める', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech(
      'comment',
      { isFanClub: false, isSuperFan: true },
      {
        enabled: true,
        minFanLevel: 10,
        speakFanClub: true,
        speakSubscriber: true,
      },
    ),
    false,
  );
});

test('ギフトは条件の外', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech('gift', { isFanClub: false }, {
      enabled: true,
      minFanLevel: 1,
      speakFanClub: true,
      speakSubscriber: false,
    }),
    false,
  );
});

test('メンレベを読まないときはスーパーファンだけ読む', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech(
      'comment',
      { isFanClub: true, fanClubLevel: 20 },
      {
        enabled: true,
        minFanLevel: 1,
        speakFanClub: false,
        speakSubscriber: true,
      },
    ),
    true,
  );
  assert.equal(
    shouldSkipRestrictedCommentSpeech(
      'comment',
      { isFanClub: true, fanClubLevel: 20, isSuperFan: true },
      {
        enabled: true,
        minFanLevel: 1,
        speakFanClub: false,
        speakSubscriber: true,
      },
    ),
    false,
  );
});

test('同じ人の連投は話したあとの短い間だけ飛ばす', () => {
  const guard = new RepeatSpeechGuard();
  assert.equal(guard.shouldSkip('id:a', 1000, 6000), false);
  guard.markSpoken('id:a', 1000);
  assert.equal(guard.shouldSkip('id:a', 2000, 6000), true);
  assert.equal(guard.shouldSkip('id:a', 8000, 6000), false);
});

test('飛ばしただけでは次の間隔を延ばさない', () => {
  const guard = new RepeatSpeechGuard();
  guard.markSpoken('id:a', 1000);
  assert.equal(guard.shouldSkip('id:a', 2000, 6000), true);
  assert.equal(guard.shouldSkip('id:a', 3000, 6000), true);
  assert.equal(guard.shouldSkip('id:a', 7001, 6000), false);
});

test('ID が無いときは名前で同一人物とみなす', () => {
  assert.equal(speechUserKey({ nickname: '太郎' }), 'name:太郎');
  assert.equal(speechUserKey({ uniqueId: '@Abc', nickname: '太郎' }), 'id:abc');
});

test('連投間隔とファン最低レベを収める', () => {
  assert.equal(clampRepeatSpeechSec(1), 2);
  assert.equal(clampRepeatSpeechSec(100), 30);
  assert.equal(clampSpeakFanMinLevel(0), 1);
  assert.equal(clampSpeakFanMinLevel(200), 99);
});
