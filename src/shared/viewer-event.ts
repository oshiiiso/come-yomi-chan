import { OverlayEventType, OverlayUser } from './types';

export type ViewerStatusKind = 'connected' | 'disconnected';

export const EMPTY_VIEWER_USER: OverlayUser = {
  uniqueId: '',
  nickname: '',
  avatarUrl: '',
  isFanClub: false,
  fanClubStatus: 0,
  isSuperFan: false,
  fanClubLevel: 0,
  fanClubName: '',
  isModerator: false,
  isAnchor: false,
};

export const VIEWER_MAX_CHARS = 200;
export const VIEWER_MAX_ROWS = 300;

export const VIEWER_DISPLAY_TOGGLE_TYPES = [
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
] as const;

export type ViewerDisplayToggleType = (typeof VIEWER_DISPLAY_TOGGLE_TYPES)[number];

export type ViewerDisplayMap = Record<OverlayEventType, boolean>;

export const DEFAULT_VIEWER_DISPLAY: ViewerDisplayMap = {
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

export interface ViewerEvent {
  type: OverlayEventType;
  user: OverlayUser;
  displayText: string;
  comment: string;
  giftImageUrl: string;
  giftName: string;
  giftCount: number;
  diamondCount: number;
  receivedAt: string;
  sample?: boolean;
  statusKind?: ViewerStatusKind;
}

export function isCommentViewerType(type: OverlayEventType | string): boolean {
  return type === 'comment';
}

export function normalizeViewerDisplay(raw: unknown): ViewerDisplayMap {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const next: ViewerDisplayMap = { ...DEFAULT_VIEWER_DISPLAY };
  next.comment = true;
  for (const type of VIEWER_DISPLAY_TOGGLE_TYPES) {
    if (typeof record[type] === 'boolean') {
      next[type] = record[type];
    }
  }
  next.subscribe = next.superFan;
  return next;
}

/** コメントは常に出す。ほかはコメント画面の表示チェックに従う。配信ソースの表示とは別。 */
export function shouldShowInViewer(
  type: OverlayEventType,
  display: ViewerDisplayMap = DEFAULT_VIEWER_DISPLAY,
): boolean {
  if (type === 'comment') {
    return true;
  }
  const key = type === 'subscribe' ? 'superFan' : type;
  return display[key] === true;
}
