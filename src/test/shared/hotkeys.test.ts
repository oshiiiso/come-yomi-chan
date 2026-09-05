import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_SKIP_SPEECH_HOTKEY,
  hotkeyFromEvent,
  hotkeyLabel,
  isHotkeyEvent,
  normalizeHotkey,
} from '../../shared/hotkeys';

test('壊れた値は初期キーに戻す', () => {
  assert.equal(normalizeHotkey(undefined, DEFAULT_SKIP_SPEECH_HOTKEY), 'F8');
  assert.equal(normalizeHotkey('Shift', DEFAULT_SKIP_SPEECH_HOTKEY), 'F8');
  assert.equal(normalizeHotkey('Ctrl+Shift', DEFAULT_SKIP_SPEECH_HOTKEY), 'F8');
  assert.equal(normalizeHotkey('F7', DEFAULT_SKIP_SPEECH_HOTKEY), 'F7');
});

test('空文字は消した状態として残す', () => {
  assert.equal(normalizeHotkey('', DEFAULT_SKIP_SPEECH_HOTKEY), '');
  assert.equal(hotkeyLabel(''), 'なし');
  assert.equal(isHotkeyEvent({ key: 'F8' }, ''), false);
});

test('修飾つきは順序をそろえて残す', () => {
  assert.equal(normalizeHotkey('Shift+F8', DEFAULT_SKIP_SPEECH_HOTKEY), 'Shift+F8');
  assert.equal(normalizeHotkey('ctl+shift+f8', DEFAULT_SKIP_SPEECH_HOTKEY), 'Ctrl+Shift+F8');
  assert.equal(normalizeHotkey('Shift+Ctrl+F8', DEFAULT_SKIP_SPEECH_HOTKEY), 'Ctrl+Shift+F8');
});

test('押したキーを表示用の名前にする', () => {
  assert.equal(hotkeyLabel('F8'), 'F8');
  assert.equal(hotkeyLabel(' '), 'スペース');
  assert.equal(hotkeyLabel('Space'), 'スペース');
  assert.equal(hotkeyLabel('ArrowUp'), '↑');
  assert.equal(hotkeyLabel('Shift+F8'), 'Shift+F8');
  assert.equal(hotkeyLabel('Ctrl+Shift+F8'), 'Ctrl+Shift+F8');
  assert.equal(hotkeyLabel('Ctrl+ '), 'Ctrl+スペース');
});

test('修飾キーだけは取り込まない', () => {
  assert.equal(hotkeyFromEvent({ key: 'Control' }), null);
  assert.equal(hotkeyFromEvent({ key: 'Shift', shiftKey: true }), null);
  assert.equal(hotkeyFromEvent({ key: 'F8' }), 'F8');
  assert.equal(hotkeyFromEvent({ key: 'F8', shiftKey: true }), 'Shift+F8');
  assert.equal(
    hotkeyFromEvent({ key: 'F8', ctrlKey: true, shiftKey: true }),
    'Ctrl+Shift+F8',
  );
});

test('修飾の有無が違うと一致しない', () => {
  assert.equal(isHotkeyEvent({ key: 'F8' }, 'F8'), true);
  assert.equal(isHotkeyEvent({ key: 'F8', ctrlKey: true }, 'F8'), false);
  assert.equal(isHotkeyEvent({ key: 'F8', shiftKey: true }, 'F8'), false);
  assert.equal(isHotkeyEvent({ key: 'F8', shiftKey: true }, 'Shift+F8'), true);
  assert.equal(
    isHotkeyEvent({ key: 'F8', ctrlKey: true, shiftKey: true }, 'Ctrl+Shift+F8'),
    true,
  );
  assert.equal(
    isHotkeyEvent({ key: 'F8', ctrlKey: true, shiftKey: true }, 'Shift+F8'),
    false,
  );
  assert.equal(isHotkeyEvent({ key: 'F8', repeat: true }, 'F8'), false);
  assert.equal(isHotkeyEvent({ key: 'F9' }, 'F8'), false);
});
