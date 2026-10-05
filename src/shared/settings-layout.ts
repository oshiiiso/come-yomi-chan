export const DEFAULT_SETTINGS_PREVIEW_PX = 380;
export const MIN_SETTINGS_PREVIEW_PX = 240;
export const MAX_SETTINGS_PREVIEW_PX = 720;
export const MIN_SETTINGS_FORM_PX = 280;

export function clampSettingsPreviewPx(value: unknown, workspaceWidth = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  const fallback = DEFAULT_SETTINGS_PREVIEW_PX;
  const px = Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  const absolute = Math.min(MAX_SETTINGS_PREVIEW_PX, Math.max(MIN_SETTINGS_PREVIEW_PX, px));
  if (workspaceWidth <= 0) {
    return absolute;
  }
  // 設定欄の最小幅を残せないときは横並びできない（狭い窓は CSS で縦積み）
  const maxByWindow = workspaceWidth - MIN_SETTINGS_FORM_PX;
  if (maxByWindow < MIN_SETTINGS_PREVIEW_PX) {
    return absolute;
  }
  const max = Math.min(MAX_SETTINGS_PREVIEW_PX, maxByWindow);
  return Math.min(max, Math.max(MIN_SETTINGS_PREVIEW_PX, px));
}
