import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_TEMPLATE_ACCENT_COLORS } from '../../shared/template-accent-colors';
import {
  renderDisplayParts,
  renderDisplayTemplate,
  renderOverlayDisplay,
  renderSpeechParts,
  varsFromEvent,
} from '../../template/render-template';

test('コメントの表示テンプレートを展開する', () => {
  const vars = varsFromEvent('comment', 'テストユーザー', 'こんにちは', 'バラ', 1);
  const text = renderDisplayTemplate('{user}: {comment}', vars);
  assert.equal(text, 'テストユーザー: こんにちは');
});

test('ギフト1個の {count} は空になる', () => {
  const vars = varsFromEvent('gift', 'テストユーザー', '', 'バラ', 1);
  const display = renderDisplayTemplate('{user}さんから{gift}{count}', vars);
  const speech = renderSpeechParts('{user}さんから{gift}{count}', vars, 80);
  assert.equal(display, 'テストユーザーさんからバラ');
  assert.deepEqual(speech, [{ kind: 'text', value: 'テストユーザーさんからバラ' }]);
});

test('ギフト100個の {count} は表示と読み上げで分かれる', () => {
  const vars = varsFromEvent('gift', 'テストユーザー', '', 'バラ', 100);
  const display = renderDisplayTemplate('{user}さんから{gift}{count}', vars);
  const speech = renderSpeechParts('{user}さんから{gift}{count}', vars, 80);
  assert.equal(display, 'テストユーザーさんからバラ×100');
  assert.deepEqual(speech, [{ kind: 'text', value: 'テストユーザーさんからバラ 100こ' }]);
});

test('いいねの {likes} は数字のまま出す', () => {
  const vars = varsFromEvent('like', 'テストユーザー', '', '', 10);
  const display = renderDisplayTemplate('{user}さんが{likes}いいね', vars);
  assert.equal(display, 'テストユーザーさんが10いいね');
});

test('名前を出さないときは表示から名前を外す', () => {
  const comment = varsFromEvent('comment', 'テストユーザー', 'こんにちは', '', 1);
  const gift = varsFromEvent('gift', 'テストユーザー', '', 'バラ', 1);
  const follow = varsFromEvent('follow', 'テストユーザー', '', '', 1);
  assert.equal(
    renderDisplayTemplate('{user}: {comment}', comment, { hideUserName: true }),
    'こんにちは',
  );
  assert.equal(
    renderDisplayTemplate('{user}さんから{gift}{count}', gift, { hideUserName: true }),
    'バラ',
  );
  assert.equal(
    renderDisplayTemplate('{user}さんがフォローしました', follow, { hideUserName: true }),
    'フォローしました',
  );
});

test('読み上げの文字数上限を超えたら省略する', () => {
  const vars = varsFromEvent('comment', 'テストユーザー', 'あいうえおかきくけこ', '', 1);
  const parts = renderSpeechParts('{comment}', vars, 5);
  assert.deepEqual(parts, [{ kind: 'text', value: 'あいうえお…' }]);
});

test('表示の文字数上限を超えたら省略する', () => {
  const vars = varsFromEvent('comment', 'テストユーザー', 'あいうえおかきくけこ', '', 1);
  assert.equal(
    renderDisplayTemplate('{comment}', vars, { maxChars: 5 }),
    'あいうえお…',
  );
});

test('読み上げテンプレートの半角ピリオドは拍になる', () => {
  const vars = varsFromEvent('comment', 'テストユーザー', 'こんにちは', '', 1);
  const parts = renderSpeechParts('{user}.{comment}', vars, 80);
  assert.deepEqual(parts, [
    { kind: 'text', value: 'テストユーザー' },
    { kind: 'beat', count: 1 },
    { kind: 'text', value: 'こんにちは' },
  ]);
});

test('{event} を種類ごとの短い名前に展開する', () => {
  const follow = varsFromEvent('follow', 'テストユーザー', '', '', 1);
  assert.equal(follow.event, 'フォロー');
  assert.equal(
    renderDisplayTemplate('{user}さんが{event}しました', follow),
    'テストユーザーさんがフォローしました',
  );
});

test('表示の **強調** は記号を外し、読み上げも中身だけ読む', () => {
  const vars = varsFromEvent('follow', 'テストユーザー', '', '', 1);
  assert.equal(renderDisplayTemplate('**初**{event}', vars), '初フォロー');
  assert.deepEqual(renderSpeechParts('**初**{event}', vars, 80), [
    { kind: 'text', value: '初フォロー' },
  ]);
});

test('表示パーツは名前色と差し込み色と強調色を分ける', () => {
  const vars = varsFromEvent('gift', 'テストユーザー', '', 'バラ', 2);
  const parts = renderDisplayParts('{user}さんから{gift}{count}**おまけ**', vars, {
    nameColor: '#ff0000',
    accentColors: DEFAULT_TEMPLATE_ACCENT_COLORS,
  });
  assert.deepEqual(parts, [
    { kind: 'name', value: 'テストユーザー', color: '#ff0000' },
    { kind: 'text', value: 'さんから' },
    {
      kind: 'accent',
      value: 'バラ',
      color: DEFAULT_TEMPLATE_ACCENT_COLORS.gift,
      token: 'gift',
    },
    {
      kind: 'accent',
      value: '×2',
      color: DEFAULT_TEMPLATE_ACCENT_COLORS.count,
      token: 'count',
    },
    {
      kind: 'accent',
      value: 'おまけ',
      color: DEFAULT_TEMPLATE_ACCENT_COLORS.emphasis,
      token: 'emphasis',
    },
  ]);
});

test('配信ソース用表示は displayText と displayParts を同じ内容で返す', () => {
  const vars = varsFromEvent('follow', 'テストユーザー', '', '', 1);
  const rendered = renderOverlayDisplay('{user}さんが{event}', vars, {
    nameColor: '#abcdef',
    accentColors: DEFAULT_TEMPLATE_ACCENT_COLORS,
  });
  assert.equal(rendered.displayText, 'テストユーザーさんがフォロー');
  assert.deepEqual(
    rendered.displayParts.map((part) => part.value).join(''),
    rendered.displayText,
  );
  assert.ok(rendered.displayParts.some((part) => part.kind === 'name'));
  assert.ok(rendered.displayParts.some((part) => part.kind === 'accent' && part.token === 'event'));
});
