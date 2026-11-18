<script setup>
import { computed } from 'vue'
import DesignArt from '@/components/DesignArt.vue'

// One design in the owner's gallery: the photo, "#3 Cherry bows", and two buttons:
// Edit (name, photo, delete) and a quick Hide / Show.
// In "Reorder" mode it shows its place in the list and Earlier / Later instead.
// The page does the saving; this component only says what she tapped.
const props = defineProps({
  design: { type: Object, required: true }, // { id, number, name, image, colors, hidden }
  reordering: { type: Boolean, default: false },
  position: { type: Number, default: 0 }, // 1 = first in the list (only used when reordering)
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false }, // just added
})

const emit = defineEmits(['edit', 'toggle-hidden', 'move'])

// DesignArt shows the public number as the design's id (and picks the drawing by it).
const artDesign = computed(() => ({ ...props.design, id: props.design.number }))
const title = computed(() => `#${props.design.number} ${props.design.name}`)
</script>

<template>
  <article
    class="design-card"
    :class="{ 'is-hidden': design.hidden, 'is-new': highlight }"
    :aria-label="title"
  >
    <div class="card-art">
      <DesignArt :design="artDesign" />
      <span v-if="reordering" class="position" aria-hidden="true">{{ position }}</span>
      <div class="badges">
        <span v-if="design.hidden" class="badge-hidden">Hidden</span>
        <span v-if="!design.image" class="badge-sample">Sample art</span>
      </div>
    </div>

    <p class="design-title">
      <span class="design-number">#{{ design.number }}</span> {{ design.name }}
    </p>

    <div v-if="reordering" class="card-actions">
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="isFirst"
        :aria-label="`Move ${title} earlier (now ${position})`"
        @click="emit('move', -1)"
      >
        <span aria-hidden="true">←</span> Earlier
      </button>
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="isLast"
        :aria-label="`Move ${title} later (now ${position})`"
        @click="emit('move', 1)"
      >
        Later <span aria-hidden="true">→</span>
      </button>
    </div>

    <div v-else class="card-actions">
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="busy"
        @click="emit('edit')"
      >
        Edit <span class="visually-hidden">{{ title }}</span>
      </button>
      <button
        type="button"
        class="btn btn-sm hide-button"
        :disabled="busy"
        @click="emit('toggle-hidden')"
      >
        {{ design.hidden ? 'Show' : 'Hide' }} <span class="visually-hidden">{{ title }}</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.design-card {
  height: 100%;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  scroll-margin: 6rem;
}

/* Hidden from customers: dimmed, with a dashed frame and a "Hidden" badge. */
.design-card.is-hidden {
  border-style: dashed;
  background: transparent;
}

.design-card.is-hidden .card-art :deep(.design-art) {
  opacity: 0.45;
}

/* Just added: a rose glow for a moment. */
.design-card.is-new {
  box-shadow: 0 0 0 4px var(--tt-deep-rose);
  transition: box-shadow 0.4s ease;
}

.card-art {
  position: relative;
}

.position {
  position: absolute;
  top: 6px;
  left: 6px;
  min-width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: var(--tt-ink);
  color: #fff;
  font-weight: 800;
}

.badges {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.badge-hidden,
.badge-sample {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}

.badge-hidden {
  background: var(--tt-ink);
  color: #fff;
}

.badge-sample {
  background: #fffc;
  color: var(--tt-ink);
  border: 1px solid var(--tt-line);
}

/* The drawing already says "sample" in its corner; the badge says it once, clearly. */
.card-art :deep(.placeholder-label) {
  display: none;
}

.design-title {
  margin: 0;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.design-number {
  color: var(--tt-deep-rose);
}

.card-actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}

.card-actions .btn {
  padding-left: 0.4rem;
  padding-right: 0.4rem;
}

/* Hide / Show: a quiet button, so Edit stays the main one. */
.hide-button {
  --bs-btn-color: var(--tt-muted);
  --bs-btn-border-color: var(--tt-line);
  --bs-btn-bg: transparent;
  --bs-btn-hover-bg: var(--tt-pink);
  --bs-btn-hover-color: var(--tt-ink);
  --bs-btn-hover-border-color: var(--tt-line);
  --bs-btn-active-bg: var(--tt-pink);
  --bs-btn-active-border-color: var(--tt-line);
}
</style>
