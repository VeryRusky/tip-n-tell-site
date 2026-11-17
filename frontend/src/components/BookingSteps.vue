<script setup>
import { bookingSteps } from '@/router/steps'
import { useBookingStore } from '@/stores/booking'
import IconCheck from './icons/IconCheck.vue'

// Shows "where am I" in the booking flow. Earlier steps are links, so the
// customer can go back; their choices stay in the booking store.
defineProps({
  current: { type: Number, required: true },
})

const booking = useBookingStore()
</script>

<template>
  <nav class="booking-steps" aria-label="Booking steps">
    <p class="visually-hidden">Step {{ current }} of {{ bookingSteps.length }}</p>
    <ol>
      <li
        v-for="item in bookingSteps"
        :key="item.step"
        :class="{ done: item.step < current, current: item.step === current }"
      >
        <RouterLink
          v-if="item.step !== current && item.step <= booking.furthestStep"
          :to="{ name: item.name }"
          class="step"
        >
          <span class="step-dot" aria-hidden="true">
            <IconCheck v-if="item.step < current" />
            <template v-else>{{ item.step }}</template>
          </span>
          <span class="step-label">
            {{ item.label }}<span v-if="item.step < current" class="visually-hidden"> (done)</span>
          </span>
        </RouterLink>
        <span v-else class="step" :aria-current="item.step === current ? 'step' : null">
          <span class="step-dot" aria-hidden="true">{{ item.step }}</span>
          <span class="step-label">{{ item.label }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.booking-steps ol {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 56px;
  text-decoration: none;
  color: var(--tt-muted);
  font-size: 0.875rem;
  font-weight: 700;
  border-radius: var(--tt-radius-small);
}

a.step {
  color: var(--tt-deep-rose);
}

a.step:hover .step-label {
  text-decoration: underline;
}

.step-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--tt-line);
  background: var(--tt-white);
  font-size: 0.85rem;
}

.done .step-dot {
  background: var(--tt-pink);
  border-color: var(--tt-deep-rose);
  color: var(--tt-deep-rose);
}

.current .step {
  color: var(--tt-ink);
}

.current .step-dot {
  background: var(--tt-deep-rose);
  border-color: var(--tt-deep-rose);
  color: #fff;
}

/* Thin line under the current step, so it is not shown by colour alone. */
.current .step-label {
  border-bottom: 2px solid var(--tt-deep-rose);
}
</style>
