export const DEFAULT_VIEWER_EVENT_PANE_PX = 340;
export const MIN_VIEWER_EVENT_PANE_PX = 220;
export const MAX_VIEWER_EVENT_PANE_PX = 720;
export const MIN_VIEWER_COMMENT_PANE_PX = 260;

export const DEFAULT_VIEWER_FONT_SIZE = 20;
export const MIN_VIEWER_FONT_SIZE = 10;
export const MAX_VIEWER_FONT_SIZE = 30;

export type ViewerLayoutMode = 'split' | 'combined' | 'custom';
export const DEFAULT_VIEWER_LAYOUT: ViewerLayoutMode = 'split';

export function normalizeViewerLayout(value: unknown): ViewerLayoutMode {
  if (value === 'combined' || value === 'custom') {
    return value;
  }
  return 'split';
}

export function clampViewerFontSize(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  const px = Number.isFinite(parsed) ? Math.round(parsed) : DEFAULT_VIEWER_FONT_SIZE;
  return Math.min(MAX_VIEWER_FONT_SIZE, Math.max(MIN_VIEWER_FONT_SIZE, px));
}

export function clampViewerEventPanePx(value: unknown, workspaceWidth = 0): number {
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
