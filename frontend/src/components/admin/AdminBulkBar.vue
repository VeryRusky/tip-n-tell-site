<script setup>
import { ref, useId } from 'vue'
import { site } from '@/config/site'
import { formatTime } from '@/utils/format'

// The bar pinned to the bottom in "Select days" mode: which of her usual times to open,
// whether they are special, and one button to open them on every picked day.
const props = defineProps({
  count: { type: Number, required: true }, // how many days are picked
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'cancel'])

const id = useId()
const times = ref([...site.usualTimes]) // all usual times ticked to start with
const special = ref(false)

function open() {
  if (props.count === 0 || times.value.length === 0) return
  emit('open', { times: [...times.value].sort(), special: special.value })
}
</script>

<template>
  <section class="bulk-bar" :aria-labelledby="`${id}-title`">
    <div class="container-lg">
      <h2 :id="`${id}-title`" class="bulk-title">
        {{
          count === 0 ? 'Tap the days to open' : `${count} ${count === 1 ? 'day' : 'days'} picked`
        }}
      </h2>
      <fieldset class="mb-2">
        <legend class="visually-hidden">Times to open on each picked day</legend>
        <div class="d-flex flex-wrap gap-2">
          <template v-for="time in site.usualTimes" :key="time">
            <input
              :id="`${id}-${time}`"
              v-model="times"
              type="checkbox"
              class="btn-check"
              :value="time"
            />
            <label class="btn btn-outline-primary btn-sm time-toggle" :for="`${id}-${time}`">
              {{ formatTime(time) }}
            </label>
          </template>
          <div class="form-check form-switch ms-1">
            <input
              :id="`${id}-special`"
              v-model="special"
              class="form-check-input"
              type="checkbox"
              role="switch"
            />
            <label class="form-check-label" :for="`${id}-special`">Special (+fee)</label>
          </div>
        </div>
      </fieldset>
      <div class="d-flex gap-2">
        <button
          type="button"
          class="btn btn-primary flex-grow-1"
          :disabled="busy || count === 0 || times.length === 0"
          @click="open"
        >
          {{ busy ? 'Opening…' : 'Open these times' }}
        </button>
        <button type="button" class="btn btn-outline-primary" @click="emit('cancel')">Done</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bulk-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1040;
  background: var(--tt-white);
  border-top: 1px solid var(--tt-line);
  box-shadow: 0 -10px 24px -18px rgba(26, 26, 26, 0.5);
  padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
}

.bulk-title {
  font-family: var(--tt-font-body);
  font-size: 1rem;
  font-weight: 700;
  color: var(--tt-ink);
  margin-bottom: 0.5rem;
}

.time-toggle {
  min-height: 44px;
  min-width: 4.5rem;
}

.btn-check:checked + .time-toggle {
  background: var(--tt-deep-rose);
  border-color: var(--tt-deep-rose);
  color: #fff;
}

.btn-check:focus-visible + .time-toggle {
  outline: 3px solid var(--tt-ink);
  outline-offset: 2px;
}

.form-switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
}

.form-switch .form-check-input {
  width: 2.6em;
  height: 1.4em;
  margin-top: 0;
}

.form-check-input:checked {
  background-color: var(--tt-deep-rose);
  border-color: var(--tt-deep-rose);
}
</style>
