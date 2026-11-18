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

// ---- Booking details ----

// The design part of a summary: '#3 Cherry bows', 'Own design', or '#12' if she has
// deleted that design since.
export function designText(design, designs = []) {
  if (design === undefined || design === null) return ''
  if (design === 'own') return 'Own design'
  const found = designs.find((d) => d.number === design)
  return found ? `#${found.number} ${found.name}` : `#${design}`
}

// One line about a booking, e.g. 'Extensions + Foreign removal · #3 Cherry bows · $45'.
// The customer is returned separately so pages can show it in bold.
// catalog: { services, addOns, designs } (services and add-ons by id, designs by number).
export function bookingSummary(booking, catalog = {}) {
  if (!booking) return { customer: '', details: '' }
  const { services = [], addOns = [], designs = [] } = catalog
  const parts = []
  const service = services.find((s) => s.id === booking.service)
  const addOnNames = (booking.addOns ?? []).map((id) => addOns.find((a) => a.id === id)?.name ?? id)
  const what = [service?.name ?? booking.service, ...addOnNames].filter(Boolean).join(' + ')
  if (what) parts.push(what)
  const design = designText(booking.design, designs)
  if (design) parts.push(design)
  if (typeof booking.price === 'number') parts.push(`$${booking.price}`)
  if (booking.note) parts.push('note')
  return { customer: booking.customer ?? '', details: parts.join(' · ') }
}
