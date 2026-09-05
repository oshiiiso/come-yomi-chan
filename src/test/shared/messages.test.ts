import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { getRendererCopy } from '../../shared/messages';

test('レンダラ向け文言はIPCで渡せる', () => {
  const copy = structuredClone(getRendererCopy());
  assert.equal(typeof copy.viewerUserMuted, 'string');
  assert.ok(copy.viewerUserMuted.includes('{user}'));
});

test('UI の fallback 文言は getRendererCopy のキーを揃える', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'ui', 'js', 'renderer-copy.js'),
    'utf8',
  );
  const copy = getRendererCopy();
  for (const key of Object.keys(copy)) {
    assert.match(source, new RegExp(`\\b${key}:`), `${key} が renderer-copy.js に無い`);
  }
  for (const key of Object.keys(copy.viewerTypes)) {
    assert.match(
      source,
      new RegExp(`\\b${key}:`),
      `viewerTypes.${key} が renderer-copy.js に無い`,
    );
  }
});
