function pickViewerStatusNotice(previous, next, copy) {
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
