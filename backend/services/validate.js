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
