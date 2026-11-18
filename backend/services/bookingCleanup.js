import { Slot } from '../models/Slot.js'
import { todayInSingapore, addDays } from './dates.js'

// Booking details (a customer's name, what they booked) are personal data, so they are not
// kept forever: they are removed from every slot dated more than `keepDays` days ago
// (BOOKING_DETAILS_KEEP_DAYS, 30 by default). The slot itself stays, so her past calendar
// still shows which times were booked.
//
// Returns how many slots were cleaned. Nothing about the details is ever logged.
export async function clearOldBookingDetails(keepDays, now = new Date()) {
  const oldestKept = addDays(todayInSingapore(now), -keepDays)
  const result = await Slot.updateMany(
    { date: { $lt: oldestKept }, booking: { $exists: true } },
    { $unset: { booking: 1 } },
  )
  return result.modifiedCount
}

const ONE_DAY = 24 * 60 * 60 * 1000 // milliseconds

// Runs the clean-up now (when the server starts) and then once a day while it runs.
// Returns a function that stops the daily run (used by tests).
export function startBookingCleanup(keepDays) {
  async function run() {
    try {
      const cleaned = await clearOldBookingDetails(keepDays)
      if (cleaned > 0) {
        console.log(`[privacy] Removed booking details from ${cleaned} past slot(s).`)
      }
    } catch (error) {
      console.error(`[privacy] Booking clean-up failed: ${error.name}`)
    }
  }
  run()
  const timer = setInterval(run, ONE_DAY)
  timer.unref() // never keeps the process alive on its own
  return () => clearInterval(timer)
}
