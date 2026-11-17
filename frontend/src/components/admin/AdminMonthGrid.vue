<script setup>
import { computed } from 'vue'
import { formatLongDate, formatTime, parseDate, toDateString } from '@/utils/format'

// The owner's month grid (weeks start on Monday, like the public calendar).
// Every day can be tapped. Each day shows one small mark per slot:
//   filled dot = open, ring = on hold, cross = booked.
// In "Select days" mode (`selecting`), tapping picks or unpicks days instead,
// and days before today cannot be picked.
const props = defineProps({
  month: { type: String, required: true }, // '2026-12'
  slotsByDate: { type: Object, required: true },
  today: { type: String, required: true }, // '2026-11-18'
  selectedDate: { type: String, default: '' },
  selecting: { type: Boolean, default: false },
  pickedDates: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['tap-day'])

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function describeDay(date) {
  const slots = props.slotsByDate[date] ?? []
  const past = date < props.today
  const picked = props.pickedDates.includes(date)

  // e.g. "Thursday 3 December: 10am open, 2pm on hold, 4pm booked"
  const names = { open: 'open', pending: 'on hold', booked: 'booked' }
  let label = `${formatLongDate(date)}: `
  label += slots.length
    ? slots.map((slot) => `${formatTime(slot.time)} ${names[slot.status]}`).join(', ')
    : 'no times'
  if (props.selecting) label += picked ? ' (picked)' : ''

  return {
    date,
    dayNumber: parseDate(date).getDate(),
    slots,
    past,
    picked,
    isToday: date === props.today,
    disabled: props.selecting && past,
    label,
  }
}

// Rows of 7 cells. Empty cells (null) pad the first and last week.
const weeks = computed(() => {
  const [year, monthNumber] = props.month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const firstColumn = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7
  const cells = Array(firstColumn).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(describeDay(toDateString(new Date(year, monthNumber - 1, day))))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
})
</script>

<template>
  <table class="admin-grid" :class="{ 'is-loading': loading, 'is-selecting': selecting }">
    <thead>
      <tr>
        <th v-for="name in weekdayNames" :key="name" scope="col">{{ name }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(week, rowIndex) in weeks" :key="rowIndex">
        <td v-for="(day, colIndex) in week" :key="colIndex">
          <button
            v-if="day"
            type="button"
            class="grid-day"
            :class="{
              past: day.past,
              today: day.isToday,
              selected: !selecting && day.date === selectedDate,
              picked: selecting && day.picked,
            }"
            :disabled="day.disabled"
            :aria-pressed="selecting ? day.picked : day.date === selectedDate"
            :aria-label="day.label"
            @click="emit('tap-day', day.date)"
          >
            <span class="grid-number">{{ day.dayNumber }}</span>
            <span class="grid-marks" aria-hidden="true">
              <span
                v-for="slot in day.slots"
                :key="slot.id"
                class="mark"
                :class="`mark-${slot.status}`"
              ></span>
            </span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
  <ul class="grid-key" aria-label="Key">
    <li><span class="mark mark-open" aria-hidden="true"></span> Open</li>
    <li><span class="mark mark-pending" aria-hidden="true"></span> On hold</li>
    <li><span class="mark mark-booked" aria-hidden="true"></span> Booked</li>
  </ul>
</template>

<style scoped>
.admin-grid {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 3px;
}

.admin-grid.is-loading {
  opacity: 0.5;
}

th {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
  padding: 0.2rem 0;
}

td {
  padding: 0;
}

.grid-day {
  width: 100%;
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0 0.3rem;
  border: 1px solid var(--tt-line);
  border-radius: 10px;
  background: var(--tt-white);
  color: var(--tt-ink);
  font: inherit;
}

.grid-number {
  font-size: 1rem;
  line-height: 1.1;
  font-weight: 700;
}

.grid-day.past {
  background: transparent;
  color: var(--tt-muted);
  border-style: dashed;
}

.grid-day.past .grid-number {
  font-weight: 400;
}

.grid-day.today .grid-number {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.grid-day:disabled {
  opacity: 0.45;
}

/* The day being looked at, and days picked in "Select days" mode:
   thick border plus filled colour, not colour alone. */
.grid-day.selected,
.grid-day.picked {
  background: var(--tt-deep-rose);
  border: 2px solid var(--tt-ink);
  color: #fff;
}

.grid-marks {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  min-height: 7px;
  max-width: 34px;
}

/* Small marks, one per slot. Shape (not only colour) shows the status. */
.mark {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.mark-open {
  background: var(--tt-deep-rose);
}

.mark-pending {
  border: 1.5px solid var(--tt-deep-rose);
  background: transparent;
}

.mark-booked {
  border-radius: 0;
  background:
    linear-gradient(45deg, transparent 40%, var(--tt-ink) 40%, var(--tt-ink) 60%, transparent 60%),
    linear-gradient(-45deg, transparent 40%, var(--tt-ink) 40%, var(--tt-ink) 60%, transparent 60%);
}

.selected .mark-open,
.picked .mark-open {
  background: #fff;
}

.selected .mark-pending,
.picked .mark-pending {
  border-color: #fff;
}

.selected .mark-booked,
.picked .mark-booked {
  background:
    linear-gradient(45deg, transparent 40%, #fff 40%, #fff 60%, transparent 60%),
    linear-gradient(-45deg, transparent 40%, #fff 40%, #fff 60%, transparent 60%);
}

.grid-key {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  font-size: 0.85rem;
  color: var(--tt-muted);
}

.grid-key li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
