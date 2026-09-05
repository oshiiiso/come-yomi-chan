import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_VIEWER_DISPLAY,
  isCommentViewerType,
  normalizeViewerDisplay,
  shouldShowInViewer,
} from '../../shared/viewer-event';

test('コメントだけ左欄に出す', () => {
  assert.equal(isCommentViewerType('comment'), true);
  assert.equal(isCommentViewerType('gift'), false);
  assert.equal(isCommentViewerType('follow'), false);
});

test('初期のコメント画面はいいねと入室以外を出す', () => {
  assert.equal(shouldShowInViewer('comment'), true);
  assert.equal(shouldShowInViewer('gift'), true);
  assert.equal(shouldShowInViewer('follow'), true);
  assert.equal(shouldShowInViewer('portal'), true);
  assert.equal(shouldShowInViewer('like'), false);
  assert.equal(shouldShowInViewer('member'), false);
});

test('コメント画面の表示チェックでギフトやフォローを隠せる', () => {
  const display = normalizeViewerDisplay({ gift: false, follow: false, like: true });
  assert.equal(shouldShowInViewer('comment', display), true);
  assert.equal(shouldShowInViewer('gift', display), false);
  assert.equal(shouldShowInViewer('follow', display), false);
  assert.equal(shouldShowInViewer('like', display), true);
  assert.equal(display.share, DEFAULT_VIEWER_DISPLAY.share);
});

test('旧メンバー通知はスパファンの表示に従う', () => {
  const hidden = normalizeViewerDisplay({ superFan: false });
  assert.equal(hidden.subscribe, false);
  assert.equal(shouldShowInViewer('subscribe', hidden), false);
  assert.equal(shouldShowInViewer('superFan', hidden), false);
  const shown = normalizeViewerDisplay({ superFan: true });
  assert.equal(shouldShowInViewer('subscribe', shown), true);
});
