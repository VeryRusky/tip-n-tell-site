<script setup>
import { ref, computed, watch, useId, onMounted, onBeforeUnmount } from 'vue'
import { almondNail } from '@/utils/nailArt'
import NailPaint from './NailPaint.vue'

// A line-art hand whose nails are painted with a design (see NailPaint.vue for the motifs).
//
// Two views:
//   'hand'  the back of a hand, cropped from the fingertips to mid-palm, with the lines
//           fading out towards the wrist (the home page's "Pick a design" scene)
//   'tips'  a close-up of four fingertips in a row, so the design is easy to see in a
//           small space (the live preview on the Design step)
//
// Two ways to paint:
// - Normal (default): when `design` changes, the new design wipes over the old one,
//   from cuticle to tip, nail after nail (a short CSS animation).
// - Scrubbed (`scrub`): the home page scene controls the wipe with scroll. It passes all
//   the designs it will show (`layers`), which are drawn once, stacked, each starting
//   hidden. The scene then sets CSS variables on a parent element:
//     --wipe-0, --wipe-1, …  0 to 1, how far each design has wiped over the ones below
//     --draw                 0 to 1, how much of the outline has been drawn
//   Scrolling only changes these numbers, so Vue never has to redraw the nails.
//
// A design of null means bare nails ("My own design").
const props = defineProps({
  design: { type: Object, default: null },
  layers: { type: Array, default: () => [] }, // scrubbed mode: the designs, in order
  scrub: { type: Boolean, default: false },
  view: { type: String, default: 'hand' }, // 'hand' or 'tips'
  close: { type: Boolean, default: false }, // hand view: crop closer, to the four fingers
  ownHint: { type: Boolean, default: false }, // sparkles and "your design" on bare nails
})

const uid = useId()

// ---- Fingers ----
// Each finger is described by where its base sits, which way it points, how much it
// curves along its length, and how wide it is. Its outline is worked out from that.
//   x, y      middle of the finger's base
//   angle     direction at the base, in degrees (0 = straight up, negative leans left)
//   bend      how many degrees it turns between base and tip (a gentle curve)
//   length    base to fingertip
//   base/tip  half the finger's width at the base and at the tip
const HAND = [
  { x: 120, y: 350, angle: -46, bend: 20, length: 116, base: 18.5, tip: 13.5 }, // thumb
  { x: 152, y: 262, angle: -7, bend: 4, length: 150, base: 16.5, tip: 12.5 }, // index
  { x: 186, y: 254, angle: -1, bend: 1, length: 166, base: 17, tip: 13 }, // middle
  { x: 219, y: 262, angle: 6, bend: -3, length: 152, base: 16, tip: 12.3 }, // ring
  { x: 249, y: 284, angle: 13, bend: -5, length: 118, base: 14, tip: 10.8 }, // pinky
]

// The fingertip close-up: four short, upright fingertips side by side.
const TIPS = [
  { x: 36, y: 140, angle: -5, bend: 0, length: 118, base: 15, tip: 14.5 },
  { x: 82, y: 140, angle: -1, bend: 0, length: 130, base: 15.5, tip: 15 },
  { x: 128, y: 140, angle: 3, bend: 0, length: 124, base: 15, tip: 14.5 },
  { x: 172, y: 140, angle: 8, bend: 0, length: 104, base: 13.5, tip: 13 },
]

const rad = (deg) => (deg * Math.PI) / 180
const round = (n) => Math.round(n * 10) / 10
const pt = (p) => `${round(p[0])} ${round(p[1])}`

// Point and direction a distance `s` along a finger's centre line. The direction turns
// evenly from `angle` to `angle + bend`, so the finger curves smoothly.
function along(f, s) {
  const steps = 24
  let x = f.x
  let y = f.y
  for (let i = 0; i < steps; i++) {
    const a = rad(f.angle + (f.bend * (i + 0.5) * s) / (steps * f.length))
    x += (Math.sin(a) * s) / steps
    y -= (Math.cos(a) * s) / steps
  }
  return { x, y, a: rad(f.angle + (f.bend * s) / f.length) }
}

// Half the finger's width at distance s (narrows towards the tip, a touch fuller at the knuckle).
function halfWidth(f, s) {
  const t = s / f.length
  return f.base + (f.tip - f.base) * t + 0.9 * Math.sin(Math.PI * t)
}

// A point on the left (-1) or right (+1) edge of the finger at distance s.
function edge(f, s, side) {
  const p = along(f, s)
  const w = halfWidth(f, s) * side
  return [p.x + Math.cos(p.a) * w, p.y + Math.sin(p.a) * w]
}

// Smooth curve through a list of points (Catmull-Rom turned into Bézier curves).
function smooth(points) {
  let d = ''
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d
}

// One finger's outline, from the base of its left edge, round the tip, and down its
// right edge to `rightEnd` (the base, or part-way up for the thumb, where the web joins).
// The path must already be at the left base.
function fingerOutline(f, rightEnd = 0) {
  const top = f.length - f.tip
  const count = 7
  const left = []
  const right = []
  for (let i = 0; i <= count; i++) {
    left.push(edge(f, (top * i) / count, -1))
    right.push(edge(f, rightEnd + ((top - rightEnd) * i) / count, 1))
  }
  return `${smooth(left)} A ${f.tip} ${f.tip} 0 0 1 ${pt(right[count])}${smooth(right.reverse())}`
}

// The dip between two fingers.
function between(a, b) {
  const [x1, y1] = edge(a, 0, 1)
  const [x2, y2] = edge(b, 0, -1)
  return `Q ${round((x1 + x2) / 2)} ${round(Math.max(y1, y2) + 9)} ${pt([x2, y2])}`
}

// The skin between thumb and index: it carries on down the thumb's inner edge, dips,
// then rises into the index finger, so there is no sharp corner.
function web(thumb, webStart, index) {
  const start = along(thumb, webStart)
  const [ix, iy] = edge(index, 0, -1)
  const [sx, sy] = edge(thumb, webStart, 1)
  const c1 = [sx - Math.sin(start.a) * 22, sy + Math.cos(start.a) * 22]
  const c2 = [ix - 2, iy + 34]
  return `C ${pt(c1)} ${pt(c2)} ${pt([ix, iy])}`
}

// The hand as one continuous line, so it can draw itself in one stroke.
function handOutline() {
  const [thumb, index, middle, ring, pinky] = HAND
  const webStart = thumb.length * 0.3 // the web leaves the thumb a third of the way up
  return [
    'M 138 470',
    `C 132 430 110 400 ${pt(edge(thumb, 0, -1))}`,
    fingerOutline(thumb, webStart),
    web(thumb, webStart, index), // the soft web between thumb and index
    fingerOutline(index),
    between(index, middle),
    fingerOutline(middle),
    between(middle, ring),
    fingerOutline(ring),
    between(ring, pinky),
    fingerOutline(pinky),
    'C 270 330 268 400 258 470',
  ].join(' ')
}

// Each fingertip on its own (tips view).
function tipOutline(f) {
  return `M ${pt(edge(f, 0, -1))}${fingerOutline(f)}`
}

// Lighter accent lines: a crease at the middle joint, and (on the hand) a knuckle curve.
function details(f, positions) {
  return positions.map((at) => {
    const s = f.length * at
    const p = along(f, s)
    const w = halfWidth(f, s) * 0.5
    const lift = at < 0.3 ? 5 : 3
    const a = [p.x - Math.cos(p.a) * w, p.y - Math.sin(p.a) * w]
    const b = [p.x + Math.cos(p.a) * w, p.y + Math.sin(p.a) * w]
    const c = [p.x + Math.sin(p.a) * lift, p.y - Math.cos(p.a) * lift]
    return `M ${pt(a)} Q ${pt(c)} ${pt(b)}`
  })
}

// The nail sits at the fingertip, pointing the way the finger points there.
// It is long and almond shaped: it starts 30% of the finger's length back from the tip
// and reaches 14% of the finger's length beyond it.
function nailFor(f) {
  const end = along(f, f.length)
  const halfW = f.tip * 0.9
  const cuticle = f.length * 0.3
  const tip = -f.length * 0.14
  return {
    transform: `translate(${round(end.x)} ${round(end.y)}) rotate(${round((end.a * 180) / Math.PI)})`,
    halfWidth: round(halfW),
    cuticle: round(cuticle),
    tip: round(tip),
    outline: almondNail(halfW, cuticle, tip),
  }
}

// ---- What to draw for the chosen view ----
const drawing = computed(() => {
  if (props.view === 'tips') {
    return {
      viewBox: [10, 2, 190, 92],
      fadeFrom: 66,
      fadeTo: 94,
      lines: TIPS.map(tipOutline),
      details: TIPS.flatMap((f) => details(f, [0.42])),
      nails: TIPS.map(nailFor),
      hint: { x: 104, y: 88 },
    }
  }
  // The close crop (phones) leaves the thumb out of frame so the four nails can be bigger.
  return {
    viewBox: props.close ? [106, 58, 188, 270] : [22, 56, 272, 356],
    fadeFrom: props.close ? 262 : 330,
    fadeTo: props.close ? 328 : 410,
    lines: [handOutline()],
    details: HAND.flatMap((f, i) => details(f, i === 0 ? [0.5] : [0.5, 0.12])),
    nails: HAND.map(nailFor),
    hint: { x: 190, y: 330 },
  }
})

// ---- Thin, even lines at any size ----
// The drawing is scaled to fit its box, so a line 1 unit wide would look thicker on a big
// screen than on a small one. We measure the scale and set the line width so it always
// shows at about 1.75 pixels (see the styles).
const svg = ref(null)
const unit = ref(1) // drawing units per screen pixel
let resizeObserver = null

function measure() {
  const box = svg.value?.getBoundingClientRect()
  const [, , width, height] = drawing.value.viewBox
  if (!box || !box.width || !box.height) return
  unit.value = round((100 * Math.max(width / box.width, height / box.height)) / 1) / 100
}

onMounted(() => {
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(svg.value)
  measure()
})

onBeforeUnmount(() => resizeObserver?.disconnect())
watch(drawing, measure, { flush: 'post' })

// ---- Normal mode: remember the design underneath while the new one wipes in ----
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

// The first scrubbed layer is painted one nail after another; the later ones are quick wipes.
const layerStagger = (k) => (k === 0 ? 0.3 : 0.07)
// The order the nails are painted in. In the close crop the thumb is out of frame,
// so it goes last and the visible nails start straight away.
const paintOrder = (n) => (props.view === 'hand' && props.close ? (n + 4) % 5 : n)

// Which of a design's nail drawings each finger uses (the tips view starts at the index finger).
const nailIndex = (n) => (props.view === 'tips' ? n + 1 : n)
</script>

<template>
  <svg
    ref="svg"
    class="hand-art"
    :class="[scrub ? 'is-scrub' : 'is-auto', `view-${view}`]"
    :viewBox="drawing.viewBox.join(' ')"
    :style="{ '--unit': unit }"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <!-- The lines fade out towards the wrist instead of stopping. -->
      <linearGradient
        :id="`${uid}-fade`"
        gradientUnits="userSpaceOnUse"
        x1="0"
        :y1="drawing.fadeFrom"
        x2="0"
        :y2="drawing.fadeTo"
      >
        <stop offset="0" class="fade-stop" />
        <stop offset="1" class="fade-stop" stop-opacity="0" />
      </linearGradient>
    </defs>

    <g :stroke="`url(#${uid}-fade)`">
      <path
        v-for="(line, i) in drawing.lines"
        :key="`l${i}`"
        class="hand-line"
        :d="line"
        pathLength="1"
      />
      <path
        v-for="(line, i) in drawing.details"
        :key="`d${i}`"
        class="hand-detail"
        :d="line"
        pathLength="1"
      />
    </g>

    <g
      v-for="(nail, n) in drawing.nails"
      :key="n"
      :transform="nail.transform"
      :style="{ '--n': paintOrder(n) }"
    >
      <!-- Scrubbed: bare nails, then every design stacked, each wiped in by its own variable. -->
      <template v-if="scrub">
        <NailPaint
          class="nail-under"
          :index="nailIndex(n)"
          :half-width="nail.halfWidth"
          :cuticle="nail.cuticle"
          :tip="nail.tip"
          :uid="`${uid}-bare${n}`"
        />
        <NailPaint
          v-for="(layer, k) in layers"
          :key="layer.id"
          class="nail-paint"
          :style="{ '--wipe': `var(--wipe-${k}, 1)`, '--stagger': layerStagger(k) }"
          :design="layer"
          :index="nailIndex(n)"
          :half-width="nail.halfWidth"
          :cuticle="nail.cuticle"
          :tip="nail.tip"
          :uid="`${uid}-l${k}n${n}`"
        />
      </template>
      <!-- Normal: the previous design, and the new one wiping in (a new key restarts it). -->
      <template v-else>
        <NailPaint
          class="nail-under"
          :design="previous"
          :index="nailIndex(n)"
          :half-width="nail.halfWidth"
          :cuticle="nail.cuticle"
          :tip="nail.tip"
          :uid="`${uid}-u${n}-${previous?.id ?? 'bare'}`"
        />
        <NailPaint
          :key="`paint-${paintKey}`"
          class="nail-paint"
          :design="design"
          :index="nailIndex(n)"
          :half-width="nail.halfWidth"
          :cuticle="nail.cuticle"
          :tip="nail.tip"
          :uid="`${uid}-p${n}-${design?.id ?? 'bare'}-${paintKey}`"
        />
      </template>
      <path class="nail-line" :d="nail.outline" pathLength="1" />
    </g>

    <!-- "My own design": bare nails with sparkles and a note. -->
    <g v-if="ownHint && !design" class="own-hint">
      <path
        :transform="`translate(${drawing.hint.x + 40} ${drawing.hint.y - 90}) scale(0.8)`"
        d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
      />
      <path
        :transform="`translate(${drawing.hint.x - 80} ${drawing.hint.y - 50}) scale(0.5)`"
        d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
      />
      <text :x="drawing.hint.x" :y="drawing.hint.y" text-anchor="middle">your design</text>
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

.fade-stop {
  stop-color: var(--tt-deep-rose);
}

/* ---- Line art: about 1.75px main lines and lighter 1.1px accents, at any size ---- */
.hand-line,
.hand-detail,
.nail-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hand-line {
  stroke-width: calc(1.75 * var(--unit, 1));
}

.hand-detail {
  stroke-width: calc(1.1 * var(--unit, 1));
  opacity: 0.45;
}

.nail-line {
  stroke: var(--tt-deep-rose);
  stroke-width: calc(1.1 * var(--unit, 1));
  opacity: 0.75;
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

.view-tips .own-hint text {
  font-size: 12px;
}

/* ---- Normal mode: the new design wipes up each nail, one nail just after another ---- */
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
  inset(top …) hides the nail from the tip down; as --f grows, the paint rises from the cuticle.
*/
.is-scrub .nail-paint {
  --f: clamp(
    0,
    var(--wipe, 1) * (1 + 4 * var(--stagger, 0.08)) - var(--n) * var(--stagger, 0.08),
    1
  );
  clip-path: inset(calc((1 - var(--f)) * 100%) 0 0 0);
}

/* The outline draws itself: a dash as long as the line, slid along it (pathLength="1").
   Round line ends would show a dot before drawing starts, so lines also fade in quickly. */
.is-scrub .hand-line,
.is-scrub .hand-detail,
.is-scrub .nail-line {
  stroke-dasharray: 1 1;
  stroke-dashoffset: calc(1 - var(--draw, 1));
}

.is-scrub .hand-line {
  opacity: min(1, var(--draw, 1) * 20);
}

.is-scrub .hand-detail {
  opacity: min(0.45, var(--draw, 1) * 20);
}

.is-scrub .nail-line {
  opacity: min(0.75, var(--draw, 1) * 20);
}

.is-scrub .nail-under {
  opacity: var(--draw, 1);
}

@media (prefers-reduced-motion: reduce) {
  .is-auto .nail-paint {
    animation: none;
  }
}
</style>
