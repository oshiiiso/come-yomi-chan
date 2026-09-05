import { LiveTtsApi } from '../main/preload';

declare global {
  interface Window {
    liveTts: LiveTtsApi;
  }
}

export {};
