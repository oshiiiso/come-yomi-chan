export type GiftDiamondTier = 'low' | 'mid' | 'high' | 'top';

export function giftDiamondTier(diamonds: unknown): GiftDiamondTier {
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
