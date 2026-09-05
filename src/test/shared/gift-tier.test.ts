import assert from 'node:assert/strict';
import { test } from 'node:test';
import { giftDiamondTier } from '../../shared/gift-tier';

test('ダイヤ数でギフトの帯を分ける', () => {
  assert.equal(giftDiamondTier(0), 'low');
  assert.equal(giftDiamondTier(1), 'low');
  assert.equal(giftDiamondTier(9), 'low');
  assert.equal(giftDiamondTier(10), 'mid');
  assert.equal(giftDiamondTier(99), 'mid');
  assert.equal(giftDiamondTier(100), 'high');
  assert.equal(giftDiamondTier(499), 'high');
  assert.equal(giftDiamondTier(500), 'top');
  assert.equal(giftDiamondTier(800), 'top');
});

test('不正な値は安い帯にする', () => {
  assert.equal(giftDiamondTier(undefined), 'low');
  assert.equal(giftDiamondTier(Number.NaN), 'low');
  assert.equal(giftDiamondTier(-3), 'low');
});
