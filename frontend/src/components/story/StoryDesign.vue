<script setup>
import { ref, computed, onMounted } from 'vue'
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

// Four designs from her gallery, ending on #3 (the one the "Send it" scene books).
const SHOWCASE_IDS = [8, 4, 1, 3]
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

// Runs on every scrolled frame. Small things that change all the time are written as
// CSS variables (no Vue re-render); `progress` only matters when a design changes.
function onProgress(p) {
  emit('progress', p)
  const index = CHANGES.filter((start) => p >= start).length
  current.value = index // Vue only re-renders when this number actually changes

  // How far the top colour has wiped over the one underneath.
  const wipe = index === 0 ? phase(p, 0.15, 0.4) : phase(p, CHANGES[index - 1], CHANGES[index - 1] + CHANGE_LENGTH)
  const draw = easeOut(phase(p, 0.02, 0.15))

  setVars(visual.value, {
    '--draw': draw,
    '--wipe': wipe,
    // Wide stagger for the first paint (one nail after another), small for the quick changes.
    '--stagger': index === 0 ? 0.3 : 0.07,
    // The hand rises in as it draws, tilts gently while the designs change, then settles.
    '--rise': 1 - draw,
    '--tilt': Math.sin(Math.PI * phase(p, 0.4, 0.9)),
    '--caption': phase(p, 0.14, 0.22),
    '--settle': easeOut(phase(p, 0.9, 0.98)),
    // Background tint of each design, so later ones cover earlier ones.
    '--tint-0': phase(p, 0.15, 0.4),
    '--tint-1': phase(p, CHANGES[0], CHANGES[0] + CHANGE_LENGTH),
    '--tint-2': phase(p, CHANGES[1], CHANGES[1] + CHANGE_LENGTH),
    '--tint-3': phase(p, CHANGES[2], CHANGES[2] + CHANGE_LENGTH),
  })
}

// What HandArt shows: the current design over the previous one (bare nails before the first).
const topDesign = computed(() => designs.value[current.value] ?? null)
const underDesign = computed(() => (current.value === 0 ? null : designs.value[current.value - 1]))
</script>

<template>
  <StoryScene number="01" title-id="story-design-title" :animated="animated" @progress="onProgress">
    <template #text>
      <h2 id="story-design-title">Pick a design</h2>
      <p>Pick a design, or bring your own.</p>
      <p class="visually-hidden">
        The picture shows a hand whose nails are painted in some of my designs, ending with
        {{ topDesign ? `#${topDesign.id} ${topDesign.name}` : 'a sample design' }}.
      </p>
    </template>

    <template #visual>
      <div ref="visual" class="design-visual" :class="{ 'is-animated': animated }" aria-hidden="true">
        <!-- Soft background tints, one per design, faded in turn (opacity only). -->
        <div
          v-for="(design, i) in designs"
          :key="design.id"
          class="tint"
          :style="{ '--tint-color': design.colors[0], '--tint': `var(--tint-${i})` }"
        ></div>

        <div class="hand-wrap">
          <HandArt :design="topDesign" :under="underDesign" scrub />
          <svg class="settle-sparkle sparkle-a" viewBox="0 0 24 24">
            <path d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z" />
          </svg>
          <svg class="settle-sparkle sparkle-b" viewBox="0 0 24 24">
            <path d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z" />
          </svg>
        </div>

        <p v-if="topDesign" class="caption">
          <Transition name="caption-swap" mode="out-in">
            <span :key="topDesign.id">
              <strong>#{{ topDesign.id }}</strong> {{ topDesign.name }}
            </span>
          </Transition>
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

/* A soft round glow behind the hand in the design's base colour. */
.tint {
  position: absolute;
  inset: -10% -20%;
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--tint-color) 70%, transparent),
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
  margin: 0;
  padding: 0.35rem 1rem;
  border-radius: 999px;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  font-size: 1rem;
  white-space: nowrap;
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

.caption-swap-enter-active,
.caption-swap-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.caption-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.caption-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---- Pinned and scrubbed ---- */
.design-visual.is-animated {
  height: 100%;
}

.is-animated .tint {
  opacity: var(--tint);
}

.is-animated .hand-wrap {
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
