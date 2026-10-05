import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  diamondBandsOverlap,
  findGiftChimeDiamondBand,
  DEFAULT_GIFT_CHIME_VOLUME,
  giftChimeVolumeForId,
  giftChimeVolumeToGain,
  MAX_GIFT_CHIME_VOLUME,
  normalizeCommentNotifyMode,
  normalizeGiftChimeDestinations,
  normalizeGiftChimeDiamondBands,
  normalizeGiftChimeMatchMode,
  normalizeGiftChimeVolume,
  normalizeGiftChimeVolumeById,
  normalizeGiftNotifyMode,
  normalizeGiftSpeakById,
  pruneGiftChimeVolumeById,
  resolveGiftChimeBandSound,
  resolveGiftChimeSound,
  resolveGiftChimeVolume,
  shouldPlayGiftChime,
  shouldSpeakGiftById,
  validateGiftChimeDiamondBands,
} from '../../shared/gift-notify';
import { DEFAULT_GIFT_SOUND_REF } from '../../shared/sound-ref';

test('通知モードは speak / chime 以外を speak に戻す', () => {
  assert.equal(normalizeGiftNotifyMode('chime'), 'chime');
  assert.equal(normalizeGiftNotifyMode('speak'), 'speak');
  assert.equal(normalizeGiftNotifyMode(''), 'speak');
  assert.equal(normalizeGiftNotifyMode(null), 'speak');
});

test('コメント通知モードは speak / sound（旧 chime も sound）', () => {
  assert.equal(normalizeCommentNotifyMode('sound'), 'sound');
  assert.equal(normalizeCommentNotifyMode('chime'), 'sound');
  assert.equal(normalizeCommentNotifyMode('speak'), 'speak');
  assert.equal(normalizeCommentNotifyMode(''), 'speak');
  assert.equal(normalizeCommentNotifyMode(null), 'speak');
});

test('サウンドの分け方は gift / diamond', () => {
  assert.equal(normalizeGiftChimeMatchMode('diamond'), 'diamond');
  assert.equal(normalizeGiftChimeMatchMode('gift'), 'gift');
  assert.equal(normalizeGiftChimeMatchMode(''), 'gift');
});

test('サウンドのときは鳴らし先をアプリだけにする', () => {
  assert.deepEqual(
    normalizeGiftChimeDestinations({
      mode: 'chime',
      playApp: false,
      playOverlay: false,
    }),
    { playApp: true, playOverlay: false },
  );
  assert.deepEqual(
    normalizeGiftChimeDestinations({
      mode: 'chime',
      playApp: false,
      playOverlay: true,
    }),
    { playApp: true, playOverlay: false },
  );
  assert.deepEqual(
    normalizeGiftChimeDestinations({
      mode: 'speak',
      playApp: false,
      playOverlay: false,
    }),
    { playApp: false, playOverlay: false },
  );
});

test('種別 ON のときだけサウンド対象', () => {
  assert.equal(shouldSpeakGiftById('1', { '1': false }), false);
  assert.equal(shouldSpeakGiftById('1', { '1': true }), true);
  assert.equal(shouldSpeakGiftById('1', {}), false);
  assert.equal(shouldSpeakGiftById('', { '1': true }), false);
  assert.equal(shouldSpeakGiftById('2', { '1': true }), false);
});

test('壊れた種別マップは ON だけ残す', () => {
  assert.deepEqual(normalizeGiftSpeakById({ '1': true, '2': false, bad: 'x', '': true }), {
    '1': true,
  });
  assert.deepEqual(normalizeGiftSpeakById(null), {});
});

test('サウンドは鳴らし先だけ見る', () => {
  assert.deepEqual(
    shouldPlayGiftChime({
      playApp: true,
      playOverlay: false,
    }),
    { playApp: true, playOverlay: false },
  );
  assert.deepEqual(
    shouldPlayGiftChime({
      playApp: false,
      playOverlay: true,
    }),
    { playApp: false, playOverlay: true },
  );
});

test('個別音が無ければ統一音、無ければテンプレ', () => {
  const file = { kind: 'file' as const, fileName: 'a.wav' };
  assert.deepEqual(
    resolveGiftChimeSound('9', { '9': file }, DEFAULT_GIFT_SOUND_REF),
    file,
  );
  assert.deepEqual(
    resolveGiftChimeSound('8', { '9': file }, DEFAULT_GIFT_SOUND_REF),
    DEFAULT_GIFT_SOUND_REF,
  );
  assert.deepEqual(resolveGiftChimeSound('8', undefined, undefined), DEFAULT_GIFT_SOUND_REF);
});

test('ダイヤ帯は空行を捨て、下限なしは1、上限なしは null', () => {
  assert.deepEqual(
    normalizeGiftChimeDiamondBands([
      { minDiamonds: '', maxDiamonds: '' },
      { minDiamonds: '', maxDiamonds: 10 },
      { minDiamonds: 100, maxDiamonds: '' },
      { minDiamonds: 11, maxDiamonds: 99 },
    ]),
    [
      {
        minDiamonds: 1,
        maxDiamonds: 10,
        sound: DEFAULT_GIFT_SOUND_REF,
        volume: 100,
      },
      {
        minDiamonds: 11,
        maxDiamonds: 99,
        sound: DEFAULT_GIFT_SOUND_REF,
        volume: 100,
      },
      {
        minDiamonds: 100,
        maxDiamonds: null,
        sound: DEFAULT_GIFT_SOUND_REF,
        volume: 100,
      },
    ],
  );
});

test('ダイヤ帯の正規化は逆転・重複を捨てる', () => {
  assert.deepEqual(
    normalizeGiftChimeDiamondBands([
      { minDiamonds: 20, maxDiamonds: 10 },
      { minDiamonds: 1, maxDiamonds: 10 },
      { minDiamonds: 5, maxDiamonds: 15 },
      { minDiamonds: 20, maxDiamonds: null },
    ]),
    [
      {
        minDiamonds: 1,
        maxDiamonds: 10,
        sound: DEFAULT_GIFT_SOUND_REF,
        volume: 100,
      },
      {
        minDiamonds: 20,
        maxDiamonds: null,
        sound: DEFAULT_GIFT_SOUND_REF,
        volume: 100,
      },
    ],
  );
});

test('ダイヤ帯の音量を 0〜500 に丸める', () => {
  assert.equal(
    normalizeGiftChimeDiamondBands([{ minDiamonds: 1, maxDiamonds: 10, volume: 250 }])[0]
      ?.volume,
    250,
  );
  assert.equal(
    normalizeGiftChimeDiamondBands([{ minDiamonds: 1, maxDiamonds: 10, volume: 999 }])[0]
      ?.volume,
    500,
  );
});

test('ダイヤ帯の重複と逆転を弾く', () => {
  assert.equal(
    validateGiftChimeDiamondBands([
      { minDiamonds: 1, maxDiamonds: 10, sound: DEFAULT_GIFT_SOUND_REF, volume: 100 },
      { minDiamonds: 10, maxDiamonds: 20, sound: DEFAULT_GIFT_SOUND_REF, volume: 100 },
    ]).ok,
    false,
  );
  assert.equal(
    validateGiftChimeDiamondBands([
      { minDiamonds: 1, maxDiamonds: 10, sound: DEFAULT_GIFT_SOUND_REF, volume: 100 },
      { minDiamonds: 11, maxDiamonds: null, sound: DEFAULT_GIFT_SOUND_REF, volume: 100 },
    ]).ok,
    true,
  );
  assert.deepEqual(
    validateGiftChimeDiamondBands([
      { minDiamonds: 20, maxDiamonds: 10, sound: DEFAULT_GIFT_SOUND_REF, volume: 100 },
    ]),
    { ok: false, issue: 'inverted' },
  );
  assert.equal(
    diamondBandsOverlap(
      { minDiamonds: 1, maxDiamonds: 10, sound: DEFAULT_GIFT_SOUND_REF, volume: 100 },
      { minDiamonds: 11, maxDiamonds: 20, sound: DEFAULT_GIFT_SOUND_REF, volume: 100 },
    ),
    false,
  );
});

test('ダイヤ帯の一致は両端を含む', () => {
  const bands = normalizeGiftChimeDiamondBands([
    { minDiamonds: 1, maxDiamonds: 10 },
    { minDiamonds: 11, maxDiamonds: 100 },
  ]);
  assert.equal(findGiftChimeDiamondBand(10, bands)?.minDiamonds, 1);
  assert.equal(findGiftChimeDiamondBand(11, bands)?.minDiamonds, 11);
  assert.equal(findGiftChimeDiamondBand(50, bands)?.minDiamonds, 11);
  assert.equal(findGiftChimeDiamondBand(0, bands), null);
  assert.equal(findGiftChimeDiamondBand(101, bands), null);
});

test('帯の音がテンプレなら内蔵チャリン、ファイルなら帯の音', () => {
  const file = { kind: 'file' as const, fileName: 'band.wav' };
  assert.deepEqual(
    resolveGiftChimeBandSound({
      minDiamonds: 1,
      maxDiamonds: null,
      sound: DEFAULT_GIFT_SOUND_REF,
      volume: 100,
    }),
    DEFAULT_GIFT_SOUND_REF,
  );
  assert.deepEqual(
    resolveGiftChimeBandSound({
      minDiamonds: 1,
      maxDiamonds: null,
      sound: file,
      volume: 100,
    }),
    file,
  );
  assert.equal(resolveGiftChimeBandSound(null), null);
});

test('ギフト別音量は 0〜500 に丸める', () => {
  assert.equal(normalizeGiftChimeVolume(55.6), 56);
  assert.equal(normalizeGiftChimeVolume(-1), 0);
  assert.equal(normalizeGiftChimeVolume(200), 200);
  assert.equal(normalizeGiftChimeVolume(999), MAX_GIFT_CHIME_VOLUME);
  assert.equal(normalizeGiftChimeVolume(''), DEFAULT_GIFT_CHIME_VOLUME);
  assert.deepEqual(normalizeGiftChimeVolumeById({ rose: 40, '': 10, bad: 'x' }), {
    rose: 40,
    bad: DEFAULT_GIFT_CHIME_VOLUME,
  });
  assert.equal(giftChimeVolumeForId('rose', { rose: 25 }), 25);
  assert.equal(giftChimeVolumeForId('other', { rose: 25 }), DEFAULT_GIFT_CHIME_VOLUME);
  assert.equal(giftChimeVolumeToGain(50), 0.5);
  assert.equal(giftChimeVolumeToGain(500), 5);
});

test('テンプレ音は共通音量、個別ファイル音だけギフト別音量', () => {
  const bySound = {
    rose: { kind: 'file' as const, fileName: 'rose.wav' },
    heart: { kind: 'template' as const, id: 'default' as const },
  };
  const byVolume = { rose: 40, heart: 10, leftover: 20 };
  assert.equal(
    resolveGiftChimeVolume({
      giftId: 'rose',
      byGiftIdSound: bySound,
      byGiftIdVolume: byVolume,
      commonVolume: 180,
    }),
    40,
  );
  assert.equal(
    resolveGiftChimeVolume({
      giftId: 'heart',
      byGiftIdSound: bySound,
      byGiftIdVolume: byVolume,
      commonVolume: 180,
    }),
    180,
  );
  assert.equal(
    resolveGiftChimeVolume({
      giftId: 'other',
      byGiftIdSound: bySound,
      byGiftIdVolume: byVolume,
      commonVolume: 180,
    }),
    180,
  );
  assert.deepEqual(pruneGiftChimeVolumeById(byVolume, bySound), { rose: 40 });
});
