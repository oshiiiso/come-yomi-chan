import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_VIEWER_DISPLAY } from '../../shared/viewer-event';
import {
  assignTypeToLeaf,
  DEFAULT_VIEWER_DOCK,
  dockLeafToEdge,
  dockPaneCount,
  dockTypeToEdge,
  ensureAllTypes,
  leafIdForType,
  listDockLeaves,
  maxDockPanes,
  normalizeViewerDock,
  pruneDock,
  visibleDockTypes,
} from '../../shared/viewer-dock';

test('表示中の種類だけ窓の上限になる', () => {
  assert.equal(maxDockPanes(DEFAULT_VIEWER_DISPLAY), 7);
  assert.deepEqual(visibleDockTypes({ ...DEFAULT_VIEWER_DISPLAY, like: true }), [
    'comment',
    'gift',
    'follow',
    'share',
    'superFan',
    'envelope',
    'portal',
    'like',
  ]);
});

test('初期配置はコメントとその他の2窓', () => {
  const leaves = listDockLeaves(DEFAULT_VIEWER_DOCK);
  assert.equal(leaves.length, 2);
  assert.deepEqual(leaves[0].types, ['comment']);
  assert.ok(leaves[1].types.includes('gift'));
});

test('古いメンバー欄はスパファンへ寄せる', () => {
  const dock = normalizeViewerDock({
    kind: 'leaf',
    id: 'only',
    types: ['comment', 'subscribe'],
  });
  assert.equal(leafIdForType(dock, 'superFan'), 'only');
  assert.equal(
    listDockLeaves(dock).some((leaf) => leaf.types.includes('subscribe')),
    false,
  );
});

test('壊れた木は初期に戻しつつ種類を欠けさせない', () => {
  const dock = normalizeViewerDock({ kind: 'leaf', id: 'only', types: ['comment'] });
  assert.equal(leafIdForType(dock, 'gift') !== null, true);
  assert.equal(leafIdForType(dock, 'comment'), 'only');
});

test('古い配置にポータルが無くても足す', () => {
  const dock = normalizeViewerDock({
    kind: 'split',
    id: 'dock-root',
    dir: 'h',
    ratio: 0.62,
    a: { kind: 'leaf', id: 'dock-comments', types: ['comment'] },
    b: {
      kind: 'leaf',
      id: 'dock-events',
      types: ['gift', 'follow', 'share', 'superFan', 'envelope', 'like', 'member'],
    },
  });
  assert.equal(leafIdForType(dock, 'portal'), 'dock-events');
});

test('表示オフの種類だけの窓は消す', () => {
  const pruned = pruneDock(DEFAULT_VIEWER_DOCK, {
    ...DEFAULT_VIEWER_DISPLAY,
    gift: false,
    follow: false,
    share: false,
    superFan: false,
    envelope: false,
    portal: false,
    like: false,
    member: false,
  });
  assert.equal(pruned.kind, 'leaf');
  if (pruned.kind === 'leaf') {
    assert.deepEqual(pruned.types, ['comment']);
  }
});

test('種類を別窓へ移せる', () => {
  const next = assignTypeToLeaf(DEFAULT_VIEWER_DOCK, 'gift', 'dock-comments');
  assert.equal(leafIdForType(next, 'gift'), 'dock-comments');
  assert.equal(listDockLeaves(next).some((leaf) => leaf.types.includes('gift') && leaf.id === 'dock-events'), false);
});

test('端にドロップすると新しい窓ができる', () => {
  const next = dockTypeToEdge(DEFAULT_VIEWER_DOCK, 'gift', 'dock-comments', 'right');
  assert.equal(dockPaneCount(next), 3);
  const giftLeaf = listDockLeaves(next).find((leaf) => leaf.types.includes('gift'));
  assert.ok(giftLeaf);
  assert.equal(giftLeaf?.types.includes('comment'), false);
});

test('上限いっぱいなら新しい窓は作らず既存へ移す', () => {
  const display = {
    ...DEFAULT_VIEWER_DISPLAY,
    gift: false,
    follow: false,
    share: false,
    superFan: false,
    envelope: false,
    portal: false,
    like: false,
    member: false,
  };
  const one = pruneDock(DEFAULT_VIEWER_DOCK, display);
  const next = dockTypeToEdge(one, 'comment', listDockLeaves(one)[0].id, 'right', display);
  assert.equal(dockPaneCount(next), 1);
});

test('表示オフの種類も木から消さず、再表示できる', () => {
  const next = dockTypeToEdge(DEFAULT_VIEWER_DOCK, 'gift', 'dock-comments', 'right');
  const pruned = pruneDock(next, {
    ...DEFAULT_VIEWER_DISPLAY,
    gift: false,
  });
  assert.equal(leafIdForType(pruned, 'gift'), null);
  const restored = ensureAllTypes(pruned);
  assert.equal(leafIdForType(restored, 'gift') !== null, true);
  assert.equal(leafIdForType(next, 'like') !== null, true);
});

test('窓どうしをドッキングして上下に分けられる', () => {
  const three = dockTypeToEdge(DEFAULT_VIEWER_DOCK, 'gift', 'dock-comments', 'right');
  const giftId = leafIdForType(three, 'gift');
  const commentId = leafIdForType(three, 'comment');
  assert.ok(giftId && commentId);
  const stacked = dockLeafToEdge(three, giftId, commentId, 'bottom');
  assert.equal(stacked.kind, 'split');
  if (stacked.kind === 'split') {
    assert.equal(stacked.dir === 'v' || stacked.a.kind === 'split' || stacked.b.kind === 'split', true);
  }
  assert.equal(dockPaneCount(stacked) >= 2, true);
});
