import mongoose from 'mongoose'

// What she noted about a booking (all optional). Only she sees it, in the admin pages;
// the public site never returns it, and it is deleted 30 days after the appointment
// (services/bookingCleanup.js). Every value is checked by hand in services/validate.js
// before it gets here; the limits below are a second safety net.
const bookingSchema = new mongoose.Schema(
  {
    customer: { type: String, maxlength: 40 }, // name or Instagram name
    service: { type: String, maxlength: 40 }, // an id from the price list, e.g. 'extensions'
    design: { type: mongoose.Schema.Types.Mixed }, // a design number, or 'own'
    addOns: { type: [String], default: undefined }, // add-on ids
    price: { type: Number, min: 0, max: 1000 },
    note: { type: String, maxlength: 200 },
  },
  { _id: false, strict: 'throw' },
)

// One appointment time on one day, e.g. 12 Dec 2026 at 2pm.
const slotSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // '2026-12-12'
  time: { type: String, required: true, match: /^\d{2}:\d{2}$/ }, // '14:00'
  // open: customers can ask for it. pending: on hold while she talks to someone.
  // booked: taken. Only she changes this; a customer's request never does.
  status: { type: String, enum: ['open', 'pending', 'booked'], default: 'open' },
  // A specially opened slot (outside her usual days), which costs a little extra.
  special: { type: Boolean, default: false },
  // Her own notes on who is coming and what for. Only on pending or booked slots.
  booking: { type: bookingSchema, default: undefined },
})

// The same day and time can only exist once.
slotSchema.index({ date: 1, time: 1 }, { unique: true })

export const Slot = mongoose.model('Slot', slotSchema)
