import { Slot } from '../models/Slot.js'
import { todayInSingapore, addMonths } from '../services/dates.js'
import { check, isDate, isMonth, isTime, isStatus, isId } from '../services/validate.js'

// The owner's calendar. Unlike the public list, this includes past days and uses
// the database id, so a slot can be changed or removed.

// The most slots one remove or restore request may touch. A month of her usual times is
// about 93 slots. 100 restored slots are about 7 kB of JSON, which fits under the 10 kB body
// limit in app.js; the admin page splits a bigger job into several requests.
export const MAX_SLOTS_PER_REQUEST = 100

function toAdminSlot(slot) {
  return {
    id: String(slot._id),
    date: slot.date,
    time: slot.time,
    status: slot.status,
    special: slot.special,
  }
}

// Today in Singapore, and the last month she may open (12 months ahead).
function allowedRange() {
  const today = todayInSingapore()
  return { today, lastMonth: addMonths(today.slice(0, 7), 12) }
}

function isAllowedDate(date, { today, lastMonth }) {
  return date >= today && date.slice(0, 7) <= lastMonth
}

// Inserts new slots and returns the ones that went in. A slot that appeared a moment ago
// (e.g. after a double tap) is skipped instead of failing the whole request.
async function insertSkippingDuplicates(newSlots) {
  if (newSlots.length === 0) return []
  try {
    return await Slot.insertMany(newSlots, { ordered: false })
  } catch (error) {
    // 11000 = duplicate. Keep the ones that went in; anything else is a real error.
    const onlyDuplicates = error.writeErrors?.every((writeError) => writeError.code === 11000)
    if (!onlyDuplicates) throw error
    return error.insertedDocs ?? []
  }
}

// Removes from `wanted` (a Map of 'date T time' -> slot) every slot that already exists.
async function leaveOutExisting(wanted, dates) {
  const existing = await Slot.find({ date: { $in: dates } }).lean()
  for (const slot of existing) wanted.delete(`${slot.date}T${slot.time}`)
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
  const range = allowedRange()
  check(
    dates.every((date) => isAllowedDate(date, range)),
    'Days must be from today up to 12 months ahead.',
  )

  // Every date-and-time pair, without repeats.
  const uniqueDates = [...new Set(dates)]
  const uniqueTimes = [...new Set(times)]
  const wanted = new Map()
  for (const date of uniqueDates) {
    for (const time of uniqueTimes) wanted.set(`${date}T${time}`, { date, time, special })
  }

  await leaveOutExisting(wanted, uniqueDates)
  const created = await insertSkippingDuplicates([...wanted.values()])

  req.app.locals.publicCache.clear() // show the change on the public site now
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
  req.app.locals.publicCache.clear() // show the change on the public site now
  res.json(toAdminSlot(slot))
}

// DELETE /api/admin/slots/:id
export async function remove(req, res) {
  check(isId(req.params.id), 'Unknown slot.')
  const slot = await Slot.findByIdAndDelete(req.params.id)
  if (!slot) return res.status(404).json({ error: 'That slot no longer exists.' })
  req.app.locals.publicCache.clear() // show the change on the public site now
  res.status(204).end()
}

// POST /api/admin/slots/remove  body: { ids: ['<slot id>', ...] }
// Removes several slots at once ("Close this day", or the days picked in "Select days").
// Answers with the removed slots exactly as they were, so the page can offer Undo.
// An id that no longer exists is skipped, not an error (she may have removed it already).
export async function removeMany(req, res) {
  const { ids } = req.body ?? {}
  check(
    Array.isArray(ids) && ids.length >= 1 && ids.length <= MAX_SLOTS_PER_REQUEST,
    `Choose 1 to ${MAX_SLOTS_PER_REQUEST} slots.`,
  )
  check(ids.every(isId), 'Unknown slot.')

  const found = await Slot.find({ _id: { $in: ids } }).lean()
  if (found.length > 0) {
    await Slot.deleteMany({ _id: { $in: found.map((slot) => slot._id) } })
    req.app.locals.publicCache.clear() // show the change on the public site now
  }
  res.json({
    removed: found.map(toAdminSlot),
    missing: new Set(ids).size - found.length, // already gone
  })
}

// POST /api/admin/slots/restore  body: { slots: [{ date, time, status, special }, ...] }
// Puts removed slots back (the Undo button) with the same day, time, status and special.
// Like opening times: only today up to 12 months ahead, and a day and time that already has
// a slot is skipped, never overwritten. The slots get new ids.
export async function restoreMany(req, res) {
  const { slots } = req.body ?? {}
  check(
    Array.isArray(slots) && slots.length >= 1 && slots.length <= MAX_SLOTS_PER_REQUEST,
    `Choose 1 to ${MAX_SLOTS_PER_REQUEST} slots.`,
  )
  for (const slot of slots) {
    check(
      slot !== null && typeof slot === 'object' && !Array.isArray(slot),
      'Each slot must look like { date, time, status, special }.',
    )
    check(isDate(slot.date), 'Each day must look like 2026-12-03.')
    check(isTime(slot.time), 'Each time must look like 14:00.')
    check(isStatus(slot.status), 'status must be open, pending or booked.')
    check(typeof slot.special === 'boolean', 'special must be true or false.')
  }
  const range = allowedRange()
  check(
    slots.every((slot) => isAllowedDate(slot.date, range)),
    'Days must be from today up to 12 months ahead.',
  )

  // Copy only the four checked values (never the whole object), without repeats.
  const wanted = new Map()
  for (const { date, time, status, special } of slots) {
    const key = `${date}T${time}`
    if (!wanted.has(key)) wanted.set(key, { date, time, status, special })
  }

  await leaveOutExisting(wanted, [...new Set(slots.map((slot) => slot.date))])
  const created = await insertSkippingDuplicates([...wanted.values()])

  req.app.locals.publicCache.clear() // show the change on the public site now
  res.status(201).json({
    created: created.map(toAdminSlot),
    skipped: slots.length - created.length, // already there, or listed twice
  })
}
