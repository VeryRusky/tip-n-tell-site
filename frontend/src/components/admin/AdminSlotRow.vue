<script setup>
import { ref, computed, nextTick, useId } from 'vue'
import { formatTime } from '@/utils/format'
import { statusNames, bookingSummary } from '@/utils/adminSlots'

// One time on the chosen day, in one compact row:
//   the time | Open / On hold / Booked | Special | Remove
// Removing an open time happens at once (the page offers Undo). Removing a booked or
// on-hold time asks first, because a customer is waiting on it.
// The page does the saving; this component only says what she tapped.
const props = defineProps({
  timeSlot: { type: Object, required: true }, // { id, date, time, status, special }
  specialFee: { type: Number, default: 0 }, // the extra customers pay for a special slot
  canRemove: { type: Boolean, default: true }, // false on days that have passed
  catalog: { type: Object, default: () => ({}) }, // services, add-ons and designs, for the summary
})

const emit = defineEmits(['set-status', 'set-special', 'remove', 'details'])

// Booked and on-hold times can have her notes on who is coming and what for.
const canHaveDetails = computed(() => props.timeSlot.status !== 'open')
const summary = computed(() => bookingSummary(props.timeSlot.booking, props.catalog))

const id = useId()
const confirming = ref(false)
const question = ref(null)

const timeText = computed(() => formatTime(props.timeSlot.time))
const statuses = ['open', 'pending', 'booked']

function askRemove() {
  if (props.timeSlot.status === 'open') emit('remove')
  else {
    confirming.value = true
    nextTick(() => question.value?.focus()) // read the question out first
  }
}

const removeButton = ref(null)

// "Keep it": back to the row, with the focus on Remove again.
function keepIt() {
  confirming.value = false
  nextTick(() => removeButton.value?.focus())
}

function confirmRemove() {
  confirming.value = false
  emit('remove')
}
</script>

<template>
  <li class="slot-row" :class="{ 'is-special': timeSlot.special }">
    <div
      v-if="confirming"
      ref="question"
      class="danger-note"
      role="group"
      tabindex="-1"
      :aria-labelledby="`${id}-ask`"
    >
      <p :id="`${id}-ask`" class="mb-2">
        <strong>{{ timeText }} is {{ statusNames[timeSlot.status].toLowerCase() }}.</strong>
        Remove it anyway? Message the customer first: the site does not tell them.
      </p>
      <div class="d-flex flex-wrap gap-2">
        <!-- The safe choice is the filled button. -->
        <button type="button" class="btn btn-primary btn-sm" @click="keepIt">Keep it</button>
        <button type="button" class="btn btn-outline-danger btn-sm" @click="confirmRemove">
          Remove {{ timeText }}
        </button>
      </div>
    </div>

    <div v-else class="row-main">
      <h3 :id="`${id}-time`" class="slot-time">{{ timeText }}</h3>

      <fieldset class="status-switch">
        <legend class="visually-hidden">Status of {{ timeText }}</legend>
        <template v-for="status in statuses" :key="status">
          <input
            :id="`${id}-${status}`"
            type="radio"
            class="btn-check"
            :name="`${id}-status`"
            :value="status"
            :checked="timeSlot.status === status"
            @change="emit('set-status', status)"
          />
          <label class="status-option" :class="`is-${status}`" :for="`${id}-${status}`">
            {{ statusNames[status] }}
          </label>
        </template>
      </fieldset>

      <div class="row-tools">
        <button
          type="button"
          class="tool-button special-button"
          :aria-pressed="timeSlot.special"
          :aria-describedby="`${id}-time`"
          @click="emit('set-special', !timeSlot.special)"
        >
          <span class="tool-icon" aria-hidden="true">★</span>
          <span class="tool-text">Special</span>
        </button>
        <button
          v-if="canRemove"
          ref="removeButton"
          type="button"
          class="tool-button remove-button"
          :aria-label="`Remove ${timeText}`"
          @click="askRemove"
        >
          <span class="tool-icon" aria-hidden="true">✕</span>
          <span class="tool-text" aria-hidden="true">Remove</span>
        </button>
      </div>
    </div>

    <p v-if="timeSlot.special && !confirming" class="special-note">
      <span aria-hidden="true">★</span> Specially opened slot: customers see +${{ specialFee }}
    </p>

    <!-- Who is coming and what for: a summary to tap, or "Add details".
         One button for both, so the focus stays on it when the details are saved. -->
    <button
      v-if="canHaveDetails && !confirming"
      type="button"
      :class="timeSlot.booking ? 'details-summary' : 'btn btn-link btn-sm add-details'"
      :aria-label="
        timeSlot.booking
          ? `Details for ${timeText}: ${[summary.customer, summary.details].filter(Boolean).join(', ')}. Change`
          : `Add details for ${timeText}`
      "
      @click="emit('details')"
    >
      <template v-if="timeSlot.booking">
        <strong v-if="summary.customer">{{ summary.customer }}</strong>
        <span v-if="summary.customer && summary.details" aria-hidden="true"> · </span>
        <span>{{ summary.details }}</span>
      </template>
      <template v-else>+ Add details</template>
    </button>
  </li>
</template>

<style scoped>
.slot-row {
  list-style: none;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--tt-line);
}

.slot-row:last-child {
  border-bottom: 0;
}

.row-main {
  display: grid;
  grid-template-columns: 2.9rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.3rem;
}

.slot-time {
  margin: 0;
  font-family: var(--tt-font-body);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--tt-ink);
}

/* Three options joined into one switch. */
.status-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1.5px solid var(--tt-deep-rose);
  border-radius: 999px;
  overflow: hidden;
  margin: 0;
  min-width: 0;
}

.status-option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 0.15rem;
  font-weight: 700;
  font-size: 0.82rem;
  line-height: 1.1;
  text-align: center;
  color: var(--tt-deep-rose);
  background: var(--tt-white);
  cursor: pointer;
  user-select: none;
}

.status-option:not(:first-of-type) {
  border-left: 1px solid var(--tt-line);
}

.btn-check:checked + .status-option.is-open {
  background: var(--tt-deep-rose);
  color: #fff;
}

.btn-check:checked + .status-option.is-pending {
  background: var(--tt-hold);
  color: #fff;
}

.btn-check:checked + .status-option.is-booked {
  background: var(--tt-ink);
  color: #fff;
}

.btn-check:focus-visible + .status-option {
  outline: 3px solid var(--tt-ink);
  outline-offset: -3px;
}

.row-tools {
  display: flex;
  gap: 0.1rem;
}

/* Small square buttons with an icon and a word under it. */
.tool-button {
  width: 42px;
  min-height: 46px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 0;
  border: 1.5px solid transparent;
  border-radius: var(--tt-radius-small);
  background: transparent;
  color: var(--tt-muted);
}

.tool-icon {
  font-size: 1rem;
  line-height: 1;
}

.tool-text {
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
}

.special-button[aria-pressed='true'] {
  background: var(--tt-pink);
  border-color: var(--tt-deep-rose);
  color: var(--tt-deep-rose);
}

.remove-button {
  color: var(--tt-danger);
}

.tool-button:hover {
  border-color: var(--tt-line);
}

/* The booking summary: one line, tap to change. */
.details-summary {
  display: block;
  width: calc(100% - 3.2rem);
  min-height: 44px;
  margin: 0.25rem 0 0 3.2rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius-small);
  background: var(--tt-cream);
  color: var(--tt-ink);
  font-size: 0.9rem;
  text-align: left;
  overflow-wrap: anywhere;
}

.add-details {
  min-height: 44px;
  margin-left: 3.2rem;
  padding-left: 0;
  color: var(--tt-muted);
  font-weight: 600;
}

.special-note {
  margin: 0.3rem 0 0 3.2rem;
  font-size: 0.85rem;
  color: var(--tt-deep-rose);
  font-weight: 600;
}
</style>
