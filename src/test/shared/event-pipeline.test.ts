import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../../shared/config-store';
import {
  isGiftLikeEvent,
  resolveEventSpeech,
  resolveShowDisplay,
} from '../../shared/event-pipeline';

const viewer = {
  uniqueId: 'tester',
  nickname: 'テスト',
  isFanClub: false,
  isSuperFan: false,
  fanClubLevel: 0,
  isAnchor: false,
};

function commentEvent(comment: string, user = viewer) {
  return {
    type: 'comment' as const,
    comment,
    diamondCount: 0,
    giftName: '',
    user,
  };
}

function giftEvent(diamonds: number, giftName = 'バラ') {
  return {
    type: 'gift' as const,
    comment: '',
    diamondCount: diamonds,
    giftName,
    user: viewer,
  };
}

test('ギフト・宝箱・スパファンボックスをギフト扱いにする', () => {
  assert.equal(isGiftLikeEvent({ type: 'gift', giftName: 'バラ' }), true);
  assert.equal(isGiftLikeEvent({ type: 'envelope' }), true);
  assert.equal(isGiftLikeEvent({ type: 'superFan', giftName: 'ボックス' }), true);
  assert.equal(isGiftLikeEvent({ type: 'superFan', giftName: '' }), false);
  assert.equal(isGiftLikeEvent({ type: 'portal', giftName: 'ポータル' }), true);
  assert.equal(isGiftLikeEvent({ type: 'member', giftName: 'ポータル' }), false);
  assert.equal(isGiftLikeEvent({ type: 'comment' }), false);
});

test('表示は forceDisplay かトグルで決まる', () => {
  assert.equal(resolveShowDisplay({}, false), false);
  assert.equal(resolveShowDisplay({}, true), true);
  assert.equal(resolveShowDisplay({ forceDisplay: true }, false), true);
});

test('通常コメントは読む', () => {
  const result = resolveEventSpeech({
    event: commentEvent('こんにちは'),
    config: DEFAULT_CONFIG,
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: 'こんにちは',
  });
  assert.deepEqual(result, { shouldSpeak: true, speechComment: 'こんにちは' });
});

test('silent と読み上げオフは読まない', () => {
  assert.equal(
    resolveEventSpeech({
      event: commentEvent('こんにちは'),
      config: DEFAULT_CONFIG,
      options: { silent: true },
      toggleSpeak: true,
      repeatWouldSkip: false,
      varsComment: 'こんにちは',
    }).shouldSpeak,
    false,
  );
  assert.equal(
    resolveEventSpeech({
      event: commentEvent('こんにちは'),
      config: DEFAULT_CONFIG,
      options: {},
      toggleSpeak: false,
      repeatWouldSkip: false,
      varsComment: 'こんにちは',
    }).shouldSpeak,
    false,
  );
});

test('forceSpeak はトグルオフでも読む', () => {
  assert.equal(
    resolveEventSpeech({
      event: commentEvent('こんにちは'),
      config: DEFAULT_CONFIG,
      options: { forceSpeak: true },
      toggleSpeak: false,
      repeatWouldSkip: false,
      varsComment: 'こんにちは',
    }).shouldSpeak,
    true,
  );
});

test('最低ダイヤ未満のギフトは表示対象でも読まない', () => {
  const result = resolveEventSpeech({
    event: giftEvent(5),
    config: { ...DEFAULT_CONFIG, minGiftDiamonds: 10 },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: '',
  });
  assert.equal(result.shouldSpeak, false);
});

test('テスト送信は最低ダイヤを見ない', () => {
  const result = resolveEventSpeech({
    event: giftEvent(5),
    config: { ...DEFAULT_CONFIG, minGiftDiamonds: 10 },
    options: { skipFilters: true },
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: '',
  });
  assert.equal(result.shouldSpeak, true);
});

test('@から始まるコメントは読まない', () => {
  const result = resolveEventSpeech({
    event: commentEvent('@someone こんにちは'),
    config: DEFAULT_CONFIG,
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: '@someone こんにちは',
  });
  assert.equal(result.shouldSpeak, false);
});

test('URLだけのコメントは読まない', () => {
  const result = resolveEventSpeech({
    event: commentEvent('https://example.com/live'),
    config: DEFAULT_CONFIG,
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: 'https://example.com/live',
  });
  assert.equal(result.shouldSpeak, false);
});

test('文言つきURLはリンク部分だけ飛ばす', () => {
  const result = resolveEventSpeech({
    event: commentEvent('見て https://example.com/a ね'),
    config: DEFAULT_CONFIG,
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: '見て https://example.com/a ね',
  });
  assert.deepEqual(result, { shouldSpeak: true, speechComment: '見て ね' });
});

test('メンレベとスパファンだけ読むときは一般コメントを落とす', () => {
  const result = resolveEventSpeech({
    event: commentEvent('こんにちは'),
    config: { ...DEFAULT_CONFIG, speakFanSubOnly: true },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: 'こんにちは',
  });
  assert.equal(result.shouldSpeak, false);
});

test('メンレベとスパファンだけ読むときは条件を満たすコメントを読む', () => {
  const fan = { ...viewer, isFanClub: true, fanClubLevel: 5 };
  const result = resolveEventSpeech({
    event: commentEvent('こんにちは', fan),
    config: { ...DEFAULT_CONFIG, speakFanSubOnly: true, speakFanMinLevel: 5 },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: 'こんにちは',
  });
  assert.equal(result.shouldSpeak, true);
});

test('配信者のコメントは読まない', () => {
  const anchor = { ...viewer, isAnchor: true };
  const result = resolveEventSpeech({
    event: commentEvent('自分の発言', anchor),
    config: { ...DEFAULT_CONFIG, skipAnchorSpeech: true },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: '自分の発言',
  });
  assert.equal(result.shouldSpeak, false);
});

test('テスト送信は配信者フィルタを見ない', () => {
  const anchor = { ...viewer, isAnchor: true };
  const result = resolveEventSpeech({
    event: commentEvent('自分の発言', anchor),
    config: { ...DEFAULT_CONFIG, skipAnchorSpeech: true },
    options: { skipFilters: true },
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: '自分の発言',
  });
  assert.equal(result.shouldSpeak, true);
});

test('絵文字だけのコメントは読まない', () => {
  const result = resolveEventSpeech({
    event: commentEvent('絵文字'),
    config: { ...DEFAULT_CONFIG, skipEmoteSpeech: true },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: '絵文字',
  });
  assert.equal(result.shouldSpeak, false);
});

test('連投は読み上げだけ飛ばす', () => {
  const result = resolveEventSpeech({
    event: commentEvent('連投'),
    config: { ...DEFAULT_CONFIG, skipRepeatSpeech: true },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: true,
    varsComment: '連投',
  });
  assert.equal(result.shouldSpeak, false);
});

test('ミュートした人は読まない', () => {
  const result = resolveEventSpeech({
    event: commentEvent('こんにちは'),
    config: { ...DEFAULT_CONFIG, mutedUsers: ['tester'] },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: false,
    varsComment: 'こんにちは',
  });
  assert.equal(result.shouldSpeak, false);
});

test('ギフトの連投・メンション判定はコメント専用', () => {
  const result = resolveEventSpeech({
    event: giftEvent(1),
    config: { ...DEFAULT_CONFIG, mutedUsers: [] },
    options: {},
    toggleSpeak: true,
    repeatWouldSkip: true,
    varsComment: '',
  });
  assert.equal(result.shouldSpeak, true);
});
