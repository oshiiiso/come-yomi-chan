import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_UI_THEME,
  normalizeUiTheme,
  resolveUiTheme,
  windowBackgroundFor,
} from '../../shared/ui-theme';

test('アプリの明るさは system / dark / light だけ通す', () => {
  assert.equal(normalizeUiTheme('system'), 'system');
  assert.equal(normalizeUiTheme('dark'), 'dark');
  assert.equal(normalizeUiTheme('light'), 'light');
  assert.equal(normalizeUiTheme('neon'), DEFAULT_UI_THEME);
  assert.equal(normalizeUiTheme(''), DEFAULT_UI_THEME);
});

test('PCの設定に合わせるときは OS のダーク判定を使う', () => {
  assert.equal(resolveUiTheme('system', true), 'dark');
  assert.equal(resolveUiTheme('system', false), 'light');
  assert.equal(resolveUiTheme('dark', false), 'dark');
  assert.equal(resolveUiTheme('light', true), 'light');
});

test('ウィンドウ背景色は解決後のテーマに合わせる', () => {
  assert.equal(windowBackgroundFor('dark', false), '#141517');
  assert.equal(windowBackgroundFor('light', true), '#f4f5f7');
  assert.equal(windowBackgroundFor('system', false), '#f4f5f7');
});
