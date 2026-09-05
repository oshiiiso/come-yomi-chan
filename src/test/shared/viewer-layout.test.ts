import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_VIEWER_EVENT_PANE_PX,
  DEFAULT_VIEWER_FONT_SIZE,
  DEFAULT_VIEWER_LAYOUT,
  MAX_VIEWER_FONT_SIZE,
  MIN_VIEWER_EVENT_PANE_PX,
  MIN_VIEWER_FONT_SIZE,
  clampViewerEventPanePx,
  clampViewerFontSize,
  normalizeViewerLayout,
} from '../../shared/viewer-layout';

test('イベント欄の幅の初期値と範囲', () => {
  assert.equal(clampViewerEventPanePx(undefined), DEFAULT_VIEWER_EVENT_PANE_PX);
  assert.equal(clampViewerEventPanePx(340), 340);
  assert.equal(clampViewerEventPanePx(10), MIN_VIEWER_EVENT_PANE_PX);
  assert.equal(clampViewerEventPanePx(9000), 720);
});

test('ウィンドウが狭いときはコメント側の幅を残す', () => {
  assert.equal(clampViewerEventPanePx(500, 600), 340);
  assert.equal(clampViewerEventPanePx(220, 600), 220);
});

test('コメント画面のレイアウトはまとめる・分ける・自由配置だけ通す', () => {
  assert.equal(normalizeViewerLayout(undefined), DEFAULT_VIEWER_LAYOUT);
  assert.equal(normalizeViewerLayout('split'), 'split');
  assert.equal(normalizeViewerLayout('combined'), 'combined');
  assert.equal(normalizeViewerLayout('custom'), 'custom');
  assert.equal(normalizeViewerLayout('other'), 'split');
});

test('コメント画面の文字サイズは範囲内に収める', () => {
  assert.equal(DEFAULT_VIEWER_FONT_SIZE, (MIN_VIEWER_FONT_SIZE + MAX_VIEWER_FONT_SIZE) / 2);
  assert.equal(clampViewerFontSize(undefined), DEFAULT_VIEWER_FONT_SIZE);
  assert.equal(clampViewerFontSize(18), 18);
  assert.equal(clampViewerFontSize(1), MIN_VIEWER_FONT_SIZE);
  assert.equal(clampViewerFontSize(90), MAX_VIEWER_FONT_SIZE);
});
