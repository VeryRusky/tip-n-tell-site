<script setup>
import { ref } from 'vue'
import { useScrollProgress } from '@/composables/useScrollProgress'

// The frame shared by the three scroll scenes: a numeral, the scene's text and its picture.
//
//   phones                    laptops (lg and up)
//   ┌───────────────┐         ┌─────────────┬─────────────────┐
//   │ 01            │         │ 01          │                 │
//   │ Heading       │         │ Heading     │     picture     │
//   │ text          │         │ text        │                 │
//   ├───────────────┤         └─────────────┴─────────────────┘
//   │   picture     │
//   └───────────────┘
//
// When `animated` is true the section is two screens tall and its stage is pinned with
// `position: sticky`, so the picture can be scrubbed by scrolling (see useScrollProgress).
// When it is false (Reduce Motion, or a very short screen) it is an ordinary section and
// the picture shows its finished state.
defineProps({
  number: { type: String, required: true }, // '01'
  titleId: { type: String, required: true }, // id of the <h2> inside the #text slot
  animated: { type: Boolean, default: false },
})

const emit = defineEmits(['progress'])

const section = ref(null)
const stage = ref(null)
useScrollProgress(section, stage, (progress) => emit('progress', progress))
</script>

<template>
  <section ref="section" class="scene" :class="{ 'is-pinned': animated }" :aria-labelledby="titleId">
    <div ref="stage" class="scene-stage">
      <div class="container-lg scene-grid">
        <div class="scene-text">
          <p class="scene-number" aria-hidden="true">{{ number }}</p>
          <slot name="text" />
        </div>
        <div class="scene-visual">
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

.scene-text :deep(h2) {
  font-size: clamp(2.5rem, 9vw, 5.5rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--tt-ink);
  margin: 0 0 0.6rem;
}

.scene-text :deep(p:not(.scene-number)) {
  font-size: 1.15rem;
  color: var(--tt-muted);
  margin-bottom: 0.35rem;
  max-width: 26rem;
}

.scene-visual {
  position: relative;
  min-width: 0;
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

/* Short phones: tighten the text so the picture keeps enough room. */
@media (max-height: 700px) and (max-width: 991.98px) {
  .is-pinned .scene-text :deep(h2) {
    font-size: 2.3rem;
    margin-bottom: 0.3rem;
  }

  .is-pinned .scene-text :deep(p:not(.scene-number)) {
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

  .scene-text :deep(p:not(.scene-number)) {
    font-size: 1.3rem;
  }
}
</style>
