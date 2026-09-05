const { app, BrowserWindow } = require('electron');
const path = require('path');

const preloadPath = path.join(__dirname, '..', 'dist', 'main', 'preload.js');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const preloadError = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preload の確認がタイムアウトしました')), 15000);
    window.webContents.on('preload-error', (_event, file, error) => {
      clearTimeout(timer);
      resolve(new Error(`preload読み込み失敗: ${file} (${error.message})`));
    });
    window
      .loadURL('data:text/html,<html><body></body></html>')
      .then(() => {
        clearTimeout(timer);
        resolve(null);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

  if (preloadError) {
    console.error(preloadError.message);
    app.exit(1);
    return;
  }

  const ok = await window.webContents.executeJavaScript(
    'Boolean(window.liveTts && typeof window.liveTts.onStatusChanged === "function")',
  );
  if (!ok) {
    console.error('window.liveTts.onStatusChanged がありません');
    app.exit(1);
    return;
  }

  app.exit(0);
});
