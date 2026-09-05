import assert from 'node:assert/strict';
import path from 'path';
import { test } from 'node:test';
import {
  ensureVoicevoxRunning,
  isAllowedVoicevoxExecutable,
  resolveVoicevoxExecutable,
  voicevoxCandidatePaths,
  waitForVoicevoxReady,
} from '../../tts/voicevox-launcher';

test('VOICEVOXの実行ファイルは絶対パスのexeだけ通す', () => {
  assert.equal(isAllowedVoicevoxExecutable('C:\\Apps\\VOICEVOX\\VOICEVOX.exe'), true);
  assert.equal(isAllowedVoicevoxExecutable('C:\\engine\\run.exe'), true);
  assert.equal(isAllowedVoicevoxExecutable('VOICEVOX.exe'), false);
  assert.equal(isAllowedVoicevoxExecutable('C:\\Apps\\VOICEVOX\\VOICEVOX.bat'), false);
  assert.equal(isAllowedVoicevoxExecutable(''), false);
});

test('未指定ならよくあるインストール先からVOICEVOX.exeを探す', () => {
  const env = {
    LOCALAPPDATA: 'C:\\Users\\demo\\AppData\\Local',
    ProgramFiles: 'C:\\Program Files',
  };
  const candidates = voicevoxCandidatePaths(env);
  assert.ok(
    candidates.includes(
      path.join('C:\\Users\\demo\\AppData\\Local', 'Programs', 'VOICEVOX', 'VOICEVOX.exe'),
    ),
  );

  const found = resolveVoicevoxExecutable('', {
    env,
    exists: (filePath) =>
      filePath === path.join('C:\\Program Files', 'VOICEVOX', 'VOICEVOX.exe'),
  });
  assert.equal(found, path.join('C:\\Program Files', 'VOICEVOX', 'VOICEVOX.exe'));
});

test('設定した実行ファイルがあればそれを使う', () => {
  const configured = 'D:\\tools\\VOICEVOX.exe';
  const found = resolveVoicevoxExecutable(configured, {
    exists: (filePath) => filePath === configured,
    env: {},
  });
  assert.equal(found, configured);
});

test('VOICEVOXの応答が来るまで待つ', async () => {
  let tries = 0;
  const ready = await waitForVoicevoxReady(
    async () => {
      tries += 1;
      return tries >= 2;
    },
    {
      timeoutMs: 1_000,
      intervalMs: 1,
      sleep: async () => undefined,
    },
  );
  assert.equal(ready, true);
  assert.equal(tries, 2);
});

test('すでに応答があるときは起動しない', async () => {
  let spawned = false;
  const result = await ensureVoicevoxRunning({
    configuredPath: '',
    baseUrl: 'http://127.0.0.1:50021',
    ping: async () => true,
    spawnProcess: async () => {
      spawned = true;
    },
  });
  assert.equal(result.status, 'already-running');
  assert.equal(spawned, false);
});

test('見つからないときは起動しない', async () => {
  const result = await ensureVoicevoxRunning({
    configuredPath: '',
    baseUrl: 'http://127.0.0.1:50021',
    ping: async () => false,
    exists: () => false,
    env: {},
    spawnProcess: async () => {
      throw new Error('should not spawn');
    },
  });
  assert.equal(result.status, 'missing');
});

test('不正な実行ファイルパスは起動しない', async () => {
  const result = await ensureVoicevoxRunning({
    configuredPath: 'VOICEVOX.bat',
    baseUrl: 'http://127.0.0.1:50021',
    ping: async () => false,
    spawnProcess: async () => {
      throw new Error('should not spawn');
    },
  });
  assert.equal(result.status, 'invalid');
});
