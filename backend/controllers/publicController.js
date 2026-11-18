import { Slot } from '../models/Slot.js'
import { Design } from '../models/Design.js'
import { todayInSingapore, addMonths } from '../services/dates.js'
import { check, isMonth } from '../services/validate.js'

// Answers for the public site. Customers only ever see today and later.
// The three lists are kept for 60 seconds in req.app.locals.publicCache (services/publicCache.js),
// so a busy minute costs one database read. Admin changes clear it straight away.

// GET /api/health -> { ok: true }. Hosts and uptime checkers call this.
export function health(req, res) {
  res.json({ ok: true })
}

// GET /api/slots/months -> ['2026-12', '2027-01']
// Months that have at least one slot dated today or later.
export async function listOpenMonths(req, res) {
  const today = todayInSingapore()
  const months = await req.app.locals.publicCache.get(`months:${today}`, async () => {
    const dates = await Slot.distinct('date', { date: { $gte: today } })
    return [...new Set(dates.map((date) => date.slice(0, 7)))].sort()
  })
  res.json(months)
}

// The shape the frontend uses for a slot.
function toPublicSlot(slot) {
  return {
    id: `${slot.date}T${slot.time}`,
    date: slot.date,
    time: slot.time,
    status: slot.status,
    special: slot.special,
  }
}

// GET /api/slots?month=2026-12 -> slots in that month, from today on.
export async function listSlots(req, res) {
  const month = req.query.month
  check(isMonth(month), 'month must look like 2026-12.')

  const today = todayInSingapore()
  const monthStart = `${month}-01`
  const nextMonthStart = `${addMonths(month, 1)}-01`
  const from = monthStart > today ? monthStart : today

  // The key includes today, so past days drop out right after midnight.
  const slots = await req.app.locals.publicCache.get(`slots:${month}:${today}`, async () => {
    const found = await Slot.find({ date: { $gte: from, $lt: nextMonthStart } })
      .sort({ date: 1, time: 1 })
      .lean()
    return found.map(toPublicSlot)
  })
  res.json(slots)
}

// GET /api/designs -> visible designs in her chosen order.
// `id` is the design's public number, the one customers quote.
export async function listDesigns(req, res) {
  const designs = await req.app.locals.publicCache.get('designs', async () => {
    const found = await Design.find({ hidden: false }).sort({ order: 1, number: 1 }).lean()
    return found.map((design) => ({
      id: design.number,
      name: design.name,
      image: design.image?.url ?? null,
      colors: design.colors,
    }))
  })
  res.json(designs)
}
