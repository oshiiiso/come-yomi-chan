import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';

const logger = getLogger('voicevox-launcher');

const READY_TIMEOUT_MS = 60_000;
const READY_INTERVAL_MS = 500;
const PING_TIMEOUT_MS = 2_000;

export type VoicevoxLaunchStatus =
  | 'already-running'
  | 'launched'
  | 'missing'
  | 'invalid'
  | 'failed'
  | 'timeout';

export interface VoicevoxLaunchResult {
  status: VoicevoxLaunchStatus;
  exePath: string;
}

export function isAllowedVoicevoxExecutable(filePath: string): boolean {
  const trimmed = filePath.trim();
  if (!trimmed || trimmed.includes('\0')) {
    return false;
  }
  if (!path.isAbsolute(trimmed)) {
    return false;
  }
  return path.extname(trimmed).toLowerCase() === '.exe';
}

export function voicevoxCandidatePaths(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const roots = [
    env.LOCALAPPDATA,
    env.ProgramW6432,
    env.ProgramFiles,
    env['ProgramFiles(x86)'],
  ].filter((value): value is string => Boolean(value));

  const extra = env.USERPROFILE
    ? [path.join(env.USERPROFILE, 'AppData', 'Local')]
    : [];

  const dirs = [...roots, ...extra];
  const names = [
    path.join('Programs', 'VOICEVOX', 'VOICEVOX.exe'),
    path.join('VOICEVOX', 'VOICEVOX.exe'),
  ];

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const dir of dirs) {
    for (const name of names) {
      const full = path.join(dir, name);
      if (seen.has(full)) {
        continue;
      }
      seen.add(full);
      candidates.push(full);
    }
  }
  return candidates;
}

export function voicevoxDialogDefaultPath(configuredPath: string): string {
  const resolved = resolveVoicevoxExecutable(configuredPath);
  if (resolved) {
    return resolved;
  }
  const first = voicevoxCandidatePaths()[0];
  return first ? path.dirname(first) : '';
}

export function resolveVoicevoxExecutable(
  configuredPath: string,
  options?: {
    exists?: (filePath: string) => boolean;
    env?: NodeJS.ProcessEnv;
  },
): string {
  const exists = options?.exists ?? pathExists;
  const configured = configuredPath.trim();
  if (isAllowedVoicevoxExecutable(configured) && exists(configured)) {
    return configured;
  }

  for (const candidate of voicevoxCandidatePaths(options?.env ?? process.env)) {
    if (exists(candidate)) {
      return candidate;
    }
  }
  return '';
}

export async function pingVoicevox(
  baseUrl: string,
  timeoutMs = PING_TIMEOUT_MS,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/version`, { method: 'GET', signal: controller.signal });
    return response.ok;
  } catch (error) {
    logger.debug(`VOICEVOXの応答待ち: ${getErrorMessage(error)}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForVoicevoxReady(
  ping: () => Promise<boolean>,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? READY_TIMEOUT_MS;
  const intervalMs = options?.intervalMs ?? READY_INTERVAL_MS;
  const sleep =
    options?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const started = Date.now();

  while (Date.now() - started <= timeoutMs) {
    if (await ping()) {
      return true;
    }
    if (Date.now() - started + intervalMs > timeoutMs) {
      break;
    }
    await sleep(intervalMs);
  }
  return false;
}

export async function spawnVoicevoxProcess(exePath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

export async function ensureVoicevoxRunning(options: {
  configuredPath: string;
  baseUrl: string;
  ping?: (baseUrl: string) => Promise<boolean>;
  spawnProcess?: (exePath: string) => Promise<void>;
  wait?: typeof waitForVoicevoxReady;
  exists?: (filePath: string) => boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<VoicevoxLaunchResult> {
  const ping = options.ping ?? pingVoicevox;
  const spawnProcess = options.spawnProcess ?? spawnVoicevoxProcess;
  const wait = options.wait ?? waitForVoicevoxReady;
  const exists = options.exists ?? pathExists;

  if (await ping(options.baseUrl)) {
    return {
      status: 'already-running',
      exePath: resolveVoicevoxExecutable(options.configuredPath, {
        exists,
        env: options.env,
      }),
    };
  }

  const configured = options.configuredPath.trim();
  let exePath = '';
  if (configured) {
    if (!isAllowedVoicevoxExecutable(configured)) {
      return { status: 'invalid', exePath: '' };
    }
    if (!exists(configured)) {
      return { status: 'missing', exePath: configured };
    }
    exePath = configured;
  } else {
    exePath = resolveVoicevoxExecutable('', {
      exists,
      env: options.env,
    });
    if (!exePath) {
      return { status: 'missing', exePath: '' };
    }
  }

  try {
    await spawnProcess(exePath);
  } catch (error) {
    logger.warning(`VOICEVOXの起動に失敗しました: ${getErrorMessage(error)}`);
    return { status: 'failed', exePath };
  }

  const ready = await wait(() => ping(options.baseUrl));
  if (!ready) {
    return { status: 'timeout', exePath };
  }
  return { status: 'launched', exePath };
}

function pathExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error) {
    logger.debug(`VOICEVOX実行ファイルを確認できません: ${getErrorMessage(error)}`);
    return false;
  }
}
