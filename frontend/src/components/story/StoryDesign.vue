<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useCatalogStore } from '@/stores/catalog'
import { phase, easeOut, setVars } from '@/utils/motion'
import HandArt from '@/components/HandArt.vue'
import StoryScene from './StoryScene.vue'

// Scene 01, "Pick a design". As the visitor scrolls (progress 0 → 1):
//   0    – 0.15  the hand's outline draws itself
//   0.15 – 0.4   the nails are painted one after another in the first design
//   0.4  – 0.9   the set changes through the other designs, each a quick wipe,
//                while the caption and the background tint follow
//   0.9  – 1     the hand settles and the scene scrolls away
defineProps({
  animated: { type: Boolean, default: false },
})
const emit = defineEmits(['progress'])

const catalog = useCatalogStore()
onMounted(() => catalog.load())

// Four designs from her gallery with clearly different motifs, ending on #3
// (the one the "Send it" scene books).
const SHOWCASE_IDS = [2, 4, 7, 3]
const designs = computed(() => {
  const picked = SHOWCASE_IDS.map((id) => catalog.designs.find((d) => d.id === id)).filter(Boolean)
  return picked.length === SHOWCASE_IDS.length ? picked : catalog.designs.slice(0, 4)
})

// When each change of design starts (the first design is painted from 0.15 to 0.4).
const CHANGES = [0.52, 0.66, 0.8]
const CHANGE_LENGTH = 0.08

// Which of the four designs is on top. It starts on the last one (the finished picture).
const current = ref(CHANGES.length)

const visual = ref(null)

// Phones show a closer crop of the hand (the four fingers), so the nails are bigger.
// Tablets and laptops have room for the whole hand.
const isWide = useMediaQuery('(min-width: 768px)')

// Runs on every scrolled frame. Small things that change all the time are written as
// CSS variables (no Vue re-render); `progress` only matters when a design changes.
function onProgress(p) {
  emit('progress', p)
  const index = CHANGES.filter((start) => p >= start).length
  current.value = index // Vue only re-renders when this number actually changes

  // How far each design has wiped over the ones before it: the first is painted from 0.15
  // to 0.4 (nail after nail), each later one is a quick wipe starting at its CHANGES time.
  const wipes = [phase(p, 0.15, 0.4), ...CHANGES.map((at) => phase(p, at, at + CHANGE_LENGTH))]
  const draw = easeOut(phase(p, 0.02, 0.15))

  setVars(visual.value, {
    '--draw': draw,
    '--wipe-0': wipes[0],
    '--wipe-1': wipes[1],
    '--wipe-2': wipes[2],
    '--wipe-3': wipes[3],
    // Each design's background tint fades in with its wipe and out as the next one arrives,
    // so only one soft colour shows at a time.
    '--tint-0': wipes[0] * (1 - wipes[1]),
    '--tint-1': wipes[1] * (1 - wipes[2]),
    '--tint-2': wipes[2] * (1 - wipes[3]),
    '--tint-3': wipes[3],
    // The hand rises in as it draws, tilts gently while the designs change, then settles.
    '--rise': 1 - draw,
    '--tilt': Math.sin(Math.PI * phase(p, 0.4, 0.9)),
    '--caption': phase(p, 0.14, 0.22),
    '--settle': easeOut(phase(p, 0.9, 0.98)),
  })
}

// The design on top at the moment (for the description read by screen readers).
const topDesign = computed(() => designs.value[current.value] ?? null)
</script>

<template>
  <StoryScene
    number="01"
    title="Pick a design"
    title-id="story-design-title"
    :animated="animated"
    @progress="onProgress"
  >
    <template #text>
      <p>Pick a design, or bring your own.</p>
      <p class="visually-hidden">
        The picture shows a hand whose nails are painted in some of my designs, ending with
        {{ topDesign ? `#${topDesign.id} ${topDesign.name}` : 'a sample design' }}.
      </p>
    </template>

    <template #visual>
      <div
        ref="visual"
        class="design-visual"
        :class="{ 'is-animated': animated }"
        aria-hidden="true"
      >
        <!-- Soft background tints, one per design, faded in turn (opacity only). -->
        <div
          v-for="(design, i) in designs"
          :key="design.id"
          class="tint"
          :style="{ '--tint-color': design.colors[0], '--tint': `var(--tint-${i})` }"
        ></div>

        <div class="hand-wrap">
          <HandArt :layers="designs" :close="!isWide" scrub />
          <svg class="settle-sparkle sparkle-a" viewBox="0 0 24 24">
            <path
              d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
            />
          </svg>
          <svg class="settle-sparkle sparkle-b" viewBox="0 0 24 24">
            <path
              d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
            />
          </svg>
        </div>

        <!--
          The caption rolls like a ticker: every name is stacked in one place, the current one
          shows, the previous one has rolled up out of view and the next waits below. The pill
          clips them, so the text is always solid and never half faded. All names share one
          grid cell, so the pill is as wide as the longest and never changes size.
        -->
        <p v-if="designs.length" class="caption">
          <span
            v-for="(design, i) in designs"
            :key="design.id"
            class="caption-name"
            :class="{ 'is-current': i === current, 'is-past': i < current }"
          >
            <strong>#{{ design.id }}</strong> {{ design.name }}
          </span>
        </p>
      </div>
    </template>
  </StoryScene>
</template>

<style scoped>
.design-visual {
  position: relative;
  height: min(70vw, 26rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

/* A soft round glow behind the hand in the design's base colour (mixed with cream,
   so even the dark designs only tint it gently). */
.tint {
  position: absolute;
  inset: -10% -20%;
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--tint-color) 45%, var(--tt-cream)),
    transparent
  );
  opacity: 0;
  pointer-events: none;
}

/* Finished state: the last tint shows. */
.tint:last-of-type {
  opacity: 1;
}

.hand-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  justify-content: center;
}

.hand-wrap :deep(.hand-art) {
  width: auto;
  max-width: 100%;
  height: 100%;
}

.caption {
  position: relative;
  flex: 0 0 auto;
  display: grid;
  margin: 0;
  padding: 0.4rem 1.1rem;
  border-radius: 999px;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
}

.caption-name {
  grid-area: 1 / 1;
  text-align: center;
  transform: translateY(130%);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.caption-name.is-past {
  transform: translateY(-130%);
}

.caption-name.is-current {
  transform: none;
}

.caption strong {
  color: var(--tt-deep-rose);
}

.settle-sparkle {
  position: absolute;
  width: 1.4rem;
  fill: var(--tt-rose);
}

.sparkle-a {
  top: 6%;
  right: 22%;
}

.sparkle-b {
  top: 30%;
  left: 18%;
  width: 0.9rem;
}

/* ---- Pinned and scrubbed ---- */
.design-visual.is-animated {
  height: 100%;
}

/* will-change gives the moving parts their own compositor layers, so a change to one
   does not repaint the large soft glows around it. */
.is-animated .tint {
  opacity: var(--tint);
  will-change: opacity;
}

.is-animated .hand-wrap {
  will-change: transform;
  transform: translateY(calc(var(--rise, 0) * 1.5rem)) rotate(calc(var(--tilt, 0) * -3deg));
  transform-origin: 50% 90%;
}

.is-animated .caption {
  opacity: var(--caption, 1);
}

.is-animated .settle-sparkle {
  opacity: var(--settle, 1);
  transform: scale(calc(0.4 + var(--settle, 1) * 0.6));
}

@media (min-width: 992px) {
  .design-visual {
    height: 32rem;
  }
}
</style>
