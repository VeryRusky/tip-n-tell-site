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

// ---- Reading a request back (the admin's "Paste her message") ----
// The opposite of buildRequestMessage above. Keep the two in step: if the wording of the
// message changes, change the patterns below too (the tests build messages and read them back).

// '2pm' -> '14:00', '10:30am' -> '10:30', '12pm' -> '12:00'
function readTime(text) {
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?([ap]m)$/)
  if (!match) return null
  let hours = Number(match[1]) % 12
  if (match[3] === 'pm') hours += 12
  return `${String(hours).padStart(2, '0')}:${match[2] ?? '00'}`
}

// Reads a request message (as the site writes it) and returns the choices in it:
//   { dateText: 'Sat 12 Dec', time: '14:00', special, serviceId, design, addOnIds, estimate }
// design is a design number, 'own', or null. Anything not in the message is null (or []).
// `services` and `addOns` are the price list, used to turn names back into ids.
// Returns null when the text does not look like a request from the site.
// It never reads a name: the message has none.
export function parseRequestMessage(text, { services = [], addOns = [] } = {}) {
  if (typeof text !== 'string') return null
  // Instagram may turn ' into ’ and add line breaks; undo both.
  const message = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  const opening = message.match(
    /I'd like to book (\w{3} \d{1,2} \w{3}), (\d{1,2}(?::\d{2})?[ap]m)( \(specially opened slot\))?\./,
  )
  if (!opening) return null

  const result = {
    dateText: opening[1],
    time: readTime(opening[2]),
    special: Boolean(opening[3]),
    serviceId: null,
    design: null,
    addOnIds: [],
    estimate: null,
  }

  const service = message.match(/Service: (.+?)\.(?= Design:| Add-on:| Estimated|$)/)
  if (service) {
    const name = service[1].toLowerCase()
    result.serviceId = services.find((s) => s.name.toLowerCase() === name)?.id ?? null
  }

  if (message.includes('Design: my own design')) result.design = 'own'
  else {
    const design = message.match(/Design: #(\d+) /)
    if (design) result.design = Number(design[1])
  }

  const addOnList = message.match(/Add-on: (.+?)\.(?= Estimated|$)/)
  if (addOnList) {
    const names = addOnList[1].toLowerCase().split(', ')
    result.addOnIds = addOns.filter((a) => names.includes(a.name.toLowerCase())).map((a) => a.id)
  }

  const estimate = message.match(/Estimated \$(\d+(?:\.\d+)?)/)
  if (estimate) result.estimate = Number(estimate[1])

  return result
}
