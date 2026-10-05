function speechHotkeyValue(id, fallback) {
  return normalizeHotkey($(id)?.dataset.value, fallback);
}

function paintHotkeyButton(id, key, recording) {
  const button = $(id);
  if (!button) {
    return;
  }
  button.dataset.value = key;
  button.textContent = recording ? uiCopy.hotkeyPress || 'キーを押す' : hotkeyLabel(key);
  button.classList.toggle('is-recording', recording);
  button.setAttribute('aria-pressed', recording ? 'true' : 'false');
}

function speechActionLabel(label, key) {
  return key ? `${label} ${hotkeyLabel(key)}` : label;
}

function paintSpeechActionButton(button, label, key) {
  const title = speechActionLabel(label, key);
  const text = document.createElement('span');
  text.className = 'btn__label';
  text.textContent = label;
  button.replaceChildren(text);
  if (key) {
    const chip = document.createElement('kbd');
    chip.className = 'hotkey-chip';
    chip.textContent = hotkeyLabel(key);
    button.append(chip);
  }
  button.title = title;
}

function syncSpeechHotkeyUi() {
  const skip = speechHotkeyValue('hotkey-skip-speech', DEFAULT_SKIP_SPEECH_HOTKEY);
  const clear = speechHotkeyValue('hotkey-clear-speech', DEFAULT_CLEAR_SPEECH_HOTKEY);
  const pin = speechHotkeyValue('hotkey-clear-pin', DEFAULT_CLEAR_PIN_HOTKEY);
  const pause = speechHotkeyValue('hotkey-pause-speech', DEFAULT_PAUSE_SPEECH_HOTKEY);
  const mute = speechHotkeyValue('hotkey-mute-comment-sound', DEFAULT_MUTE_COMMENT_SOUND_HOTKEY);
  paintHotkeyButton('hotkey-skip-speech', skip, hotkeyCapture === 'hotkey-skip-speech');
  paintHotkeyButton('hotkey-clear-speech', clear, hotkeyCapture === 'hotkey-clear-speech');
  paintHotkeyButton('hotkey-clear-pin', pin, hotkeyCapture === 'hotkey-clear-pin');
  paintHotkeyButton('hotkey-pause-speech', pause, hotkeyCapture === 'hotkey-pause-speech');
  paintHotkeyButton(
    'hotkey-mute-comment-sound',
    mute,
    hotkeyCapture === 'hotkey-mute-comment-sound',
  );
  const skipUnset = $('hotkey-skip-unset');
  const clearUnset = $('hotkey-clear-unset');
  const pinUnset = $('hotkey-clear-pin-unset');
  const pauseUnset = $('hotkey-pause-unset');
  const muteUnset = $('hotkey-mute-comment-sound-unset');
  if (skipUnset) {
    skipUnset.disabled = !skip;
  }
  if (clearUnset) {
    clearUnset.disabled = !clear;
  }
  if (pinUnset) {
    pinUnset.disabled = !pin;
  }
  if (pauseUnset) {
    pauseUnset.disabled = !pause;
  }
  if (muteUnset) {
    muteUnset.disabled = !mute;
  }
  const skipBtn = $('btn-skip-speech');
  const clearBtn = $('btn-clear-speech');
  const pinBtn = $('btn-clear-pin');
  if (skipBtn) {
    paintSpeechActionButton(skipBtn, uiCopy.skipSpeechButton || '読み上げを飛ばす', skip);
  }
  if (clearBtn) {
    paintSpeechActionButton(clearBtn, uiCopy.clearSpeechButton || '読み上げの待ちを捨てる', clear);
  }
  if (pinBtn) {
    paintSpeechActionButton(pinBtn, uiCopy.clearPinButton || '固定枠の待ちを捨てる', pin);
  }
  if (typeof syncPauseMuteButtons === 'function') {
    syncPauseMuteButtons();
  }
}

function unsetSpeechHotkey(id) {
  if (hotkeyCapture === id) {
    hotkeyCapture = '';
  }
  paintHotkeyButton(id, '', false);
  syncSpeechHotkeyUi();
  noteFormChanged();
}

function fillSpeechHotkeys(config) {
  hotkeyCapture = '';
  paintHotkeyButton(
    'hotkey-skip-speech',
    normalizeHotkey(config.skipSpeechHotkey, DEFAULT_SKIP_SPEECH_HOTKEY),
    false,
  );
  paintHotkeyButton(
    'hotkey-clear-speech',
    normalizeHotkey(config.clearSpeechHotkey, DEFAULT_CLEAR_SPEECH_HOTKEY),
    false,
  );
  paintHotkeyButton(
    'hotkey-clear-pin',
    normalizeHotkey(config.clearPinHotkey, DEFAULT_CLEAR_PIN_HOTKEY),
    false,
  );
  paintHotkeyButton(
    'hotkey-pause-speech',
    normalizeHotkey(config.pauseSpeechHotkey, DEFAULT_PAUSE_SPEECH_HOTKEY),
    false,
  );
  paintHotkeyButton(
    'hotkey-mute-comment-sound',
    normalizeHotkey(config.muteCommentSoundHotkey, DEFAULT_MUTE_COMMENT_SOUND_HOTKEY),
    false,
  );
  syncSpeechHotkeyUi();
}

function startHotkeyCapture(id) {
  hotkeyCapture = hotkeyCapture === id ? '' : id;
  syncSpeechHotkeyUi();
  if (hotkeyCapture) {
    $(hotkeyCapture)?.focus();
  }
}
