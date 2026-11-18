<script setup>
import { ref, computed, useId } from 'vue'
import { site } from '@/config/site'
import { formatTime } from '@/utils/format'
import { plural } from '@/utils/adminSlots'

// "Open times" for the picked days: which of her usual times (all ticked to start with)
// and whether they are specially opened slots. Shown in a sheet.
const props = defineProps({
  dayCount: { type: Number, required: true },
  specialFee: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['open'])

const id = useId()
const times = ref([...site.usualTimes])
const special = ref(false)

const buttonText = computed(() => {
  if (props.busy) return 'Opening…'
  if (times.value.length === 0) return 'Choose at least one time'
  return `Open ${plural(times.value.length, 'time')} on ${plural(props.dayCount, 'day')}`
})

function open() {
  if (times.value.length === 0 || props.busy) return
  emit('open', { times: [...times.value].sort(), special: special.value })
}
</script>

<template>
  <form @submit.prevent="open">
    <fieldset class="mb-3">
      <legend class="form-legend">Times to open on each day</legend>
      <div class="d-flex flex-wrap gap-2">
        <template v-for="time in site.usualTimes" :key="time">
          <input
            :id="`${id}-${time}`"
            v-model="times"
            type="checkbox"
            class="btn-check"
            :value="time"
          />
          <label class="btn btn-outline-primary time-toggle" :for="`${id}-${time}`">
            <span class="tick" aria-hidden="true">✓</span> {{ formatTime(time) }}
          </label>
        </template>
      </div>
      <p class="small-print mt-2 mb-0">Times a day already has are left as they are.</p>
    </fieldset>

    <div class="form-check form-switch special-switch mb-1">
      <input
        :id="`${id}-special`"
        v-model="special"
        class="form-check-input"
        type="checkbox"
        role="switch"
        :aria-describedby="`${id}-special-help`"
      />
      <label class="form-check-label" :for="`${id}-special`">Specially opened slots</label>
    </div>
    <p :id="`${id}-special-help`" class="small-print mb-3">
      For days you don't usually work. Customers see +${{ specialFee }} on these times.
    </p>

    <button
      type="submit"
      class="btn btn-primary w-100"
      :disabled="busy || times.length === 0"
      :aria-busy="busy"
    >
      {{ buttonText }}
    </button>
  </form>
</template>

<style scoped>
.form-legend {
  font-family: var(--tt-font-body);
  font-size: 1rem;
  font-weight: 800;
  color: var(--tt-ink);
  margin-bottom: 0.5rem;
}

.time-toggle {
  min-width: 5.5rem;
}

.tick {
  visibility: hidden;
}

.btn-check:checked + .time-toggle {
  background: var(--tt-deep-rose);
  border-color: var(--tt-deep-rose);
  color: #fff;
}

.btn-check:checked + .time-toggle .tick {
  visibility: visible;
}

.btn-check:focus-visible + .time-toggle {
  outline: 3px solid var(--tt-ink);
  outline-offset: 2px;
}

.special-switch {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 44px;
}

.special-switch .form-check-input {
  width: 2.6em;
  height: 1.4em;
  margin-top: 0;
}

.special-switch .form-check-label {
  font-weight: 700;
}
</style>
