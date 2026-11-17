import { formatShortDate, formatTime, formatPrice } from '@/utils/format'

// Builds the Instagram message from a set of choices.
// The booking store uses it for the customer's real request, and the home page's
// "Send it" scene uses it with sample choices, so both always look the same.
//
//   slot       { date: '2026-12-12', time: '14:00', special: false }
//   service    { name: 'Extensions', ... } or null
//   design     { id: 3, name: 'Cherry bows', ... } or null
//   ownDesign  true when the customer brings their own design
//   addOns     [{ name: 'Foreign removal', ... }]
//   estimate   the estimated price as a number
export function buildRequestMessage({ slot, service, design, ownDesign, addOns, estimate }) {
  if (!slot) return ''
  const special = slot.special ? ' (specially opened slot)' : ''
  const lines = [
    `Hi! I'd like to book ${formatShortDate(slot.date)}, ${formatTime(slot.time)}${special}.`,
  ]
  if (service) lines.push(`Service: ${service.name.toLowerCase()}.`)
  if (ownDesign) lines.push(`Design: my own design (I'll send a picture).`)
  else if (design) lines.push(`Design: #${design.id} ${design.name}.`)
  if (addOns.length > 0) {
    lines.push(`Add-on: ${addOns.map((a) => a.name.toLowerCase()).join(', ')}.`)
  }
  if (service) {
    lines.push(
      ownDesign
        ? `Estimated ${formatPrice(estimate)} plus your quote for the design.`
        : `Estimated ${formatPrice(estimate)}.`,
    )
  }
  return lines.join(' ')
}
