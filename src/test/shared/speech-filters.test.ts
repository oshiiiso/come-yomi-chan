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
      speakSubscriber: false,
    }),
    false,
  );
  assert.equal(
    shouldSkipRestrictedCommentSpeech('comment', { isFanClub: true, fanClubLevel: 9 }, {
      enabled: true,
      minFanLevel: 10,
      speakSubscriber: false,
    }),
    true,
  );
});

test('スーパーファンはファン未加入でも読める', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech('comment', { isSuperFan: true, isFanClub: false }, {
      enabled: true,
      minFanLevel: 10,
      speakSubscriber: true,
    }),
    false,
  );
  assert.equal(
    shouldSkipRestrictedCommentSpeech('comment', { isSuperFan: true, isFanClub: false }, {
      enabled: true,
      minFanLevel: 10,
      speakSubscriber: false,
    }),
    true,
  );
});

test('ギフトは条件の外', () => {
  assert.equal(
    shouldSkipRestrictedCommentSpeech('gift', { isFanClub: false }, {
      enabled: true,
      minFanLevel: 1,
      speakSubscriber: true,
    }),
    false,
  );
});

test('同じ人の連投は話したあとの短い間だけ飛ばす', () => {
  const guard = new RepeatSpeechGuard();
  const key = speechUserKey({ uniqueId: 'viewer_a' });
  assert.equal(guard.shouldSkip(key, 1000, 6000), false);
  guard.markSpoken(key, 1000);
  assert.equal(guard.shouldSkip(key, 2000, 6000), true);
  assert.equal(guard.shouldSkip(key, 7000, 6000), false);
});

test('飛ばしただけでは次の間隔を延ばさない', () => {
  const guard = new RepeatSpeechGuard();
  const key = speechUserKey({ uniqueId: 'viewer_b' });
  guard.markSpoken(key, 1000);
  assert.equal(guard.shouldSkip(key, 2000, 6000), true);
  assert.equal(guard.shouldSkip(key, 6999, 6000), true);
  assert.equal(guard.shouldSkip(key, 7000, 6000), false);
});

test('ID が無いときは名前で同一人物とみなす', () => {
  assert.equal(speechUserKey({ nickname: 'いちご' }), 'name:いちご');
  assert.equal(speechUserKey({ uniqueId: '@Foo' }), 'id:foo');
});

test('連投間隔とファン最低レベを収める', () => {
  assert.equal(clampRepeatSpeechSec(1), 2);
  assert.equal(clampRepeatSpeechSec(6), 6);
  assert.equal(clampRepeatSpeechSec(40), 30);
  assert.equal(clampRepeatSpeechSec('nope'), 6);
  assert.equal(clampSpeakFanMinLevel(0), 1);
  assert.equal(clampSpeakFanMinLevel(15), 15);
  assert.equal(clampSpeakFanMinLevel(200), 99);
});
