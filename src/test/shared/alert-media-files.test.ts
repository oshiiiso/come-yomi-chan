import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectReferencedAlertMediaFiles } from '../../shared/alert-media-files';
import { defaultEventAlertMediaMap } from '../../shared/event-alert';

test('参照中のアラート画像だけ集める', () => {
  const media = defaultEventAlertMediaMap();
  media.gift = { kind: 'file', fileName: 'spark.gif' };
  media.follow = { kind: 'file', fileName: '../evil.png' };
  media.share = { kind: 'none' };
  const keep = collectReferencedAlertMediaFiles(media);
  assert.equal(keep.has('spark.gif'), true);
  assert.equal(keep.has('../evil.png'), false);
  assert.equal(keep.size, 1);
});

test('初期（なし）やテンプレだけのときは参照なし', () => {
  const keep = collectReferencedAlertMediaFiles(defaultEventAlertMediaMap());
  assert.equal(keep.size, 0);
  const withTemplate = defaultEventAlertMediaMap();
  withTemplate.follow = { kind: 'template', id: 'follow' };
  assert.equal(collectReferencedAlertMediaFiles(withTemplate).size, 0);
});
