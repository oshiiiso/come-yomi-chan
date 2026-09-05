import { BrowserWindowConstructorOptions } from 'electron';
import { APP_CONFIG } from '../../shared/app-config';
import { loadAppIcon } from '../tray-icon';

export function getFramelessWindowOptions(
  overrides: BrowserWindowConstructorOptions = {},
): BrowserWindowConstructorOptions {
  return {
    frame: false,
    roundedCorners: true,
    backgroundColor: APP_CONFIG.windowBackground,
    autoHideMenuBar: true,
    useContentSize: true,
    show: false,
    icon: loadAppIcon(),
    ...overrides,
  };
}
