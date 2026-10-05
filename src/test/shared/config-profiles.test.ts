import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyProfileToConfig,
  buildProfileExport,
  createProfile,
  normalizeConfigProfiles,
  parseProfileExport,
  profileFromImportPayload,
  stripProfileIdentity,
} from '../../shared/config-profiles';
import { buildConfigExport } from '../../shared/config-transfer';
import { DEFAULT_CONFIG } from '../../shared/config-store';

test('ID・ポート・窓位置・プロファイル一覧はプロファイルから外す', () => {
  const stripped = stripProfileIdentity({
    uniqueId: 'a',
    confirmedUniqueId: 'a',
    overlayPort: 9000,
    mainWindowBounds: {
      x: 1,
      y: 2,
      width: 900,
      height: 700,
      isMaximized: false,
    },
    configProfiles: [],
    activeConfigProfileId: 'x',
    maxQueue: 5,
  });
  assert.equal(stripped.uniqueId, undefined);
  assert.equal(stripped.confirmedUniqueId, undefined);
  assert.equal(stripped.overlayPort, undefined);
  assert.equal(stripped.mainWindowBounds, undefined);
  assert.equal(stripped.configProfiles, undefined);
  assert.equal(stripped.activeConfigProfileId, undefined);
  assert.equal(stripped.maxQueue, 5);
});

test('適用しても ID・ポートとプロファイル一覧は残る', () => {
  const current = {
    ...DEFAULT_CONFIG,
    uniqueId: 'keep',
    confirmedUniqueId: 'keep',
    overlayPort: 8787,
    configProfiles: [
      {
        id: 'p1',
        name: '残す',
        updatedAt: new Date(0).toISOString(),
        config: {},
      },
    ],
    activeConfigProfileId: 'p1',
  };
  const profile = createProfile('試験', {
    ...current,
    uniqueId: 'other',
    overlayPort: 9999,
    maxQueue: 7,
  });
  const next = applyProfileToConfig(current, profile.config);
  assert.equal(next.uniqueId, 'keep');
  assert.equal(next.overlayPort, 8787);
  assert.equal(next.maxQueue, 7);
  assert.equal(next.configProfiles.length, 1);
  assert.equal(next.activeConfigProfileId, 'p1');
});

test('壊れた一覧は捨て、上限30で新しい方を残す', () => {
  const raw = Array.from({ length: 35 }, (_, i) => ({
    id: `p${i}`,
    name: `n${i}`,
    updatedAt: new Date(0).toISOString(),
    config: { maxQueue: i },
  }));
  raw.push({ id: '', name: 'x', updatedAt: '', config: { maxQueue: 0 } });
  const list = normalizeConfigProfiles(raw);
  assert.equal(list.length, 30);
  assert.equal(list[0]?.id, 'p5');
  assert.equal(list[29]?.id, 'p34');
});

test('書き出しと読み込み', () => {
  const profile = createProfile('試験', DEFAULT_CONFIG);
  const payload = buildProfileExport(profile);
  const parsed = parseProfileExport(payload);
  assert.ok(parsed);
  assert.equal(parsed?.name, '試験');
  assert.equal(parseProfileExport({ app: 'other' }), null);
});

test('旧設定書き出しもプロファイルとして読める', () => {
  const legacy = buildConfigExport({
    ...DEFAULT_CONFIG,
    uniqueId: 'old',
    overlayPort: 9999,
    maxQueue: 11,
  });
  const profile = profileFromImportPayload(legacy, {
    ...DEFAULT_CONFIG,
    uniqueId: 'keep',
    overlayPort: 8787,
  });
  assert.ok(profile);
  assert.equal(profile?.config.maxQueue, 11);
  assert.equal(profile?.config.uniqueId, undefined);
  assert.equal(profile?.config.overlayPort, undefined);
});
