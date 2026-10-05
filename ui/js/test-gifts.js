let testGiftPickerBound = false;

function selectedTestGiftId() {
  return $('test-gift')?.value || '';
}

function giftIconSrc(imageUrl) {
  if (!imageUrl) {
    return '';
  }
  try {
    const parsed = new URL(imageUrl);
    const host = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (host === '127.0.0.1' || host === 'localhost')
    ) {
      return imageUrl;
    }
  } catch {
    // 相対パスなどは下で処理する
  }
  const preview = savedConfig?.overlayPreviewUrl || '';
  const origin = String(preview).replace(/\/overlay\/?$/, '');
  if (imageUrl.startsWith('/')) {
    return origin ? `${origin}${imageUrl}` : imageUrl;
  }
  if (!origin) {
    return imageUrl;
  }
  return `${origin}/media/gift?u=${encodeURIComponent(imageUrl)}`;
}

function testGiftListItems() {
  return [...($('test-gift-list')?.querySelectorAll('[role="option"]') || [])];
}

function closeTestGiftPicker() {
  const trigger = $('test-gift-trigger');
  const list = $('test-gift-list');
  if (!list || list.hidden) {
    return;
  }
  list.hidden = true;
  trigger?.setAttribute('aria-expanded', 'false');
}

function openTestGiftPicker() {
  const trigger = $('test-gift-trigger');
  const list = $('test-gift-list');
  if (!trigger || !list || trigger.disabled) {
    return;
  }
  list.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  const selected = list.querySelector('[role="option"][aria-selected="true"]');
  const focusTarget = selected || testGiftListItems()[0];
  focusTarget?.focus();
}

function toggleTestGiftPicker() {
  const list = $('test-gift-list');
  if (!list) {
    return;
  }
  if (list.hidden) {
    openTestGiftPicker();
  } else {
    closeTestGiftPicker();
    $('test-gift-trigger')?.focus();
  }
}

function replaceTestGiftIcon(next) {
  const current = $('test-gift-icon');
  if (!(next instanceof HTMLElement)) {
    return;
  }
  next.id = 'test-gift-icon';
  if (current?.parentNode) {
    current.replaceWith(next);
    return;
  }
  $('test-gift-trigger')?.prepend(next);
}

function paintTestGiftTrigger(gift) {
  const label = $('test-gift-label');
  const trigger = $('test-gift-trigger');
  const hidden = $('test-gift');
  if (!label || !hidden) {
    return;
  }
  if (!gift) {
    hidden.value = '';
    label.textContent = 'TikTok ID から取得できます';
    const empty = document.createElement('img');
    empty.className = 'gift-test-icon is-hidden';
    empty.alt = '';
    replaceTestGiftIcon(empty);
    if (trigger) {
      trigger.disabled = true;
    }
    return;
  }
  hidden.value = String(gift.id || '');
  label.textContent = `${gift.name || gift.id}（${gift.diamondCount ?? 0}）`;
  if (trigger) {
    trigger.disabled = false;
  }
  const imageUrl = giftIconSrc(gift.imageUrl || '');
  if (typeof createGiftImage === 'function') {
    replaceTestGiftIcon(createGiftImage(imageUrl, 'gift-test-icon'));
    return;
  }
  const icon = document.createElement('img');
  icon.className = 'gift-test-icon';
  icon.alt = '';
  if (imageUrl) {
    icon.src = imageUrl;
  } else {
    icon.classList.add('is-hidden');
  }
  replaceTestGiftIcon(icon);
}

function selectTestGift(option, { close = true, focusTrigger = true } = {}) {
  if (!(option instanceof HTMLElement)) {
    return;
  }
  const list = $('test-gift-list');
  const hidden = $('test-gift');
  if (!list || !hidden) {
    return;
  }
  for (const item of testGiftListItems()) {
    item.setAttribute('aria-selected', item === option ? 'true' : 'false');
  }
  paintTestGiftTrigger({
    id: option.dataset.id || '',
    name: option.dataset.name || '',
    diamondCount: Number(option.dataset.diamonds || 0),
    imageUrl: option.dataset.image || '',
  });
  hidden.dispatchEvent(new Event('change', { bubbles: true }));
  if (close) {
    closeTestGiftPicker();
  }
  if (focusTrigger) {
    $('test-gift-trigger')?.focus();
  }
}

function syncTestGiftIcon() {
  const hidden = $('test-gift');
  const selectedId = String(hidden?.value || '');
  const option = testGiftListItems().find((item) => item.dataset.id === selectedId);
  if (option) {
    paintTestGiftTrigger({
      id: option.dataset.id || '',
      name: option.dataset.name || '',
      diamondCount: Number(option.dataset.diamonds || 0),
      imageUrl: option.dataset.image || '',
    });
    return;
  }
  paintTestGiftTrigger(null);
}

function fillTestGifts(gifts) {
  const list = $('test-gift-list');
  const hidden = $('test-gift');
  if (!list || !hidden) {
    return;
  }
  const previous = hidden.value;
  list.replaceChildren();
  bindTestGiftPicker();

  if (!Array.isArray(gifts) || gifts.length === 0) {
    closeTestGiftPicker();
    paintTestGiftTrigger(null);
    if (typeof setGiftCatalogForSpeakList === 'function') {
      setGiftCatalogForSpeakList([]);
    }
    return;
  }

  for (const gift of gifts) {
    const id = String(gift.id || '').trim();
    if (!id || (typeof catalogGiftHasIcon === 'function' ? !catalogGiftHasIcon(gift) : !gift.imageUrl)) {
      continue;
    }
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'gift-test-picker__option';
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.dataset.id = id;
    option.dataset.name = gift.name || id;
    option.dataset.diamonds = String(gift.diamondCount ?? 0);
    option.dataset.image = gift.imageUrl || '';

    const imageUrl = giftIconSrc(gift.imageUrl || '');
    const icon =
      typeof createGiftImage === 'function'
        ? createGiftImage(imageUrl, 'gift-test-icon gift-test-icon--option')
        : (() => {
            const img = document.createElement('img');
            img.className = 'gift-test-icon gift-test-icon--option';
            img.alt = '';
            if (imageUrl) {
              img.src = imageUrl;
            } else {
              img.classList.add('is-hidden');
            }
            return img;
          })();

    const text = document.createElement('span');
    text.className = 'gift-test-picker__option-label';
    text.textContent = `${gift.name || id}（${gift.diamondCount ?? 0}）`;

    option.append(icon, text);
    list.append(option);
  }

  const items = testGiftListItems();
  const selected =
    items.find((item) => item.dataset.id === previous) || items[0] || null;
  if (selected) {
    selectTestGift(selected, { close: true, focusTrigger: false });
  } else {
    paintTestGiftTrigger(null);
  }
  closeTestGiftPicker();

  if (typeof setGiftCatalogForSpeakList === 'function') {
    setGiftCatalogForSpeakList(gifts);
  }
}

function bindTestGiftPicker() {
  if (testGiftPickerBound) {
    return;
  }
  const trigger = $('test-gift-trigger');
  const list = $('test-gift-list');
  const picker = $('test-gift-picker');
  if (!trigger || !list || !picker) {
    return;
  }
  testGiftPickerBound = true;

  trigger.addEventListener('click', () => {
    toggleTestGiftPicker();
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTestGiftPicker();
    }
  });

  list.addEventListener('click', (event) => {
    const option = event.target.closest('[role="option"]');
    if (option && list.contains(option)) {
      selectTestGift(option);
    }
  });

  list.addEventListener('keydown', (event) => {
    const items = testGiftListItems();
    if (items.length === 0) {
      return;
    }
    const current = document.activeElement;
    const index = items.indexOf(current);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTestGiftPicker();
      trigger.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (current instanceof HTMLElement && items.includes(current)) {
        selectTestGift(current);
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const safeIndex = index < 0 ? 0 : index;
      const next =
        event.key === 'ArrowDown'
          ? items[(safeIndex + 1) % items.length]
          : items[(safeIndex - 1 + items.length) % items.length];
      next?.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (!picker.contains(event.target)) {
      closeTestGiftPicker();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !list.hidden) {
      closeTestGiftPicker();
      trigger.focus();
    }
  });
}

async function loadTestGifts() {
  if (!window.liveTts.getTestGifts) {
    return;
  }
  const gifts = await window.liveTts.getTestGifts();
  fillTestGifts(gifts);
}

async function refreshTestGifts(showToast) {
  if (!window.liveTts.refreshTestGifts) {
    return;
  }
  const uniqueId = $('unique-id')?.value.trim() || '';
  const result = await window.liveTts.refreshTestGifts(uniqueId);
  fillTestGifts(result.gifts ?? []);
  if (showToast) {
    setToast(result.message, !result.ok);
  }
}
