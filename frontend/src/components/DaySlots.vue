<script setup>
import { useCatalogStore } from '@/stores/catalog'
import { formatLongDate, formatTime, formatPrice } from '@/utils/format'
import ChoiceCard from './ChoiceCard.vue'
import IconSparkle from './icons/IconSparkle.vue'

// The times for one day, as large options. Booked times stay visible but
// are struck through, labelled "Booked" and cannot be chosen.
defineProps({
  date: { type: String, required: true },
  slots: { type: Array, required: true },
  selectedSlotId: { type: String, default: '' },
})

const emit = defineEmits(['choose'])
const catalog = useCatalogStore()
</script>

<template>
  <fieldset>
    <legend>{{ formatLongDate(date) }}</legend>
    <p class="small-print mb-2">Choose a time.</p>
    <!-- A new key for each day replays the entrance, so the day's times stagger in. -->
    <div :key="date" class="slot-options">
      <ChoiceCard
        v-for="(slot, index) in slots"
        :key="slot.id"
        class="slot-option"
        :style="{ '--i': index }"
        name="slot"
        :value="slot.id"
        :checked="slot.id === selectedSlotId"
        :disabled="slot.status === 'booked'"
        @select="emit('choose', slot)"
      >
        <span class="slot-row">
          <span class="slot-time" :class="{ booked: slot.status === 'booked' }">
            {{ formatTime(slot.time) }}
          </span>
          <span v-if="slot.status === 'booked'" class="slot-tag tag-booked">Booked</span>
          <span v-else-if="slot.special" class="slot-tag tag-special">
            <IconSparkle /> Specially opened · +{{ formatPrice(catalog.specialSlotFee) }}
          </span>
          <span v-else class="slot-tag">Open</span>
        </span>
      </ChoiceCard>
    </div>
  </fieldset>
</template>

<style scoped>
.slot-options {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.slot-option {
  animation: slot-in 0.35s var(--tt-ease-out) both;
  animation-delay: calc(var(--i) * 50ms);
}

/* (Once chosen, ChoiceCard's own "settle" pop replaces this entrance.) */
@keyframes slot-in {
  from {
    opacity: 0;
    transform: translateY(0.6rem);
  }
}

.slot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.slot-time {
  font-size: 1.35rem;
  font-weight: 700;
  min-width: 3.5rem;
}

.slot-time.booked {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  color: var(--tt-muted);
}

.slot-tag {
  font-size: 0.9rem;
  color: var(--tt-muted);
}

.tag-booked {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
}

.tag-special {
  font-weight: 700;
  color: var(--tt-deep-rose);
}
</style>
