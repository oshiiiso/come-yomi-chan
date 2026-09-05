// src/shared/gift-tier.ts と同じ段階。bundler が無いので UI 側にも置く。
function giftDiamondTier(diamonds) {
  const count =
    typeof diamonds === 'number' && Number.isFinite(diamonds)
      ? Math.max(0, Math.trunc(diamonds))
      : 0;
  if (count >= 500) {
    return 'top';
  }
  if (count >= 100) {
    return 'high';
  }
  if (count >= 10) {
    return 'mid';
  }
  return 'low';
}
