<script setup>
import { useId } from 'vue'
import { almondNail } from '@/utils/nailArt'
import NailPaint from './NailPaint.vue'

// The picture for one design. Until she supplies her own photos, this draws a
// placeholder: five almond nails painted with the design's colours and motif, using the
// same drawing as the hand on the home page and the live preview (NailPaint.vue).
// When `design.image` is set, the real photo is shown instead.
defineProps({
  design: { type: Object, required: true },
})

const uid = useId()

// Five nails in a row, the middle one longest, like a hand's fingertips.
const NAILS = [
  { x: 36, cuticle: 152, tip: 78 },
  { x: 68, cuticle: 143, tip: 58 },
  { x: 100, cuticle: 139, tip: 48 },
  { x: 132, cuticle: 143, tip: 58 },
  { x: 164, cuticle: 152, tip: 78 },
]
const HALF_WIDTH = 12.5
</script>

<template>
  <div class="design-art">
    <img
      v-if="design.image"
      :src="design.image"
      :alt="`Design ${design.id}: ${design.name}`"
      loading="lazy"
    />
    <div
      v-else
      class="design-placeholder"
      :style="{ '--base': design.colors[0] }"
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" focusable="false">
        <g v-for="(nail, i) in NAILS" :key="i" :transform="`translate(${nail.x} 0)`">
          <NailPaint
            :design="design"
            :index="i"
            :half-width="HALF_WIDTH"
            :cuticle="nail.cuticle"
            :tip="nail.tip"
            :uid="`${uid}-${i}`"
          />
          <!-- A faint edge so pale nails still show on pale backgrounds. -->
          <path class="nail-edge" :d="almondNail(HALF_WIDTH, nail.cuticle, nail.tip)" />
        </g>
      </svg>
      <span class="placeholder-label">sample</span>
    </div>
  </div>
</template>

<style scoped>
.design-art {
  aspect-ratio: 1 / 1;
  border-radius: var(--tt-radius-small);
  overflow: hidden;
  border: 1px solid var(--tt-line);
  background: var(--tt-blush);
}

.design-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.design-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 20%, #fff8 0, transparent 55%), var(--base);
}

.design-placeholder svg {
  display: block;
  width: 100%;
  height: 100%;
}

.nail-edge {
  fill: none;
  stroke: rgba(26, 26, 26, 0.12);
  stroke-width: 1;
}

.placeholder-label {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #1a1a1a;
  background: #ffffffcc;
  border-radius: 999px;
  padding: 0 0.4rem;
}
</style>
