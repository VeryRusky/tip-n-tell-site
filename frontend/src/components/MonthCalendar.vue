<script setup>
import { computed } from 'vue'
import { formatMonth, formatLongDate, parseDate, toDateString } from '@/utils/format'
import IconSparkle from './icons/IconSparkle.vue'

// Month grid modelled on her Instagram calendar (weeks start on Monday).
// A phone is too narrow for three time pills per day, so each day only shows
// whether it has open times; tapping a day shows its times underneath.
const props = defineProps({
  month: { type: String, required: true }, // '2026-12'
  slotsByDate: { type: Object, required: true },
  selectedDate: { type: String, default: '' },
  hasPrevious: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['select-day', 'previous', 'next'])

const weekdayNames = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
]

const today = toDateString(new Date())

// Works out what one day cell should show.
function describeDay(date) {
  const slots = props.slotsByDate[date] ?? []
  const openCount = slots.filter((slot) => slot.status === 'open').length
  const hasSpecial = slots.some((slot) => slot.status === 'open' && slot.special)
  let state = 'open'
  if (slots.length === 0 || date < today) state = 'closed'
  else if (openCount === 0) state = 'full'

  let label = `${formatLongDate(date)}: `
  if (state === 'closed') label += 'closed'
  else if (state === 'full') label += 'fully booked'
  else label += `${openCount} open ${openCount === 1 ? 'time' : 'times'}`
  if (hasSpecial) label += ', includes a specially opened slot'

  return { date, dayNumber: parseDate(date).getDate(), state, openCount, hasSpecial, label }
}

// Rows of 7 cells. Empty cells (null) pad the first and last week.
const weeks = computed(() => {
  const [year, monthNumber] = props.month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  // getDay() is 0 for Sunday; shift so Monday is the first column.
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
  <section class="calendar" aria-labelledby="calendar-month">
    <div class="calendar-header">
      <button
        type="button"
        class="month-button"
        :disabled="!hasPrevious"
        aria-label="Previous month"
        @click="emit('previous')"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <h2 id="calendar-month" class="calendar-month" aria-live="polite">
        {{ formatMonth(month) }}
      </h2>
      <button
        type="button"
        class="month-button"
        :disabled="!hasNext"
        aria-label="Next month"
        @click="emit('next')"
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>

    <table class="calendar-grid" :class="{ 'is-loading': loading }" :aria-busy="loading">
      <caption class="visually-hidden">
        Open days in
        {{
          formatMonth(month)
        }}. Choose a day to see its times.
      </caption>
      <thead>
        <tr>
          <th v-for="weekday in weekdayNames" :key="weekday.short" scope="col">
            <abbr :title="weekday.long">{{ weekday.short }}</abbr>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, rowIndex) in weeks" :key="rowIndex">
          <td v-for="(day, colIndex) in week" :key="colIndex">
            <template v-if="day">
              <!-- Closed days are plain text, like the dash on her calendar. -->
              <div v-if="day.state === 'closed'" class="day day-closed">
                <span class="day-number">{{ day.dayNumber }}</span>
                <span class="day-status" aria-hidden="true">–</span>
                <span class="visually-hidden">{{ day.label }}</span>
              </div>
              <!-- Open and fully booked days can be tapped to see their times. -->
              <button
                v-else
                type="button"
                class="day"
                :class="[`day-${day.state}`, { selected: day.date === selectedDate }]"
                :aria-pressed="day.date === selectedDate"
                :aria-label="day.label"
                @click="emit('select-day', day.date)"
              >
                <span class="day-number">{{ day.dayNumber }}</span>
                <span v-if="day.state === 'full'" class="day-status">full</span>
                <span v-else class="day-dots" aria-hidden="true">
                  <span v-for="n in day.openCount" :key="n" class="dot"></span>
                </span>
                <IconSparkle v-if="day.hasSpecial" class="day-special" />
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <ul class="calendar-legend" aria-label="Calendar key">
      <li>
        <span class="legend-swatch legend-open" aria-hidden="true"><span class="dot"></span></span>
        Open times
      </li>
      <li><IconSparkle class="legend-special" /> Specially opened (+fee)</li>
      <li><span class="legend-swatch" aria-hidden="true">full</span> All booked</li>
      <li><span class="legend-swatch" aria-hidden="true">–</span> Closed</li>
    </ul>
  </section>
</template>

<style scoped>
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.calendar-month {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tt-ink);
}

.month-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1.5px solid var(--tt-deep-rose);
  background: var(--tt-white);
  color: var(--tt-deep-rose);
  font-size: 1.6rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 0.2rem;
}

.month-button:disabled {
  border-color: var(--tt-line);
  color: #b9a2a5;
  background: transparent;
}

.calendar-grid {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 3px;
  transition: opacity 0.15s;
}

.calendar-grid.is-loading {
  opacity: 0.5;
}

th {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
  background: var(--tt-pink);
  padding: 0.3rem 0;
  border-radius: 6px;
}

th abbr {
  text-decoration: none;
}

td {
  padding: 0;
  vertical-align: top;
}

.day {
  position: relative;
  width: 100%;
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.2rem;
  padding: 0.3rem 0 0.25rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--tt-ink);
  font: inherit;
}

.day-number {
  font-size: 1rem;
  line-height: 1.2;
}

.day-closed {
  color: var(--tt-muted);
}

.day-open {
  background: var(--tt-pink);
  border-color: var(--tt-line);
}

.day-open .day-number {
  font-weight: 700;
}

.day-full {
  background: transparent;
  border: 1px dashed var(--tt-line);
}

.day-full .day-number {
  text-decoration: line-through;
  color: var(--tt-muted);
}

.day-status {
  font-size: 0.75rem;
  line-height: 1;
  color: var(--tt-muted);
}

.day-dots {
  display: flex;
  gap: 3px;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tt-deep-rose);
}

.day-special {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 0.7rem;
  color: var(--tt-deep-rose);
}

/* Selected day: thick border plus filled colour, not colour alone. It pops in briefly. */
.day.selected {
  background: var(--tt-deep-rose);
  border: 2px solid var(--tt-ink);
  color: #fff;
  animation: day-pop 0.3s var(--tt-ease-pop);
}

@keyframes day-pop {
  from {
    transform: scale(0.86);
  }
}

.day.selected .day-number,
.day.selected .day-status,
.day.selected .day-special {
  color: #fff;
}

.day.selected .dot {
  background: #fff;
}

.calendar-legend {
  list-style: none;
  padding: 0;
  margin: 0.6rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1rem;
  font-size: 0.85rem;
  color: var(--tt-muted);
}

.calendar-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  height: 1.1rem;
  font-size: 0.7rem;
  border-radius: 4px;
  border: 1px dashed var(--tt-line);
}

.legend-open {
  background: var(--tt-pink);
  border: 1px solid var(--tt-line);
}

.legend-special {
  color: var(--tt-deep-rose);
}
</style>
