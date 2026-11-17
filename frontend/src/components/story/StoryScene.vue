<script setup>
import { ref, computed } from 'vue'
import { useScrollProgress } from '@/composables/useScrollProgress'
import { phase, easeOut, setVars } from '@/utils/motion'

// The frame shared by the three scroll scenes: a numeral, a headline, the scene's text
// and its picture.
//
//   phones                    laptops (lg and up)
//   ┌───────────────┐         ┌─────────────┬─────────────────┐
//   │ 01            │         │ 01          │                 │
//   │ Headline      │         │ Headline    │     picture     │
//   │ text          │         │ text        │                 │
//   ├───────────────┤         └─────────────┴─────────────────┘
//   │   picture     │
//   └───────────────┘
//
// When `animated` is true the section is two screens tall and its stage is pinned with
// `position: sticky`, so the picture can be scrubbed by scrolling (see useScrollProgress).
// The text is choreographed too: as the stage arrives, the numeral comes in first, then
// the headline's words rise one after another, then the supporting text. It is fully
// readable from 8% to 90% of the scene, and eases out at the very end, as the next scene
// arrives. When `animated` is false (Reduce Motion, or a very short screen) it is an
// ordinary section, and everything shows its finished state.
const props = defineProps({
  number: { type: String, required: true }, // '01'
  title: { type: String, required: true }, // the headline, e.g. 'Pick a design'
  titleId: { type: String, required: true },
  animated: { type: Boolean, default: false },
})

const emit = defineEmits(['progress'])

// The headline split into words, so each word can rise on its own.
const words = computed(() => props.title.split(' '))

// A few sparkles and hearts around the picture on laptops. Each drifts at its own rate
// as you scroll (a little parallax), so the scene has some depth. `rate` is how many
// pixels it moves over the scene; bigger ones move more, as if nearer.
const DECOR = [
  { kind: 'sparkle', x: '4%', y: '14%', size: 1.3, rate: 90 },
  { kind: 'heart', x: '90%', y: '10%', size: 0.95, rate: 140 },
  { kind: 'sparkle', x: '94%', y: '62%', size: 0.8, rate: 60 },
  { kind: 'heart', x: '8%', y: '78%', size: 0.75, rate: 110 },
  { kind: 'sparkle', x: '52%', y: '96%', size: 0.6, rate: 40 },
]

const section = ref(null)
const stage = ref(null)

useScrollProgress(section, stage, (progress, raw) => {
  setVars(stage.value, {
    // Text in: from 30% of a screen before pinning until 8% into the scene.
    '--enter': easeOut(phase(raw, -0.3, 0.08)),
    // Text out: over the last 10% of the scene.
    '--leave': phase(raw, 0.9, 1),
    // For the drifting decorations: runs on a little before and after the scene.
    '--drift': Math.min(1.3, Math.max(-0.3, raw)),
  })
  emit('progress', progress)
})
</script>

<template>
  <section
    ref="section"
    class="scene"
    :class="{ 'is-pinned': animated }"
    :aria-labelledby="titleId"
  >
    <div ref="stage" class="scene-stage">
      <div class="container-lg scene-grid">
        <div class="scene-text">
          <p class="scene-number" aria-hidden="true">{{ number }}</p>
          <h2 :id="titleId" class="scene-title">
            <template v-for="(word, i) in words" :key="i"
              ><span class="word" :style="{ '--w': i }">{{ word }}</span
              >{{ i < words.length - 1 ? ' ' : '' }}</template
            >
          </h2>
          <div class="scene-lines">
            <slot name="text" />
          </div>
        </div>
        <div class="scene-visual">
          <div class="scene-decor d-none d-lg-block" aria-hidden="true">
            <svg
              v-for="(item, i) in DECOR"
              :key="i"
              class="decor"
              :class="`decor-${item.kind}`"
              viewBox="0 0 24 24"
              :style="{
                left: item.x,
                top: item.y,
                '--size': `${item.size}rem`,
                '--rate': item.rate,
              }"
            >
              <path
                v-if="item.kind === 'sparkle'"
                d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
              />
              <path
                v-else
                d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.7c0 5.4-7.5 10-7.5 10z"
              />
            </svg>
          </div>
          <slot name="visual" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---- Finished (static) layout: an ordinary section ---- */
.scene-stage {
  padding: 2.5rem 0;
}

.scene-grid {
  display: grid;
  gap: 1.25rem;
}

.scene-number {
  font-family: var(--tt-font-heading);
  font-weight: 600;
  color: var(--tt-deep-rose);
  font-size: 1rem;
  letter-spacing: 0.12em;
  margin: 0 0 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

/* A short line after the number, like the rules on her posters. */
.scene-number::after {
  content: '';
  width: 2.5rem;
  height: 1px;
  background: var(--tt-line);
}

.scene-title {
  font-size: clamp(2.5rem, 9vw, 5.5rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--tt-ink);
  margin: 0 0 0.6rem;
}

.word {
  display: inline-block;
}

.scene-lines :deep(p) {
  font-size: 1.15rem;
  color: var(--tt-muted);
  margin-bottom: 0.35rem;
  max-width: 26rem;
}

.scene-visual {
  position: relative;
  min-width: 0;
}

/* Decorations sit behind the picture and never catch clicks. */
.scene-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decor {
  position: absolute;
  width: var(--size);
  height: var(--size);
  fill: var(--tt-rose);
  opacity: 0.55;
}

.decor-heart {
  fill: none;
  stroke: var(--tt-rose);
  stroke-width: 1.8;
}

/* ---- Pinned layout (animated) ---- */
.is-pinned {
  /* Two screens: one to look at the stage, one of scrolling to play it. */
  height: 200svh;
}

.is-pinned .scene-stage {
  position: sticky;
  top: var(--tt-header-h);
  height: calc(100svh - var(--tt-header-h));
  /* Room at the top for the story's progress bars. */
  padding: 1.6rem 0 1rem;
}

.is-pinned .scene-grid {
  height: 100%;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
}

.is-pinned .scene-visual {
  min-height: 0;
}

/*
  Headline choreography. --enter goes 0 → 1 as the stage arrives; each part starts a
  little later than the one before (numeral, then each word, then the text).
  --leave goes 0 → 1 at the very end and lifts the whole block away.
*/
.is-pinned .scene-number {
  --f: clamp(0, var(--enter, 1) * 3, 1);
  opacity: var(--f);
  transform: translateY(calc((1 - var(--f)) * 0.8rem));
}

.is-pinned .word {
  --f: clamp(0, var(--enter, 1) * 2.4 - 0.45 - var(--w) * 0.22, 1);
  opacity: var(--f);
  transform: translateY(calc((1 - var(--f)) * 0.45em));
}

.is-pinned .scene-lines {
  --f: clamp(0, var(--enter, 1) * 3 - 2, 1);
  opacity: var(--f);
  transform: translateY(calc((1 - var(--f)) * 0.75rem));
}

/* will-change: the moving text and decorations get their own compositor layers, so
   scrolling does not repaint the rest of the stage. */
.is-pinned .scene-text {
  will-change: transform, opacity;
  opacity: calc(1 - var(--leave, 0));
  transform: translateY(calc(var(--leave, 0) * -1.5rem));
}

/* Each decoration drifts at its own rate: up as you scroll down, by `--rate` pixels. */
.is-pinned .decor {
  will-change: transform;
  transform: translateY(calc((0.5 - var(--drift, 0.5)) * var(--rate) * 1px))
    rotate(calc(var(--drift, 0.5) * 40deg));
}

/* Short phones: tighten the text so the picture keeps enough room. */
@media (max-height: 700px) and (max-width: 991.98px) {
  .is-pinned .scene-title {
    font-size: 2.3rem;
    margin-bottom: 0.3rem;
  }

  .is-pinned .scene-lines :deep(p) {
    font-size: 1rem;
    margin-bottom: 0.15rem;
  }

  .is-pinned .scene-grid {
    gap: 0.6rem;
  }
}

/* ---- Laptops: text on the left with a large numeral, picture on the right ---- */
@media (min-width: 992px) {
  .scene-grid {
    grid-template-columns: 5fr 7fr;
    align-items: center;
    gap: 3rem;
  }

  .is-pinned .scene-grid {
    grid-template-rows: minmax(0, 1fr);
  }

  .is-pinned .scene-visual {
    height: 100%;
  }

  .scene-number {
    font-size: clamp(5rem, 9vw, 8rem);
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--tt-rose); /* large type only, so the lighter rose is fine here */
    margin-bottom: 0.5rem;
  }

  .scene-number::after {
    display: none;
  }

  .scene-lines :deep(p) {
    font-size: 1.3rem;
  }
}
</style>
