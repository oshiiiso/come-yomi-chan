function titlebarMenuButtons() {
  return document.querySelectorAll(
    '.titlebar-menu > .titlebar__text, .titlebar-menu > button[aria-haspopup="true"]',
  );
}

function closeTitlebarMenus() {
  for (const button of titlebarMenuButtons()) {
    if (
      button.getAttribute('aria-expanded') === 'true' &&
      document.activeElement instanceof Element &&
      document.activeElement.closest('.titlebar-menu__list')
    ) {
      button.focus();
    }
    button.setAttribute('aria-expanded', 'false');
  }
  for (const list of document.querySelectorAll('.titlebar-menu__list')) {
    list.hidden = true;
  }
}

function titlebarMenuItems(list) {
  return [...list.querySelectorAll('button:not([disabled])')];
}

function toggleTitlebarMenu(button) {
  const menu = button.closest('.titlebar-menu');
  const list = menu?.querySelector('.titlebar-menu__list');
  if (!list) {
    return;
  }
  const open = list.hidden;
  closeTitlebarMenus();
  hideViewerUserMenu();
  if (open) {
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    const first = titlebarMenuItems(list)[0];
    first?.focus();
  }
}

function bindTitlebarMenus() {
  for (const button of titlebarMenuButtons()) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTitlebarMenu(button);
    });
  }
  for (const list of document.querySelectorAll('.titlebar-menu__list')) {
    list.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });
    list.addEventListener('click', (event) => {
      if (event.target.closest('button')) {
        closeTitlebarMenus();
      }
    });
  }
  window.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.titlebar-menu')) {
        return;
      }
      closeTitlebarMenus();
    },
    true,
  );
  window.addEventListener('blur', () => {
    closeTitlebarMenus();
  });
  window.addEventListener('keydown', (event) => {
    const openList = [...document.querySelectorAll('.titlebar-menu__list')].find(
      (list) => !list.hidden,
    );
    if (!openList) {
      return;
    }
    const items = titlebarMenuItems(openList);
    if (!items.length) {
      return;
    }
    const active = document.activeElement;
    const idx = active instanceof HTMLElement ? items.indexOf(active) : -1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(idx + 1) % items.length].focus();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(idx <= 0 ? items.length : idx) - 1].focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      items[0].focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1].focus();
    }
  });
}

function syncMaximizeChrome(maximized) {
  const on = Boolean(maximized);
  const maxBtn = $('btn-maximize');
  const maxLabel = on
    ? uiCopy.restoreWindow || '元のサイズに戻す'
    : uiCopy.maximizeWindow || '最大化';
  if (maxBtn) {
    const maxIcon = maxBtn.querySelector('.titlebar__glyph--maximize');
    const restoreIcon = maxBtn.querySelector('.titlebar__glyph--restore');
    if (maxIcon instanceof SVGElement) {
      maxIcon.hidden = on;
    }
    if (restoreIcon instanceof SVGElement) {
      restoreIcon.hidden = !on;
    }
    maxBtn.title = maxLabel;
    maxBtn.setAttribute('aria-label', maxLabel);
    maxBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

function bindWindowChrome() {
  $('btn-minimize')?.addEventListener('click', () => {
    void window.liveTts.minimizeWindow?.();
  });
  const toggleMax = () => {
    void window.liveTts.toggleMaximizeWindow?.().then((result) => {
      if (result && typeof result.maximized === 'boolean') {
        syncMaximizeChrome(result.maximized);
      }
    });
  };
  $('btn-maximize')?.addEventListener('click', toggleMax);
  if (typeof window.liveTts.onWindowMaximizedChanged === 'function') {
    window.liveTts.onWindowMaximizedChanged((maximized) => {
      syncMaximizeChrome(maximized);
    });
  }
  void window.liveTts.isWindowMaximized?.().then((result) => {
    if (result && typeof result.maximized === 'boolean') {
      syncMaximizeChrome(result.maximized);
    }
  });
}
