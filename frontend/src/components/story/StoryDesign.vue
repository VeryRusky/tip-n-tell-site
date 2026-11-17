<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { phase, easeOut, setVars } from '@/utils/motion'
import HandArt from '@/components/HandArt.vue'

// Story scene 1, "Pick a design". The story player (StoryPlayer.vue) calls `update(t)`
// about 60 times a second while the scene plays, with t going from 0 to 1 over about
// four seconds:
//   0    – 0.14  the hand's outline draws itself
//   0.13 – 0.34  the nails are painted one after another in the first design
//   0.42 – 0.75  the set changes through three more designs, each a quick wipe,
//                while the caption and the background tint follow
//   0.8  – 1     the hand settles with two sparkles, and holds
// Without `animated` (Reduce Motion) the scene simply shows its finished picture.
defineProps({
  animated: { type: Boolean, default: false },
})

const catalog = useCatalogStore()
onMounted(() => catalog.load())

// Four designs from her gallery with clearly different motifs, ending on #3
// (the one the "Send it" scene books).
const SHOWCASE_IDS = [2, 4, 7, 3]
const designs = computed(() => {
  const picked = SHOWCASE_IDS.map((id) => catalog.designs.find((d) => d.id === id)).filter(Boolean)
  return picked.length === SHOWCASE_IDS.length ? picked : catalog.designs.slice(0, 4)
})

// When each change of design starts, and how long its wipe takes.
const CHANGES = [0.42, 0.53, 0.64]
const CHANGE_LENGTH = 0.07

// Which of the four designs is on top. It starts on the last one (the finished picture).
const current = ref(CHANGES.length)

const visual = ref(null)

// Draws the scene at time t (0 to 1). Things that change every frame are written as CSS
// variables (no Vue re-render); `current` only changes when a new design starts.
function update(t) {
  current.value = CHANGES.filter((start) => t >= start).length

  // How far each design has wiped over the ones before it.
  const wipes = [phase(t, 0.13, 0.34), ...CHANGES.map((at) => phase(t, at, at + CHANGE_LENGTH))]
  const draw = easeOut(phase(t, 0, 0.14))

  setVars(visual.value, {
    '--draw': draw,
    '--wipe-0': wipes[0],
    '--wipe-1': wipes[1],
    '--wipe-2': wipes[2],
    '--wipe-3': wipes[3],
    // Each design's background tint fades in with its wipe and out as the next one arrives.
    '--tint-0': wipes[0] * (1 - wipes[1]),
    '--tint-1': wipes[1] * (1 - wipes[2]),
    '--tint-2': wipes[2] * (1 - wipes[3]),
    '--tint-3': wipes[3],
    // The hand rises in as it draws, tilts gently while the designs change, then settles.
    '--rise': 1 - draw,
    '--tilt': Math.sin(Math.PI * phase(t, 0.36, 0.8)),
    '--caption': phase(t, 0.1, 0.16),
    '--settle': easeOut(phase(t, 0.78, 0.88)),
  })
}

defineExpose({ update })

// The design on top at the moment (for the description read by screen readers).
const topDesign = computed(() => designs.value[current.value] ?? null)
</script>

<template>
  <div class="card-scene">
    <div class="card-text">
      <h3 id="story-design-title">Pick a design</h3>
      <p>Pick a design, or bring your own.</p>
      <p class="visually-hidden">
        The picture shows a hand whose nails are painted in some of my designs, ending with
        {{ topDesign ? `#${topDesign.id} ${topDesign.name}` : 'a sample design' }}.
      </p>
    </div>

    <div
      ref="visual"
      class="card-picture design-visual"
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

      <!-- A close crop of four fingers, so the designs are big enough to see. -->
      <div class="hand-wrap">
        <HandArt :layers="designs" close scrub />
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
  </div>
</template>

<style scoped>
.design-visual {
  position: relative;
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

/* ---- Playing (CSS variables set by update) ---- */
/* will-change gives the moving parts their own compositor layers, so a change to one
   does not repaint the large soft glows around it. */
.is-animated .tint {
  opacity: var(--tint);
  will-change: opacity;
}

.is-animated .hand-wrap {
  will-change: transform;
  transform: translateY(calc(var(--rise, 0) * 1rem)) rotate(calc(var(--tilt, 0) * -2.5deg));
  transform-origin: 50% 90%;
}

.is-animated .caption {
  opacity: var(--caption, 1);
}

.is-animated .settle-sparkle {
  opacity: var(--settle, 1);
  transform: scale(calc(0.4 + var(--settle, 1) * 0.6));
}
</style>
