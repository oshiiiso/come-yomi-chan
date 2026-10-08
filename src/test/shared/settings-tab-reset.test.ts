import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../../shared/config-store';
import {
  resetSettingsTab,
  SETTINGS_TAB_IDS,
  SETTINGS_TAB_RESET_KEPT_KEYS,
  settingsTabScalarKeys,
  type SettingsTabId,
} from '../../shared/settings-tab-reset';
import type { AppConfig } from '../../shared/types';

const PARTIAL_KEYS = [
  'events',
  'eventAlertEnabled',
  'eventAlertMedia',
  'eventAlertDisplayMsByType',
] as const satisfies readonly (keyof AppConfig)[];

test('タブ初期化の対象は設定キーを取りこぼさず、タブ間で重複しない', () => {
  const owned = new Set<string>();
  for (const tab of SETTINGS_TAB_IDS) {
    for (const key of settingsTabScalarKeys(tab)) {
      assert.equal(owned.has(key), false, `${key} が複数タブにある`);
      owned.add(key);
    }
  }
  for (const key of PARTIAL_KEYS) {
    assert.equal(owned.has(key), false, `${key} がスカラーと部分更新の両方にある`);
    owned.add(key);
  }
  for (const key of SETTINGS_TAB_RESET_KEPT_KEYS) {
    assert.equal(owned.has(key), false, `${key} が残すキーと戻すキーの両方にある`);
    owned.add(key);
  }
  assert.deepEqual([...owned].sort(), Object.keys(DEFAULT_CONFIG).sort());
});

function dirtied(): AppConfig {
  const next = structuredClone(DEFAULT_CONFIG);
  next.uniqueId = 'sample_user';
  next.confirmedUniqueId = 'sample_user';
  next.autoConnectOnStart = true;
  next.overlayPort = 9444;
  next.ngWords = ['ng'];
  next.commentDisplayTemplate = 'comment-changed';
  next.giftDisplayTemplate = 'gift-changed';
  next.followDisplayTemplate = 'follow-changed';
  next.overlayTheme = 'neon';
  next.ttsEngineId = 'voicevox';
  next.alwaysOnTop = true;
  next.viewerLogMaxRows = 2500;
  next.configProfiles = [
    { id: 'p1', name: '保存', updatedAt: '2026-01-01T00:00:00.000Z', config: { ttsRate: 3 } },
  ];
  next.activeConfigProfileId = 'p1';
  next.viewerFontSize = 40;
  next.mainWindowBounds = { x: 1, y: 2, width: 800, height: 600, isMaximized: false };
  next.cachedTestGifts = [{ id: '1', name: 'バラ', imageUrl: '', diamondCount: 1 }];
  for (const key of Object.keys(next.events) as (keyof AppConfig['events'])[]) {
    next.events[key] = { display: false, speak: false };
  }
  next.eventAlertEnabled.gift = false;
  next.eventAlertEnabled.follow = false;
  return next;
}

function reset(tab: SettingsTabId): AppConfig {
  return resetSettingsTab(dirtied(), DEFAULT_CONFIG, tab);
}

test('接続タブは ID だけ戻し、ポートと他タブは残す', () => {
  const next = reset('connect');
  assert.equal(next.uniqueId, '');
  assert.equal(next.confirmedUniqueId, '');
  assert.equal(next.autoConnectOnStart, false);
  assert.equal(next.overlayPort, 9444);
  assert.deepEqual(next.ngWords, ['ng']);
});

test('フィルタタブは一覧だけ空にする', () => {
  const next = reset('filter');
  assert.deepEqual(next.ngWords, []);
  assert.equal(next.uniqueId, 'sample_user');
  assert.equal(next.commentDisplayTemplate, 'comment-changed');
});

test('コメントタブはギフトの表示切替を残す', () => {
  const next = reset('comment');
  assert.equal(next.commentDisplayTemplate, DEFAULT_CONFIG.commentDisplayTemplate);
  assert.deepEqual(next.events.comment, DEFAULT_CONFIG.events.comment);
  assert.deepEqual(next.events.gift, { display: false, speak: false });
  assert.equal(next.giftDisplayTemplate, 'gift-changed');
});

test('ギフトタブはフォローのアラートを残す', () => {
  const next = reset('gift');
  assert.equal(next.giftDisplayTemplate, DEFAULT_CONFIG.giftDisplayTemplate);
  assert.equal(next.eventAlertEnabled.gift, DEFAULT_CONFIG.eventAlertEnabled.gift);
  assert.equal(next.eventAlertEnabled.follow, false);
  assert.equal(next.followDisplayTemplate, 'follow-changed');
  assert.deepEqual(next.cachedTestGifts, dirtied().cachedTestGifts);
});

test('イベントタブはギフト文言を残す', () => {
  const next = reset('events');
  assert.equal(next.followDisplayTemplate, DEFAULT_CONFIG.followDisplayTemplate);
  assert.deepEqual(next.events.follow, DEFAULT_CONFIG.events.follow);
  assert.equal(next.eventAlertEnabled.follow, DEFAULT_CONFIG.eventAlertEnabled.follow);
  assert.equal(next.giftDisplayTemplate, 'gift-changed');
  assert.equal(next.eventAlertEnabled.gift, false);
  assert.equal(next.likeMilestone, DEFAULT_CONFIG.likeMilestone);
});

test('オーバーレイタブはポートを残す', () => {
  const next = reset('look');
  assert.equal(next.overlayTheme, DEFAULT_CONFIG.overlayTheme);
  assert.equal(next.overlayPort, 9444);
  assert.equal(next.uniqueId, 'sample_user');
});

test('読み上げタブは見た目を残す', () => {
  const next = reset('tts');
  assert.equal(next.ttsEngineId, DEFAULT_CONFIG.ttsEngineId);
  assert.equal(next.overlayTheme, 'neon');
});

test('アプリタブはプロファイルと窓位置を残す', () => {
  const next = reset('app');
  assert.equal(next.alwaysOnTop, false);
  assert.equal(next.viewerLogMaxRows, DEFAULT_CONFIG.viewerLogMaxRows);
  assert.equal(next.configProfiles.length, 1);
  assert.equal(next.activeConfigProfileId, 'p1');
  assert.equal(next.viewerFontSize, 40);
  assert.equal(next.mainWindowBounds?.x, 1);
  assert.equal(next.ttsEngineId, 'voicevox');
});
