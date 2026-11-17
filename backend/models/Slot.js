import mongoose from 'mongoose'

// One appointment time on one day, e.g. 12 Dec 2026 at 2pm.
// On purpose there is nothing about the customer here: no name, phone or notes.
const slotSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // '2026-12-12'
  time: { type: String, required: true, match: /^\d{2}:\d{2}$/ }, // '14:00'
  // open: customers can ask for it. pending: on hold while she talks to someone.
  // booked: taken. Only she changes this; a customer's request never does.
  status: { type: String, enum: ['open', 'pending', 'booked'], default: 'open' },
  // A specially opened slot (outside her usual days), which costs a little extra.
  special: { type: Boolean, default: false },
})

// The same day and time can only exist once.
slotSchema.index({ date: 1, time: 1 }, { unique: true })

export const Slot = mongoose.model('Slot', slotSchema)
