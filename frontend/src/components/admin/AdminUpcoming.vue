<script setup>
import { formatShortDate, formatTime } from '@/utils/format'
import { statusNames } from '@/utils/adminSlots'

// "Coming up": her next on-hold and booked times, soonest first.
// Tapping one opens that day.
defineProps({
  slots: { type: Array, required: true }, // already filtered, sorted and limited by the page
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['open-day'])
</script>

<template>
  <section class="upcoming" aria-labelledby="upcoming-title">
    <h2 id="upcoming-title" class="upcoming-title">Coming up</h2>
    <p v-if="loading && slots.length === 0" class="muted mb-0">Loading…</p>
    <p v-else-if="slots.length === 0" class="muted mb-0">
      Nothing booked or on hold yet. When a customer DMs you, tap the day and mark the time.
    </p>
    <ul v-else class="upcoming-list">
      <li v-for="slot in slots" :key="slot.id">
        <button type="button" class="upcoming-item" @click="emit('open-day', slot.date)">
          <span class="upcoming-date">{{ formatShortDate(slot.date) }}</span>
          <span class="upcoming-time">{{ formatTime(slot.time) }}</span>
          <span class="status-label" :class="`is-${slot.status}`">
            <span class="status-mark" :class="`is-${slot.status}`" aria-hidden="true"></span>
            {{ statusNames[slot.status] }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.upcoming {
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 0.85rem;
}

.upcoming-title {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.upcoming-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.upcoming-list li + li {
  border-top: 1px solid var(--tt-line);
}

.upcoming-item {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: 1fr auto 6.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.25rem;
  border: 0;
  background: transparent;
  color: var(--tt-ink);
  text-align: left;
  font: inherit;
}

.upcoming-item:hover {
  background: var(--tt-cream);
}

.upcoming-date {
  font-weight: 700;
}

.upcoming-time {
  font-weight: 700;
  color: var(--tt-muted);
}
</style>
