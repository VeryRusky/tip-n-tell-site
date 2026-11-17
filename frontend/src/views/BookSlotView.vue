<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSlotsStore } from '@/stores/slots'
import { useBookingStore } from '@/stores/booking'
import { useCatalogStore } from '@/stores/catalog'
import { formatShortDate, formatTime } from '@/utils/format'
import { useSlowNotice } from '@/composables/useSlowNotice'
import BookingLayout from '@/components/BookingLayout.vue'
import MonthCalendar from '@/components/MonthCalendar.vue'
import DaySlots from '@/components/DaySlots.vue'
import MidSessionNote from '@/components/MidSessionNote.vue'
import RequestSummary from '@/components/RequestSummary.vue'
import RequestTicket from '@/components/RequestTicket.vue'

const router = useRouter()
const slotsStore = useSlotsStore()
const booking = useBookingStore()
const catalog = useCatalogStore()

const dayPanel = ref(null)
const takenNotice = ref('')
// After 4 seconds of loading, explain the wait (the live server may be waking up).
const slow = useSlowNotice(() => slotsStore.loading)

onMounted(() => {
  catalog.load()
  // Coming back to this step? Start on the month of the chosen slot.
  slotsStore.init(booking.slot?.date.slice(0, 7))
})

// Runs each time a month's slots arrive.
watch(
  () => slotsStore.slots,
  (slots) => {
    if (!booking.slot) return
    const latest = slots.find((slot) => slot.id === booking.slot.id)
    if (!latest) return
    if (latest.status !== 'open') {
      // The saved choice was booked or put on hold for someone else: drop it and say so.
      const what = latest.status === 'pending' ? 'is now on hold' : 'has just been booked'
      takenNotice.value = `Sorry, ${formatShortDate(latest.date)} at ${formatTime(latest.time)} ${what}. Please choose another time.`
      booking.clearSlot()
    } else if (!slotsStore.selectedDate) {
      // Re-open the day of the chosen slot, so the customer sees their choice.
      slotsStore.selectDate(latest.date)
    }
  },
)

const daySlots = computed(() => slotsStore.slotsByDate[slotsStore.selectedDate] ?? [])

const showMidSessionNote = computed(
  () => booking.isMidSession && booking.slot?.date === slotsStore.selectedDate,
)

async function selectDay(date) {
  slotsStore.selectDate(date)
  await nextTick()
  // On a phone the times appear below the calendar, so bring them into view.
  const panel = dayPanel.value
  if (!panel) return
  const bottom = panel.getBoundingClientRect().bottom
  if (bottom > window.innerHeight - 140) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }
  panel.focus({ preventScroll: true })
}

function chooseSlot(slot) {
  takenNotice.value = ''
  booking.chooseSlot(slot)
}

function goNext() {
  router.push({ name: 'book-service' })
}
</script>

<template>
  <BookingLayout :step="1" title="Pick a time" :back-to="{ name: 'home' }" back-label="Home">
    <p class="muted">Tap a day with dots to see its open times.</p>

    <p v-if="takenNotice" class="notice" role="alert">{{ takenNotice }}</p>
    <p v-if="slotsStore.error" class="notice" role="alert">{{ slotsStore.error }}</p>

    <!-- From md up the chosen day's times sit beside the calendar; on phones, below it. -->
    <div class="row g-4">
      <div class="col-md-7">
        <div class="panel calendar-panel">
          <p v-if="slotsStore.noOpenMonths" class="mb-0">
            No open times right now. Please check back soon, or message me on Instagram.
          </p>
          <p v-else-if="!slotsStore.currentMonth" role="status" class="mb-0">Loading open slots…</p>
          <MonthCalendar
            v-else
            :month="slotsStore.currentMonth"
            :slots-by-date="slotsStore.slotsByDate"
            :selected-date="slotsStore.selectedDate"
            :has-previous="slotsStore.hasPreviousMonth"
            :has-next="slotsStore.hasNextMonth"
            :loading="slotsStore.loading"
            @select-day="selectDay"
            @previous="slotsStore.previousMonth()"
            @next="slotsStore.nextMonth()"
          />
          <p v-if="slow && slotsStore.loading" class="small-print mt-2 mb-0" role="status">
            Waking up the calendar, one moment…
          </p>
        </div>
      </div>

      <div class="col-md-5">
        <section
          v-if="slotsStore.selectedDate && daySlots.length"
          ref="dayPanel"
          class="day-panel"
          tabindex="-1"
          aria-label="Times for the chosen day"
        >
          <DaySlots
            :date="slotsStore.selectedDate"
            :slots="daySlots"
            :selected-slot-id="booking.slot?.id ?? ''"
            @choose="chooseSlot"
          />
          <MidSessionNote v-if="showMidSessionNote" />
        </section>
        <!-- Empty state for wider screens, where this column is visible beside the calendar. -->
        <p v-else class="no-day d-none d-md-flex">Choose a day on the calendar to see its times.</p>
      </div>
    </div>

    <template #card><RequestTicket /></template>
    <!-- Phones: a one-line summary in the bottom bar (laptops have the ticket instead). -->
    <template #summary>
      <RequestSummary v-if="booking.slot" class="d-lg-none" />
      <p v-else class="small-print mb-0 d-lg-none">Choose a day, then a time, to continue.</p>
    </template>
    <template #actions>
      <button
        type="button"
        class="btn btn-primary btn-lg"
        :disabled="!booking.slot"
        @click="goNext"
      >
        Next: service <span aria-hidden="true">›</span>
      </button>
    </template>
  </BookingLayout>
</template>

<style scoped>
.calendar-panel {
  padding: 0.75rem 0.5rem;
}

.day-panel {
  /* Leave room for the sticky header when scrolled into view. */
  scroll-margin-top: 5rem;
}

.no-day {
  height: 100%;
  min-height: 8rem;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem;
  border: 1.5px dashed var(--tt-line);
  border-radius: var(--tt-radius);
  color: var(--tt-muted);
}

/* Focus is moved here for screen readers after tapping a day; no outline needed. */
.day-panel:focus {
  outline: none;
}

.notice {
  padding: 0.75rem 1rem;
  border-radius: var(--tt-radius-small);
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-left: 4px solid var(--tt-deep-rose);
  font-weight: 700;
}
</style>
