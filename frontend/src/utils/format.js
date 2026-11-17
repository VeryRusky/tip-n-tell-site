// Small helpers for showing dates, times and prices the same way everywhere.

const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const weekdaysLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const monthsShort = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const monthsLong = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// '2026-12-12' -> a Date at local midnight.
// (new Date('2026-12-12') would read it as UTC and can land on the wrong day.)
export function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Date -> '2026-12-12'
export function toDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// '2026-12-12' -> 'Sat 12 Dec'
export function formatShortDate(dateString) {
  const date = parseDate(dateString)
  return `${weekdaysShort[date.getDay()]} ${date.getDate()} ${monthsShort[date.getMonth()]}`
}

// '2026-12-12' -> 'Saturday 12 December'
export function formatLongDate(dateString) {
  const date = parseDate(dateString)
  return `${weekdaysLong[date.getDay()]} ${date.getDate()} ${monthsLong[date.getMonth()]}`
}

// '2026-12' -> 'December 2026'
export function formatMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  return `${monthsLong[monthNumber - 1]} ${year}`
}

// '14:00' -> '2pm', '10:30' -> '10:30am'
export function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const suffix = hours < 12 ? 'am' : 'pm'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return minutes === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`
}

// 35 -> '$35'
export function formatPrice(amount) {
  return `$${amount}`
}
