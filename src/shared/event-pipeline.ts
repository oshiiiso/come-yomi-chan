import {
  hasCommentUrl,
  isEmoteOnlyComment,
  isListedUser,
  isMentionComment,
  stripCommentUrls,
} from './comment-filters';
import { shouldSkipRestrictedCommentSpeech } from './speech-filters';
import { isPortalSendEvent } from './portal-event';
import { isSuperFanBoxEvent } from './super-fan-event';
import type { AppConfig, OverlayEventType, OverlayUser } from './types';

export interface EventPlanOptions {
  silent?: boolean;
  forceDisplay?: boolean;
  forceSpeak?: boolean;
  skipFilters?: boolean;
}

export interface SpeechPlanEvent {
  type: OverlayEventType;
  comment: string;
  diamondCount: number;
  giftName?: string;
  user: Pick<
    OverlayUser,
    'uniqueId' | 'nickname' | 'isFanClub' | 'isSuperFan' | 'fanClubLevel'
  > & { isAnchor?: boolean };
}

export function isGiftLikeEvent(event: {
  type?: string;
  giftName?: string;
}): boolean {
  return (
    event.type === 'gift' ||
    event.type === 'envelope' ||
    isSuperFanBoxEvent(event) ||
    isPortalSendEvent(event)
  );
}

export function resolveShowDisplay(
  options: EventPlanOptions,
  toggleDisplay: boolean,
): boolean {
  return Boolean(options.forceDisplay || toggleDisplay);
}

export function resolveEventSpeech(params: {
  event: SpeechPlanEvent;
  config: Pick<
    AppConfig,
    | 'minGiftDiamonds'
    | 'skipMentionSpeech'
    | 'skipUrlSpeech'
    | 'skipAnchorSpeech'
    | 'skipEmoteSpeech'
    | 'speakFanSubOnly'
    | 'speakFanMinLevel'
    | 'speakSubscriberComments'
    | 'skipRepeatSpeech'
    | 'mutedUsers'
  >;
  options: EventPlanOptions;
  toggleSpeak: boolean;
  repeatWouldSkip: boolean;
  varsComment: string;
}): { shouldSpeak: boolean; speechComment: string } {
  let shouldSpeak = (params.options.forceSpeak || params.toggleSpeak) && !params.options.silent;
  if (
    shouldSpeak &&
    isGiftLikeEvent(params.event) &&
    !params.options.skipFilters &&
    params.event.diamondCount < params.config.minGiftDiamonds
  ) {
    shouldSpeak = false;
  }
  let speechComment = params.varsComment;
  if (shouldSpeak && params.event.type === 'comment') {
    if (params.config.skipMentionSpeech && isMentionComment(params.event.comment)) {
      shouldSpeak = false;
    } else if (params.config.skipUrlSpeech && hasCommentUrl(params.event.comment)) {
      const spokenComment = stripCommentUrls(params.event.comment);
      if (!spokenComment) {
        shouldSpeak = false;
      } else {
        speechComment = spokenComment;
      }
    }
    if (
      shouldSpeak &&
      params.config.skipAnchorSpeech &&
      !params.options.skipFilters &&
      params.event.user.isAnchor === true
    ) {
      shouldSpeak = false;
    }
    if (shouldSpeak && params.config.skipEmoteSpeech && isEmoteOnlyComment(params.event.comment)) {
      shouldSpeak = false;
    }
    if (
      !params.options.skipFilters &&
      shouldSkipRestrictedCommentSpeech(params.event.type, params.event.user, {
        enabled: params.config.speakFanSubOnly,
        minFanLevel: params.config.speakFanMinLevel,
        speakSubscriber: params.config.speakSubscriberComments,
      })
    ) {
      shouldSpeak = false;
    }
    if (shouldSpeak && params.config.skipRepeatSpeech && !params.options.skipFilters && params.repeatWouldSkip) {
      shouldSpeak = false;
    }
  }
  if (
    shouldSpeak &&
    !params.options.skipFilters &&
    isListedUser(params.event.user, params.config.mutedUsers ?? [])
  ) {
    shouldSpeak = false;
  }
  return { shouldSpeak, speechComment };
}
