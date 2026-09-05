import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../../shared/config-store';
import { pickEventTemplates } from '../../shared/event-templates';
import { MSG } from '../../shared/messages';

test('加入はスーパーファンの文言、ボックスは別文言', () => {
  const join = pickEventTemplates(DEFAULT_CONFIG, { type: 'superFan', giftName: '' });
  assert.equal(join.display, MSG.template.superFanDisplayDefault);
  const box = pickEventTemplates(DEFAULT_CONFIG, {
    type: 'superFan',
    giftName: MSG.ui.superFanBox,
  });
  assert.equal(box.display, MSG.template.superFanBoxDisplayDefault);
});

test('旧 subscribe もスーパーファンの文言になる', () => {
  const templates = pickEventTemplates(DEFAULT_CONFIG, { type: 'subscribe', giftName: '' });
  assert.equal(templates.speech, MSG.template.superFanSpeechDefault);
});

test('入室は通常とポータル経由で文言を分ける', () => {
  const regular = pickEventTemplates(DEFAULT_CONFIG, { type: 'member', giftName: '' });
  assert.equal(regular.display, MSG.template.memberDisplayDefault);
  const portalJoin = pickEventTemplates(DEFAULT_CONFIG, {
    type: 'member',
    giftName: MSG.ui.portalGift,
  });
  assert.equal(portalJoin.display, MSG.template.portalJoinDisplayDefault);
});

test('ポータル投げはポータルの文言', () => {
  const send = pickEventTemplates(DEFAULT_CONFIG, { type: 'portal', giftName: MSG.ui.portalGift });
  assert.equal(send.display, MSG.template.portalDisplayDefault);
});

test('コメントはコメント用テンプレート', () => {
  const templates = pickEventTemplates(DEFAULT_CONFIG, { type: 'comment' });
  assert.equal(templates.display, MSG.template.commentDisplayDefault);
});
