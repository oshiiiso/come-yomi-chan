import { LiveConnectionState } from './types';
import { EMPTY_VIEWER_USER, ViewerEvent, ViewerStatusKind } from './viewer-event';

export type ViewerStatusNoticeKind = 'connected' | 'disconnected';

export interface ViewerStatusNotice {
  kind: ViewerStatusNoticeKind;
  text: string;
}

export interface ViewerStatusCopy {
  connected: string;
  disconnected: string;
  disconnectedFromLive: string;
}

export function pickViewerStatusNotice(
  previous: LiveConnectionState | null | undefined,
  next: LiveConnectionState | null | undefined,
  copy: ViewerStatusCopy,
): ViewerStatusNotice | null {
  if (!previous || !next || previous === next) {
    return null;
  }
  if (next === 'live' && previous !== 'live') {
    return { kind: 'connected', text: copy.connected };
  }
  if (previous === 'live' && next !== 'live') {
    const text = next === 'waiting_live' ? copy.disconnectedFromLive : copy.disconnected;
    return { kind: 'disconnected', text };
  }
  return null;
}

export function buildViewerStatusEvent(notice: ViewerStatusNotice, receivedAt: string): ViewerEvent {
  return {
    type: 'comment',
    user: EMPTY_VIEWER_USER,
    displayText: notice.text,
    comment: '',
    giftImageUrl: '',
    giftName: '',
    giftCount: 0,
    diamondCount: 0,
    receivedAt,
    statusKind: notice.kind as ViewerStatusKind,
  };
}
