<script setup>
import { ref, onMounted, onBeforeUnmount, useId } from 'vue'
import { plural } from '@/utils/adminSlots'

// The actions for the days picked in "Select days" mode:
//   Open times · Remove open times · Remove all times, plus Clear selection and Done.
// On a phone it is pinned to the bottom of the screen (`docked`); on a laptop it sits in the
// right-hand column. The picked days stay picked after an action, so she can do another.
const props = defineProps({
  count: { type: Number, required: true }, // how many days are picked
  openCount: { type: Number, default: 0 }, // open times on those days
  totalCount: { type: Number, default: 0 }, // all times on those days
  working: { type: String, default: '' }, // which action is saving
  docked: { type: Boolean, default: false },
})

const emit = defineEmits(['open-times', 'remove-open', 'remove-all', 'clear', 'done'])

const id = useId()
const bar = ref(null)

// While pinned, tell the page how tall the bar is, so messages sit just above it.
let watcher = null
function setBarHeight(height) {
  document.documentElement.style.setProperty('--admin-bar-height', `${height}px`)
}

onMounted(() => {
  if (!props.docked || !bar.value) return
  setBarHeight(bar.value.offsetHeight)
  if (window.ResizeObserver) {
    watcher = new ResizeObserver(() => setBarHeight(bar.value?.offsetHeight ?? 0))
    watcher.observe(bar.value)
  }
})

onBeforeUnmount(() => {
  watcher?.disconnect()
  document.documentElement.style.removeProperty('--admin-bar-height')
})
</script>

<template>
  <section ref="bar" class="bulk-bar" :class="{ docked }" :aria-labelledby="`${id}-title`">
    <div :class="{ 'container-lg': docked }">
      <div class="bulk-top">
        <h2 :id="`${id}-title`" class="bulk-title" aria-live="polite">
          {{ count === 0 ? 'No days selected' : `${plural(count, 'day')} selected` }}
        </h2>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="btn btn-link btn-sm clear-button"
            :disabled="count === 0"
            @click="emit('clear')"
          >
            Clear selection
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm" @click="emit('done')">
            Done
          </button>
        </div>
      </div>

      <div class="bulk-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="count === 0 || working !== ''"
          :aria-busy="working === 'bulk-open'"
          @click="emit('open-times')"
        >
          {{ working === 'bulk-open' ? 'Opening…' : 'Open times' }}
        </button>
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="openCount === 0 || working !== ''"
          :aria-busy="working === 'bulk-remove-open'"
          @click="emit('remove-open')"
        >
          <template v-if="working === 'bulk-remove-open'">Removing…</template>
          <template v-else>Remove open<span class="wide-only"> times</span></template>
          <span v-if="openCount" class="count">({{ openCount }})</span>
        </button>
        <button
          type="button"
          class="btn btn-outline-danger"
          :disabled="totalCount === 0 || working !== ''"
          :aria-busy="working === 'bulk-remove-all'"
          @click="emit('remove-all')"
        >
          <template v-if="working === 'bulk-remove-all'">Removing…</template>
          <template v-else>Remove all<span class="wide-only"> times</span></template>
          <span v-if="totalCount" class="count">({{ totalCount }})</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bulk-bar {
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 0.75rem;
}

/* On a phone: pinned to the bottom, full width. */
.bulk-bar.docked {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1040;
  border-width: 1px 0 0;
  border-radius: 0;
  box-shadow: 0 -10px 24px -18px rgba(26, 26, 26, 0.5);
  padding: 0.6rem 0 calc(0.6rem + env(safe-area-inset-bottom));
}

.bulk-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.bulk-title {
  margin: 0;
  white-space: nowrap;
  font-family: var(--tt-font-body);
  font-size: 1rem;
  font-weight: 800;
  color: var(--tt-ink);
}

.clear-button {
  white-space: nowrap;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  color: var(--tt-deep-rose);
}

.clear-button:disabled {
  color: #9d8588;
}

.bulk-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
}

.bulk-actions .btn {
  padding-left: 0.4rem;
  padding-right: 0.4rem;
  font-size: 0.88rem;
  line-height: 1.15;
  flex-direction: column;
  white-space: normal;
}

/* On a narrow phone the word "times" is only read out, not shown, to keep the bar short. */
@media (max-width: 575.98px) {
  .docked .wide-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}

.count {
  font-weight: 600;
  font-size: 0.8rem;
}

/* A laptop's column is roomier: one action per line. */
.bulk-bar:not(.docked) .bulk-actions {
  grid-template-columns: 1fr;
}

.bulk-bar:not(.docked) .bulk-actions .btn {
  flex-direction: row;
  gap: 0.3rem;
  font-size: 1rem;
}
</style>
