<script setup>
import { computed } from 'vue'
import { almondNail, motifFor, BARE_NAIL } from '@/utils/nailArt'

// The paint on one nail: a design's colours and motif, drawn in SVG.
// Used inside an <svg> by DesignArt.vue (gallery tiles) and HandArt.vue (the hand),
// so a design looks the same everywhere.
//
// The nail points up, centred on x = 0, from `tip` (top) to `cuticle` (bottom).
// Every shape stays between those two heights, so a parent can wipe the paint on with
// `clip-path: inset(…)` measured on this group (the nail's own height).
const props = defineProps({
  design: { type: Object, default: null }, // null = bare nail
  index: { type: Number, default: 0 }, // which nail of the five (0 = thumb / first)
  halfWidth: { type: Number, required: true },
  cuticle: { type: Number, required: true },
  tip: { type: Number, required: true },
  uid: { type: String, required: true }, // unique prefix for this nail's ids
})

const motif = computed(() => motifFor(props.design))
const base = computed(() => props.design?.colors[0] ?? BARE_NAIL)
const accent = computed(() => props.design?.colors[1] ?? BARE_NAIL)

const outline = computed(() => almondNail(props.halfWidth, props.cuticle, props.tip))
const ids = computed(() => ({
  clip: `${props.uid}-clip`,
  shade: `${props.uid}-shade`,
}))

// Handy measurements.
const hw = computed(() => props.halfWidth)
const len = computed(() => props.cuticle - props.tip)
const at = (fraction) => props.tip + len.value * fraction // a height along the nail, 0 = tip

// ---- Motif pieces (all positions are inside the nail) ----

// Little 4-point star / sparkle, centred on (x, y), radius r.
function star(x, y, r) {
  const k = r * 0.28
  return `M ${x} ${y - r} Q ${x + k} ${y - k} ${x + r} ${y} Q ${x + k} ${y + k} ${x} ${y + r} Q ${x - k} ${y + k} ${x - r} ${y} Q ${x - k} ${y - k} ${x} ${y - r} Z`
}

// A tiny ribbon bow centred on (x, y), width about 1.5 × the nail's half width.
const bow = computed(() => {
  const w = hw.value * 0.62
  const h = hw.value * 0.4
  const y = at(0.5)
  return {
    left: `M 0 ${y} C ${-w * 0.5} ${y - h} ${-w} ${y - h * 0.9} ${-w} ${y} C ${-w} ${y + h * 0.9} ${-w * 0.5} ${y + h} 0 ${y} Z`,
    right: `M 0 ${y} C ${w * 0.5} ${y - h} ${w} ${y - h * 0.9} ${w} ${y} C ${w} ${y + h * 0.9} ${w * 0.5} ${y + h} 0 ${y} Z`,
    tails: `M ${-hw.value * 0.08} ${y + h * 0.3} L ${-w * 0.55} ${y + h * 2.1} M ${hw.value * 0.08} ${y + h * 0.3} L ${w * 0.55} ${y + h * 2.1}`,
    knot: { cx: 0, cy: y, r: hw.value * 0.17 },
    stroke: hw.value * 0.16,
  }
})

// Polka dots in staggered rows (the clip path trims the ones at the edges).
const dots = computed(() => {
  const r = hw.value * 0.17
  const gap = hw.value * 0.62
  const list = []
  let row = 0
  for (let y = props.tip + gap * 0.9; y < props.cuticle - r; y += gap, row++) {
    const offset = row % 2 ? gap / 2 : 0
    for (let x = -hw.value + offset; x <= hw.value; x += gap) list.push({ x, y, r })
  }
  return list
})

// Gingham: see-through bands across and down; where they cross, the check looks darker.
const gingham = computed(() => {
  const band = hw.value * 0.36
  const list = []
  for (let x = -hw.value + band * 0.25; x < hw.value; x += band * 2) {
    list.push({ x, y: props.tip, width: band, height: len.value })
  }
  for (let y = props.tip + band * 0.5; y < props.cuticle - band * 0.2; y += band * 2) {
    list.push({ x: -hw.value * 1.2, y, width: hw.value * 2.4, height: band })
  }
  return list
})

// Gingham on some nails and a bow on one plain one; bows on two cherry nails.
const isGinghamNail = computed(() => props.index % 2 === 1)
const hasBow = computed(() => {
  if (motif.value === 'cherry-bows') return props.index === 1 || props.index === 3
  if (motif.value === 'gingham-bows') return props.index === 2
  return false
})

// Stars and pearls sit in different places on each nail, so the set looks hand-placed.
const STAR_SPOTS = [
  [
    [-0.25, 0.35, 0.3],
    [0.3, 0.62, 0.22],
  ],
  [[0.1, 0.42, 0.34]],
  [
    [-0.3, 0.3, 0.22],
    [0.2, 0.52, 0.32],
    [-0.15, 0.78, 0.2],
  ],
  [[-0.1, 0.55, 0.3]],
  [
    [0.2, 0.36, 0.26],
    [-0.25, 0.66, 0.22],
  ],
]
const stars = computed(() =>
  STAR_SPOTS[props.index % 5].map(([x, y, r]) => star(x * hw.value, at(y), r * hw.value * 1.4)),
)

const PEARL_SPOTS = [
  [
    [-0.35, 0.82],
    [0.05, 0.86],
    [0.42, 0.8],
  ],
  [
    [0.25, 0.4],
    [-0.3, 0.7],
  ],
  [
    [-0.35, 0.82],
    [0.05, 0.86],
    [0.42, 0.8],
    [0.05, 0.5],
  ],
  [[-0.2, 0.55]],
  [
    [0.25, 0.75],
    [-0.25, 0.8],
  ],
]
const pearls = computed(() =>
  PEARL_SPOTS[props.index % 5].map(([x, y]) => ({
    cx: x * hw.value,
    cy: at(y),
    r: hw.value * 0.17,
  })),
)

// A gloss highlight down the left side of the nail.
const gloss = computed(
  () =>
    `M ${-hw.value * 0.5} ${at(0.86)} Q ${-hw.value * 0.62} ${at(0.4)} ${-hw.value * 0.18} ${at(0.12)}`,
)
</script>

<template>
  <g class="nail-paint-art">
    <defs>
      <clipPath :id="ids.clip"><path :d="outline" /></clipPath>
      <!-- One shading gradient, down the nail, set up for whichever motif needs it. -->
      <linearGradient :id="ids.shade" x1="0" y1="1" x2="0" y2="0">
        <template v-if="motif === 'chrome'">
          <stop offset="0" :stop-color="accent" />
          <stop offset="0.45" stop-color="#f5f3f7" />
          <stop offset="0.7" :stop-color="base" />
          <stop offset="1" :stop-color="accent" />
        </template>
        <template v-else-if="motif === 'milky'">
          <stop offset="0" :stop-color="base" />
          <stop offset="1" :stop-color="accent" />
        </template>
        <template v-else>
          <stop offset="0" :stop-color="base" />
          <stop offset="1" :stop-color="accent" />
        </template>
      </linearGradient>
    </defs>

    <!-- Bare nail, or a plain colour (also the base under every motif). -->
    <path v-if="motif === 'bare'" :d="outline" :fill="base" />
    <path v-else-if="motif === 'plain'" :d="outline" :fill="accent" />

    <!-- Chrome ombré: metallic gradient and a bright streak. -->
    <template v-else-if="motif === 'chrome'">
      <path :d="outline" :fill="`url(#${ids.shade})`" />
      <path :d="gloss" class="streak" :stroke-width="hw * 0.22" />
    </template>

    <!-- French tips: sheer nude with a curved white tip. -->
    <template v-else-if="motif === 'french'">
      <path :d="outline" :fill="base" />
      <g :clip-path="`url(#${ids.clip})`">
        <ellipse :cx="0" :cy="at(0.12)" :rx="hw * 1.5" :ry="len * 0.3" fill="#ffffff" />
      </g>
    </template>

    <!-- Cherry bows: deep red, with a little bow on two accent nails. -->
    <path v-else-if="motif === 'cherry-bows'" :d="outline" :fill="accent" />

    <!-- Gingham bows: a check on some nails, plain on the others. -->
    <template v-else-if="motif === 'gingham-bows'">
      <template v-if="isGinghamNail">
        <path :d="outline" fill="#fbfcff" />
        <g :clip-path="`url(#${ids.clip})`" :fill="accent" opacity="0.42">
          <rect
            v-for="(band, i) in gingham"
            :key="i"
            :x="band.x"
            :y="band.y"
            :width="band.width"
            :height="band.height"
          />
        </g>
      </template>
      <path v-else :d="outline" :fill="accent" />
    </template>

    <!-- Milky pink: soft see-through pink with a gloss. -->
    <template v-else-if="motif === 'milky'">
      <path :d="outline" :fill="`url(#${ids.shade})`" opacity="0.92" />
      <path :d="gloss" class="streak" :stroke-width="hw * 0.3" opacity="0.8" />
    </template>

    <!-- Polka dots. -->
    <template v-else-if="motif === 'polka'">
      <path :d="outline" :fill="base" />
      <g :clip-path="`url(#${ids.clip})`" :fill="accent">
        <circle v-for="(dot, i) in dots" :key="i" :cx="dot.x" :cy="dot.y" :r="dot.r" />
      </g>
    </template>

    <!-- Star charms: deep wine with small gold stars. -->
    <template v-else-if="motif === 'stars'">
      <path :d="outline" :fill="base" />
      <path v-for="(d, i) in stars" :key="i" :d="d" :fill="accent" />
    </template>

    <!-- Pearl sparkle: pale shimmer with scattered pearls. -->
    <template v-else-if="motif === 'pearl'">
      <path :d="outline" :fill="`url(#${ids.shade})`" />
      <g v-for="(pearl, i) in pearls" :key="i">
        <circle
          :cx="pearl.cx"
          :cy="pearl.cy"
          :r="pearl.r"
          fill="#fffdfb"
          :stroke="accent"
          :stroke-width="pearl.r * 0.35"
        />
        <circle
          :cx="pearl.cx - pearl.r * 0.35"
          :cy="pearl.cy - pearl.r * 0.35"
          :r="pearl.r * 0.3"
          fill="#ffffff"
        />
      </g>
    </template>

    <!-- The bow (cherry and gingham designs). -->
    <g v-if="hasBow" class="bow" :fill="motif === 'cherry-bows' ? base : '#ffffff'">
      <path :d="bow.left" />
      <path :d="bow.right" />
      <path
        :d="bow.tails"
        fill="none"
        :stroke="motif === 'cherry-bows' ? base : '#ffffff'"
        :stroke-width="bow.stroke"
        stroke-linecap="round"
      />
      <circle v-bind="bow.knot" />
    </g>

    <!-- A soft shine on every painted nail. -->
    <path v-if="motif !== 'bare'" :d="gloss" class="shine" :stroke-width="hw * 0.14" />
  </g>
</template>

<style scoped>
.streak,
.shine {
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
}

.streak {
  opacity: 0.85;
}

.shine {
  opacity: 0.35;
}
</style>
