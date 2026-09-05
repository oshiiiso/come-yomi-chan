import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

function startWorker(): ReturnType<typeof spawn> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'windows-tts-worker.ps1');
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    { windowsHide: true },
  );
  child.stdout?.setEncoding('utf8');
  return child;
}

function readLine(child: ReturnType<typeof spawn>, leftover: { text: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('読み上げワーカーの応答がありません'));
    }, 20_000);

    const takeLine = (): boolean => {
      const newline = leftover.text.indexOf('\n');
      if (newline < 0) {
        return false;
      }
      const line = leftover.text.slice(0, newline).trim();
      leftover.text = leftover.text.slice(newline + 1);
      if (!line) {
        return takeLine();
      }
      clearTimeout(timer);
      resolve(line);
      return true;
    };

    if (takeLine()) {
      return;
    }

    const onData = (chunk: string): void => {
      leftover.text += chunk;
      if (takeLine()) {
        child.stdout?.off('data', onData);
      }
    };

    child.stdout?.on('data', onData);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

test('Windows TTSワーカーが指定した声で wav を書き出す', async (t) => {
  if (process.platform !== 'win32') {
    t.skip('Windowsのみ');
    return;
  }

  const leftover = { text: '' };
  const child = startWorker();
  const outPath = path.join(os.tmpdir(), `come-yomi-chan-test-${process.pid}.wav`);
  const ziraPath = path.join(os.tmpdir(), `come-yomi-chan-zira-${process.pid}.wav`);

  try {
    child.stdin?.write(`${JSON.stringify({ id: '1', cmd: 'voices' })}\n`);
    const voicesLine = await readLine(child, leftover);
    const voicesParsed = JSON.parse(voicesLine) as {
      id: string;
      ok: boolean;
      voices?: Array<{ id: string; name: string }>;
      error?: string;
    };
    assert.equal(voicesParsed.ok, true, voicesParsed.error ?? 'voices が失敗しました');
    const voices = Array.isArray(voicesParsed.voices)
      ? voicesParsed.voices
      : voicesParsed.voices
        ? [voicesParsed.voices]
        : [];

    child.stdin?.write(
      `${JSON.stringify({ id: '2', cmd: 'speak', text: 'テスト', out: outPath })}\n`,
    );
    const speakLine = await readLine(child, leftover);
    const spoken = JSON.parse(speakLine) as { id: string; ok: boolean; error?: string };
    assert.equal(spoken.ok, true, spoken.error ?? 'speak が失敗しました');
    assert.equal(fs.readFileSync(outPath).toString('ascii', 0, 4), 'RIFF');

    const zira = voices.find((voice) => /zira/i.test(voice.id) || /zira/i.test(voice.name));
    if (!zira) {
      t.skip('Zira が入っていない');
      return;
    }

    child.stdin?.write(
      `${JSON.stringify({
        id: '3',
        cmd: 'speak',
        text: 'hello',
        voice: zira.id,
        out: ziraPath,
      })}\n`,
    );
    const ziraLine = await readLine(child, leftover);
    const ziraSpoken = JSON.parse(ziraLine) as { id: string; ok: boolean; error?: string };
    assert.equal(ziraSpoken.ok, true, ziraSpoken.error ?? 'Zira の speak が失敗しました');
    assert.equal(fs.readFileSync(ziraPath).toString('ascii', 0, 4), 'RIFF');
  } finally {
    child.stdin?.write(`${JSON.stringify({ id: '9', cmd: 'quit' })}\n`);
    child.kill();
    for (const filePath of [outPath, ziraPath]) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
});
