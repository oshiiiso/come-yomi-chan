export function isPortalSendEvent(event: { type?: string }): boolean {
  return event.type === 'portal';
}

export function isPortalJoinEvent(event: {
  type?: string;
  giftName?: string;
}): boolean {
  return event.type === 'member' && Boolean(String(event.giftName || '').trim());
}
