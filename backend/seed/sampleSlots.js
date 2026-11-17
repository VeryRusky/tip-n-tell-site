// Copied from frontend/src/data/slots.js (the sample calendar), for seeding the database.
// pnpm seed puts these in an empty database. Edit freely; nothing else reads this file.

const usualTimes = ['10:00', '14:00', '16:00']

// Builds the slots for one day. By default all three usual times are open.
function day(date, { times = usualTimes, booked = [], special = [] } = {}) {
  return times.map((time) => ({
    date,
    time,
    status: booked.includes(time) ? 'booked' : 'open',
    special: special.includes(time),
  }))
}

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
