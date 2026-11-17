import { Slot } from '../models/Slot.js'
import { todayInSingapore, addMonths } from '../services/dates.js'
import { check, isDate, isMonth, isTime, isStatus, isId } from '../services/validate.js'

// The owner's calendar. Unlike the public list, this includes past days and uses
// the database id, so a slot can be changed or removed.

function toAdminSlot(slot) {
  return {
    id: String(slot._id),
    date: slot.date,
    time: slot.time,
    status: slot.status,
    special: slot.special,
  }
}

// GET /api/admin/slots?month=2026-12
export async function listMonth(req, res) {
  const month = req.query.month
  check(isMonth(month), 'month must look like 2026-12.')
  const slots = await Slot.find({
    date: { $gte: `${month}-01`, $lt: `${addMonths(month, 1)}-01` },
  })
    .sort({ date: 1, time: 1 })
    .lean()
  res.json(slots.map(toAdminSlot))
}

// POST /api/admin/slots  body: { dates: ['2026-12-03', ...], times: ['10:00', ...], special: false }
// Opens every time on every date. Ones that already exist are skipped, not changed.
export async function createMany(req, res) {
  const { dates, times, special = false } = req.body ?? {}
  check(Array.isArray(dates) && dates.length >= 1 && dates.length <= 62, 'Choose 1 to 62 days.')
  check(Array.isArray(times) && times.length >= 1 && times.length <= 12, 'Choose 1 to 12 times.')
  check(dates.every(isDate), 'Each day must look like 2026-12-03.')
  check(times.every(isTime), 'Each time must look like 14:00.')
  check(typeof special === 'boolean', 'special must be true or false.')

  // Only today up to 12 months ahead.
  const today = todayInSingapore()
  const lastMonth = addMonths(today.slice(0, 7), 12)
  check(
    dates.every((date) => date >= today && date.slice(0, 7) <= lastMonth),
    'Days must be from today up to 12 months ahead.',
  )

  // Every date-and-time pair, without repeats.
  const uniqueDates = [...new Set(dates)]
  const uniqueTimes = [...new Set(times)]
  const wanted = new Map()
  for (const date of uniqueDates) {
    for (const time of uniqueTimes) wanted.set(`${date}T${time}`, { date, time, special })
  }

  // Leave out the ones that already exist.
  const existing = await Slot.find({ date: { $in: uniqueDates } }).lean()
  for (const slot of existing) wanted.delete(`${slot.date}T${slot.time}`)

  let created = []
  if (wanted.size > 0) {
    try {
      created = await Slot.insertMany([...wanted.values()], { ordered: false })
    } catch (error) {
      // 11000 = duplicate: the same slot was added a moment ago (e.g. a double tap).
      // Keep the ones that went in; anything else is a real error.
      const onlyDuplicates = error.writeErrors?.every((writeError) => writeError.code === 11000)
      if (!onlyDuplicates) throw error
      created = error.insertedDocs ?? []
    }
  }

  res.status(201).json({
    created: created.map(toAdminSlot),
    skipped: uniqueDates.length * uniqueTimes.length - created.length, // already there
  })
}

// PATCH /api/admin/slots/:id  body: { status?: 'open' | 'pending' | 'booked', special?: true | false }
export async function update(req, res) {
  check(isId(req.params.id), 'Unknown slot.')
  const { status, special } = req.body ?? {}
  const changes = {}
  if (status !== undefined) {
    check(isStatus(status), 'status must be open, pending or booked.')
    changes.status = status
  }
  if (special !== undefined) {
    check(typeof special === 'boolean', 'special must be true or false.')
    changes.special = special
  }
  check(Object.keys(changes).length > 0, 'Nothing to change.')

  const slot = await Slot.findByIdAndUpdate(
    req.params.id,
    { $set: changes },
    { returnDocument: 'after' },
  ).lean()
  if (!slot) return res.status(404).json({ error: 'That slot no longer exists.' })
  res.json(toAdminSlot(slot))
}

// DELETE /api/admin/slots/:id
export async function remove(req, res) {
  check(isId(req.params.id), 'Unknown slot.')
  const slot = await Slot.findByIdAndDelete(req.params.id)
  if (!slot) return res.status(404).json({ error: 'That slot no longer exists.' })
  res.status(204).end()
}
