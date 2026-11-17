<script setup>
import { ref, computed } from 'vue'
import { formatMonth, formatLongDate, formatTime, toDateString } from '@/utils/format'
import { phase, easeOut, setVars } from '@/utils/motion'
import IconCheck from '@/components/icons/IconCheck.vue'
import StoryScene from './StoryScene.vue'
import StoryFit from './StoryFit.vue'

// Scene 02, "Pick a time". A picture of the real calendar for the first open month
// (from the API, so it is always true), assembling itself as the visitor scrolls:
//   0.03 – 0.2   grid lines draw
//   0.12 – 0.26  weekday headers drop in
//   0.2  – 0.4   day numbers fade in, row by row
//   0.36 – 0.54  the open days pop in as a wave
//   0.54 – 0.7   a ring travels to one open day and selects it
//   0.7  – 0.84  that day's times slide up
//   0.86 – 0.94  one time is ticked
// It is only a picture (aria-hidden); the scene's text describes it, and the real,
// usable calendar is on the booking page.
const props = defineProps({
  animated: { type: Boolean, default: false },
  month: { type: String, default: '' },
  slotsByDate: { type: Object, required: true },
  sampleSlot: { type: Object, default: null },
})
const emit = defineEmits(['progress'])

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const today = toDateString(new Date())

// The month as rows of 7 cells (Monday first), like MonthCalendar.vue.
const weeks = computed(() => {
  if (!props.month) return []
  const [year, monthNumber] = props.month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const firstColumn = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7
  const cells = Array(firstColumn).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toDateString(new Date(year, monthNumber - 1, day))
    const slots = props.slotsByDate[date] ?? []
    const open = slots.filter((slot) => slot.status === 'open').length
    let state = 'open'
    if (slots.length === 0 || date < today) state = 'closed'
    else if (open === 0) state = 'full'
    cells.push({ date, day, state })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
})

// Grid position of a date, as { row, col }.
function cellOf(date) {
  for (let row = 0; row < weeks.value.length; row++) {
    const col = weeks.value[row].findIndex((cell) => cell?.date === date)
    if (col !== -1) return { row, col }
  }
  return null
}

const target = computed(() => (props.sampleSlot ? cellOf(props.sampleSlot.date) : null))

// The ring starts on the first open day and travels to the chosen one.
const ringStart = computed(() => {
  const first = weeks.value.flat().find((cell) => cell?.state === 'open')
  return first ? cellOf(first.date) : target.value
})

const times = computed(() =>
  props.sampleSlot ? (props.slotsByDate[props.sampleSlot.date] ?? []) : [],
)

const visual = ref(null)

function onProgress(p) {
  emit('progress', p)
  const travel = easeOut(phase(p, 0.56, 0.68))
  const from = ringStart.value ?? { row: 0, col: 0 }
  const to = target.value ?? from
  setVars(visual.value, {
    '--lines': phase(p, 0.03, 0.2),
    '--heads': phase(p, 0.12, 0.26),
    '--nums': phase(p, 0.2, 0.4),
    '--pills': phase(p, 0.36, 0.54),
    '--ring': phase(p, 0.53, 0.57),
    '--rx': from.col + (to.col - from.col) * travel,
    '--ry': from.row + (to.row - from.row) * travel,
    '--select': phase(p, 0.66, 0.71),
    '--times': phase(p, 0.7, 0.84),
    '--tick': phase(p, 0.86, 0.94),
  })
}
</script>

<template>
  <StoryScene number="02" title-id="story-time-title" :animated="animated" @progress="onProgress">
    <template #text>
      <h2 id="story-time-title">Pick a time</h2>
      <p>Open days and times, always up to date.</p>
      <p v-if="month && sampleSlot" class="visually-hidden">
        The picture shows my calendar for {{ formatMonth(month) }}, with the open days marked.
        {{ formatLongDate(sampleSlot.date) }} is chosen, and its {{ formatTime(sampleSlot.time) }}
        time is ticked.
      </p>
    </template>

    <template #visual>
      <StoryFit :active="animated">
        <div
          ref="visual"
          class="mini"
          :class="{ 'is-animated': animated }"
          :style="{
            '--rows': weeks.length,
            '--target-row': target?.row ?? 0,
            '--target-col': target?.col ?? 0,
          }"
          aria-hidden="true"
        >
          <p class="mini-month">{{ month ? formatMonth(month) : '' }}</p>

          <div class="mini-heads">
            <span v-for="(name, i) in weekdays" :key="i" :style="{ '--i': i }">{{ name }}</span>
          </div>

          <div class="mini-grid">
            <!-- Thin grid lines, drawn with transforms (scaleX / scaleY from 0 to 1). -->
            <span
              v-for="h in weeks.length + 1"
              :key="`h${h}`"
              class="hline"
              :style="{ '--i': h - 1, top: `${((h - 1) / weeks.length) * 100}%` }"
            ></span>
            <span
              v-for="v in 8"
              :key="`v${v}`"
              class="vline"
              :style="{ '--i': v - 1, left: `${((v - 1) / 7) * 100}%` }"
            ></span>

            <template v-for="(week, row) in weeks" :key="row">
              <div
                v-for="(cell, col) in week"
                :key="`${row}-${col}`"
                class="cell"
                :class="cell ? `is-${cell.state}` : 'is-empty'"
                :style="{ '--row': row, '--wave': row + col }"
              >
                <template v-if="cell">
                  <span v-if="cell.state === 'open'" class="pill"></span>
                  <span class="num">{{ cell.day }}</span>
                  <span
                    v-if="target && target.row === row && target.col === col"
                    class="chosen"
                  >
                    <span>{{ cell.day }}</span>
                  </span>
                </template>
              </div>
            </template>

            <span v-if="target" class="ring"></span>
          </div>

          <div v-if="times.length" class="mini-times">
            <span
              v-for="(slot, i) in times"
              :key="slot.id"
              class="time"
              :class="{
                'is-booked': slot.status === 'booked',
                'is-ticked': slot.id === sampleSlot?.id,
              }"
              :style="{ '--i': i }"
            >
              <span class="time-fill"></span>
              <span class="time-label">{{ formatTime(slot.time) }}</span>
              <IconCheck v-if="slot.id === sampleSlot?.id" class="time-tick" />
            </span>
          </div>
        </div>
      </StoryFit>
    </template>
  </StoryScene>
</template>

<style scoped>
.mini {
  width: 100%;
  max-width: 26rem;
  margin: 0 auto;
  padding: 1rem 0.9rem 1.1rem;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: 1.4rem;
  box-shadow: 0 18px 40px -24px rgba(158, 74, 85, 0.45);
}

.mini-month {
  margin: 0 0 0.6rem;
  text-align: center;
  font-family: var(--tt-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tt-ink);
}

.mini-heads {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  margin-bottom: 4px;
}

.mini-heads span {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
  background: var(--tt-pink);
  border-radius: 6px;
  padding: 0.15rem 0;
}

.mini-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 2.6rem;
}

.hline,
.vline {
  position: absolute;
  background: var(--tt-line);
  opacity: 0.7;
}

.hline {
  left: 0;
  right: 0;
  height: 1px;
  transform-origin: left center;
}

.vline {
  top: 0;
  bottom: 0;
  width: 1px;
  transform-origin: center top;
}

.cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.num {
  position: relative;
  font-size: 0.95rem;
}

.is-closed .num {
  color: var(--tt-muted);
  opacity: 0.6;
}

.is-full .num {
  color: var(--tt-muted);
  text-decoration: line-through;
}

.is-open .num {
  font-weight: 700;
}

/* The pink pill behind an open day. */
.pill {
  position: absolute;
  inset: 5px 4px;
  border-radius: 999px;
  background: var(--tt-pink);
  border: 1px solid var(--tt-line);
}

/* The chosen day: deep rose with a white number (shown over the plain one). */
.chosen {
  position: absolute;
  inset: 4px 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--tt-deep-rose);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
}

/* The ring that travels to the chosen day. Its size is one cell, so translating it by
   100% moves it exactly one cell; --rx and --ry say how many cells across and down. */
.ring {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% / 7);
  height: calc(100% / var(--rows));
  transform: translate(calc(var(--target-col) * 100%), calc(var(--target-row) * 100%));
  pointer-events: none;
}

.ring::after {
  content: '';
  position: absolute;
  inset: 1px 0;
  border: 2px solid var(--tt-ink);
  border-radius: 999px;
}

.mini-times {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.9rem;
}

.time {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  border: 1.5px solid var(--tt-line);
  background: var(--tt-white);
  font-weight: 700;
  overflow: hidden;
}

.time.is-booked .time-label {
  text-decoration: line-through;
  color: var(--tt-muted);
}

.time.is-ticked {
  border-color: var(--tt-deep-rose);
}

.time-fill {
  position: absolute;
  inset: 0;
  background: var(--tt-pink);
  opacity: 0;
}

.is-ticked .time-fill {
  opacity: 1;
}

.time-label,
.time-tick {
  position: relative;
}

.time-tick {
  color: var(--tt-deep-rose);
}

/* ---- Scrubbed. Each element's own progress comes from the phase variables plus its
   index (--i, --row or --wave), so neighbours start one after another. ---- */
.is-animated .hline {
  transform: scaleX(clamp(0, var(--lines) * 1.9 - var(--i) * 0.15, 1));
}

.is-animated .vline {
  transform: scaleY(clamp(0, var(--lines) * 1.84 - var(--i) * 0.12, 1));
}

.is-animated .mini-month {
  opacity: var(--heads);
}

.is-animated .mini-heads span {
  --f: clamp(0, var(--heads) * 1.9 - var(--i) * 0.15, 1);
  opacity: var(--f);
  transform: translateY(calc((1 - var(--f)) * -0.6rem));
}

.is-animated .num {
  --f: clamp(0, var(--nums) * (1 + (var(--rows) - 1) * 0.35) - var(--row) * 0.35, 1);
  opacity: var(--f);
  transform: translateY(calc((1 - var(--f)) * 0.4rem));
}

.is-animated .is-closed .num {
  opacity: calc(var(--f) * 0.6);
}

/* Open days pop in as a diagonal wave, with a small overshoot (the sin() bump). */
.is-animated .pill {
  --f: clamp(0, var(--pills) * 2.3 - var(--wave) * 0.12, 1);
  opacity: min(1, var(--f) * 2);
  transform: scale(calc(0.4 + var(--f) * 0.6 + sin(var(--f) * 180deg) * 0.18));
}

.is-animated .ring {
  opacity: var(--ring);
  transform: translate(calc(var(--rx) * 100%), calc(var(--ry) * 100%));
}

.is-animated .chosen {
  opacity: var(--select);
  transform: scale(calc(0.6 + var(--select) * 0.4));
}

.is-animated .time {
  --f: clamp(0, var(--times) * 1.6 - var(--i) * 0.3, 1);
  opacity: var(--f);
  transform: translateY(calc((1 - var(--f)) * 1rem));
}

.is-animated .is-ticked .time-fill {
  opacity: var(--tick);
}

.is-animated .time-tick {
  opacity: min(1, var(--tick) * 20);
}

.is-animated .time-tick :deep(path) {
  stroke-dasharray: 1 1;
  stroke-dashoffset: calc(1 - var(--tick));
}

@media (min-width: 992px) {
  .mini {
    max-width: 30rem;
    padding: 1.4rem 1.4rem 1.5rem;
  }

  .mini-grid {
    grid-auto-rows: 3rem;
  }

  .num,
  .chosen {
    font-size: 1.05rem;
  }
}
</style>
