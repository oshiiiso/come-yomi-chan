import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  collectReferencedAlertMediaFiles,
  collectReferencedAlertMediaFilesFromApp,
} from '../../shared/alert-media-files';
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

test('テンプレだけのときは参照なし', () => {
  const keep = collectReferencedAlertMediaFiles(defaultEventAlertMediaMap());
  assert.equal(keep.size, 0);
});

test('保存済みプロファイルのアラート画像も残す', () => {
  const keep = collectReferencedAlertMediaFilesFromApp({
    eventAlertMedia: defaultEventAlertMediaMap(),
    configProfiles: [
      {
        id: 'p1',
        name: '配信用',
        config: {
          eventAlertMedia: {
            gift: { kind: 'file', fileName: 'profile-gift.gif' },
          },
        },
      },
    ],
  });
  assert.equal(keep.has('profile-gift.gif'), true);
});
