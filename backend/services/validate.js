// Small checks for values that arrive in requests.
//
// Every check also makes sure the value is a plain string (or boolean). That matters
// for security: if someone sends an object like { "$gt": "" } instead of a date, it is
// rejected here, so it can never reach a database query and change its meaning.

// A request error: the error handler turns it into a 400 response with this message.
export class BadRequest extends Error {
  constructor(message) {
    super(message)
    this.name = 'BadRequest'
    this.status = 400
  }
}

// 'YYYY-MM-DD' and a real calendar date (no 31 February).
export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

// 'YYYY-MM', e.g. '2026-12'
export function isMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

// 'HH:mm' on the 24-hour clock, e.g. '14:00'
export function isTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export const SLOT_STATUSES = ['open', 'pending', 'booked']

export function isStatus(value) {
  return typeof value === 'string' && SLOT_STATUSES.includes(value)
}

// A MongoDB id: 24 hexadecimal characters.
export function isId(value) {
  return typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)
}

// A design name: text, 1 to 60 characters once the spaces at the ends are removed.
// Returns the tidied name, or throws BadRequest.
export function cleanName(value) {
  if (typeof value !== 'string') throw new BadRequest('Please give the design a name.')
  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 1 || name.length > 60) {
    throw new BadRequest('A design name must be 1 to 60 characters.')
  }
  return name
}

// Throws BadRequest when `ok` is false. Keeps the controllers short.
export function check(ok, message) {
  if (!ok) throw new BadRequest(message)
}

// ---- Booking details (the owner's own notes on a booked or on-hold slot) ----

// An id from the frontend's price list, e.g. 'extensions' or 'foreign-removal':
// lower-case letters and numbers joined by single dashes, at most 40 characters.
export function isCatalogueId(value) {
  return typeof value === 'string' && value.length <= 40 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
}

// Text she typed: spaces at the ends removed, runs of spaces (and new lines) made single.
// Empty text counts as "not filled in". Returns the tidied text, or undefined.
function cleanText(value, maxLength, message) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new BadRequest(message)
  const text = value.trim().replace(/\s+/g, ' ')
  if (text.length === 0) return undefined
  if (text.length > maxLength) throw new BadRequest(message)
  return text
}

const BOOKING_FIELDS = ['customer', 'service', 'design', 'addOns', 'price', 'note']

// Checks booking details field by field and returns a NEW object with only the known
// fields that were filled in, or null when nothing was filled in.
// Throws BadRequest for anything else (an unknown field, a wrong type, too long...).
//   customer  her customer's name or Instagram name, 1 to 40 characters
//   service   a service id, e.g. 'extensions'
//   design    a design number (1 to 9999) or 'own' (the customer's own design)
//   addOns    up to 5 add-on ids
//   price     a number from 0 to 1000
//   note      up to 200 characters
export function cleanBooking(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequest('Booking details must be an object, or null to clear them.')
  }
  for (const key of Object.keys(value)) {
    check(BOOKING_FIELDS.includes(key), 'Booking details have an unknown field.')
  }

  const booking = {}
  const customer = cleanText(value.customer, 40, 'The name must be 1 to 40 characters.')
  if (customer) booking.customer = customer

  if (value.service !== undefined && value.service !== null) {
    check(isCatalogueId(value.service), 'Unknown service.')
    booking.service = value.service
  }

  if (value.design !== undefined && value.design !== null) {
    const design = value.design
    check(
      design === 'own' || (Number.isInteger(design) && design >= 1 && design <= 9999),
      'The design must be a design number or "own".',
    )
    booking.design = design
  }

  if (value.addOns !== undefined && value.addOns !== null) {
    check(Array.isArray(value.addOns) && value.addOns.length <= 5, 'Choose at most 5 add-ons.')
    check(value.addOns.every(isCatalogueId), 'Unknown add-on.')
    if (value.addOns.length > 0) booking.addOns = [...new Set(value.addOns)]
  }

  if (value.price !== undefined && value.price !== null) {
    const price = value.price
    check(
      typeof price === 'number' && Number.isFinite(price) && price >= 0 && price <= 1000,
      'The price must be a number from 0 to 1000.',
    )
    booking.price = Math.round(price * 100) / 100 // whole cents
  }

  const note = cleanText(value.note, 200, 'The note can be at most 200 characters.')
  if (note) booking.note = note

  return Object.keys(booking).length > 0 ? booking : null
}
