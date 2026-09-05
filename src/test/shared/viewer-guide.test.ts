import assert from 'node:assert/strict';
import { test } from 'node:test';
import { viewerGuideKind } from '../../shared/viewer-guide';

test('本番のコメントがあると案内は出さない', () => {
  assert.equal(
    viewerGuideKind({ hasComments: true, hasUniqueId: false, state: 'disconnected' }),
    'hidden',
  );
});

test('ID が無いときは設定へ誘導する', () => {
  assert.equal(
    viewerGuideKind({ hasComments: false, hasUniqueId: false, state: 'disconnected' }),
    'need-id',
  );
});

test('ID がある未接続は接続へ誘導する', () => {
  assert.equal(
    viewerGuideKind({ hasComments: false, hasUniqueId: true, state: 'disconnected' }),
    'need-connect',
  );
  assert.equal(
    viewerGuideKind({ hasComments: false, hasUniqueId: true, state: 'error' }),
    'need-connect',
  );
});

test('接続中と配信待ちは開始待ちにする', () => {
  assert.equal(
    viewerGuideKind({ hasComments: false, hasUniqueId: true, state: 'connecting' }),
    'waiting',
  );
  assert.equal(
    viewerGuideKind({ hasComments: false, hasUniqueId: true, state: 'waiting_live' }),
    'waiting',
  );
});

test('配信接続済みでコメントが無いときは待ちの案内にする', () => {
  assert.equal(
    viewerGuideKind({ hasComments: false, hasUniqueId: true, state: 'live' }),
    'live',
  );
});
