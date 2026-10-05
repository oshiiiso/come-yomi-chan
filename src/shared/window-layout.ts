export type WindowKind = 'main' | 'help';

export interface WindowSize {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  /** 無いときはモニタ最大化を妨げない */
  maxWidth?: number;
  maxHeight?: number;
}

export const COMPACT_WINDOW_LAYOUT: WindowSize = {
  width: 440,
  height: 720,
  minWidth: 360,
  minHeight: 480,
};

export const WINDOW_LAYOUT: Record<WindowKind, WindowSize> = {
  main: {
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
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

/** Electron の上限解除用（実モニタより十分大きく） */
export const WINDOW_SIZE_NO_MAX = 16384;
