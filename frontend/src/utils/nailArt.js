// Shared drawing helpers for nails, used by the gallery tiles (DesignArt.vue), the hand
// (HandArt.vue) and the nail paint itself (NailPaint.vue), so all three always match.

// An almond nail, pointing up, centred on x = 0.
//   halfWidth  half the nail's width
//   cuticle    y of the rounded cuticle end (bottom)
//   tip        y of the pointed tip (top, a smaller number than cuticle)
export function almondNail(halfWidth, cuticle, tip) {
  const hw = halfWidth
  const len = cuticle - tip
  const r = (n) => Math.round(n * 10) / 10
  return [
    `M ${r(-hw)} ${r(cuticle)}`,
    // rounded cuticle
    `C ${r(-hw)} ${r(cuticle + hw * 0.85)} ${r(hw)} ${r(cuticle + hw * 0.85)} ${r(hw)} ${r(cuticle)}`,
    // right side, curving in to the almond point
    `C ${r(hw * 1.02)} ${r(tip + len * 0.42)} ${r(hw * 0.42)} ${r(tip)} 0 ${r(tip)}`,
    // left side back down
    `C ${r(-hw * 0.42)} ${r(tip)} ${r(-hw * 1.02)} ${r(tip + len * 0.42)} ${r(-hw)} ${r(cuticle)}`,
    'Z',
  ].join(' ')
}

// Which motif each sample design is drawn with, by design number.
// These are placeholder drawings until she supplies photos of her own sets;
// an unknown design is painted in its colours only.
const MOTIFS = {
  1: 'chrome', // Chrome ombré
  2: 'french', // French tips
  3: 'cherry-bows', // Cherry bows
  4: 'gingham-bows', // Gingham bows
  5: 'milky', // Milky pink
  6: 'polka', // Polka dots
  7: 'stars', // Star charms
  8: 'pearl', // Pearl sparkle
}

// 'bare' for no design ("My own design"), otherwise the design's motif.
export function motifFor(design) {
  if (!design) return 'bare'
  return MOTIFS[design.id] ?? 'plain'
}

export const BARE_NAIL = '#fffaf6'
