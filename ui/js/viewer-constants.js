// src/shared/viewer-dock.ts / viewer-event.ts と同じ種類。bundler が無いので UI 側にも置く。
const VIEWER_MAX_ROWS = 300;
const EVENT_ORDER = [
  'comment',
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];
const VIEWER_DISPLAY_TYPES = [
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];
const DEFAULT_VIEWER_DISPLAY = {
  comment: true,
  gift: true,
  follow: true,
  share: true,
  subscribe: true,
  superFan: true,
  envelope: true,
  portal: true,
  like: false,
  member: false,
};
const VIEWER_DOCK_TYPES = [
  'comment',
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];
const DEFAULT_VIEWER_DOCK = {
  kind: 'split',
  id: 'dock-root',
  dir: 'h',
  ratio: 0.62,
  a: { kind: 'leaf', id: 'dock-comments', types: ['comment'] },
  b: {
    kind: 'leaf',
    id: 'dock-events',
    types: ['gift', 'follow', 'share', 'superFan', 'envelope', 'portal', 'like', 'member'],
  },
};
