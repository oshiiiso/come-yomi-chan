import { MSG } from './messages';
import { isPortalJoinEvent } from './portal-event';
import { isSuperFanBoxEvent } from './super-fan-event';
import { canonicalOverlayType, type OverlayEventType } from './types';

/** `{event}` に入れる短いイベント名。 */
export function templateEventLabel(event: {
  type: OverlayEventType;
  giftName?: string;
}): string {
  if (isSuperFanBoxEvent(event)) {
    return MSG.template.eventLabel.superFanBox;
  }
  if (isPortalJoinEvent(event)) {
    return MSG.template.eventLabel.member;
  }
  const type = canonicalOverlayType(event.type);
  switch (type) {
    case 'comment':
      return MSG.template.eventLabel.comment;
    case 'gift':
      return MSG.template.eventLabel.gift;
    case 'follow':
      return MSG.template.eventLabel.follow;
    case 'share':
      return MSG.template.eventLabel.share;
    case 'superFan':
    case 'subscribe':
      return MSG.template.eventLabel.superFan;
    case 'envelope':
      return MSG.template.eventLabel.envelope;
    case 'portal':
      return MSG.template.eventLabel.portal;
    case 'like':
      return MSG.template.eventLabel.like;
    case 'member':
      return MSG.template.eventLabel.member;
    default:
      return MSG.template.eventLabel.comment;
  }
}
