/** 色ピッカー横の ×（初期色に戻す）共通処理 */

function colorPickerResetLabelText() {
  return typeof uiCopy === 'object' && uiCopy?.colorPickerResetLabel
    ? uiCopy.colorPickerResetLabel
    : '初期色に戻す';
}

/**
 * @param {HTMLButtonElement|null|undefined} reset
 * @param {string} currentHex
 * @param {string} defaultHex
 */
function syncColorPickerResetButton(reset, currentHex, defaultHex) {
  if (!(reset instanceof HTMLButtonElement)) {
    return;
  }
  const label = colorPickerResetLabelText();
  reset.setAttribute('aria-label', label);
  reset.title = label;
  reset.hidden =
    String(currentHex || '').toLowerCase() === String(defaultHex || '').toLowerCase();
}

/**
 * @param {{ datasetKey?: string, datasetValue?: string, onClick?: (event: MouseEvent) => void }} [options]
 */
function createColorPickerResetButton(options) {
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn--ghost color-picker-reset';
  reset.textContent = '×';
  const label = colorPickerResetLabelText();
  reset.setAttribute('aria-label', label);
  reset.title = label;
  reset.hidden = true;
  if (options && typeof options.datasetKey === 'string' && options.datasetKey) {
    reset.dataset[options.datasetKey] = String(options.datasetValue ?? '');
  }
  if (options && typeof options.onClick === 'function') {
    reset.addEventListener('click', options.onClick);
  }
  return reset;
}
