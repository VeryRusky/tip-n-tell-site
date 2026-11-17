<script setup>
import { ref, watch } from 'vue'

// A line-art hand with five nails, painted in a design's colours.
// Used by the home page's "Pick a design" scene and the live preview on the Design step.
//
// Two ways to paint:
// - Normal (default): when `design` changes, the new colour wipes over the old one,
//   from cuticle to tip, nail after nail (a short CSS animation).
// - Scrubbed (`scrub`): the home page scene controls the wipe with scroll. It passes the
//   colour underneath (`under`) and sets two CSS variables on a parent element:
//     --wipe   0 to 1, how far the new colour has wiped over
//     --draw   0 to 1, how much of the hand's outline has been drawn
//   (and optionally --stagger, how far apart the five nails start).
//
// A design of null means bare nails ("My own design").
// Nail colours match DesignArt.vue: the nail is the design's second colour (`colors[1]`).
const props = defineProps({
  design: { type: Object, default: null },
  under: { type: Object, default: null }, // scrubbed mode only: the colour being painted over
  scrub: { type: Boolean, default: false },
  ownHint: { type: Boolean, default: false }, // shows a sparkle and "your design" on bare nails
})

const BARE = '#fffaf6'
const colorOf = (design) => (design ? design.colors[1] : BARE)

// ---- Geometry (drawn once) ----
// Each finger is a slightly tapered capsule, described in its own coordinates
// (base at 0,0, pointing up), then rotated and moved into place with an SVG transform.
//   x, y   where the middle of the finger's base sits in the picture
//   length from base to fingertip
//   base / tip   half the finger's width at the base and at the tip
//   angle  lean in degrees (negative leans left)
const FINGERS = [
  { name: 'thumb', x: 104, y: 250, length: 84, base: 21, tip: 17.5, angle: -48 },
  { name: 'index', x: 129, y: 180, length: 112, base: 19.5, tip: 16, angle: -6 },
  { name: 'middle', x: 166, y: 170, length: 126, base: 19.5, tip: 16.5, angle: 0 },
  { name: 'ring', x: 203, y: 177, length: 116, base: 19, tip: 15.5, angle: 6 },
  { name: 'pinky', x: 237, y: 199, length: 90, base: 16, tip: 13, angle: 13 },
]

// Rotate a point from finger coordinates into the picture.
function place(finger, px, py) {
  const a = (finger.angle * Math.PI) / 180
  const x = finger.x + px * Math.cos(a) - py * Math.sin(a)
  const y = finger.y + px * Math.sin(a) + py * Math.cos(a)
  return `${x.toFixed(1)} ${y.toFixed(1)}`
}

// Where a point in finger coordinates lands in the picture, as numbers.
function point(finger, px, py) {
  return place(finger, px, py).split(' ').map(Number)
}

// One finger's outline, starting at its base on the left: up the left side,
// round the tip, and down the right side.
function fingerOutline(f) {
  const top = -(f.length - f.tip)
  return [
    `C ${place(f, -f.base - 1.5, -f.length * 0.35)} ${place(f, -f.tip - 1, -f.length * 0.7)} ${place(f, -f.tip, top)}`,
    `A ${f.tip} ${f.tip} 0 0 1 ${place(f, f.tip, top)}`,
    `C ${place(f, f.tip + 1, -f.length * 0.7)} ${place(f, f.base + 1.5, -f.length * 0.35)} ${place(f, f.base, 0)}`,
  ].join(' ')
}

// The small dip between two fingers: a curve from one finger's base to the next one's.
function between(left, right) {
  const [x1, y1] = point(left, left.base, 0)
  const [x2, y2] = point(right, -right.base, 0)
  const dipX = (x1 + x2) / 2
  const dipY = Math.max(y1, y2) + 7
  return `Q ${dipX.toFixed(1)} ${dipY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

// The whole hand as one continuous line, from the left of the wrist to the right,
// so it can "draw itself" in one stroke.
function handOutline() {
  const [thumb, index, middle, ring, pinky] = FINGERS
  return [
    'M 120 372',
    `C 114 340 98 300 ${place(thumb, -thumb.base, 0)}`,
    fingerOutline(thumb),
    `Q 128 214 ${place(index, -index.base, 0)}`, // the web between thumb and index
    fingerOutline(index),
    between(index, middle),
    fingerOutline(middle),
    between(middle, ring),
    fingerOutline(ring),
    between(ring, pinky),
    fingerOutline(pinky),
    'C 258 240 250 320 240 372',
  ].join(' ')
}

// A small crease line across each finger's middle knuckle.
function knuckle(f) {
  const y = -f.length * 0.42
  return `M ${place(f, -f.base * 0.45, y)} Q ${place(f, 0, y - 4)} ${place(f, f.base * 0.45, y)}`
}

// Almond nail in finger coordinates: rounded cuticle at the bottom, tip a little past the finger.
function nail(f) {
  const hw = f.tip * 0.78
  const cuticle = -f.length * 0.7
  const tip = -(f.length + 9)
  const len = cuticle - tip
  return [
    `M ${-hw} ${cuticle}`,
    `C ${-hw} ${cuticle + hw * 0.9} ${hw} ${cuticle + hw * 0.9} ${hw} ${cuticle}`,
    `C ${hw} ${tip + len * 0.35} ${hw * 0.35} ${tip} 0 ${tip}`,
    `C ${-hw * 0.35} ${tip} ${-hw} ${tip + len * 0.35} ${-hw} ${cuticle}`,
    'Z',
  ].join(' ')
}

// A soft highlight down one side of the nail, like the shine on the gallery tiles.
function shine(f) {
  const hw = f.tip * 0.78
  const cuticle = -f.length * 0.7
  return `M ${-hw * 0.45} ${cuticle - 2} Q ${-hw * 0.55} ${-f.length + 2} ${-hw * 0.15} ${-f.length - 4}`
}

const outline = handOutline()
const fingers = FINGERS.map((f) => ({
  name: f.name,
  transform: `translate(${f.x} ${f.y}) rotate(${f.angle})`,
  nail: nail(f),
  shine: shine(f),
  knuckle: knuckle(f),
}))

// ---- Normal mode: remember the colour underneath while the new one wipes in ----
const previous = ref(null)
const paintKey = ref(0)
watch(
  () => props.design,
  (next, old) => {
    if (props.scrub) return
    previous.value = old
    paintKey.value++
  },
)
</script>

<template>
  <svg
    class="hand-art"
    :class="scrub ? 'is-scrub' : 'is-auto'"
    viewBox="0 0 300 380"
    aria-hidden="true"
    focusable="false"
  >
    <path class="hand-line" :d="outline" pathLength="1" />
    <path
      v-for="finger in fingers"
      :key="`k-${finger.name}`"
      class="hand-detail"
      :d="finger.knuckle"
      pathLength="1"
    />

    <g
      v-for="(finger, n) in fingers"
      :key="finger.name"
      :transform="finger.transform"
      :style="{ '--n': n }"
    >
      <path class="nail-bare" :d="finger.nail" />
      <!-- The colour underneath, fully painted. -->
      <path
        class="nail-under"
        :d="finger.nail"
        :fill="colorOf(scrub ? under : previous)"
      />
      <!-- The new colour, wiping in from the cuticle. A new key restarts the animation. -->
      <path
        :key="scrub ? 'paint' : `paint-${paintKey}`"
        class="nail-paint"
        :d="finger.nail"
        :fill="colorOf(design)"
      />
      <path class="nail-shine" :d="finger.shine" />
      <path class="nail-line" :d="finger.nail" pathLength="1" />
    </g>

    <!-- "My own design": bare nails with a sparkle and a note. -->
    <g v-if="ownHint && !design" class="own-hint">
      <path
        d="M226 70c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
      />
      <path
        d="M70 128c.4 3.4 1.8 4.8 5.2 5.2-3.4.4-4.8 1.8-5.2 5.2-.4-3.4-1.8-4.8-5.2-5.2 3.4-.4 4.8-1.8 5.2-5.2z"
      />
      <text x="166" y="290" text-anchor="middle">your design</text>
    </g>
  </svg>
</template>

<style scoped>
.hand-art {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* ---- Line art ---- */
.hand-line,
.hand-detail,
.nail-line {
  fill: none;
  stroke: var(--tt-deep-rose);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hand-line {
  stroke-width: 2;
}

.hand-detail {
  stroke-width: 1.4;
  opacity: 0.55;
}

.nail-line {
  stroke-width: 1.4;
}

.nail-bare {
  fill: #fffaf6;
}

.nail-shine {
  fill: none;
  stroke: #fff;
  stroke-width: 2.2;
  stroke-linecap: round;
  opacity: 0.55;
}

.own-hint {
  fill: var(--tt-rose);
}

.own-hint text {
  font-family: var(--tt-font-heading);
  font-style: italic;
  font-size: 20px;
  fill: var(--tt-deep-rose);
}

/* ---- Normal mode: the new colour wipes up each nail, one nail just after another ---- */
.is-auto .nail-paint {
  animation: nail-wipe 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--n) * 45ms);
}

@keyframes nail-wipe {
  from {
    clip-path: inset(100% 0 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

/*
  ---- Scrubbed mode: the same wipe, but its position comes from scroll ----
  --f is this nail's own progress. Each nail starts a little after the one before it
  (by --stagger), so with a large stagger they are painted one after another.
  inset(top …) hides the nail from the tip down; as --f grows, the colour rises from the cuticle.
*/
.is-scrub .nail-paint {
  --f: clamp(
    0,
    var(--wipe, 1) * (1 + 4 * var(--stagger, 0.08)) - var(--n) * var(--stagger, 0.08),
    1
  );
  clip-path: inset(calc((1 - var(--f)) * 100%) 0 0 0);
}

/* The outline draws itself: a dash as long as the line, slid along it (pathLength="1"). */
.is-scrub .hand-line,
.is-scrub .hand-detail,
.is-scrub .nail-line {
  stroke-dasharray: 1 1;
  stroke-dashoffset: calc(1 - var(--draw, 1));
}

/* Round line ends would show a dot before drawing starts, so hide the lines until then. */
.is-scrub .hand-line,
.is-scrub .nail-line {
  opacity: min(1, var(--draw, 1) * 20);
}

.is-scrub .hand-detail {
  opacity: min(0.55, var(--draw, 1) * 20);
}

.is-scrub .nail-bare {
  opacity: var(--draw, 1);
}

@media (prefers-reduced-motion: reduce) {
  .is-auto .nail-paint {
    animation: none;
  }
}
</style>
