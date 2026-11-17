<script setup>
import { ref, computed, useId } from 'vue'
import { formatTime } from '@/utils/format'

// One time on the chosen day, with its controls:
//   - Open / On hold / Booked (three radio buttons that look like one switch)
//   - Special (+fee) on or off
//   - Remove (asks first if someone is booked or on hold)
// The page does the saving; this component only says what she tapped.
const props = defineProps({
  timeSlot: { type: Object, required: true }, // { id, date, time, status, special }
})

const emit = defineEmits(['set-status', 'set-special', 'remove'])

const id = useId()
const confirming = ref(false)

const statuses = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'On hold' },
  { value: 'booked', label: 'Booked' },
]

const timeText = computed(() => formatTime(props.timeSlot.time))

// Removing an open slot is harmless; removing one with a customer needs a second tap.
function askRemove() {
  if (props.timeSlot.status === 'open') emit('remove')
  else confirming.value = true
}

function confirmRemove() {
  confirming.value = false
  emit('remove')
}
</script>

<template>
  <li class="slot-row">
    <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
      <h3 class="slot-time mb-0">{{ timeText }}</h3>
      <div class="form-check form-switch mb-0">
        <input
          :id="`${id}-special`"
          class="form-check-input"
          type="checkbox"
          role="switch"
          :checked="timeSlot.special"
          @change="emit('set-special', $event.target.checked)"
        />
        <label class="form-check-label" :for="`${id}-special`">Special (+fee)</label>
      </div>
    </div>

    <fieldset>
      <legend class="visually-hidden">Status of the {{ timeText }} slot</legend>
      <div class="status-switch">
        <template v-for="option in statuses" :key="option.value">
          <input
            :id="`${id}-${option.value}`"
            type="radio"
            class="btn-check"
            :name="`${id}-status`"
            :value="option.value"
            :checked="timeSlot.status === option.value"
            @change="emit('set-status', option.value)"
          />
          <label class="status-option" :class="`is-${option.value}`" :for="`${id}-${option.value}`">
            {{ option.label }}
          </label>
        </template>
      </div>
    </fieldset>

    <div v-if="confirming" class="confirm mt-2" role="group" :aria-label="`Remove ${timeText}?`">
      <p class="mb-2">
        Remove {{ timeText }}? It is {{ timeSlot.status === 'booked' ? 'booked' : 'on hold' }} for
        someone.
      </p>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-primary btn-sm" @click="confirmRemove">
          Yes, remove
        </button>
        <button type="button" class="btn btn-outline-primary btn-sm" @click="confirming = false">
          Keep it
        </button>
      </div>
    </div>
    <button v-else type="button" class="btn btn-link remove-link mt-1" @click="askRemove">
      Remove {{ timeText }}
    </button>
  </li>
</template>

<style scoped>
.slot-row {
  list-style: none;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 0.75rem 0.85rem 0.5rem;
}

.slot-time {
  font-family: var(--tt-font-body);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--tt-ink);
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
  cursor: pointer;
}

.form-check-input:checked {
  background-color: var(--tt-deep-rose);
  border-color: var(--tt-deep-rose);
}

.form-check-input:focus-visible {
  outline: 3px solid var(--tt-deep-rose);
  outline-offset: 2px;
  box-shadow: none;
}

/* Three options joined into one switch. */
.status-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1.5px solid var(--tt-deep-rose);
  border-radius: 999px;
  overflow: hidden;
}

.status-option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--tt-deep-rose);
  background: var(--tt-white);
  cursor: pointer;
  user-select: none;
}

.status-option:not(:first-of-type) {
  border-left: 1px solid var(--tt-line);
}

.btn-check:checked + .status-option {
  background: var(--tt-deep-rose);
  color: #fff;
}

.btn-check:checked + .status-option.is-booked {
  background: var(--tt-ink);
}

.btn-check:focus-visible + .status-option {
  outline: 3px solid var(--tt-ink);
  outline-offset: -3px;
}

.remove-link {
  min-height: 44px;
  padding-left: 0;
  color: var(--tt-deep-rose);
  font-weight: 700;
}

.confirm {
  background: var(--tt-pink);
  border-radius: var(--tt-radius-small);
  padding: 0.75rem;
}
</style>
