import { ref, computed, onMounted } from 'vue'
import { getOpenMonths, getSlots } from '@/services/api'
import { parseDate, toDateString } from '@/utils/format'

// Real data for the home page story: the first open month and its slots, straight from
// the API, plus one sample slot that the "Pick a time" scene selects and the "Send it"
// scene books. Nothing here is saved, and the customer's own request is not touched.
export function useStorySample() {
  const month = ref('') // '2026-12'
  const slots = ref([])

  onMounted(async () => {
    try {
      const months = await getOpenMonths()
      if (months.length === 0) return
      slots.value = await getSlots(months[0])
      month.value = months[0]
    } catch (error) {
      // The story still reads fine without the calendar data.
      console.error(error)
    }
  })

  // { '2026-12-12': [slot, slot, slot], ... }
  const slotsByDate = computed(() => {
    const groups = {}
    for (const slot of slots.value) {
      if (!groups[slot.date]) groups[slot.date] = []
      groups[slot.date].push(slot)
    }
    return groups
  })

  // The day to show as chosen: a weekend day with every time still open if there is one,
  // otherwise any day with an open time. Its first open time is the one ticked.
  const sampleSlot = computed(() => {
    const today = toDateString(new Date())
    const days = Object.keys(slotsByDate.value)
      .filter((date) => date >= today)
      .sort()
    const openTimes = (date) => slotsByDate.value[date].filter((slot) => slot.status === 'open')
    const allOpen = (date) => openTimes(date).length === slotsByDate.value[date].length
    const weekend = (date) => [0, 6].includes(parseDate(date).getDay())

    const day =
      days.find((date) => weekend(date) && allOpen(date) && openTimes(date).length >= 3) ??
      days.find((date) => openTimes(date).length > 0)
    return day ? openTimes(day)[0] : null
  })

  return { month, slotsByDate, sampleSlot }
}
