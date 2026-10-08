import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_TEMPLATE_ACCENT_COLORS,
  TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET,
  isAutoTemplateAccentColors,
  normalizeTemplateAccentColors,
  resolveTemplateAccentColorsForLookPreset,
  templateAccentColorsFromNamePalette,
} from '../../shared/template-accent-colors';
import {
  DEFAULT_OVERLAY_NAME_COLORS,
  OVERLAY_NAME_COLORS_BY_LOOK_PRESET,
} from '../../shared/overlay-name-colors';

test('初期の差し込み色は名前色パレットから取る', () => {
  assert.equal(DEFAULT_TEMPLATE_ACCENT_COLORS.gift, DEFAULT_OVERLAY_NAME_COLORS[0]);
  assert.equal(DEFAULT_TEMPLATE_ACCENT_COLORS.event, DEFAULT_OVERLAY_NAME_COLORS[3]);
  assert.equal(DEFAULT_TEMPLATE_ACCENT_COLORS.emphasis, DEFAULT_OVERLAY_NAME_COLORS[4]);
});

test('差し込み色の正規化は欠けと不正を初期値に戻す', () => {
  assert.deepEqual(normalizeTemplateAccentColors(undefined), {
    ...DEFAULT_TEMPLATE_ACCENT_COLORS,
  });
  assert.equal(normalizeTemplateAccentColors({ gift: '#FF0000' }).gift, '#ff0000');
  assert.equal(
    normalizeTemplateAccentColors({ gift: 'red' }).gift,
    DEFAULT_TEMPLATE_ACCENT_COLORS.gift,
  );
});

test('かんたん見た目用の差し込み色は名前色パレットと同じ並び', () => {
  assert.deepEqual(
    TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET.light,
    templateAccentColorsFromNamePalette(OVERLAY_NAME_COLORS_BY_LOOK_PRESET.light, 'light'),
  );
  assert.deepEqual(
    TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET.neon,
    templateAccentColorsFromNamePalette(OVERLAY_NAME_COLORS_BY_LOOK_PRESET.neon, 'neon'),
  );
});

test('旧コメント色が名前色と同じ初期値なら吹き出し色へ寄せる', () => {
  const legacy = templateAccentColorsFromNamePalette(DEFAULT_OVERLAY_NAME_COLORS);
  const stored = {
    ...legacy,
    comment: DEFAULT_OVERLAY_NAME_COLORS[2],
  };
  assert.equal(normalizeTemplateAccentColors(stored).comment, '#f1f3f5');
  assert.equal(isAutoTemplateAccentColors(stored), true);
  for (const [id, palette] of Object.entries(OVERLAY_NAME_COLORS_BY_LOOK_PRESET)) {
    const comment = TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET[id].comment;
    assert.equal(palette.includes(comment), false, id);
  }
});

test('差し込み色は初期またはプリセット色のときだけかんたん見た目で差し替える', () => {
  assert.equal(isAutoTemplateAccentColors(DEFAULT_TEMPLATE_ACCENT_COLORS), true);
  assert.equal(
    isAutoTemplateAccentColors(TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET.light),
    true,
  );
  assert.deepEqual(
    resolveTemplateAccentColorsForLookPreset('light', DEFAULT_TEMPLATE_ACCENT_COLORS),
    TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET.light,
  );
  assert.deepEqual(
    resolveTemplateAccentColorsForLookPreset(
      'neon',
      TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET.light,
    ),
    TEMPLATE_ACCENT_COLORS_BY_LOOK_PRESET.neon,
  );
  assert.equal(
    resolveTemplateAccentColorsForLookPreset('light', {
      ...DEFAULT_TEMPLATE_ACCENT_COLORS,
      gift: '#111111',
    }),
    null,
  );
});
