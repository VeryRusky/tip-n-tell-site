import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getOpenMonths, getSlots } from '@/services/api'

// The month calendar: which months exist, which month is showing, its slots,
// and which day the customer tapped.
export const useSlotsStore = defineStore('slots', () => {
  const months = ref([])
  const currentMonth = ref('')
  const slots = ref([])
  const selectedDate = ref('')
  const loading = ref(false)
  const error = ref(null)
  const monthsLoaded = ref(false)

  // True when there are no open months at all (she has not opened any dates yet).
  const noOpenMonths = computed(() => monthsLoaded.value && months.value.length === 0)

  // { '2026-12-12': [slot, slot, slot], ... } for the month that is showing.
  const slotsByDate = computed(() => {
    const groups = {}
    for (const slot of slots.value) {
      if (!groups[slot.date]) groups[slot.date] = []
      groups[slot.date].push(slot)
    }
    return groups
  })

  const monthIndex = computed(() => months.value.indexOf(currentMonth.value))
  const hasPreviousMonth = computed(() => monthIndex.value > 0)
  const hasNextMonth = computed(() => monthIndex.value < months.value.length - 1)

  // First visit: find the open months, then show `startMonth` if given, else the first one.
  async function init(startMonth) {
    error.value = null
    try {
      if (!monthsLoaded.value) {
        loading.value = true
        months.value = await getOpenMonths()
        monthsLoaded.value = true
      }
      if (months.value.length === 0) {
        loading.value = false
        return
      }
      const month = months.value.includes(startMonth)
        ? startMonth
        : currentMonth.value || months.value[0]
      await showMonth(month)
    } catch (e) {
      error.value = 'Slots could not be loaded. Please refresh the page.'
      loading.value = false
      console.error(e)
    }
  }

  async function showMonth(month) {
    if (!month) return
    if (month !== currentMonth.value) selectedDate.value = ''
    currentMonth.value = month
    loading.value = true
    error.value = null
    try {
      slots.value = await getSlots(month)
    } catch (e) {
      error.value = 'Slots could not be loaded. Please refresh the page.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  function previousMonth() {
    if (hasPreviousMonth.value) showMonth(months.value[monthIndex.value - 1])
  }

  function nextMonth() {
    if (hasNextMonth.value) showMonth(months.value[monthIndex.value + 1])
  }

  function selectDate(date) {
    selectedDate.value = date
  }

  return {
    months,
    currentMonth,
    slots,
    selectedDate,
    loading,
    error,
    noOpenMonths,
    slotsByDate,
    hasPreviousMonth,
    hasNextMonth,
    init,
    showMonth,
    previousMonth,
    nextMonth,
    selectDate,
  }
})
