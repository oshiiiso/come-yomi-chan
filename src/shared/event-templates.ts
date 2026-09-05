import { isPortalJoinEvent } from './portal-event';
import { isSuperFanBoxEvent } from './super-fan-event';
import type { AppConfig, OverlayEventType } from './types';

export function pickEventTemplates(
  config: AppConfig,
  event: { type: OverlayEventType; giftName?: string },
): { display: string; speech: string } {
  switch (event.type) {
    case 'gift':
      return {
        display: config.giftDisplayTemplate,
        speech: config.giftSpeechTemplate,
      };
    case 'follow':
      return {
        display: config.followDisplayTemplate,
        speech: config.followSpeechTemplate,
      };
    case 'share':
      return {
        display: config.shareDisplayTemplate,
        speech: config.shareSpeechTemplate,
      };
    case 'subscribe':
    case 'superFan':
      if (isSuperFanBoxEvent(event)) {
        return {
          display: config.superFanBoxDisplayTemplate,
          speech: config.superFanBoxSpeechTemplate,
        };
      }
      return {
        display: config.superFanDisplayTemplate,
        speech: config.superFanSpeechTemplate,
      };
    case 'envelope':
      return {
        display: config.envelopeDisplayTemplate,
        speech: config.envelopeSpeechTemplate,
      };
    case 'portal':
      return {
        display: config.portalDisplayTemplate,
        speech: config.portalSpeechTemplate,
      };
    case 'like':
      return {
        display: config.likeDisplayTemplate,
        speech: config.likeSpeechTemplate,
      };
    case 'member':
      if (isPortalJoinEvent(event)) {
        return {
          display: config.portalJoinDisplayTemplate,
          speech: config.portalJoinSpeechTemplate,
        };
      }
      return {
        display: config.memberDisplayTemplate,
        speech: config.memberSpeechTemplate,
      };
    default:
      return {
        display: config.commentDisplayTemplate,
        speech: config.commentSpeechTemplate,
      };
  }
}
