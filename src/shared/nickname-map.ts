export interface NicknameMapEntry {
  uniqueId: string;
  displayName: string;
}

const MAX_NICKNAME_MAP = 500;

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeNicknameKey(uniqueId: unknown): string {
  return asText(uniqueId).replace(/^@/, '').trim();
}

export function normalizeNicknameMap(raw: unknown): NicknameMapEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: NicknameMapEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const uniqueId = normalizeNicknameKey(record.uniqueId ?? record.id);
    const displayName = asText(record.displayName ?? record.name).slice(0, 80);
    if (!uniqueId || !displayName) {
      continue;
    }
    const key = uniqueId.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({ uniqueId, displayName });
    if (out.length >= MAX_NICKNAME_MAP) {
      break;
    }
  }
  return out;
}

export function resolveDisplayName(
  uniqueId: string,
  nickname: string,
  map: NicknameMapEntry[] | undefined,
): string {
  const key = normalizeNicknameKey(uniqueId).toLowerCase();
  if (key && Array.isArray(map)) {
    const hit = map.find((entry) => entry.uniqueId.toLowerCase() === key);
    if (hit?.displayName) {
      return hit.displayName;
    }
  }
  const nick = asText(nickname);
  if (nick) {
    return nick;
  }
  return normalizeNicknameKey(uniqueId);
}

export function upsertNicknameMap(
  map: NicknameMapEntry[],
  uniqueId: string,
  displayName: string,
): NicknameMapEntry[] {
  const id = normalizeNicknameKey(uniqueId);
  const name = asText(displayName).slice(0, 80);
  if (!id || !name) {
    return map;
  }
  const key = id.toLowerCase();
  const next = map.filter((entry) => entry.uniqueId.toLowerCase() !== key);
  next.unshift({ uniqueId: id, displayName: name });
  return next.slice(0, MAX_NICKNAME_MAP);
}

export function removeNicknameMap(
  map: NicknameMapEntry[],
  uniqueId: string,
): NicknameMapEntry[] {
  const key = normalizeNicknameKey(uniqueId).toLowerCase();
  if (!key) {
    return map;
  }
  return map.filter((entry) => entry.uniqueId.toLowerCase() !== key);
}
