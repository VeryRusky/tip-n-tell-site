<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import {
  getMonthSlots,
  openSlots,
  updateSlot,
  removeSlot,
  removeSlots,
  restoreSlots,
  errorMessage,
} from '@/services/adminApi'
import { getSpecialSlotFee } from '@/services/api'
import { useAdminToastStore } from '@/stores/adminToast'
import { useMediaQuery } from '@/composables/useMediaQuery'
import {
  formatLongDate,
  formatMonth,
  formatShortDate,
  formatTime,
  parseDate,
  toDateString,
} from '@/utils/format'
import { statusNames, countByStatus, plural, takenWords, bySlotTime } from '@/utils/adminSlots'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import AdminMonthGrid from '@/components/admin/AdminMonthGrid.vue'
import AdminDayPanel from '@/components/admin/AdminDayPanel.vue'
import AdminBulkBar from '@/components/admin/AdminBulkBar.vue'
import AdminUpcoming from '@/components/admin/AdminUpcoming.vue'
import AdminSheet from '@/components/admin/AdminSheet.vue'
import AdminOpenTimesForm from '@/components/admin/AdminOpenTimesForm.vue'

// The owner's calendar (/admin).
//   - Tap a day: its times open in a sheet (phone) or the right-hand column (laptop).
//   - "Select days": pick several days (or every Thursday...), then open or remove times.
//   - "Coming up": her next booked and on-hold times.
// Every change saves straight away. Adding or removing times shows a message with Undo;
// if saving fails, the screen goes back to how it was and a message says so.

// '2026-12' plus `count` months, e.g. ('2026-12', 1) -> '2027-01'.
function addMonths(month, count) {
  const [year, monthNumber] = month.split('-').map(Number)
  return toDateString(new Date(year, monthNumber - 1 + count, 1)).slice(0, 7)
}

const today = toDateString(new Date())
const firstMonth = today.slice(0, 7)
const lastMonth = addMonths(firstMonth, 12)

const toast = useAdminToastStore()
const isWide = useMediaQuery('(min-width: 992px)') // a laptop: two columns

const month = ref(firstMonth) // the month on screen
const months = reactive({}) // every month loaded so far: { '2026-12': [slots] }
const loadingMonths = reactive({}) // { '2026-12': true } while loading
const loadError = ref('')
const selectedDate = ref('') // the day whose times are showing
const selecting = ref(false) // "Select days" mode
const pickedDates = ref([])
const working = ref('') // the add or remove action being saved, e.g. 'bulk-open'
const openTimesOpen = ref(false) // the "Open times" sheet
const removeAllOpen = ref(false) // the "Remove all times?" sheet
const specialFee = ref(0)

// ---- What is on screen ----

const allSlots = computed(() => Object.values(months).flat())

const slotsByDate = computed(() => {
  const groups = {}
  for (const slot of allSlots.value) (groups[slot.date] ??= []).push(slot)
  return groups
})

const monthName = computed(() => formatMonth(month.value).split(' ')[0]) // 'December'
const monthLoaded = computed(() => month.value in months)
const loading = computed(() => !!loadingMonths[month.value])

// This month's times from today on, e.g. "December: 31 open · 2 on hold · 9 booked".
const monthAhead = computed(() => (months[month.value] ?? []).filter((slot) => slot.date >= today))
const monthSummary = computed(() => {
  const counts = countByStatus(monthAhead.value)
  return `${monthName.value}: ${counts.open} open · ${counts.pending} on hold · ${counts.booked} booked`
})

const daySlots = computed(() => slotsByDate.value[selectedDate.value] ?? [])
const dayTitle = computed(() => (selectedDate.value ? formatLongDate(selectedDate.value) : 'Day'))

// "Coming up": the next 10 on-hold and booked times from today.
const upcoming = computed(() =>
  allSlots.value
    .filter((slot) => slot.date >= today && slot.status !== 'open')
    .sort(bySlotTime)
    .slice(0, 10),
)

// The times on the picked days.
const pickedSlots = computed(() =>
  pickedDates.value.flatMap((date) => slotsByDate.value[date] ?? []),
)
const pickedOpen = computed(() => pickedSlots.value.filter((slot) => slot.status === 'open'))
const pickedCounts = computed(() => countByStatus(pickedSlots.value))

// ---- Loading ----

// Loads one month. A counter ignores an answer that arrives after a newer request.
const requestNumbers = {}
async function loadMonth(wanted) {
  const number = (requestNumbers[wanted] ?? 0) + 1
  requestNumbers[wanted] = number
  loadingMonths[wanted] = true
  if (wanted === month.value) loadError.value = ''
  try {
    const result = await getMonthSlots(wanted)
    if (requestNumbers[wanted] === number) months[wanted] = result.sort(bySlotTime)
  } catch (error) {
    if (requestNumbers[wanted] === number && wanted === month.value) {
      loadError.value = errorMessage(error, 'The calendar could not load.')
    }
  } finally {
    if (requestNumbers[wanted] === number) loadingMonths[wanted] = false
  }
}

function showMonth(wanted) {
  if (wanted < firstMonth || wanted > lastMonth) return
  if (wanted !== month.value && !selecting.value) selectedDate.value = ''
  month.value = wanted
  if (!working.value) loadMonth(wanted) // shows what it has at once, then refreshes
}

// After a failed request, the screen may not match the database: load again.
function reloadLoadedMonths() {
  for (const loaded of Object.keys(months)) loadMonth(loaded)
}

// ---- Keeping the screen in step with the database ----

function findSlot(id) {
  return allSlots.value.find((slot) => slot.id === id)
}

function putOnScreen(newSlots) {
  for (const slot of newSlots) {
    const list = months[slot.date.slice(0, 7)]
    if (list && !list.some((s) => s.id === slot.id)) list.push({ ...slot })
  }
  for (const list of Object.values(months)) list.sort(bySlotTime)
}

function takeOffScreen(ids) {
  for (const key of Object.keys(months)) {
    months[key] = months[key].filter((slot) => !ids.includes(slot.id))
  }
}

// ---- Days ----

async function openDay(date, { focusPanel = false } = {}) {
  if (date.slice(0, 7) !== month.value) showMonth(date.slice(0, 7))
  selectedDate.value = date
  if (focusPanel && isWide.value) {
    await nextTick()
    document.getElementById('day-panel-title')?.focus()
  }
}

async function closeDay() {
  const date = selectedDate.value
  selectedDate.value = ''
  if (isWide.value) {
    await nextTick()
    document.querySelector(`.grid-day[data-date="${date}"]`)?.focus()
  }
}

function tapDay(date) {
  if (!selecting.value) return openDay(date)
  if (date < today) return
  pickedDates.value = pickedDates.value.includes(date)
    ? pickedDates.value.filter((picked) => picked !== date)
    : [...pickedDates.value, date]
}

// Every future day of one weekday column (0 = Monday) in the month on screen.
function toggleWeekday(column) {
  const [year, monthNumber] = month.value.split('-').map(Number)
  const count = new Date(year, monthNumber, 0).getDate()
  const dates = []
  for (let day = 1; day <= count; day++) {
    const date = toDateString(new Date(year, monthNumber - 1, day))
    if (date >= today && (parseDate(date).getDay() + 6) % 7 === column) dates.push(date)
  }
  const allPicked = dates.every((date) => pickedDates.value.includes(date))
  pickedDates.value = allPicked
    ? pickedDates.value.filter((date) => !dates.includes(date))
    : [...new Set([...pickedDates.value, ...dates])]
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

// ---- Changing one slot (shown at once, put back if saving fails) ----

async function setStatus(slot, newStatus) {
  const before = slot.status
  if (before === newStatus) return
  slot.status = newStatus
  toast.working()
  try {
    await updateSlot(slot.id, { status: newStatus })
    toast.saved(`Saved: ${formatTime(slot.time)} ${statusNames[newStatus].toLowerCase()}`)
  } catch (error) {
    slot.status = before
    toast.failed(
      `Not saved: ${errorMessage(error)} ${formatTime(slot.time)} is back to ${statusNames[before].toLowerCase()}.`,
    )
  }
}

async function setSpecial(slot, special) {
  slot.special = special
  toast.working()
  try {
    await updateSlot(slot.id, { special })
    toast.saved(special ? `Saved: ${formatTime(slot.time)} is special` : 'Saved: not special')
  } catch (error) {
    slot.special = !special
    toast.failed(`Not saved: ${errorMessage(error)} The slot is back to how it was.`)
  }
}

// ---- Adding and removing times (each one can be undone) ----

// Opens `times` on `dates`. Returns true if it worked.
async function openTimes(dates, times, special, key) {
  if (working.value) return false
  working.value = key
  toast.working('Opening…')
  try {
    const result = await openSlots(dates, times, special)
    putOnScreen(result.created)
    const opened = result.created.length
    if (opened === 0) {
      toast.saved('Those times were already open')
    } else {
      let text = `Opened ${plural(opened, 'time')}`
      if (result.skipped) text += ` (${result.skipped} already there)`
      toast.done(text, () => undoOpen(result.created))
    }
    return true
  } catch (error) {
    toast.failed(`Not opened: ${errorMessage(error)}`)
    return false
  } finally {
    working.value = ''
  }
}

async function removeTimes(slotsToRemove, key) {
  if (working.value || slotsToRemove.length === 0) return
  working.value = key
  toast.working('Removing…')
  try {
    const removed = await removeSlots(slotsToRemove.map((slot) => slot.id))
    takeOffScreen(slotsToRemove.map((slot) => slot.id))
    toast.done(`Removed ${plural(removed.length, 'time')}`, () => undoRemove(removed))
  } catch (error) {
    toast.failed(`Not removed: ${errorMessage(error)}`)
    reloadLoadedMonths()
  } finally {
    working.value = ''
  }
}

// One time (the Remove button on a row): gone from the screen at once.
async function removeOne(slot) {
  takeOffScreen([slot.id])
  toast.working('Removing…')
  try {
    await removeSlot(slot.id)
    toast.done(`Removed ${formatTime(slot.time)} on ${formatShortDate(slot.date)}`, () =>
      undoRemove([slot]),
    )
  } catch (error) {
    if (error.response?.status === 404) return toast.saved('Already removed')
    putOnScreen([slot])
    toast.failed(`Not removed: ${errorMessage(error)}`)
  }
}

// Undo "Opened 12 times": removes them again, except any she has marked since.
async function undoOpen(created) {
  working.value = 'undo'
  const stillOpen = created.filter((slot) => {
    const now = findSlot(slot.id)
    return now ? now.status === 'open' : !(slot.date.slice(0, 7) in months)
  })
  const kept = created.length - stillOpen.length
  try {
    if (stillOpen.length) await removeSlots(stillOpen.map((slot) => slot.id))
    takeOffScreen(stillOpen.map((slot) => slot.id))
    let text = `Undone: ${plural(stillOpen.length, 'new time')} removed`
    if (kept) text += `. Kept ${kept} you had changed.`
    toast.saved(text)
  } catch (error) {
    toast.failed(`Could not undo: ${errorMessage(error)}`)
    reloadLoadedMonths()
  } finally {
    working.value = ''
  }
}

// Undo "Removed 9 times": puts them back with the same status and special.
async function undoRemove(removed) {
  working.value = 'undo'
  const restorable = removed.filter((slot) => slot.date >= today)
  try {
    const result = await restoreSlots(restorable)
    putOnScreen(result.created)
    let text = `Undone: ${plural(result.created.length, 'time')} back`
    if (result.skipped) text += ` (${result.skipped} already there)`
    toast.saved(text)
  } catch (error) {
    toast.failed(`Could not undo: ${errorMessage(error)}`)
    reloadLoadedMonths()
  } finally {
    working.value = ''
  }
}

// ---- The day's actions ----

function addTimesToDay(times) {
  openTimes([selectedDate.value], times, false, 'open-usual')
}

function closeTheDay({ includeTaken }) {
  const slots = daySlots.value.filter((slot) => includeTaken || slot.status === 'open')
  removeTimes(slots, 'close-day')
}

// ---- Actions on the picked days ----

async function openOnPicked({ times, special }) {
  const ok = await openTimes([...pickedDates.value].sort(), times, special, 'bulk-open')
  if (ok) openTimesOpen.value = false
}

function removeAllPicked() {
  const taken = pickedCounts.value.booked + pickedCounts.value.pending
  if (taken > 0) removeAllOpen.value = true
  else removeTimes(pickedSlots.value, 'bulk-remove-all')
}

function removeOpenFromSheet() {
  removeAllOpen.value = false
  removeTimes(pickedOpen.value, 'bulk-remove-open')
}

function confirmRemoveAll() {
  removeAllOpen.value = false
  removeTimes(pickedSlots.value, 'bulk-remove-all')
}

onMounted(() => {
  loadMonth(firstMonth)
  loadMonth(addMonths(firstMonth, 1)) // so "Coming up" can look a little ahead
  getSpecialSlotFee().then((fee) => (specialFee.value = fee))
})
</script>

<template>
  <AdminLayout title="Calendar">
    <template v-if="!selecting" #actions>
      <button type="button" class="btn btn-outline-primary" @click="startSelecting">
        Select days
      </button>
    </template>

    <div class="row g-4" :class="{ 'room-for-bar': selecting && !isWide }">
      <div class="col-lg-7">
        <div class="panel calendar-panel">
          <div class="month-header">
            <button
              type="button"
              class="month-button"
              :disabled="month <= firstMonth"
              aria-label="Previous month"
              @click="showMonth(addMonths(month, -1))"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <h2 class="month-name" aria-live="polite">{{ formatMonth(month) }}</h2>
            <button
              type="button"
              class="month-button"
              :disabled="month >= lastMonth"
              aria-label="Next month"
              @click="showMonth(addMonths(month, 1))"
            >
              <span aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm today-button"
              :disabled="month === firstMonth"
              @click="showMonth(firstMonth)"
            >
              Today
            </button>
          </div>

          <p v-if="monthLoaded && monthAhead.length" class="month-summary">{{ monthSummary }}</p>
          <p class="hint">
            <template v-if="selecting">
              Tap days, or a weekday name to select every one in {{ monthName }}.
            </template>
            <template v-else>Tap a day to see and change its times.</template>
          </p>

          <p v-if="loading && !monthLoaded" role="status" class="small-print mb-2">
            Loading {{ formatMonth(month) }}…
          </p>
          <div v-if="loadError" class="danger-note mb-2" role="alert">
            <p class="mb-2">{{ loadError }}</p>
            <button type="button" class="btn btn-primary btn-sm" @click="loadMonth(month)">
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
            :loading="loading && !monthLoaded"
            @tap-day="tapDay"
            @toggle-weekday="toggleWeekday"
          />

          <div v-if="monthLoaded && !monthAhead.length && !selecting" class="empty-month">
            <p class="mb-2">No times in {{ monthName }} yet.</p>
            <button type="button" class="btn btn-primary" @click="startSelecting">
              Select days to open times
            </button>
          </div>
        </div>
      </div>

      <div class="col-lg-5">
        <AdminBulkBar
          v-if="selecting"
          :docked="!isWide"
          :count="pickedDates.length"
          :open-count="pickedOpen.length"
          :total-count="pickedSlots.length"
          :working="working"
          @open-times="openTimesOpen = true"
          @remove-open="removeTimes(pickedOpen, 'bulk-remove-open')"
          @remove-all="removeAllPicked"
          @clear="pickedDates = []"
          @done="stopSelecting"
        />

        <section
          v-if="isWide && selectedDate && !selecting"
          class="panel day-column"
          aria-labelledby="day-panel-title"
        >
          <div class="day-column-header">
            <h2 id="day-panel-title" class="day-title" tabindex="-1">{{ dayTitle }}</h2>
            <button type="button" class="btn btn-outline-primary btn-sm" @click="closeDay">
              Close
            </button>
          </div>
          <AdminDayPanel
            :date="selectedDate"
            :slots="daySlots"
            :today="today"
            :special-fee="specialFee"
            :working="working"
            @set-status="setStatus"
            @set-special="setSpecial"
            @remove="removeOne"
            @add-times="addTimesToDay"
            @close-day="closeTheDay"
          />
        </section>

        <AdminUpcoming
          v-if="!isWide || (!selectedDate && !selecting)"
          :slots="upcoming"
          :loading="loading"
          @open-day="openDay($event, { focusPanel: true })"
        />
      </div>
    </div>

    <!-- Phone: the day's times in a sheet over the calendar. -->
    <AdminSheet :open="!isWide && !!selectedDate && !selecting" :title="dayTitle" @close="closeDay">
      <AdminDayPanel
        v-if="selectedDate"
        :date="selectedDate"
        :slots="daySlots"
        :today="today"
        :special-fee="specialFee"
        :working="working"
        @set-status="setStatus"
        @set-special="setSpecial"
        @remove="removeOne"
        @add-times="addTimesToDay"
        @close-day="closeTheDay"
      />
    </AdminSheet>

    <AdminSheet
      :open="openTimesOpen"
      :title="`Open times on ${plural(pickedDates.length, 'day')}`"
      @close="openTimesOpen = false"
    >
      <AdminOpenTimesForm
        :day-count="pickedDates.length"
        :special-fee="specialFee"
        :busy="working === 'bulk-open'"
        @open="openOnPicked"
      />
    </AdminSheet>

    <AdminSheet
      :open="removeAllOpen"
      :title="`Remove all ${plural(pickedSlots.length, 'time')}?`"
      @close="removeAllOpen = false"
    >
      <div class="danger-note mb-3">
        <p class="mb-2">
          <strong>This includes {{ takenWords(pickedCounts) }}.</strong>
        </p>
        <p class="mb-0">
          Message those customers first: the site does not tell them. You can undo this for a few
          seconds afterwards.
        </p>
      </div>
      <!-- The safest choice is always the filled, most visible button. -->
      <div class="d-grid gap-2">
        <button
          v-if="pickedOpen.length"
          type="button"
          class="btn btn-primary"
          @click="removeOpenFromSheet"
        >
          Only the {{ plural(pickedOpen.length, 'open time') }}
        </button>
        <button v-else type="button" class="btn btn-primary" @click="removeAllOpen = false">
          Keep them
        </button>
        <button type="button" class="btn btn-outline-danger" @click="confirmRemoveAll">
          Remove all {{ plural(pickedSlots.length, 'time') }}
        </button>
        <button
          v-if="pickedOpen.length"
          type="button"
          class="btn btn-outline-primary"
          @click="removeAllOpen = false"
        >
          Cancel
        </button>
      </div>
    </AdminSheet>
  </AdminLayout>
</template>

<style scoped>
.calendar-panel {
  padding: 0.75rem 0.5rem;
}

.month-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.month-name {
  flex: 1 1 auto;
  margin: 0;
  text-align: center;
  font-size: 1.15rem;
  white-space: nowrap;
  color: var(--tt-ink);
}

.month-button {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
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

.today-button {
  flex: 0 0 auto;
}

.month-button:disabled {
  border-color: var(--tt-line);
  color: #b9a2a5;
  background: transparent;
}

.month-summary {
  margin: 0 0.25rem 0.15rem;
  font-size: 0.95rem;
  text-align: center;
  font-weight: 700;
  color: var(--tt-ink);
}

.hint {
  margin: 0 0.25rem 0.4rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--tt-muted);
}

.empty-month {
  margin: 0.75rem 0.25rem 0.25rem;
  padding: 1rem;
  text-align: center;
  border: 1.5px dashed var(--tt-line);
  border-radius: var(--tt-radius);
  background: var(--tt-white);
}

.room-for-bar {
  padding-bottom: 8rem; /* the "Select days" bar covers the bottom of the screen */
}

.day-column {
  padding: 1rem;
}

.day-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.day-title {
  margin: 0;
  font-size: 1.3rem;
}

.day-title:focus {
  outline: none;
}

.col-lg-5 > * + * {
  margin-top: 1rem;
}
</style>
