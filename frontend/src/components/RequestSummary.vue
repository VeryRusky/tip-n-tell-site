<script setup>
import { computed } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { formatShortDate, formatTime, formatPrice } from '@/utils/format'

// One-line running summary of the request, shown in the bottom bar.
const booking = useBookingStore()

// Everything chosen after the time, e.g. ['Extensions', '#3', '+ Foreign removal'].
const otherChoices = computed(() => {
  const parts = []
  if (booking.service) parts.push(booking.service.name)
  if (booking.isOwnDesign) parts.push('Own design')
  else if (booking.design) parts.push(`#${booking.design.id}`)
  for (const addOn of booking.addOns) parts.push(`+ ${addOn.name}`)
  return parts
})
</script>

<template>
  <p v-if="booking.slot" class="request-summary">
    <span>
      <strong>{{ formatShortDate(booking.slot.date) }}, {{ formatTime(booking.slot.time) }}</strong>
      <template v-if="booking.slot.special"> (special slot)</template>
      <!-- A non-breaking space keeps each dot on the line before it, so no line starts with "·". -->
      <span v-for="part in otherChoices" :key="part">&nbsp;· {{ part }}</span>
    </span>
    <span v-if="booking.service" class="estimate" aria-live="polite">
      Est. {{ formatPrice(booking.estimate) }}
      <span v-if="booking.isOwnDesign" class="estimate-extra">+ design quote</span>
    </span>
  </p>
</template>

<style scoped>
.request-summary {
  margin: 0;
  font-size: 0.95rem;
  /* Choices on the left (may wrap), estimate pinned to the right. */
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  column-gap: 0.75rem;
}

.estimate {
  text-align: right;
  font-weight: 700;
  color: var(--tt-deep-rose);
  white-space: nowrap;
}
.estimate-extra {
  display: block;
  font-size: 0.85rem;
}
</style>
