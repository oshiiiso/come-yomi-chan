import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { IpcChannels } from '../../shared/ipc-channels';

test('preload は electron 以外を import しない', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'main', 'preload.ts'), 'utf8');
  const imports = [...source.matchAll(/^import .+ from ['"]([^'"]+)['"]/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ['electron']);
});

test('preload の IPC 名は IpcChannels と一致する', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'main', 'preload.ts'), 'utf8');
  for (const channel of Object.values(IpcChannels)) {
    assert.match(source, new RegExp(`['"]${channel}['"]`), `${channel} が preload に無い`);
  }
});
