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

// '2026-12-12' plus a number of days (negative = earlier), e.g. addDays('2026-12-30', 3)
// -> '2027-01-02'. Works on the calendar date only, so time zones do not matter.
export function addDays(date, count) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10)
}
