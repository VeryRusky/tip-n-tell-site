<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { getMonthSlots, openSlots, updateSlot, removeSlot, errorMessage } from '@/services/adminApi'
import { useSaveStatus } from '@/composables/useSaveStatus'
import { formatLongDate, formatMonth, formatTime, toDateString } from '@/utils/format'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import AdminMonthGrid from '@/components/admin/AdminMonthGrid.vue'
import AdminSlotRow from '@/components/admin/AdminSlotRow.vue'
import AdminAddTimes from '@/components/admin/AdminAddTimes.vue'
import AdminBulkBar from '@/components/admin/AdminBulkBar.vue'
import AdminStatus from '@/components/admin/AdminStatus.vue'

// The owner's calendar (/admin). She can page through this month and the next 12,
// tap a day to change its times, or switch to "Select days" to open her usual times
// on many days at once. Every change saves straight away; if saving fails, the change
// is undone on screen and a message says so.

// '2026-12' plus `count` months, e.g. ('2026-12', 1) -> '2027-01'.
function addMonths(month, count) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + count, 1)
  return toDateString(date).slice(0, 7)
}

const today = toDateString(new Date())
const firstMonth = today.slice(0, 7)
const lastMonth = addMonths(firstMonth, 12)

const month = ref(firstMonth)
const slots = ref([]) // this month's slots: { id, date, time, status, special }
const loading = ref(false)
const loadError = ref('')
const selectedDate = ref('')
const selecting = ref(false) // "Select days" mode
const pickedDates = ref([])
const adding = ref(false)
const dayPanel = ref(null)
// reactive() lets the template write status.message instead of status.message.value.
const status = reactive(useSaveStatus())

const slotsByDate = computed(() => {
  const groups = {}
  for (const slot of slots.value) {
    if (!groups[slot.date]) groups[slot.date] = []
    groups[slot.date].push(slot)
  }
  return groups
})

const daySlots = computed(() => slotsByDate.value[selectedDate.value] ?? [])

function sortSlots() {
  slots.value.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

// Loads the month on screen. A counter ignores answers that arrive after she has moved on.
let request = 0
async function loadMonth() {
  const thisRequest = ++request
  loading.value = true
  loadError.value = ''
  try {
    const result = await getMonthSlots(month.value)
    if (thisRequest === request) slots.value = result
  } catch (error) {
    if (thisRequest === request)
      loadError.value = errorMessage(error, 'The calendar could not load.')
  } finally {
    if (thisRequest === request) loading.value = false
  }
}

function changeMonth(step) {
  const next = addMonths(month.value, step)
  if (next < firstMonth || next > lastMonth) return
  month.value = next
  selectedDate.value = ''
  slots.value = []
  loadMonth()
}

async function tapDay(date) {
  if (selecting.value) {
    if (date < today) return
    pickedDates.value = pickedDates.value.includes(date)
      ? pickedDates.value.filter((picked) => picked !== date)
      : [...pickedDates.value, date]
    return
  }
  selectedDate.value = date
  await nextTick()
  // On a phone the day's times are below the calendar: bring them into view.
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  dayPanel.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  dayPanel.value?.focus({ preventScroll: true })
}

function startSelecting() {
  selecting.value = true
  selectedDate.value = ''
  pickedDates.value = []
}

function stopSelecting() {
  selecting.value = false
  pickedDates.value = []
}

// ---- Changes to one slot (shown at once, undone if saving fails) ----

async function setStatus(slot, newStatus) {
  const before = slot.status
  slot.status = newStatus
  status.working()
  try {
    await updateSlot(slot.id, { status: newStatus })
    status.saved()
  } catch (error) {
    slot.status = before
    status.failed(`Not saved: ${errorMessage(error)} The slot is back to how it was.`)
  }
}

async function setSpecial(slot, special) {
  slot.special = special
  status.working()
  try {
    await updateSlot(slot.id, { special })
    status.saved()
  } catch (error) {
    slot.special = !special
    status.failed(`Not saved: ${errorMessage(error)} The slot is back to how it was.`)
  }
}

async function remove(slot) {
  const index = slots.value.indexOf(slot)
  slots.value.splice(index, 1)
  status.working('Removing…')
  try {
    await removeSlot(slot.id)
    status.saved(`Removed ${formatTime(slot.time)}`)
  } catch (error) {
    if (error.response?.status === 404) return status.saved('Already removed')
    slots.value.splice(index, 0, slot)
    status.failed(`Not removed: ${errorMessage(error)}`)
  }
}

// ---- Opening new times ----

// Adds the new slots to the screen if they are in the month showing.
function showCreated(created) {
  for (const slot of created) {
    if (slot.date.startsWith(month.value)) slots.value.push(slot)
  }
  sortSlots()
}

async function addTimes(times) {
  adding.value = true
  status.working('Adding…')
  try {
    const result = await openSlots([selectedDate.value], times)
    showCreated(result.created)
    status.saved(result.created.length ? 'Saved' : 'Already there')
  } catch (error) {
    status.failed(`Not added: ${errorMessage(error)}`)
  } finally {
    adding.value = false
  }
}

async function openPickedDays({ times, special }) {
  adding.value = true
  status.working('Opening…')
  try {
    const result = await openSlots([...pickedDates.value].sort(), times, special)
    showCreated(result.created)
    const opened = result.created.length
    let text = `Opened ${opened} ${opened === 1 ? 'time' : 'times'}`
    if (result.skipped) text += ` (${result.skipped} already there)`
    status.saved(text)
    stopSelecting()
  } catch (error) {
    status.failed(`Not opened: ${errorMessage(error)}`)
  } finally {
    adding.value = false
  }
}

onMounted(loadMonth)
</script>

<template>
  <AdminLayout title="Calendar">
    <div class="row g-4" :class="{ 'room-for-bar': selecting }">
      <div class="col-md-7">
        <div class="panel calendar-panel">
          <div class="month-header">
            <button
              type="button"
              class="month-button"
              :disabled="month <= firstMonth"
              aria-label="Previous month"
              @click="changeMonth(-1)"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <h2 class="month-name" aria-live="polite">{{ formatMonth(month) }}</h2>
            <button
              type="button"
              class="month-button"
              :disabled="month >= lastMonth"
              aria-label="Next month"
              @click="changeMonth(1)"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>

          <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
            <p class="small-print mb-0">
              {{ selecting ? 'Tap days to pick them.' : 'Tap a day to change its times.' }}
            </p>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm"
              :aria-pressed="selecting"
              @click="selecting ? stopSelecting() : startSelecting()"
            >
              {{ selecting ? 'Stop selecting' : 'Select days' }}
            </button>
          </div>

          <p v-if="loading && slots.length === 0" role="status" class="small-print mb-2">
            Loading {{ formatMonth(month) }}…
          </p>
          <div v-if="loadError" class="load-error mb-2" role="alert">
            <p class="mb-2">{{ loadError }}</p>
            <button type="button" class="btn btn-primary btn-sm" @click="loadMonth">
              Try again
            </button>
          </div>

          <AdminMonthGrid
            :month="month"
            :slots-by-date="slotsByDate"
            :today="today"
            :selected-date="selectedDate"
            :selecting="selecting"
            :picked-dates="pickedDates"
            :loading="loading"
            @tap-day="tapDay"
          />
        </div>
      </div>

      <div v-if="!selecting" class="col-md-5">
        <section
          v-if="selectedDate"
          ref="dayPanel"
          class="day-panel"
          tabindex="-1"
          aria-labelledby="day-title"
        >
          <h2 id="day-title" class="day-title">{{ formatLongDate(selectedDate) }}</h2>
          <p v-if="daySlots.length === 0" class="muted">No times on this day yet.</p>
          <ul class="slot-list">
            <AdminSlotRow
              v-for="slot in daySlots"
              :key="slot.id"
              :time-slot="slot"
              @set-status="setStatus(slot, $event)"
              @set-special="setSpecial(slot, $event)"
              @remove="remove(slot)"
            />
          </ul>
          <AdminAddTimes
            v-if="selectedDate >= today"
            :existing-times="daySlots.map((slot) => slot.time)"
            :busy="adding"
            @add="addTimes"
          />
          <p v-else class="small-print">This day has passed, so no new times can be added.</p>
        </section>
        <p v-else class="no-day">Tap a day on the calendar to see and change its times.</p>
      </div>
    </div>

    <AdminBulkBar
      v-if="selecting"
      :count="pickedDates.length"
      :busy="adding"
      @open="openPickedDays"
      @cancel="stopSelecting"
    />
    <AdminStatus :message="status.message" :kind="status.kind" :raised="selecting" />
  </AdminLayout>
</template>

<style scoped>
.calendar-panel {
  padding: 0.75rem 0.5rem;
}

.month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.month-name {
  margin: 0;
  font-size: 1.3rem;
  letter-spacing: 0.03em;
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

.room-for-bar {
  padding-bottom: 9rem; /* the "Select days" bar covers the bottom of the screen */
}

.day-panel {
  scroll-margin-top: 1rem;
}

.day-panel:focus {
  outline: none;
}

.day-title {
  font-size: 1.3rem;
}

.slot-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: grid;
  gap: 0.6rem;
}

.no-day {
  min-height: 8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem;
  border: 1.5px dashed var(--tt-line);
  border-radius: var(--tt-radius);
  color: var(--tt-muted);
}

.load-error {
  background: #fbe3e5;
  border: 1px solid #8a1c2b;
  border-radius: var(--tt-radius-small);
  padding: 0.75rem;
}
</style>
