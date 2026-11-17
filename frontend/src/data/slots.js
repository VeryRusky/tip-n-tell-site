// Sample slots, laid out like her December 2026 Instagram story,
// plus a few in January 2027 so month switching can be tried.
// Only src/services/api.js reads this file.
//
// Each slot looks like:
//   { id: '2026-12-12T14:00', date: '2026-12-12', time: '14:00', status: 'open', special: false }
// status is 'open' or 'booked'. special: true means a specially opened slot (extra fee).

const usualTimes = ['10:00', '14:00', '16:00']

// Builds the slots for one day. By default all three usual times are open.
function day(date, { times = usualTimes, booked = [], special = [] } = {}) {
  return times.map((time) => ({
    id: `${date}T${time}`,
    date,
    time,
    status: booked.includes(time) ? 'booked' : 'open',
    special: special.includes(time),
  }))
}

export const sampleOpenMonths = ['2026-12', '2027-01']

export const sampleSlots = [
  // December 2026: open most Thursdays to Sundays.
  ...day('2026-12-03'),
  ...day('2026-12-04'),
  ...day('2026-12-05', { booked: ['10:00'] }),
  ...day('2026-12-06', { booked: ['14:00'] }),
  ...day('2026-12-10'),
  ...day('2026-12-11', { booked: ['10:00', '16:00'] }),
  ...day('2026-12-12'),
  ...day('2026-12-13', { booked: ['10:00', '14:00', '16:00'] }),
  ...day('2026-12-17', { booked: ['16:00'] }),
  ...day('2026-12-18'),
  ...day('2026-12-19'),
  // A Wednesday she opened specially, one slot only.
  ...day('2026-12-23', { times: ['16:00'], special: ['16:00'] }),
  ...day('2026-12-26'),
  ...day('2026-12-27', { booked: ['14:00'] }),
  // A Tuesday she opened specially.
  ...day('2026-12-29', { times: ['10:00', '14:00'], special: ['10:00', '14:00'] }),
  ...day('2026-12-31'),

  // January 2027: only a few days opened so far.
  ...day('2027-01-02'),
  ...day('2027-01-03', { booked: ['10:00'] }),
  ...day('2027-01-09'),
  ...day('2027-01-10', { times: ['10:00', '14:00'] }),
]
