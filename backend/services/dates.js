// Dates for "today" are always worked out in Singapore time, whatever time zone
// the server itself runs in (hosting companies usually use UTC).

const singaporeDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Today's date in Singapore, as 'YYYY-MM-DD'. ('en-CA' writes dates in that order.)
export function todayInSingapore(now = new Date()) {
  return singaporeDate.format(now)
}

// '2026-12' plus a number of months, e.g. addMonths('2026-12', 1) -> '2027-01'.
export function addMonths(month, count) {
  const [year, monthNumber] = month.split('-').map(Number)
  const total = year * 12 + (monthNumber - 1) + count
  const newYear = Math.floor(total / 12)
  const newMonth = (total % 12) + 1
  return `${newYear}-${String(newMonth).padStart(2, '0')}`
}
