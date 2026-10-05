import { MSG } from './messages';
import type { AppConfig, EventToggleMap, LiveConnectionState } from './types';

export function resolveWatcherDisconnect(
  currentState: LiveConnectionState,
  reason: string,
): { state: LiveConnectionState; message: string; fullStop: boolean } | null {
  if (currentState === 'disconnected') {
    return null;
  }
  if (reason === MSG.connection.streamEnded) {
    return {
      state: 'disconnected',
      message: MSG.connection.streamEnded,
      fullStop: true,
    };
  }
  return {
    state: 'waiting_live',
    message: MSG.connection.disconnectedFromLive,
    fullStop: false,
  };
}

function eventSpeakSignature(events: EventToggleMap | undefined): string {
  if (!events || typeof events !== 'object') {
    return '';
  }
  return Object.keys(events)
    .sort()
    .map((key) => {
      const toggle = events[key as keyof EventToggleMap];
      return `${key}:${toggle?.speak ? 1 : 0}`;
    })
    .join('|');
}

export function shouldClearSpeechQueueOnConfigChange(
  previous: Pick<
    AppConfig,
    | 'giftNotifyMode'
    | 'giftSpeakByGiftId'
    | 'minGiftDiamonds'
    | 'mutedUsers'
    | 'blockedUsers'
    | 'events'
    | 'speakFanSubOnly'
    | 'speakFanMinLevel'
    | 'speakFanClubComments'
    | 'speakSubscriberComments'
    | 'commentNotifyMode'
    | 'eventNotifyMode'
    | 'skipMentionSpeech'
    | 'skipUrlSpeech'
    | 'skipAnchorSpeech'
    | 'skipEmoteSpeech'
    | 'skipRepeatSpeech'
    | 'nicknameMap'
    | 'maxSpeechChars'
    | 'commentSpeechTemplate'
    | 'giftSpeechTemplate'
    | 'followSpeechTemplate'
    | 'shareSpeechTemplate'
    | 'superFanSpeechTemplate'
    | 'superFanBoxSpeechTemplate'
    | 'envelopeSpeechTemplate'
    | 'portalSpeechTemplate'
    | 'portalJoinSpeechTemplate'
    | 'likeSpeechTemplate'
    | 'memberSpeechTemplate'
  >,
  next: typeof previous,
): boolean {
  return (
    previous.giftNotifyMode !== next.giftNotifyMode ||
    previous.minGiftDiamonds !== next.minGiftDiamonds ||
    previous.speakFanSubOnly !== next.speakFanSubOnly ||
    previous.speakFanMinLevel !== next.speakFanMinLevel ||
    previous.speakFanClubComments !== next.speakFanClubComments ||
    previous.speakSubscriberComments !== next.speakSubscriberComments ||
    previous.commentNotifyMode !== next.commentNotifyMode ||
    JSON.stringify(previous.eventNotifyMode) !== JSON.stringify(next.eventNotifyMode) ||
    previous.skipMentionSpeech !== next.skipMentionSpeech ||
    previous.skipUrlSpeech !== next.skipUrlSpeech ||
    previous.skipAnchorSpeech !== next.skipAnchorSpeech ||
    previous.skipEmoteSpeech !== next.skipEmoteSpeech ||
    previous.skipRepeatSpeech !== next.skipRepeatSpeech ||
    previous.maxSpeechChars !== next.maxSpeechChars ||
    previous.commentSpeechTemplate !== next.commentSpeechTemplate ||
    previous.giftSpeechTemplate !== next.giftSpeechTemplate ||
    previous.followSpeechTemplate !== next.followSpeechTemplate ||
    previous.shareSpeechTemplate !== next.shareSpeechTemplate ||
    previous.superFanSpeechTemplate !== next.superFanSpeechTemplate ||
    previous.superFanBoxSpeechTemplate !== next.superFanBoxSpeechTemplate ||
    previous.envelopeSpeechTemplate !== next.envelopeSpeechTemplate ||
    previous.portalSpeechTemplate !== next.portalSpeechTemplate ||
    previous.portalJoinSpeechTemplate !== next.portalJoinSpeechTemplate ||
    previous.likeSpeechTemplate !== next.likeSpeechTemplate ||
    previous.memberSpeechTemplate !== next.memberSpeechTemplate ||
    eventSpeakSignature(previous.events) !== eventSpeakSignature(next.events) ||
    JSON.stringify(previous.giftSpeakByGiftId) !== JSON.stringify(next.giftSpeakByGiftId) ||
    JSON.stringify(previous.mutedUsers) !== JSON.stringify(next.mutedUsers) ||
    JSON.stringify(previous.blockedUsers) !== JSON.stringify(next.blockedUsers) ||
    JSON.stringify(previous.nicknameMap) !== JSON.stringify(next.nicknameMap)
  );
}
