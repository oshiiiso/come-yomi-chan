import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../shared/config-store';
import {
  OVERLAY_BOARD_MAX,
  OVERLAY_BOARD_WIDGET_MAX,
  OVERLAY_BOARD_WIDGET_MIN_PX,
  clampOverlayBoardRect,
  createOverlayBoard,
  createOverlayBoardWidget,
  defaultOverlayBoards,
  normalizeOverlayBoards,
  overlayRankingBroadcastPlan,
  resizeOverlayBoardWidget,
} from '../../shared/overlay-board';
import type { OverlayBoardRankingSettings } from '../../shared/overlay-board';

test('配置が無い設定は横1枚と縦1枚', () => {
  const boards = normalizeOverlayBoards(undefined, DEFAULT_CONFIG);
  assert.equal(boards.length, 2);
  assert.equal(boards[0]?.orientation, 'landscape');
  assert.equal(boards[1]?.orientation, 'portrait');
  assert.equal(boards[0]?.widgets.length, 3);
  assert.equal(boards[0]?.showGuide, true);
  assert.deepEqual(
    boards[0]?.widgets.map((widget) => widget.kind),
    ['chat', 'ranking', 'alerts'],
  );
});

test('空配列は0枚のまま', () => {
  assert.deepEqual(normalizeOverlayBoards([], DEFAULT_CONFIG), []);
});

test('枠は最小サイズより小さくならず、一部はキャンバス内に残る', () => {
  const rect = clampOverlayBoardRect(
    { x: -5000, y: 9000, width: 10, height: 10 },
    'landscape',
    { x: 0, y: 0, width: 200, height: 200 },
  );
  assert.ok(rect.width >= OVERLAY_BOARD_WIDGET_MIN_PX);
  assert.ok(rect.height >= OVERLAY_BOARD_WIDGET_MIN_PX);
  assert.ok(rect.x + rect.width >= 48);
  assert.ok(rect.y + rect.height >= 48);
  assert.ok(rect.x < 1920);
  assert.ok(rect.y < 1080);
});

test('空白キャンバスは枠なし。テンプレートは3つ', () => {
  const blank = createOverlayBoard({
    orientation: 'landscape',
    template: false,
    config: DEFAULT_CONFIG,
    id: 'b_blank',
    name: '空',
  });
  assert.equal(blank.widgets.length, 0);
  const filled = createOverlayBoard({
    orientation: 'portrait',
    template: true,
    config: DEFAULT_CONFIG,
    id: 'b_fill',
    name: '縦',
  });
  assert.equal(filled.widgets.length, 3);
});

test('キャンバスと配置は上限で切る', () => {
  const widgets = Array.from({ length: OVERLAY_BOARD_WIDGET_MAX + 5 }, (_item, index) => ({
    id: `w_${index}`,
    kind: 'chat',
    name: `コメント ${index}`,
    visible: true,
    x: 40,
    y: 40,
    width: 200,
    height: 200,
    settings: {},
  }));
  const boards = Array.from({ length: OVERLAY_BOARD_MAX + 3 }, (_item, index) => ({
    id: `b_${index}`,
    name: `横 ${index}`,
    orientation: 'landscape',
    showGuide: false,
    widgets,
  }));
  const normalized = normalizeOverlayBoards(boards, DEFAULT_CONFIG);
  assert.equal(normalized.length, OVERLAY_BOARD_MAX);
  assert.equal(normalized[0]?.widgets.length, OVERLAY_BOARD_WIDGET_MAX);
});

test('初期配置はキャンバスの中に収まる', () => {
  for (const board of defaultOverlayBoards(DEFAULT_CONFIG)) {
    const width = board.orientation === 'portrait' ? 1080 : 1920;
    const height = board.orientation === 'portrait' ? 1920 : 1080;
    for (const widget of board.widgets) {
      assert.ok(widget.width >= OVERLAY_BOARD_WIDGET_MIN_PX);
      assert.ok(widget.height >= OVERLAY_BOARD_WIDGET_MIN_PX);
      assert.ok(widget.x >= 0 && widget.y >= 0);
      assert.ok(widget.x + widget.width <= width);
      assert.ok(widget.y + widget.height <= height);
    }
  }
});

function rankingBoard(
  settings: Partial<OverlayBoardRankingSettings>,
  visible = true,
) {
  const widget = createOverlayBoardWidget({
    kind: 'ranking',
    orientation: 'landscape',
    config: DEFAULT_CONFIG,
    now: 3,
    rand: 0.3,
  });
  widget.visible = visible;
  widget.settings = { ...(widget.settings as OverlayBoardRankingSettings), ...settings };
  const board = createOverlayBoard({
    orientation: 'landscape',
    template: false,
    config: DEFAULT_CONFIG,
    now: 1,
    rand: 0.1,
  });
  board.widgets = [widget];
  return [board];
}

test('Alt では中身の大きさを保って枠だけ動く', () => {
  const origin = {
    x: 100,
    y: 80,
    width: 400,
    height: 300,
    contentX: 0,
    contentY: 0,
    contentWidth: 400,
    contentHeight: 300,
  };
  const cropped = resizeOverlayBoardWidget({
    orientation: 'landscape',
    handle: 'e',
    alt: true,
    origin,
    dx: -80,
    dy: 0,
  });
  assert.equal(cropped.width, 320);
  assert.equal(cropped.x, 100);
  assert.equal(cropped.contentWidth, 400);
  assert.equal(cropped.contentX, 0);
  const blocked = resizeOverlayBoardWidget({
    orientation: 'landscape',
    handle: 'e',
    alt: true,
    origin,
    dx: 50,
    dy: 0,
  });
  assert.equal(blocked.width, 400);
  assert.equal(blocked.contentWidth, 400);
  const fromLeft = resizeOverlayBoardWidget({
    orientation: 'landscape',
    handle: 'w',
    alt: true,
    origin,
    dx: 60,
    dy: 0,
  });
  assert.equal(fromLeft.x, 160);
  assert.equal(fromLeft.width, 340);
  assert.equal(fromLeft.contentWidth, 400);
  assert.equal(fromLeft.contentX, -60);
  const resized = resizeOverlayBoardWidget({
    orientation: 'landscape',
    handle: 'e',
    alt: false,
    origin,
    dx: 40,
    dy: 0,
  });
  assert.equal(resized.width, 440);
  assert.equal(resized.height, 330);
  assert.equal(resized.x, 100);
  assert.equal(resized.y, 65);
  assert.equal(resized.contentWidth, 440);
  assert.equal(resized.contentHeight, 330);
  assert.equal(resized.contentX, 0);
  assert.equal(resized.layoutWidth, 400);
  assert.equal(resized.layoutHeight, 300);
  assert.equal(cropped.layoutWidth, 400);
  const moved = resizeOverlayBoardWidget({
    orientation: 'landscape',
    handle: '',
    alt: true,
    origin: fromLeft,
    dx: 10,
    dy: 0,
  });
  assert.equal(moved.x, 170);
  assert.equal(moved.contentX, -60);
  assert.equal(moved.contentWidth, 400);
  const scaled = resizeOverlayBoardWidget({
    orientation: 'landscape',
    handle: 'e',
    alt: false,
    origin: fromLeft,
    dx: 80,
    dy: 0,
  });
  assert.equal(scaled.width, 420);
  assert.equal(scaled.contentX, -74);
  assert.equal(scaled.contentWidth, 494);
});

test('ランキング配信は全体設定と配置の両方を見る', () => {
  const off = {
    overlayLikeRankingEnabled: false,
    overlayRankingMode: 'likes',
    overlayRankingLikeSyncMode: 'live',
    overlayRankingLikePollSec: 30,
    overlayBoards: [],
  };
  assert.deepEqual(overlayRankingBroadcastPlan(off), {
    likesImmediate: false,
    diamondsImmediate: false,
    likePollSec: null,
  });
  assert.equal(
    overlayRankingBroadcastPlan({ ...off, overlayLikeRankingEnabled: true }).likesImmediate,
    true,
  );
  assert.equal(
    overlayRankingBroadcastPlan({
      ...off,
      overlayLikeRankingEnabled: true,
      overlayRankingMode: 'diamonds',
    }).diamondsImmediate,
    true,
  );
  assert.equal(
    overlayRankingBroadcastPlan({
      ...off,
      overlayLikeRankingEnabled: true,
      overlayRankingLikeSyncMode: 'poll',
      overlayRankingLikePollSec: 30,
    }).likePollSec,
    30,
  );
  assert.equal(
    overlayRankingBroadcastPlan({
      ...off,
      overlayBoards: rankingBoard({ enabled: true, mode: 'likes', likeSyncMode: 'live' }),
    }).likesImmediate,
    true,
  );
  assert.equal(
    overlayRankingBroadcastPlan({
      ...off,
      overlayBoards: rankingBoard({ enabled: true, mode: 'diamonds' }),
    }).diamondsImmediate,
    true,
  );
  assert.equal(
    overlayRankingBroadcastPlan({
      ...off,
      overlayLikeRankingEnabled: true,
      overlayRankingLikeSyncMode: 'poll',
      overlayRankingLikePollSec: 30,
      overlayBoards: rankingBoard({ enabled: true, mode: 'likes', likeSyncMode: 'poll', likePollSec: 10 }),
    }).likePollSec,
    10,
  );
  assert.equal(
    overlayRankingBroadcastPlan({
      ...off,
      overlayBoards: rankingBoard({ enabled: true, mode: 'likes', likeSyncMode: 'live' }, false),
    }).likesImmediate,
    false,
  );
  assert.equal(
    overlayRankingBroadcastPlan({
      ...off,
      overlayBoards: rankingBoard({ enabled: false, mode: 'likes', likeSyncMode: 'live' }),
    }).likesImmediate,
    false,
  );
});
