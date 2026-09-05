(() => {
  let currentPref = 'system';
  let watching = false;

  function normalize(value) {
    return value === 'dark' || value === 'light' ? value : 'system';
  }

  function resolve(pref) {
    const normalized = normalize(pref);
    if (normalized !== 'system') {
      return normalized;
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function apply(pref) {
    currentPref = normalize(pref);
    document.documentElement.dataset.theme = resolve(currentPref);
  }

  function watch() {
    if (watching) {
      return;
    }
    watching = true;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (currentPref === 'system') {
        apply('system');
      }
    };
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(onChange);
    }
  }

  function boot() {
    apply('system');
    watch();
  }

  window.LiveTtsUiTheme = {
    normalize,
    resolve,
    apply,
    watch,
    boot,
  };
})();
