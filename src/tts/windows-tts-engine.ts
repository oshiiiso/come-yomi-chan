import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MSG } from '../shared/messages';
import { getErrorMessage } from '../shared/error-utils';
import { getLogger } from '../shared/logging-config';
import { getScriptsDir } from '../shared/app-paths';
import { TtsEngine, TtsOptions, TtsVoice } from './tts-engine';

const logger = getLogger('windows-tts');

interface WorkerRequest {
  id: string;
  cmd: 'voices' | 'speak' | 'quit';
  text?: string;
  voice?: string;
  rate?: number;
  volume?: number;
  out?: string;
}

interface WorkerResponse {
  id: string;
  ok: boolean;
  error?: string;
  voices?: TtsVoice[];
}

interface PendingCall {
  resolve: (value: WorkerResponse) => void;
  reject: (error: Error) => void;
}

export class WindowsTtsEngine implements TtsEngine {
  readonly id = 'windows';
  readonly label = 'Windows 内蔵TTS';

  private process: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private nextId = 1;
  private readonly pending = new Map<string, PendingCall>();

  async isAvailable(): Promise<boolean> {
    return process.platform === 'win32';
  }

  async listVoices(): Promise<TtsVoice[]> {
    const response = await this.send({ cmd: 'voices' });
    const voices = response.voices;
    if (!voices) {
      return [];
    }
    return Array.isArray(voices) ? voices : [voices];
  }

  async synthesize(text: string, options: TtsOptions): Promise<Buffer> {
    const outPath = path.join(
      os.tmpdir(),
      `come-yomi-chan-${process.pid}-${Date.now()}-${this.nextId}.wav`,
    );

    try {
      const response = await this.send({
        cmd: 'speak',
        text,
        voice: options.voiceId,
        rate: options.rate,
        volume: options.volume,
        out: outPath,
      });

      if (!response.ok) {
        const detail = response.error ?? '';
        if (detail.toLowerCase().includes('voice')) {
          throw new Error(MSG.tts.voiceMissing);
        }
        throw new Error(detail || MSG.tts.synthesizeFailed);
      }

      return fs.readFileSync(outPath);
    } finally {
      try {
        if (fs.existsSync(outPath)) {
          fs.unlinkSync(outPath);
        }
      } catch (error) {
        logger.warning(`一時WAVの削除に失敗しました: ${getErrorMessage(error)}`);
      }
    }
  }

  async dispose(): Promise<void> {
    const child = this.process;
    if (child?.stdin && !child.stdin.destroyed) {
      try {
        child.stdin.write(`${JSON.stringify({ id: '0', cmd: 'quit' })}\n`);
      } catch (error) {
        logger.warning(`読み上げプロセスの終了に失敗しました: ${getErrorMessage(error)}`);
      }
    }
    this.killWorker();
  }

  private isWorkerAlive(): boolean {
    const child = this.process;
    return Boolean(child && child.exitCode === null && !child.killed);
  }

  private failAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private killWorker(): void {
    const child = this.process;
    this.process = null;
    this.buffer = '';
    this.failAllPending(new Error(MSG.tts.workerFailed));
    if (!child) {
      return;
    }
    try {
      if (child.exitCode === null && !child.killed) {
        child.kill();
      }
    } catch (error) {
      logger.warning(`読み上げプロセスの停止に失敗しました: ${getErrorMessage(error)}`);
    }
  }

  private ensureProcess(): ChildProcessWithoutNullStreams {
    if (this.isWorkerAlive() && this.process) {
      return this.process;
    }

    if (this.process) {
      this.killWorker();
    }

    const scriptPath = path.join(getScriptsDir(), 'windows-tts-worker.ps1');
    if (!fs.existsSync(scriptPath)) {
      throw new Error(MSG.tts.workerFailed);
    }

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true },
    );

    child.stderr.setEncoding('utf8');
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => this.onStdout(chunk));
    child.stderr.on('data', (chunk: string) => {
      const text = chunk.trim();
      if (text) {
        logger.warning(`読み上げワーカー: ${text}`);
      }
    });
    child.on('error', (error) => {
      logger.error(`読み上げワーカーを起動できません: ${getErrorMessage(error)}`);
      if (this.process !== child) {
        return;
      }
      this.process = null;
      this.buffer = '';
      this.failAllPending(new Error(MSG.tts.workerFailed));
    });
    child.on('exit', (code) => {
      if (this.process !== child) {
        return;
      }
      logger.warning(`読み上げワーカーが終了しました (code=${code ?? 'null'})`);
      this.process = null;
      this.buffer = '';
      this.failAllPending(new Error(MSG.tts.workerFailed));
    });

    this.process = child;
    this.buffer = '';
    return child;
  }

  private onStdout(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line) {
        this.onLine(line);
      }
      newline = this.buffer.indexOf('\n');
    }
  }

  private onLine(line: string): void {
    let parsed: WorkerResponse;
    try {
      parsed = JSON.parse(line) as WorkerResponse;
    } catch (error) {
      logger.warning(`読み上げワーカーの応答を解釈できません: ${getErrorMessage(error)}`);
      return;
    }

    const pending = this.pending.get(parsed.id);
    if (!pending) {
      return;
    }

    this.pending.delete(parsed.id);
    pending.resolve(parsed);
  }

  private send(
    payload: Omit<WorkerRequest, 'id'>,
  ): Promise<WorkerResponse> {
    const id = String(this.nextId);
    this.nextId += 1;
    let child: ChildProcessWithoutNullStreams;
    try {
      child = this.ensureProcess();
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(MSG.tts.workerFailed),
      );
    }

    return new Promise<WorkerResponse>((resolve, reject) => {
      if (!child.stdin || child.stdin.destroyed || !child.stdin.writable) {
        this.killWorker();
        reject(new Error(MSG.tts.workerFailed));
        return;
      }

      const timer = setTimeout(() => {
        this.pending.delete(id);
        logger.warning('読み上げワーカーが応答しないため再起動します');
        this.killWorker();
        reject(new Error(MSG.tts.synthesizeFailed));
      }, 30_000);

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      const request: WorkerRequest = { id, ...payload };
      child.stdin.write(`${JSON.stringify(request)}\n`, (error) => {
        if (error) {
          this.pending.delete(id);
          clearTimeout(timer);
          this.killWorker();
          reject(error);
        }
      });
    });
  }
}
