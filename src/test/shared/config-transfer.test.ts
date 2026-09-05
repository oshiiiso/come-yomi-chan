import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../../shared/config-store';
import {
  CONFIG_EXPORT_APP,
  buildConfigExport,
  configExportFileName,
  parseConfigExport,
} from '../../shared/config-transfer';

test('書き出しはアプリ名と設定を入れる', () => {
  const payload = buildConfigExport(DEFAULT_CONFIG, new Date('2026-09-06T00:00:00.000Z'));
  assert.equal(payload.app, CONFIG_EXPORT_APP);
  assert.equal(payload.formatVersion, 1);
  assert.equal(payload.exportedAt, '2026-09-06T00:00:00.000Z');
  assert.equal(payload.config.likeMilestone, DEFAULT_CONFIG.likeMilestone);
});

test('書き出したJSONから設定を取る', () => {
  const parsed = parseConfigExport(buildConfigExport(DEFAULT_CONFIG));
  assert.ok(parsed);
  assert.equal(parsed?.likeMilestone, DEFAULT_CONFIG.likeMilestone);
});

test('設定オブジェクトそのものも読む', () => {
  const parsed = parseConfigExport({ uniqueId: 'sample', likeMilestone: 50 });
  assert.equal(parsed?.uniqueId, 'sample');
  assert.equal(parsed?.likeMilestone, 50);
});

test('別アプリのファイルは拒否する', () => {
  assert.equal(parseConfigExport({ app: 'other-app', config: { uniqueId: 'x' } }), null);
});

test('壊れたJSONは拒否する', () => {
  assert.equal(parseConfigExport(null), null);
  assert.equal(parseConfigExport([]), null);
  assert.equal(parseConfigExport({ app: CONFIG_EXPORT_APP, config: 'nope' }), null);
});

test('書き出しファイル名に日付を入れる', () => {
  assert.equal(configExportFileName(new Date(2026, 8, 6, 4, 32)), 'コメ読みちゃん設定_2026-09-06.json');
});
