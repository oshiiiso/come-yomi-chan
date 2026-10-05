const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { OverlayServer } = require('../dist/overlay-server/overlay-server');

const overlayDir = path.join(__dirname, '..', 'ui', 'overlay');
const server = new OverlayServer('127.0.0.1', overlayDir, 30_000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  await server.listen(0);
  const port = server.getPort();
  const window = new BrowserWindow({
    show: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await window.loadURL(`http://127.0.0.1:${port}/overlay/?preview=1&backdrop=dark`);
    await sleep(1200);
    window.showInactive();
    await sleep(50);

    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const pin = document.getElementById('pin');
        const item = pin?.firstElementChild;
        if (!(item instanceof HTMLElement)) {
          return { ok: false, reason: '固定枠の行がありません' };
        }

        const ms = Number.parseInt(item.style.getPropertyValue('--motion-ms'), 10) || 480;
        for (let wait = 0; wait < 40; wait += 1) {
          if (item.dataset.entered === '1') {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const enterAnim = item
          .getAnimations()
          .find((anim) => anim.animationName && anim.animationName !== 'none' && anim.effect);
        const keyframes = enterAnim?.effect?.getKeyframes?.() ?? null;
        if (!keyframes || keyframes.length === 0) {
          return { ok: false, reason: '入場アニメーションがありません' };
        }

        const durationMs =
          typeof enterAnim?.effect?.getTiming?.()?.duration === 'number' &&
          enterAnim.effect.getTiming().duration > 0
            ? enterAnim.effect.getTiming().duration
            : ms;
        enterAnim?.cancel();
        item.classList.add('is-leaving');
        item.style.removeProperty('opacity');
        item.style.setProperty('animation', 'none');

        const sorted = [...keyframes].sort(
          (left, right) =>
            (left.offset ?? left.computedOffset ?? 0) - (right.offset ?? right.computedOffset ?? 0),
        );
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const from = {};
        const to = {};
        for (const key of ['opacity', 'transform', 'filter']) {
          if (last[key] != null) {
            from[key] = last[key];
          }
          if (first[key] != null) {
            to[key] = first[key];
          }
        }

        const leaveAnim = item.animate([from, to], {
          duration: durationMs,
          easing: 'ease-in',
          fill: 'forwards',
        });

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (leaveAnim.playState !== 'running' && leaveAnim.playState !== 'finished') {
          return { ok: false, reason: '退場アニメーションが開始しません' };
        }

        const samples = [];
        const steps = Math.max(8, Math.ceil(durationMs / 40));
        for (let i = 0; i <= steps; i += 1) {
          samples.push(Number.parseFloat(getComputedStyle(item).opacity));
          await new Promise((resolve) => setTimeout(resolve, Math.max(16, Math.floor(durationMs / steps))));
        }

        await leaveAnim.finished;
        const finalOpacity = Number.parseFloat(getComputedStyle(item).opacity);
        const early = samples.slice(0, 3);
        const earlyVisible = early.every((value) => value > 0.7);
        const lateHidden = finalOpacity < 0.05;
        const gradual = samples.some((value, index) => index > 0 && value < samples[0] - 0.15);

        return {
          ok: earlyVisible && lateHidden && gradual,
          reason:
            earlyVisible && lateHidden && gradual
              ? ''
              : 'opacity=' + samples.map((v) => v.toFixed(2)).join(','),
          samples,
          ms: durationMs,
        };
      })()
    `);

    if (!result.ok) {
      console.error('固定枠の逆再生退場を確認できません:', result.reason || result);
      app.exitCode = 1;
      return;
    }

    console.log(
      `固定枠の逆再生退場を確認しました (${result.ms}ms, opacity: ${result.samples.map((v) => v.toFixed(2)).join(' → ')})`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    app.exitCode = 1;
  } finally {
    await server.close();
    app.exit(app.exitCode ?? 0);
  }
});
