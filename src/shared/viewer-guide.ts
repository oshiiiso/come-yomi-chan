import { LiveConnectionState } from './types';

export type ViewerGuideKind = 'hidden' | 'need-id' | 'need-connect' | 'waiting' | 'live';

export function viewerGuideKind(options: {
  hasComments: boolean;
  hasUniqueId: boolean;
  state: LiveConnectionState | string;
}): ViewerGuideKind {
  if (options.hasComments) {
    return 'hidden';
  }
  if (!options.hasUniqueId) {
    return 'need-id';
  }
  if (options.state === 'live') {
    return 'live';
  }
  if (options.state === 'waiting_live' || options.state === 'connecting') {
    return 'waiting';
  }
  return 'need-connect';
}
