export const FAN_LEVEL_STEP_COUNT = 5;
export const FAN_LEVEL_MIN = 1;
export const FAN_LEVEL_MAX = 99;

export const DEFAULT_FAN_LEVEL_MINS = [1, 10, 15, 20, 25] as const;

/** ダーク／ライトの両方で印として見える色 */
export const DEFAULT_FAN_LEVEL_COLORS = [
  '#c9a227',
  '#d97706',
  '#ea580c',
  '#dc2626',
  '#c026d3',
] as const;

export const FAN_LEVEL_COLOR_PRESETS = [
  '#c9a227',
  '#d97706',
  '#ea580c',
  '#dc2626',
  '#c026d3',
  '#16a34a',
  '#0d9488',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ca8a04',
  '#9a3412',
  '#64748b',
] as const;

export interface FanLevelStep {
  minLevel: number;
  color: string;
}

export const DEFAULT_FAN_LEVEL_LOOK: FanLevelStep[] = DEFAULT_FAN_LEVEL_MINS.map(
  (minLevel, index) => ({
    minLevel,
    color: DEFAULT_FAN_LEVEL_COLORS[index],
  }),
);

export function isFanLevelHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function clampFanLevel(value: unknown, fallback = FAN_LEVEL_MIN): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(FAN_LEVEL_MAX, Math.max(FAN_LEVEL_MIN, Math.trunc(parsed)));
}

export function normalizeFanLevelLook(raw: unknown): FanLevelStep[] {
  const list = Array.isArray(raw) ? raw : [];
  const steps: FanLevelStep[] = DEFAULT_FAN_LEVEL_LOOK.map((fallback, index) => {
    const item = list[index] && typeof list[index] === 'object' ? list[index] as Record<string, unknown> : {};
    return {
      minLevel: clampFanLevel(item.minLevel, fallback.minLevel),
      color: isFanLevelHex(item.color) ? item.color.toLowerCase() : fallback.color,
    };
  });
  steps.sort((left, right) => left.minLevel - right.minLevel);
  for (let index = 1; index < steps.length; index += 1) {
    if (steps[index].minLevel <= steps[index - 1].minLevel) {
      steps[index] = {
        ...steps[index],
        minLevel: Math.min(FAN_LEVEL_MAX, steps[index - 1].minLevel + 1),
      };
    }
  }
  return steps;
}

export function fanLevelStepIndex(level: unknown, steps: FanLevelStep[] = DEFAULT_FAN_LEVEL_LOOK): number {
  const value = clampFanLevel(level, 0);
  const look = steps.length === FAN_LEVEL_STEP_COUNT ? steps : DEFAULT_FAN_LEVEL_LOOK;
  let index = 0;
  for (let i = 0; i < look.length; i += 1) {
    if (value >= look[i].minLevel) {
      index = i;
    }
  }
  if (value < look[0].minLevel) {
    return 0;
  }
  return index;
}

export function fanLevelColor(level: unknown, steps: FanLevelStep[] = DEFAULT_FAN_LEVEL_LOOK): string {
  const look = steps.length === FAN_LEVEL_STEP_COUNT ? steps : DEFAULT_FAN_LEVEL_LOOK;
  return look[fanLevelStepIndex(level, look)].color;
}
