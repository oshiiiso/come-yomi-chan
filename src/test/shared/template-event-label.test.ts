import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MSG } from '../../shared/messages';
import { templateEventLabel } from '../../shared/template-event-label';

test('{event} の文言は種類ごとに短く返す', () => {
  assert.equal(templateEventLabel({ type: 'follow' }), MSG.template.eventLabel.follow);
  assert.equal(templateEventLabel({ type: 'envelope' }), MSG.template.eventLabel.envelope);
  assert.equal(templateEventLabel({ type: 'like' }), MSG.template.eventLabel.like);
  assert.equal(
    templateEventLabel({ type: 'superFan', giftName: MSG.ui.superFanBox }),
    MSG.template.eventLabel.superFanBox,
  );
  assert.equal(
    templateEventLabel({ type: 'member', giftName: MSG.ui.portalGift }),
    MSG.template.eventLabel.member,
  );
});
