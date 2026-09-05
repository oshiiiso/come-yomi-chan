function selectedTestGiftId() {
  return $('test-gift')?.value || '';
}

function giftIconSrc(imageUrl) {
  if (!imageUrl) {
    return '';
  }
  if (imageUrl.startsWith('http://127.0.0.1') || imageUrl.startsWith('http://localhost')) {
    return imageUrl;
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

function syncTestGiftIcon() {
  const select = $('test-gift');
  const icon = $('test-gift-icon');
  const option = select?.options[select.selectedIndex];
  const imageUrl = giftIconSrc(option?.dataset.image || '');
  if (!icon) {
    return;
  }
  if (imageUrl) {
    icon.src = imageUrl;
    icon.classList.remove('is-hidden');
  } else {
    icon.removeAttribute('src');
    icon.classList.add('is-hidden');
  }
}

function fillTestGifts(gifts) {
  const select = $('test-gift');
  if (!select) {
    return;
  }
  const previous = select.value;
  select.innerHTML = '';
  if (!Array.isArray(gifts) || gifts.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'TikTok ID から取得できます';
    select.appendChild(option);
    select.disabled = true;
    syncTestGiftIcon();
    return;
  }
  select.disabled = false;
  for (const gift of gifts) {
    const option = document.createElement('option');
    option.value = String(gift.id);
    option.textContent = `${gift.name}（${gift.diamondCount}）`;
    option.dataset.image = gift.imageUrl || '';
    select.appendChild(option);
  }
  select.value = gifts.some((gift) => String(gift.id) === previous) ? previous : String(gifts[0].id);
  syncTestGiftIcon();
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
