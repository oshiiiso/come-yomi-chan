import type { AppConfig } from './types';
import { parseConfigExport } from './config-transfer';

export const PROFILE_EXPORT_APP = 'come-yomi-chan-profile';
export const PROFILE_EXPORT_FORMAT = 1;

export const PROFILE_EXCLUDED_KEYS = [
  'uniqueId',
  'confirmedUniqueId',
  'overlayPort',
  'mainWindowBounds',
  'configProfiles',
  'activeConfigProfileId',
] as const;

export type ProfileExcludedKey = (typeof PROFILE_EXCLUDED_KEYS)[number];

export interface ConfigProfile {
  id: string;
  name: string;
  updatedAt: string;
  config: Partial<AppConfig>;
}

export interface ProfileExportPayload {
  app: string;
  formatVersion: number;
  exportedAt: string;
  profile: ConfigProfile;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function stripProfileIdentity(config: Partial<AppConfig>): Partial<AppConfig> {
  const next = { ...config };
  for (const key of PROFILE_EXCLUDED_KEYS) {
    delete next[key];
  }
  return next;
}

export function profilePatchFromConfig(config: AppConfig): Partial<AppConfig> {
  return stripProfileIdentity(config);
}

export function applyProfileToConfig(
  current: AppConfig,
  profileConfig: Partial<AppConfig>,
): AppConfig {
  const patch = stripProfileIdentity(profileConfig);
  return {
    ...current,
    ...patch,
    uniqueId: current.uniqueId,
    confirmedUniqueId: current.confirmedUniqueId,
    overlayPort: current.overlayPort,
    configProfiles: current.configProfiles,
    activeConfigProfileId: current.activeConfigProfileId,
  };
}

export function createProfile(
  name: string,
  config: AppConfig,
  now = new Date(),
): ConfigProfile {
  const trimmed = name.trim().slice(0, 40) || 'プロファイル';
  return {
    id: `p_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    updatedAt: now.toISOString(),
    config: profilePatchFromConfig(config),
  };
}

export function normalizeConfigProfiles(raw: unknown): ConfigProfile[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ConfigProfile[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const name = typeof record.name === 'string' ? record.name.trim().slice(0, 40) : '';
    const updatedAt =
      typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString();
    const config = asRecord(record.config);
    if (!id || !name || !config || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      name,
      updatedAt,
      config: stripProfileIdentity(config as Partial<AppConfig>),
    });
  }
  return out.slice(-30);
}

export function buildProfileExport(
  profile: ConfigProfile,
  now = new Date(),
): ProfileExportPayload {
  return {
    app: PROFILE_EXPORT_APP,
    formatVersion: PROFILE_EXPORT_FORMAT,
    exportedAt: now.toISOString(),
    profile: {
      ...profile,
      config: stripProfileIdentity(profile.config),
    },
  };
}

export function parseProfileExport(raw: unknown): ConfigProfile | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  if (record.app != null && record.app !== PROFILE_EXPORT_APP) {
    return null;
  }
  const profile = asRecord(record.profile) ?? record;
  const list = normalizeConfigProfiles([profile]);
  return list[0] ?? null;
}

/** 新プロファイル形式、または旧「設定書き出し」形式をプロファイルにする。 */
export function profileFromImportPayload(
  raw: unknown,
  current: AppConfig,
): ConfigProfile | null {
  const profile = parseProfileExport(raw);
  if (profile) {
    return profile;
  }
  const legacy = parseConfigExport(raw);
  if (!legacy) {
    return null;
  }
  return createProfile('読み込み', {
    ...current,
    ...(legacy as Partial<AppConfig>),
    uniqueId: current.uniqueId,
    confirmedUniqueId: current.confirmedUniqueId,
    overlayPort: current.overlayPort,
    configProfiles: current.configProfiles,
    activeConfigProfileId: current.activeConfigProfileId,
  });
}

export function profileExportFileName(name: string, now = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  const safe = name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'profile';
  return `コメ読みちゃん_${safe}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
