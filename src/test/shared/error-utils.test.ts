import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getErrorMessage } from '../../shared/error-utils';

test('Error のメッセージを返す', () => {
  assert.equal(getErrorMessage(new Error('失敗しました')), '失敗しました');
});

test('オブジェクトは message か入れ子の例外から取る', () => {
  assert.equal(getErrorMessage({ message: '接続できません' }), '接続できません');
  assert.equal(
    getErrorMessage({ exception: new Error('署名に失敗しました') }),
    '署名に失敗しました',
  );
});
