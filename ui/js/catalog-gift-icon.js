/** 共有 src/tiktok/gift-fields.ts の catalogGiftHasIcon と同じ判定。 */

function catalogGiftHasIcon(gift) {
  const raw = String(gift?.imageUrl || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return false;
  }
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host === 'tiktokcdn.com' || host === 'www.tiktokcdn.com') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function createGiftImagePlaceholder(className) {
  const el = document.createElement('span');
  const base = String(className || '').trim();
  el.className = base ? `${base} gift-icon--missing` : 'gift-icon--missing';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = 'No';
  return el;
}

function createGiftImage(src, className) {
  const url = String(src || '').trim();
  const classes = String(className || '').trim();
  if (!url) {
    return createGiftImagePlaceholder(classes);
  }
  const img = document.createElement('img');
  img.className = classes;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'async';
  img.addEventListener('error', () => {
    img.replaceWith(createGiftImagePlaceholder(classes));
  });
  img.src = url;
  return img;
}
