import { BrowserWindow } from 'electron';
import { WINDOW_LAYOUT, WINDOW_SIZE_NO_MAX, WindowKind, WindowSize } from '../../shared/window-layout';

export type { WindowKind };

export interface FitWindowResult {
  width: number;
  height: number;
  capped: boolean;
}

export function applyWindowSizeLimits(window: BrowserWindow, layout: WindowSize): void {
  window.setMinimumSize(layout.minWidth, layout.minHeight);
  window.setMaximumSize(
    layout.maxWidth ?? WINDOW_SIZE_NO_MAX,
    layout.maxHeight ?? WINDOW_SIZE_NO_MAX,
  );
}

export function fitWindowToContent(
  window: BrowserWindow,
  contentWidth: number,
  contentHeight: number,
  kind: WindowKind,
): FitWindowResult {
  const options = WINDOW_LAYOUT[kind];
  const maxWidth = options.maxWidth ?? WINDOW_SIZE_NO_MAX;
  const maxHeight = options.maxHeight ?? WINDOW_SIZE_NO_MAX;

  if (!Number.isFinite(contentWidth) || !Number.isFinite(contentHeight)) {
    return {
      width: options.minWidth,
      height: options.minHeight,
      capped: false,
    };
  }

  const width = Math.min(maxWidth, Math.max(options.minWidth, Math.ceil(contentWidth)));
  const naturalHeight = Math.ceil(contentHeight);
  const capped = Boolean(options.maxHeight && naturalHeight > options.maxHeight);
  const height = Math.min(maxHeight, Math.max(options.minHeight, naturalHeight));

  window.setContentSize(width, height);

  return { width, height, capped };
}
