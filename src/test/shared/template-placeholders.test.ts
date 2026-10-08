import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  highlightTemplatePlaceholdersHtml,
  isKnownTemplatePlaceholder,
  stripTemplateEmphasisMarkers,
  templateEditorTokensForField,
} from '../../shared/template-placeholders';

test('既知のプレースホルダを判定する', () => {
  assert.equal(isKnownTemplatePlaceholder('user'), true);
  assert.equal(isKnownTemplatePlaceholder('gift'), true);
  assert.equal(isKnownTemplatePlaceholder('event'), true);
  assert.equal(isKnownTemplatePlaceholder('foo'), false);
});

test('欄ごとの差し込み候補', () => {
  assert.deepEqual(templateEditorTokensForField('gift-display'), [
    'user',
    'gift',
    'count',
  ]);
  assert.deepEqual(templateEditorTokensForField('follow-display'), ['user', 'event']);
  assert.deepEqual(templateEditorTokensForField('like-speech'), ['user', 'likes', 'event']);
  assert.deepEqual(templateEditorTokensForField('unknown'), []);
});

test('ハイライトHTMLは既知を色クラスに、未知を unknown に、HTMLを逃がす', () => {
  const html = highlightTemplatePlaceholdersHtml('{user}さんから{gift}<x>{nope}');
  assert.match(html, /tpl-token--user/);
  assert.match(html, /tpl-token--gift/);
  assert.match(html, /tpl-token--unknown/);
  assert.match(html, /&lt;x&gt;/);
  assert.equal(html.includes('<x>'), false);
});

test('ハイライトHTMLは **強調** と {event} を色クラスにする', () => {
  const html = highlightTemplatePlaceholdersHtml('{user}さんが**{event}**しました');
  assert.match(html, /tpl-token--user/);
  assert.match(html, /tpl-token--emphasis/);
  assert.match(html, /tpl-token--event/);
});

test('読み上げ用に ** を外して中身だけ残す', () => {
  assert.equal(stripTemplateEmphasisMarkers('**初**{event}'), '初{event}');
  assert.equal(stripTemplateEmphasisMarkers('普通の文'), '普通の文');
});
