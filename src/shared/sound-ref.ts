export const SOUND_TEMPLATE_DEFAULT = 'default';
export const SOUND_TEMPLATE_GIFT = 'gift';
export const SOUND_TEMPLATE_IDS = [SOUND_TEMPLATE_DEFAULT, SOUND_TEMPLATE_GIFT] as const;
export const SOUND_FILE_EXTENSIONS = ['wav', 'mp3', 'ogg'] as const;

export type SoundTemplateId = (typeof SOUND_TEMPLATE_IDS)[number];

export type SoundRef =
  | { kind: 'template'; id: SoundTemplateId }
  | { kind: 'file'; fileName: string };

/** コメント新着音などの汎用テンプレ（短いピッ）。 */
export const DEFAULT_SOUND_REF: SoundRef = {
  kind: 'template',
  id: SOUND_TEMPLATE_DEFAULT,
};

/** ギフト共通／帯／個別の初期テンプレ（チャリン）。 */
export const DEFAULT_GIFT_SOUND_REF: SoundRef = {
  kind: 'template',
  id: SOUND_TEMPLATE_GIFT,
};

export function isSoundTemplateId(value: unknown): value is SoundTemplateId {
  return value === SOUND_TEMPLATE_DEFAULT || value === SOUND_TEMPLATE_GIFT;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function normalizeSoundFileName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return '';
  }
  const lower = name.toLowerCase();
  const ok = SOUND_FILE_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`));
  return ok ? name : '';
}

export function normalizeSoundRef(raw: unknown, fallback: SoundRef = DEFAULT_SOUND_REF): SoundRef {
  const record = asRecord(raw);
  if (record.kind === 'file') {
    const fileName = normalizeSoundFileName(record.fileName);
    if (fileName) {
      return { kind: 'file', fileName };
    }
    return { ...fallback };
  }
  if (record.kind === 'template' || isSoundTemplateId(record.id)) {
    if (isSoundTemplateId(record.id)) {
      return { kind: 'template', id: record.id };
    }
    return fallback.kind === 'template' ? { ...fallback } : { ...DEFAULT_SOUND_REF };
  }
  return { ...fallback };
}

/** ギフト向け。旧テンプレ default はチャリンへ寄せる。 */
export function normalizeGiftSoundRef(raw: unknown): SoundRef {
  const normalized = normalizeSoundRef(raw, DEFAULT_GIFT_SOUND_REF);
  if (normalized.kind === 'template' && normalized.id === SOUND_TEMPLATE_DEFAULT) {
    return { ...DEFAULT_GIFT_SOUND_REF };
  }
  return normalized;
}

export function sameSoundRef(left: SoundRef, right: SoundRef): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === 'template' && right.kind === 'template') {
    return left.id === right.id;
  }
  if (left.kind === 'file' && right.kind === 'file') {
    return left.fileName === right.fileName;
  }
  return false;
}

export function normalizeSoundRefMap(raw: unknown): Record<string, SoundRef> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, SoundRef> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(key || '').trim();
    if (!id) {
      continue;
    }
    out[id] = normalizeSoundRef(value);
  }
  return out;
}

/** ギフト別マップ。テンプレ default はチャリンへ寄せる。 */
export function normalizeGiftSoundRefMap(raw: unknown): Record<string, SoundRef> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, SoundRef> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(key || '').trim();
    if (!id) {
      continue;
    }
    out[id] = normalizeGiftSoundRef(value);
  }
  return out;
}
