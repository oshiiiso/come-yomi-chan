import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { test } from 'node:test';
import {
  DEFAULT_OVERLAY_NAME_COLORS,
  OVERLAY_NAME_COLORS_BY_LOOK_PRESET,
} from '../../shared/overlay-name-colors';
import {
  DEFAULT_TEMPLATE_ACCENT_COLORS,
  TEMPLATE_ACCENT_TOKEN_IDS,
} from '../../shared/template-accent-colors';
import {
  OVERLAY_COPY_KINDS,
  OVERLAY_URL_KINDS,
  OVERLAY_URL_VARIANTS,
  overlayCopyKindFrom,
  overlayUrlFieldsForPort,
  overlayUrlForCopyKind,
} from '../../shared/overlay-url';
import {
  DEFAULT_OVERLAY_LIKES_LOOK,
  OVERLAY_LIKES_LOOK_PRESETS,
  OVERLAY_LIKES_THEMES,
} from '../../shared/overlay-likes-look';
import {
  DEFAULT_OVERLAY_RANKING_MOTION,
  DEFAULT_OVERLAY_RANKING_MOTION_SPEED,
  OVERLAY_RANKING_MOTIONS,
  OVERLAY_RANKING_MOTION_MS,
  OVERLAY_RANKING_MOTION_SPEEDS,
} from '../../shared/overlay-ranking-motion';
import {
  DEFAULT_FAN_LEVEL_COLORS,
  DEFAULT_FAN_LEVEL_MINS,
  FAN_LEVEL_COLOR_PRESETS,
} from '../../shared/fan-level-look';
import {
  TEMPLATE_EDITOR_TOKENS_BY_FIELD,
  TEMPLATE_PLACEHOLDER_IDS,
} from '../../shared/template-placeholders';

function readUi(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), ...relativePath.split('/')), 'utf8');
}

test('overlay-url の種類・コピー kind は UI ミラーと一致する', () => {
  const source = readUi('ui/js/overlay-url.js');
  for (const kind of OVERLAY_URL_KINDS) {
    assert.match(source, new RegExp(`['"]${kind}['"]`), `OVERLAY_URL_KINDS に ${kind}`);
  }
  assert.match(source, /function normalizeOverlayUrlKind/);
  for (const variant of OVERLAY_URL_VARIANTS) {
    assert.match(source, new RegExp(`['"]${variant}['"]`), `OVERLAY_URL_VARIANTS に ${variant}`);
  }
  for (const copyKind of OVERLAY_COPY_KINDS) {
    assert.match(source, new RegExp(`['"]${copyKind}['"]`), `OVERLAY_COPY_KINDS に ${copyKind}`);
  }
  assert.match(source, /function overlayCopyKindFrom/);
  assert.match(source, /function normalizeOverlayCopyKind/);
});

test('overlayCopyKindFrom は種類×用途を IPC kind に落とす', () => {
  assert.equal(overlayCopyKindFrom('chat', 'live'), 'default');
  assert.equal(overlayCopyKindFrom('chat', 'obs'), 'local');
  assert.equal(overlayCopyKindFrom('chat', 'studio'), 'studio');
  assert.equal(overlayCopyKindFrom('alerts', 'live'), 'alerts');
  assert.equal(overlayCopyKindFrom('alerts', 'obs'), 'alerts-local');
  assert.equal(overlayCopyKindFrom('alerts', 'studio'), 'alerts-studio');
  assert.equal(overlayCopyKindFrom('ranking', 'live'), 'ranking');
  assert.equal(overlayCopyKindFrom('ranking', 'obs'), 'ranking-local');
  assert.equal(overlayCopyKindFrom('ranking', 'studio'), 'ranking-studio');
  assert.equal(overlayCopyKindFrom('likes', 'live'), 'ranking');
  assert.equal(overlayCopyKindFrom('unknown', 'x'), 'default');
});

test('overlayUrlForCopyKind はポートから9種のURLを返す', () => {
  const fields = overlayUrlFieldsForPort(8787);
  assert.equal(overlayUrlForCopyKind(8787, 'default'), fields.overlayUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'local'), fields.overlayPreviewUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'studio'), fields.overlayStudioUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'alerts'), fields.overlayAlertsUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'alerts-local'), fields.overlayAlertsPreviewUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'alerts-studio'), fields.overlayAlertsStudioUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'ranking'), fields.overlayLikesUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'likes'), fields.overlayLikesUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'ranking-local'), fields.overlayLikesPreviewUrl);
  assert.equal(overlayUrlForCopyKind(8787, 'likes-studio'), fields.overlayLikesStudioUrl);
  assert.match(fields.overlayAlertsUrl, /\/overlay\/alerts\/$/);
  assert.match(fields.overlayLikesUrl, /\/overlay\/ranking\/$/);
});

test('名前色の初期値は設定UI・配信ソースミラーと一致する', () => {
  const settings = readUi('ui/js/overlay-name-colors.js');
  const overlay = readUi('ui/overlay/name-colors.js');
  for (const color of DEFAULT_OVERLAY_NAME_COLORS) {
    assert.match(settings, new RegExp(`['"]${color}['"]`));
    assert.match(overlay, new RegExp(`['"]${color}['"]`));
  }
  for (const [presetId, palette] of Object.entries(OVERLAY_NAME_COLORS_BY_LOOK_PRESET)) {
    assert.match(settings, new RegExp(`${presetId}:`));
    for (const color of palette) {
      assert.match(settings, new RegExp(`['"]${color}['"]`));
    }
  }
});

test('テンプレ差し込み色の初期値は名前色パレット由来で UI と一致する', () => {
  const source = readUi('ui/js/template-accent-colors.js');
  for (const id of TEMPLATE_ACCENT_TOKEN_IDS) {
    assert.equal(
      DEFAULT_TEMPLATE_ACCENT_COLORS[id],
      {
        gift: DEFAULT_OVERLAY_NAME_COLORS[0],
        count: DEFAULT_OVERLAY_NAME_COLORS[1],
        likes: DEFAULT_OVERLAY_NAME_COLORS[1],
        comment: '#f1f3f5',
        event: DEFAULT_OVERLAY_NAME_COLORS[3],
        emphasis: DEFAULT_OVERLAY_NAME_COLORS[4],
      }[id],
    );
    assert.match(source, new RegExp(`\\b${id}:`));
  }
  assert.match(source, /templateAccentColorsFromNamePalette/);
  assert.match(source, /resolveTemplateAccentColorsForLookPreset/);
  assert.match(source, /OVERLAY_NAME_COLORS_BY_LOOK_PRESET/);
});

test('テンプレ差し込み候補は UI ミラーと一致する', () => {
  const source = readUi('ui/js/template-placeholders.js');
  for (const id of TEMPLATE_PLACEHOLDER_IDS) {
    assert.match(source, new RegExp(`['"]${id}['"]`));
  }
  for (const [fieldId, tokens] of Object.entries(TEMPLATE_EDITOR_TOKENS_BY_FIELD)) {
    assert.match(source, new RegExp(`['"]${fieldId}['"]`));
    for (const token of tokens) {
      assert.match(source, new RegExp(`['"]${token}['"]`));
    }
  }
});

test('いいねランキング見た目は UI ミラーと一致する', () => {
  const source = readUi('ui/js/overlay-likes-look.js');
  for (const theme of OVERLAY_LIKES_THEMES) {
    assert.match(source, new RegExp(`['"]${theme}['"]`));
    assert.match(source, new RegExp(`${theme}:`));
  }
  assert.match(source, /function normalizeOverlayLikesLook/);
  assert.equal(OVERLAY_LIKES_LOOK_PRESETS.standard.fontSize, DEFAULT_OVERLAY_LIKES_LOOK.fontSize);
  assert.match(source, new RegExp(`fontSize: ${DEFAULT_OVERLAY_LIKES_LOOK.fontSize}`));
  assert.match(source, new RegExp(`panelWidth: ${DEFAULT_OVERLAY_LIKES_LOOK.panelWidth}`));
});

test('ランキング入れ替わりの動きは UI ミラーと一致する', () => {
  const source = readUi('ui/js/overlay-ranking-motion.js');
  for (const motion of OVERLAY_RANKING_MOTIONS) {
    assert.match(source, new RegExp(`['"]${motion}['"]`));
  }
  for (const speed of OVERLAY_RANKING_MOTION_SPEEDS) {
    assert.match(source, new RegExp(`\\b${speed}\\b`));
    assert.match(source, new RegExp(`\\b${speed}:\\s*${OVERLAY_RANKING_MOTION_MS[speed]}\\b`));
  }
  assert.match(source, new RegExp(`['"]${DEFAULT_OVERLAY_RANKING_MOTION}['"]`));
  assert.match(source, new RegExp(`DEFAULT_OVERLAY_RANKING_MOTION_SPEED = ${DEFAULT_OVERLAY_RANKING_MOTION_SPEED}`));
  assert.match(source, /function normalizeOverlayRankingMotion/);
  assert.match(source, /function normalizeOverlayRankingMotionSpeed/);
  assert.match(source, /function overlayRankingMotionMs/);
});

test('ファンレベ色・境目は UI ミラーと一致する', () => {
  const source = readUi('ui/js/fan-level-look.js');
  for (const min of DEFAULT_FAN_LEVEL_MINS) {
    assert.match(source, new RegExp(`\\b${min}\\b`));
  }
  for (const color of DEFAULT_FAN_LEVEL_COLORS) {
    assert.match(source, new RegExp(`['"]${color}['"]`));
  }
  for (const color of FAN_LEVEL_COLOR_PRESETS) {
    assert.match(source, new RegExp(`['"]${color}['"]`));
  }
});
