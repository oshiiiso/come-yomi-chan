import { MSG } from '../shared/messages';
import { LiveConnectionState } from '../shared/types';

export type TikTokConnectKind = 'not-live' | 'user' | 'network' | 'sign' | 'unknown';

export function classifyTikTokConnectError(message: string): TikTokConnectKind {
  const text = message.toLowerCase();
  if (!text.trim()) {
    return 'not-live';
  }

  if (
    /uniqueid|user not found|unknown user|invalid user|no user|ユーザーが見つかりません/.test(
      text,
    )
  ) {
    return 'user';
  }

  if (
    /not live|offline|not in live|live has ended|ended the live|配信が始まっていません|配信は終了/.test(
      text,
    )
  ) {
    return 'not-live';
  }

  if (/room_id|roomid|retrieve room/.test(text)) {
    return 'not-live';
  }

  if (
    /business plan|eulerstream|sign server|signature|signapi|premium feature|empty payload|fetchwebcastsignature|fetchsignedwebsocket|sign a request/.test(
      text,
    )
  ) {
    return 'sign';
  }

  if (
    /enotfound|econnrefused|econnreset|etimedout|enetunreach|eai_again|network|fetch failed|socket|timeout|時間切れ|繋がりません/.test(
      text,
    )
  ) {
    return 'network';
  }

  return 'unknown';
}

export function tikTokStatusMessage(message: string): string {
  switch (classifyTikTokConnectError(message)) {
    case 'not-live':
      return MSG.connection.notLive;
    case 'user':
      return MSG.connection.userNotFound;
    case 'network':
      return MSG.connection.networkFailed;
    case 'sign':
      return MSG.connection.signFailed;
    default:
      return MSG.connection.connectFailed;
  }
}

export function tikTokStatusState(message: string): Extract<
  LiveConnectionState,
  'waiting_live' | 'error'
> {
  return classifyTikTokConnectError(message) === 'not-live' ? 'waiting_live' : 'error';
}

export function tikTokRetryMessage(message: string, delayMs: number): string {
  const seconds = Math.max(1, Math.round(delayMs / 1000));
  return MSG.connection.retrying(tikTokStatusMessage(message), seconds);
}
