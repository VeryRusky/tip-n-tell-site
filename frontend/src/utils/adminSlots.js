// Small helpers for the owner's calendar: status names and counting words.

// What she sees for each status. (The database says 'pending'; she says "On hold".)
export const statusNames = { open: 'Open', pending: 'On hold', booked: 'Booked' }

// [slots] -> { open: 3, pending: 1, booked: 2 }
export function countByStatus(slots) {
  const counts = { open: 0, pending: 0, booked: 0 }
  for (const slot of slots) counts[slot.status] += 1
  return counts
}

// (1, 'time') -> '1 time', (3, 'time') -> '3 times'
export function plural(count, word) {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

// { pending: 1, booked: 2 } -> '2 booked and 1 on hold' (only the ones that are not 0)
export function takenWords({ pending = 0, booked = 0 }) {
  const parts = []
  if (booked) parts.push(`${booked} booked`)
  if (pending) parts.push(`${pending} on hold`)
  return parts.join(' and ')
}

// Sorts slots by day, then time.
export function bySlotTime(a, b) {
  return (a.date + a.time).localeCompare(b.date + b.time)
}
