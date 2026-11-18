import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Slot } from '../models/Slot.js'
import { loadConfig } from '../config.js'
import { clearOldBookingDetails } from '../services/bookingCleanup.js'
import {
  ORIGIN,
  TEST_ENV,
  startDatabase,
  stopDatabase,
  buildApp,
  signedInAgent,
  dateFromToday,
} from './helpers.js'

// Booking details: her own notes on who is coming and what for. Admin only, never public,
// and deleted 30 days after the appointment.

let app
let agent

beforeAll(async () => {
  await startDatabase()
  app = (await buildApp()).app
  agent = await signedInAgent(app)
})

afterAll(stopDatabase)

beforeEach(async () => {
  await Slot.deleteMany({})
  app.locals.publicCache.clear() // these tests change the database directly
})

const FULL = {
  customer: 'Mei',
  service: 'extensions',
  design: 3,
  addOns: ['foreign-removal'],
  price: 45,
  note: 'Pink instead of red',
}

function patch(slot, body) {
  return agent.patch(`/api/admin/slots/${slot._id}`).set('Origin', ORIGIN).send(body)
}

function bookedSlot(changes = {}) {
  return Slot.create({ date: dateFromToday(3), time: '14:00', status: 'booked', ...changes })
}

// The public answer for the month of `date`.
async function publicMonth(date) {
  return (await request(app).get(`/api/slots?month=${date.slice(0, 7)}`)).body
}

describe('booking details', () => {
  it('saves every field on a booked slot, tidied, and shows them in the admin month', async () => {
    const slot = await bookedSlot()

    const response = await patch(slot, {
      booking: { ...FULL, customer: '  Mei   Tan ', note: ' Pink\n instead  of red ' },
    })

    expect(response.status).toBe(200)
    const expected = { ...FULL, customer: 'Mei Tan', note: 'Pink instead of red' }
    expect(response.body.booking).toEqual(expected)
    const month = await agent.get(`/api/admin/slots?month=${slot.date.slice(0, 7)}`)
    expect(month.body[0].booking).toEqual(expected)
  })

  it('accepts only some fields, and "own" as the design', async () => {
    const slot = await bookedSlot({ status: 'pending' })

    const response = await patch(slot, { booking: { customer: '@mei.nails', design: 'own' } })

    expect(response.body.booking).toEqual({ customer: '@mei.nails', design: 'own' })
  })

  it.each([
    ['a name over 40 characters', { customer: 'x'.repeat(41) }],
    ['a name that is not text', { customer: 42 }],
    ['a service id with capitals', { service: 'Extensions' }],
    ['a service id with spaces', { service: 'gel extensions' }],
    ['a query operator as the service', { service: { $ne: '' } }],
    ['a design number of 0', { design: 0 }],
    ['a design number as text', { design: '3' }],
    ['a design that is a word other than own', { design: 'mine' }],
    ['a design number with a fraction', { design: 3.5 }],
    ['add-ons that are not a list', { addOns: 'foreign-removal' }],
    ['more than 5 add-ons', { addOns: ['a', 'b', 'c', 'd', 'e', 'f'] }],
    ['an add-on id with symbols', { addOns: ['foreign_removal!'] }],
    ['a negative price', { price: -1 }],
    ['a price over 1000', { price: 1001 }],
    ['a price as text', { price: '45' }],
    ['a note over 200 characters', { note: 'x'.repeat(201) }],
    ['an unknown field such as a phone number', { phone: '91234567' }],
    ['details that are a list', ['Mei']],
    ['details that are text', 'Mei'],
  ])('rejects %s (400) and stores nothing', async (label, booking) => {
    const slot = await bookedSlot()

    const response = await patch(slot, { booking })

    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
    expect((await Slot.findById(slot._id).lean()).booking).toBeUndefined()
  })

  it('refuses details on an open slot', async () => {
    const slot = await bookedSlot({ status: 'open' })

    const response = await patch(slot, { booking: { customer: 'Mei' } })

    expect(response.status).toBe(400)
    expect((await Slot.findById(slot._id).lean()).booking).toBeUndefined()
  })

  it('refuses details sent together with a change to open', async () => {
    const slot = await bookedSlot()

    const response = await patch(slot, { status: 'open', booking: { customer: 'Mei' } })

    expect(response.status).toBe(400)
    expect((await Slot.findById(slot._id).lean()).status).toBe('booked')
  })

  it('clears the details when the slot is re-opened, and Undo can send them back', async () => {
    const slot = await bookedSlot({ booking: FULL })

    const reopened = await patch(slot, { status: 'open' })
    expect(reopened.body.booking).toBeUndefined()
    expect((await Slot.findById(slot._id).lean()).booking).toBeUndefined()

    const undone = await patch(slot, { status: 'booked', booking: FULL })
    expect(undone.body).toMatchObject({ status: 'booked', booking: FULL })
  })

  it('clears the details with null or with nothing filled in', async () => {
    const slot = await bookedSlot({ booking: FULL })
    await patch(slot, { booking: null }).expect(200)
    expect((await Slot.findById(slot._id).lean()).booking).toBeUndefined()

    await Slot.updateOne({ _id: slot._id }, { booking: FULL })
    await patch(slot, { booking: { customer: '   ', note: '' } }).expect(200)
    expect((await Slot.findById(slot._id).lean()).booking).toBeUndefined()
  })

  it('keeps the details when only the status changes between on hold and booked', async () => {
    const slot = await bookedSlot({ status: 'pending', booking: FULL })

    const response = await patch(slot, { status: 'booked' })

    expect(response.body.booking).toEqual(FULL)
  })

  it('needs the owner to be signed in', async () => {
    const slot = await bookedSlot()

    const response = await request(app)
      .patch(`/api/admin/slots/${slot._id}`)
      .set('Origin', ORIGIN)
      .send({ booking: { customer: 'Mei' } })

    expect(response.status).toBe(401)
    expect((await Slot.findById(slot._id).lean()).booking).toBeUndefined()
  })

  it('never shows any of it on the public slots, even right after she saves', async () => {
    const slot = await bookedSlot()
    await publicMonth(slot.date) // the answer is now remembered for a minute

    await patch(slot, { booking: FULL }).expect(200)
    const slots = await publicMonth(slot.date)

    expect(slots).toEqual([
      {
        id: `${slot.date}T14:00`,
        date: slot.date,
        time: '14:00',
        status: 'booked',
        special: false,
      },
    ])
    const text = JSON.stringify(slots)
    for (const value of ['Mei', 'extensions', 'foreign-removal', 'Pink', 'booking', '45']) {
      expect(text).not.toContain(value)
    }
  })

  it('brings the details back when removed slots are restored (Undo)', async () => {
    const slot = await bookedSlot({ booking: FULL })

    const removed = await agent
      .post('/api/admin/slots/remove')
      .set('Origin', ORIGIN)
      .send({ ids: [String(slot._id)] })
    expect(removed.body.removed[0].booking).toEqual(FULL)

    const restored = await agent
      .post('/api/admin/slots/restore')
      .set('Origin', ORIGIN)
      .send({ slots: removed.body.removed })
    expect(restored.status).toBe(201)
    expect(restored.body.created[0]).toMatchObject({ status: 'booked', booking: FULL })
    expect((await Slot.findOne().lean()).booking).toEqual(FULL)
  })

  it('checks restored details like any others, and refuses them on an open slot', async () => {
    const base = { date: dateFromToday(4), time: '10:00', special: false }
    const send = (slot) =>
      agent
        .post('/api/admin/slots/restore')
        .set('Origin', ORIGIN)
        .send({ slots: [slot] })

    expect((await send({ ...base, status: 'open', booking: { customer: 'Mei' } })).status).toBe(400)
    expect((await send({ ...base, status: 'booked', booking: { phone: '9123' } })).status).toBe(400)
    expect(await Slot.countDocuments()).toBe(0)
  })
})

describe('deleting old booking details', () => {
  it('removes details from slots more than 30 days ago and keeps the rest', async () => {
    await Slot.create([
      { date: dateFromToday(-31), time: '10:00', status: 'booked', booking: FULL },
      { date: dateFromToday(-30), time: '10:00', status: 'booked', booking: FULL },
      { date: dateFromToday(2), time: '10:00', status: 'booked', booking: FULL },
      { date: dateFromToday(-40), time: '14:00', status: 'booked' },
    ])

    const cleaned = await clearOldBookingDetails(30)

    expect(cleaned).toBe(1)
    const slots = await Slot.find().sort({ date: 1, time: 1 }).lean()
    expect(slots.map((slot) => [slot.date, slot.booking ? 'details' : 'none'])).toEqual([
      [dateFromToday(-40), 'none'],
      [dateFromToday(-31), 'none'],
      [dateFromToday(-30), 'details'],
      [dateFromToday(2), 'details'],
    ])
    // The slot itself stays, still booked.
    expect(slots[1].status).toBe('booked')
  })

  it('keeps 30 days unless BOOKING_DETAILS_KEEP_DAYS says otherwise', () => {
    expect(loadConfig(TEST_ENV).bookingKeepDays).toBe(30)
    expect(loadConfig({ ...TEST_ENV, BOOKING_DETAILS_KEEP_DAYS: '14' }).bookingKeepDays).toBe(14)
  })

  it.each([['0'], ['400'], ['thirty'], ['7.5']])(
    'refuses to start with BOOKING_DETAILS_KEEP_DAYS=%s',
    (value) => {
      expect(() => loadConfig({ ...TEST_ENV, BOOKING_DETAILS_KEEP_DAYS: value })).toThrow(
        /BOOKING_DETAILS_KEEP_DAYS/,
      )
    },
  )
})
