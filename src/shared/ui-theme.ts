export const UI_THEMES = ['system', 'dark', 'light'] as const;
export type UiTheme = (typeof UI_THEMES)[number];
export type ResolvedUiTheme = 'dark' | 'light';

export const DEFAULT_UI_THEME: UiTheme = 'system';

export const UI_THEME_BACKGROUNDS: Record<ResolvedUiTheme, string> = {
  dark: '#141517',
  light: '#f4f5f7',
};

export function normalizeUiTheme(value: unknown): UiTheme {
  return value === 'dark' || value === 'light' ? value : DEFAULT_UI_THEME;
}

export function resolveUiTheme(theme: UiTheme, systemDark: boolean): ResolvedUiTheme {
  if (theme === 'light') {
    return 'light';
  }
  if (theme === 'dark') {
    return 'dark';
  }
  return systemDark ? 'dark' : 'light';
}

export function windowBackgroundFor(theme: UiTheme, systemDark: boolean): string {
  return UI_THEME_BACKGROUNDS[resolveUiTheme(theme, systemDark)];
}
