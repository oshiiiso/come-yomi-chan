// src/shared/viewer-layout.ts と同じ範囲。bundler が無いので UI 側にも置く。
const DEFAULT_VIEWER_EVENT_PANE_PX = 340;
const MIN_VIEWER_EVENT_PANE_PX = 220;
const MAX_VIEWER_EVENT_PANE_PX = 720;
const MIN_VIEWER_COMMENT_PANE_PX = 260;

const DEFAULT_VIEWER_FONT_SIZE = 20;
const MIN_VIEWER_FONT_SIZE = 10;
const MAX_VIEWER_FONT_SIZE = 30;

const DEFAULT_VIEWER_LAYOUT = 'split';

function normalizeViewerLayout(value) {
  if (value === 'combined' || value === 'custom') {
    return value;
  }
  return 'split';
}

function clampViewerFontSize(value) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  const px = Number.isFinite(parsed) ? Math.round(parsed) : DEFAULT_VIEWER_FONT_SIZE;
  return Math.min(MAX_VIEWER_FONT_SIZE, Math.max(MIN_VIEWER_FONT_SIZE, px));
}

function clampViewerEventPanePx(value, workspaceWidth = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  const fallback = DEFAULT_VIEWER_EVENT_PANE_PX;
  const px = Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  const maxByWindow =
    workspaceWidth > MIN_VIEWER_COMMENT_PANE_PX + MIN_VIEWER_EVENT_PANE_PX
      ? workspaceWidth - MIN_VIEWER_COMMENT_PANE_PX
      : MAX_VIEWER_EVENT_PANE_PX;
  const max = Math.min(
    MAX_VIEWER_EVENT_PANE_PX,
    Math.max(MIN_VIEWER_EVENT_PANE_PX, maxByWindow),
  );
  return Math.min(max, Math.max(MIN_VIEWER_EVENT_PANE_PX, px));
}
