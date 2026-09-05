import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeWithTimeout, delay, withTimeout } from '../../shared/with-timeout';

test('制限時間内なら結果を返す', async () => {
  const value = await withTimeout(Promise.resolve(7), 200, '時間切れ');
  assert.equal(value, 7);
});

test('制限時間を超えたら失敗する', async () => {
  await assert.rejects(
    () => withTimeout(delay(200).then(() => 1), 20, '時間切れ'),
    /時間切れ/,
  );
});

test('close が終わらなくても制限時間で戻る', async () => {
  const started = Date.now();
  let timedOut = false;
  await closeWithTimeout(
    () => undefined,
    30,
    () => {
      timedOut = true;
    },
  );
  assert.equal(timedOut, true);
  assert.ok(Date.now() - started < 200);
});
