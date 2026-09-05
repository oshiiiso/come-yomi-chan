export type WindowKind = 'main' | 'help';

export interface WindowSize {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export const COMPACT_WINDOW_LAYOUT: WindowSize = {
  width: 440,
  height: 720,
  minWidth: 360,
  minHeight: 480,
  maxWidth: 1920,
  maxHeight: 1200,
};

export const WINDOW_LAYOUT: Record<WindowKind, WindowSize> = {
  main: {
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    maxWidth: 1920,
    maxHeight: 1200,
  },
  help: {
    width: 640,
    height: 720,
    minWidth: 480,
    minHeight: 400,
    maxWidth: 900,
    maxHeight: 1000,
  },
};
