import type { AppConfig } from './types';

export const CONFIG_EXPORT_APP = 'come-yomi-chan';
export const CONFIG_EXPORT_FORMAT = 1;

export interface ConfigExportPayload {
  app: string;
  formatVersion: number;
  exportedAt: string;
  config: AppConfig;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function buildConfigExport(config: AppConfig, now = new Date()): ConfigExportPayload {
  return {
    app: CONFIG_EXPORT_APP,
    formatVersion: CONFIG_EXPORT_FORMAT,
    exportedAt: now.toISOString(),
    config,
  };
}

export function configExportFileName(now = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `コメ読みちゃん設定_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** 書き出したJSON、または設定オブジェクトそのもの。別アプリのファイルは拒否。 */
export function parseConfigExport(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  if (record.app != null && record.app !== CONFIG_EXPORT_APP) {
    return null;
  }
  if (
    record.config !== undefined ||
    record.formatVersion !== undefined ||
    record.app === CONFIG_EXPORT_APP
  ) {
    return asRecord(record.config);
  }
  return record;
}
