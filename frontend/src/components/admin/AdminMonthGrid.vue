<script setup>
import { computed } from 'vue'
import { formatLongDate, formatMonth, formatTime, parseDate, toDateString } from '@/utils/format'
import { statusNames } from '@/utils/adminSlots'

// The owner's month grid (weeks start on Monday, like the public calendar).
// Each day shows one mark per slot (see admin.css): ring = open, half circle = on hold,
// square = booked. Days with no times are plain, past days are faded, today's number is
// ringed, and a fully booked day is dark.
// In "Select days" mode (`selecting`) tapping picks days instead, and the weekday names
// become buttons that pick every future day of that weekday in the month.
const props = defineProps({
  month: { type: String, required: true }, // '2026-12'
  slotsByDate: { type: Object, required: true }, // { '2026-12-03': [slots] }
  today: { type: String, required: true }, // '2026-11-18'
  selectedDate: { type: String, default: '' },
  selecting: { type: Boolean, default: false },
  pickedDates: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['tap-day', 'toggle-weekday'])

const weekdays = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
]

const monthName = computed(() => formatMonth(props.month).split(' ')[0]) // 'December'

function describeDay(date) {
  const slots = props.slotsByDate[date] ?? []
  const past = date < props.today
  const picked = props.pickedDates.includes(date)
  const full = slots.length > 0 && slots.every((slot) => slot.status === 'booked')

  // e.g. "Thursday 3 December, today: 10am open, 2pm on hold, 4pm booked"
  let label = formatLongDate(date)
  if (date === props.today) label += ', today'
  label += ': '
  label += slots.length
    ? slots
        .map((slot) => `${formatTime(slot.time)} ${statusNames[slot.status].toLowerCase()}`)
        .join(', ')
    : 'no times'
  if (full) label += '. Fully booked'

  return {
    date,
    dayNumber: parseDate(date).getDate(),
    slots,
    past,
    picked,
    full,
    isToday: date === props.today,
    disabled: props.selecting && past,
    label,
  }
}

// Every day of the month, and rows of 7 cells (null pads the first and last week).
const days = computed(() => {
  const [year, monthNumber] = props.month.split('-').map(Number)
  const count = new Date(year, monthNumber, 0).getDate()
  const list = []
  for (let day = 1; day <= count; day++) {
    list.push(describeDay(toDateString(new Date(year, monthNumber - 1, day))))
  }
  return list
})

const weeks = computed(() => {
  const firstColumn = (parseDate(`${props.month}-01`).getDay() + 6) % 7
  const cells = [...Array(firstColumn).fill(null), ...days.value]
  while (cells.length % 7 !== 0) cells.push(null)
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
})

// For each weekday column: can it be picked (any future day?), and is every one picked?
const weekdayState = computed(() =>
  weekdays.map((weekday, column) => {
    const future = days.value.filter(
      (day) => !day.past && (parseDate(day.date).getDay() + 6) % 7 === column,
    )
    return {
      ...weekday,
      column,
      available: future.length > 0,
      allPicked: future.length > 0 && future.every((day) => day.picked),
    }
  }),
)
</script>

<template>
  <table class="admin-grid" :class="{ 'is-loading': loading, 'is-selecting': selecting }">
    <thead>
      <tr>
        <th v-for="weekday in weekdayState" :key="weekday.short" scope="col">
          <button
            v-if="selecting"
            type="button"
            class="weekday-button"
            :disabled="!weekday.available"
            :aria-pressed="weekday.allPicked"
            :aria-label="`Every ${weekday.long} in ${monthName}`"
            @click="emit('toggle-weekday', weekday.column)"
          >
            {{ weekday.short }}
          </button>
          <abbr v-else :title="weekday.long" class="weekday-name">{{ weekday.short }}</abbr>
        </th>
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
              'has-slots': day.slots.length > 0,
              full: day.full && !(selecting && day.picked),
              selected: !selecting && day.date === selectedDate,
              picked: selecting && day.picked,
              'on-dark': day.full || (selecting && day.picked),
            }"
            :disabled="day.disabled"
            :aria-pressed="selecting ? day.picked : undefined"
            :aria-current="day.isToday ? 'date' : undefined"
            :aria-label="day.label"
            :data-date="day.date"
            @click="emit('tap-day', day.date)"
          >
            <span class="grid-number" :class="{ today: day.isToday }">{{ day.dayNumber }}</span>
            <span class="grid-marks" aria-hidden="true">
              <span
                v-for="slot in day.slots"
                :key="slot.id"
                class="status-mark"
                :class="`is-${slot.status}`"
              ></span>
            </span>
            <span v-if="selecting && day.picked" class="picked-tick" aria-hidden="true">✓</span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
  <ul class="grid-key" aria-label="Key">
    <li><span class="status-mark is-open" aria-hidden="true"></span> Open</li>
    <li><span class="status-mark is-pending" aria-hidden="true"></span> On hold</li>
    <li><span class="status-mark is-booked" aria-hidden="true"></span> Booked</li>
    <li><span class="key-full" aria-hidden="true"></span> Fully booked</li>
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
  opacity: 0.55;
}

th {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
  padding: 0 0 0.15rem;
}

.weekday-name {
  text-decoration: none;
  cursor: default;
}

/* In "Select days" mode the weekday names are buttons. */
.weekday-button {
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 1.5px solid var(--tt-deep-rose);
  border-radius: 999px;
  background: var(--tt-white);
  color: var(--tt-deep-rose);
  font-weight: 800;
  font-size: 0.8rem;
}

.weekday-button[aria-pressed='true'] {
  background: var(--tt-deep-rose);
  color: #fff;
}

.weekday-button:disabled {
  border-color: var(--tt-line);
  color: #b9a2a5;
  background: transparent;
}

td {
  padding: 0;
}

/* A day. Plain when it has no times; a white tile when it has some. */
.grid-day {
  position: relative;
  width: 100%;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0 0.35rem;
  border: 1.5px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--tt-ink);
  font: inherit;
}

.grid-day.has-slots {
  background: var(--tt-white);
  border-color: var(--tt-line);
}

.grid-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1;
  border-radius: 50%;
}

/* Today: the number in a ring. */
.grid-number.today {
  box-shadow: 0 0 0 2px var(--tt-deep-rose);
}

.grid-day.past {
  opacity: 0.5;
}

.grid-day.past .grid-number {
  font-weight: 400;
}

/* Every time booked: a dark tile, easy to spot. */
.grid-day.full {
  background: var(--tt-ink);
  border-color: var(--tt-ink);
  color: #fff;
}

.grid-day.full .grid-number.today {
  box-shadow: 0 0 0 2px #fff;
}

/* The day open in the panel: a thick dark frame (not colour alone). */
.grid-day.selected {
  border: 3px solid var(--tt-ink);
  background: var(--tt-pink);
}

.grid-day.selected.full {
  background: var(--tt-ink);
  box-shadow: 0 0 0 3px var(--tt-deep-rose);
}

/* Picked in "Select days" mode: rose, with a tick. */
.grid-day.picked {
  background: var(--tt-deep-rose);
  border-color: var(--tt-deep-rose-dark);
  color: #fff;
}

.grid-day.picked .grid-number.today {
  box-shadow: 0 0 0 2px #fff;
}

.picked-tick {
  position: absolute;
  top: -1px;
  right: 3px;
  font-size: 0.7rem;
  font-weight: 800;
}

.grid-day:disabled {
  cursor: not-allowed;
}

.grid-marks {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  min-height: 10px;
  max-width: 38px;
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

.key-full {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: var(--tt-ink);
}
</style>
