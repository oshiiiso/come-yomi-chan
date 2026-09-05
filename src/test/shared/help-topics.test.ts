import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import {
  HELP_HEADING_ID,
  HELP_HEADING_IDS,
  applyHelpHeadingIds,
  helpIdForHeading,
  isHelpTopicId,
} from '../../shared/help-topics';
import { getRendererCopy } from '../../shared/messages';

test('見出しからヘルプの飛び先を決める', () => {
  assert.equal(helpIdForHeading('ポートが使えない'), HELP_HEADING_ID.port);
  assert.equal(helpIdForHeading('  VOICEVOX に繋がらない  '), HELP_HEADING_ID.voicevox);
  assert.equal(isHelpTopicId(HELP_HEADING_ID.port), true);
  assert.equal(isHelpTopicId('help-unknown'), false);
  assert.equal(isHelpTopicId('../x'), false);
});

test('ヘルプHTMLの見出しに飛び先を付ける', () => {
  const html = applyHelpHeadingIds('<h2>よくある質問</h2><h3>接続できない</h3>');
  assert.match(html, new RegExp(`id="${HELP_HEADING_ID.faq}"`));
  assert.match(html, new RegExp(`id="${HELP_HEADING_ID.connect}"`));
});

test('USER.md の見出しと索引の飛び先は help-topics と揃える', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'docs', 'USER.md'), 'utf8');
  for (const [heading, id] of Object.entries(HELP_HEADING_IDS)) {
    assert.match(source, new RegExp(`^#{1,3} ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
    if (id === HELP_HEADING_ID.index) {
      continue;
    }
    assert.match(source, new RegExp(`\\(#${id}\\)`));
  }
});

test('ヘルプ誘導するエラー文言は helpTopics に載せる', () => {
  const copy = getRendererCopy();
  assert.equal(copy.helpTopics[copy.invalidPort], HELP_HEADING_ID.port);
  assert.equal(copy.helpTopics[copy.uniqueIdRequired], HELP_HEADING_ID.connect);
  assert.equal(copy.helpOpenLabel, 'ヘルプ');
});
