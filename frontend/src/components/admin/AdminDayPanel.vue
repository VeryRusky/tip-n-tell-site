<script setup>
import { ref, computed, watch, nextTick, useId } from 'vue'
import { site } from '@/config/site'
import { formatTime } from '@/utils/format'
import { countByStatus, plural, takenWords } from '@/utils/adminSlots'
import AdminSlotRow from './AdminSlotRow.vue'
import AdminAddTimes from './AdminAddTimes.vue'

// Everything for one day: what is on it, the day's actions at the top
// ("Open usual times", "Add another time", "Close this day"), then one row per time.
// Shown in the right-hand column on a laptop and in a bottom sheet on a phone.
// The page does the saving; this component only says what she tapped.
const props = defineProps({
  date: { type: String, required: true }, // '2026-12-03'
  slots: { type: Array, required: true }, // this day's slots, sorted by time
  today: { type: String, required: true },
  specialFee: { type: Number, default: 0 },
  working: { type: String, default: '' }, // which action is saving, e.g. 'open-usual'
})

const emit = defineEmits(['set-status', 'set-special', 'remove', 'add-times', 'close-day'])

const id = useId()
const adding = ref(false) // the "Add another time" box is open
const confirmingClose = ref(false)

const past = computed(() => props.date < props.today)
const busy = computed(() => props.working !== '')
const counts = computed(() => countByStatus(props.slots))
const taken = computed(() => counts.value.booked + counts.value.pending)

const missingUsual = computed(() =>
  site.usualTimes.filter((time) => !props.slots.some((slot) => slot.time === time)),
)

// e.g. "3 times: 1 open, 1 on hold, 1 booked"
const summary = computed(() => {
  if (props.slots.length === 0) return 'No times on this day yet.'
  const parts = []
  if (counts.value.open) parts.push(`${counts.value.open} open`)
  if (counts.value.pending) parts.push(`${counts.value.pending} on hold`)
  if (counts.value.booked) parts.push(`${counts.value.booked} booked`)
  return `${plural(props.slots.length, 'time')}: ${parts.join(', ')}`
})

// A different day: start fresh.
watch(
  () => props.date,
  () => {
    adding.value = false
    confirmingClose.value = false
  },
)

const summaryText = ref(null)
const question = ref(null)

// After an action that may remove the button she tapped (a row, "Close this day"),
// keep the focus in the panel: on the line that says what the day has.
async function focusSummary() {
  await nextTick()
  summaryText.value?.focus()
}

function addTimes(times) {
  adding.value = false
  emit('add-times', times)
  focusSummary()
}

function removeSlot(slot) {
  emit('remove', slot)
  focusSummary()
}

// Only open times: remove them now (Undo is offered). Booked or on hold: ask first.
function askClose() {
  adding.value = false
  if (taken.value === 0) {
    emit('close-day', { includeTaken: false })
    focusSummary()
  } else {
    confirmingClose.value = true
    nextTick(() => question.value?.focus())
  }
}

function close(includeTaken) {
  confirmingClose.value = false
  emit('close-day', { includeTaken })
  focusSummary()
}
</script>

<template>
  <div class="day-panel">
    <p ref="summaryText" class="day-summary" tabindex="-1">{{ summary }}</p>

    <div v-if="!past && !confirmingClose" class="day-actions">
      <button
        v-if="missingUsual.length"
        type="button"
        class="btn btn-primary"
        :disabled="busy"
        :aria-busy="working === 'open-usual'"
        @click="addTimes(missingUsual)"
      >
        {{ working === 'open-usual' ? 'Opening…' : 'Open usual times' }}
        <span class="button-detail">{{ missingUsual.map(formatTime).join(', ') }}</span>
      </button>
      <button
        type="button"
        class="btn btn-outline-primary"
        :aria-expanded="adding"
        :disabled="busy"
        @click="adding = !adding"
      >
        Add another time
      </button>
      <button
        v-if="slots.length"
        type="button"
        class="btn btn-outline-danger"
        :disabled="busy"
        :aria-busy="working === 'close-day'"
        @click="askClose"
      >
        {{ working === 'close-day' ? 'Closing…' : 'Close this day' }}
      </button>
    </div>

    <div
      v-if="confirmingClose"
      ref="question"
      class="danger-note mb-3"
      role="group"
      tabindex="-1"
      :aria-labelledby="`${id}-ask`"
    >
      <p :id="`${id}-ask`" class="mb-2">
        <strong>This day has {{ takenWords(counts) }}.</strong> Remove
        {{ taken === 1 ? 'it' : 'those' }} too? Message the
        {{ taken === 1 ? 'customer' : 'customers' }} first: the site does not tell them.
      </p>
      <!-- The safest choice is always the filled, most visible button. -->
      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="counts.open"
          type="button"
          class="btn btn-primary btn-sm"
          @click="close(false)"
        >
          Only the {{ plural(counts.open, 'open time') }}
        </button>
        <button
          v-else
          type="button"
          class="btn btn-primary btn-sm"
          @click="confirmingClose = false"
        >
          Keep {{ taken === 1 ? 'it' : 'them' }}
        </button>
        <button type="button" class="btn btn-outline-danger btn-sm" @click="close(true)">
          Remove all {{ plural(slots.length, 'time') }}
        </button>
        <button
          v-if="counts.open"
          type="button"
          class="btn btn-outline-primary btn-sm"
          @click="confirmingClose = false"
        >
          Cancel
        </button>
      </div>
    </div>

    <AdminAddTimes
      v-if="adding"
      class="mb-3"
      :existing-times="slots.map((slot) => slot.time)"
      :busy="busy"
      @add="addTimes"
      @cancel="adding = false"
    />

    <p v-if="past" class="small-print">
      This day has passed. You can still change a status, but not add or remove times.
    </p>

    <ul v-if="slots.length" class="slot-list" aria-label="Times on this day">
      <AdminSlotRow
        v-for="slot in slots"
        :key="slot.id"
        :time-slot="slot"
        :special-fee="specialFee"
        :can-remove="!past"
        @set-status="emit('set-status', slot, $event)"
        @set-special="emit('set-special', slot, $event)"
        @remove="removeSlot(slot)"
      />
    </ul>

    <p v-if="slots.length" class="special-help">
      <span aria-hidden="true">★</span> Special: a specially opened slot. Customers see +${{
        specialFee
      }}.
    </p>
  </div>
</template>

<style scoped>
.day-summary:focus {
  outline: none;
}

.day-summary {
  font-weight: 700;
  color: var(--tt-muted);
  margin-bottom: 0.75rem;
}

.day-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.day-actions .btn {
  flex: 1 1 auto;
}

/* The first action (Open usual times) gets a whole line on a phone. */
.day-actions .btn-primary {
  flex-basis: 100%;
  flex-direction: column;
  line-height: 1.2;
}

.button-detail {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.9;
}

.slot-list {
  list-style: none;
  padding: 0 0.5rem;
  margin: 0 0 0.75rem;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
}

.special-help {
  font-size: 0.85rem;
  color: var(--tt-muted);
  margin: 0;
}
</style>
