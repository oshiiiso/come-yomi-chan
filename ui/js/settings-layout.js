// src/shared/settings-layout.ts と同じ範囲。bundler が無いので UI 側にも置く。
const DEFAULT_SETTINGS_PREVIEW_PX = 380;
const MIN_SETTINGS_PREVIEW_PX = 240;
const MAX_SETTINGS_PREVIEW_PX = 720;
const MIN_SETTINGS_FORM_PX = 280;

function clampSettingsPreviewPx(value, workspaceWidth = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  const fallback = DEFAULT_SETTINGS_PREVIEW_PX;
  const px = Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  const maxByWindow =
    workspaceWidth > MIN_SETTINGS_FORM_PX + MIN_SETTINGS_PREVIEW_PX
      ? workspaceWidth - MIN_SETTINGS_FORM_PX
      : MAX_SETTINGS_PREVIEW_PX;
  const max = Math.min(
    MAX_SETTINGS_PREVIEW_PX,
    Math.max(MIN_SETTINGS_PREVIEW_PX, maxByWindow),
  );
  return Math.min(max, Math.max(MIN_SETTINGS_PREVIEW_PX, px));
}
