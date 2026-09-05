export interface TikTokSessionConfig {
  sessionId: string;
  ttTargetIdc: string;
  authenticateWs: boolean;
}

function truthyEnv(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

export function readTikTokSessionConfig(
  env: NodeJS.ProcessEnv = process.env,
): TikTokSessionConfig | null {
  const sessionId =
    String(env.TIKTOK_SESSION_ID || env.TIKTOK_SESSIONID || '').trim();
  const ttTargetIdc =
    String(env.TIKTOK_TARGET_IDC || env.TIKTOK_TT_TARGET_IDC || '').trim();
  if (!sessionId && !ttTargetIdc) {
    return null;
  }
  if (!sessionId || !ttTargetIdc) {
    return null;
  }
  return {
    sessionId,
    ttTargetIdc,
    authenticateWs: truthyEnv(env.TIKTOK_AUTHENTICATE_WS),
  };
}

export function tikTokSessionConnectionOptions(
  session: TikTokSessionConfig | null,
): Record<string, unknown> {
  if (!session) {
    return {};
  }
  return {
    authenticateWs: session.authenticateWs,
    session: {
      cookie: {
        type: 'cookie',
        value: {
          sessionId: session.sessionId,
          ttTargetIdc: session.ttTargetIdc,
        },
      },
    },
  };
}
