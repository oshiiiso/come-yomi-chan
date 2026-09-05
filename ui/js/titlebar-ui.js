function closeTitlebarMenus() {
  for (const list of document.querySelectorAll('.titlebar-menu__list')) {
    list.hidden = true;
  }
  for (const button of document.querySelectorAll('.titlebar-menu > .titlebar__text')) {
    button.setAttribute('aria-expanded', 'false');
  }
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
  }
}

function bindTitlebarMenus() {
  for (const button of document.querySelectorAll('.titlebar-menu > .titlebar__text')) {
    button.addEventListener('pointerdown', (event) => {
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
}
