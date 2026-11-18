import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Slot } from '../models/Slot.js'
import {
  ORIGIN,
  startDatabase,
  stopDatabase,
  buildApp,
  signedInAgent,
  dateFromToday,
} from './helpers.js'

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

// Opens slots as the signed-in owner.
function openSlots(body) {
  return agent.post('/api/admin/slots').set('Origin', ORIGIN).send(body)
}

describe('slots', () => {
  it('opens several days and times at once, skipping ones that already exist', async () => {
    const days = [dateFromToday(3), dateFromToday(4)]
    const first = await openSlots({ dates: [days[0]], times: ['10:00'] })
    expect(first.status).toBe(201)

    const second = await openSlots({ dates: days, times: ['10:00', '14:00', '16:00'] })
    expect(second.status).toBe(201)
    expect(second.body.created).toHaveLength(5)
    expect(second.body.skipped).toBe(1)
    expect(await Slot.countDocuments()).toBe(6)
  })

  it('never stores the same day and time twice', async () => {
    const day = dateFromToday(5)
    await Slot.create({ date: day, time: '10:00' })
    await expect(Slot.create({ date: day, time: '10:00' })).rejects.toThrow(/duplicate/i)
  })

  it.each([
    ['a date in the wrong format', { dates: ['12/12/2026'], times: ['10:00'] }],
    ['an impossible date', { dates: ['2026-02-31'], times: ['10:00'] }],
    ['a time in the wrong format', { dates: ['2099-01-01'], times: ['2pm'] }],
    ['a time that does not exist', { dates: ['2099-01-01'], times: ['25:00'] }],
    ['a query operator instead of a date', { dates: [{ $gt: '' }], times: ['10:00'] }],
    ['dates that are not a list', { dates: '2099-01-01', times: ['10:00'] }],
    ['an empty list of times', { dates: ['2099-01-01'], times: [] }],
    [
      'special that is not true or false',
      { dates: ['2099-01-01'], times: ['10:00'], special: 'yes' },
    ],
  ])('rejects %s with 400', async (label, body) => {
    const response = await openSlots(body)
    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
    expect(await Slot.countDocuments()).toBe(0)
  })

  it('rejects days in the past and more than 12 months ahead', async () => {
    expect((await openSlots({ dates: [dateFromToday(-1)], times: ['10:00'] })).status).toBe(400)
    expect((await openSlots({ dates: [dateFromToday(400)], times: ['10:00'] })).status).toBe(400)
  })

  it('changes a slot to on hold, booked and special', async () => {
    const slot = await Slot.create({ date: dateFromToday(2), time: '14:00' })
    const path = `/api/admin/slots/${slot._id}`

    const held = await agent.patch(path).set('Origin', ORIGIN).send({ status: 'pending' })
    expect(held.body).toMatchObject({ status: 'pending', special: false })

    const booked = await agent
      .patch(path)
      .set('Origin', ORIGIN)
      .send({ status: 'booked', special: true })
    expect(booked.body).toMatchObject({ status: 'booked', special: true })
  })

  it.each([
    ['an unknown status', { status: 'cancelled' }],
    ['a query operator as the status', { status: { $ne: 'open' } }],
    ['nothing to change', {}],
  ])('rejects %s when changing a slot', async (label, body) => {
    const slot = await Slot.create({ date: dateFromToday(2), time: '14:00' })
    const response = await agent
      .patch(`/api/admin/slots/${slot._id}`)
      .set('Origin', ORIGIN)
      .send(body)
    expect(response.status).toBe(400)
  })

  it('rejects an id that is not a database id', async () => {
    const response = await agent.delete('/api/admin/slots/not-an-id').set('Origin', ORIGIN)
    expect(response.status).toBe(400)
  })

  it('removes a slot', async () => {
    const slot = await Slot.create({ date: dateFromToday(2), time: '14:00' })
    await agent.delete(`/api/admin/slots/${slot._id}`).set('Origin', ORIGIN).expect(204)
    expect(await Slot.countDocuments()).toBe(0)
  })

  it('shows the owner past days too', async () => {
    const past = dateFromToday(-2)
    await Slot.create({ date: past, time: '10:00' })
    const response = await agent.get(`/api/admin/slots?month=${past.slice(0, 7)}`)
    expect(response.body.map((slot) => slot.date)).toContain(past)
  })
})

describe('public slots', () => {
  it('hides past days and lists months from today on', async () => {
    const yesterday = dateFromToday(-1)
    const today = dateFromToday(0)
    const later = dateFromToday(40)
    await Slot.create([
      { date: yesterday, time: '10:00' },
      { date: today, time: '16:00', status: 'pending' },
      { date: later, time: '14:00', special: true },
    ])

    const months = await request(app).get('/api/slots/months')
    expect(months.body).toEqual([...new Set([today.slice(0, 7), later.slice(0, 7)])].sort())

    const thisMonth = await request(app).get(`/api/slots?month=${today.slice(0, 7)}`)
    const dates = thisMonth.body.map((slot) => slot.date)
    expect(dates).toContain(today)
    expect(dates).not.toContain(yesterday)
    expect(thisMonth.body.find((slot) => slot.date === today)).toEqual({
      id: `${today}T16:00`,
      date: today,
      time: '16:00',
      status: 'pending',
      special: false,
    })
  })

  it.each([['2026-13'], ['2026-1'], ['']])('rejects month "%s"', async (month) => {
    const response = await request(app).get(`/api/slots?month=${month}`)
    expect(response.status).toBe(400)
  })

  it('rejects a month sent as a query operator', async () => {
    const response = await request(app).get('/api/slots').query('month[$gt]=2000-01')
    expect(response.status).toBe(400)
  })

  it('answers unknown API addresses with a short 404', async () => {
    const response = await request(app).get('/api/nothing-here')
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Not found.' })
  })

  it('rejects a JSON body over 10 kB without details', async () => {
    const response = await agent
      .post('/api/admin/slots')
      .set('Origin', ORIGIN)
      .send({ dates: ['x'.repeat(11 * 1024)], times: ['10:00'] })
    expect(response.status).toBe(413)
    expect(response.text).not.toMatch(/at .*\.js/) // no stack trace
  })
})

describe('removing several slots and Undo', () => {
  // Requests as the signed-in owner.
  function removeSlots(body, origin = ORIGIN) {
    return agent.post('/api/admin/slots/remove').set('Origin', origin).send(body)
  }
  function restoreSlots(body, origin = ORIGIN) {
    return agent.post('/api/admin/slots/restore').set('Origin', origin).send(body)
  }
  // A well-formed id that is not in the database.
  const UNKNOWN_ID = '0123456789abcdef01234567'
  // Only the values a slot keeps, without its id.
  const values = ({ date, time, status, special }) => ({ date, time, status, special })

  it('removes the chosen slots and answers with them as they were', async () => {
    const day = dateFromToday(3)
    const [open, booked, other] = await Slot.create([
      { date: day, time: '10:00' },
      { date: day, time: '14:00', status: 'booked', special: true },
      { date: day, time: '16:00' },
    ])

    const response = await removeSlots({ ids: [String(open._id), String(booked._id)] })

    expect(response.status).toBe(200)
    expect(response.body.removed).toEqual([
      { id: String(open._id), date: day, time: '10:00', status: 'open', special: false },
      { id: String(booked._id), date: day, time: '14:00', status: 'booked', special: true },
    ])
    expect(response.body.missing).toBe(0)
    expect((await Slot.find()).map((slot) => String(slot._id))).toEqual([String(other._id)])
  })

  it('skips ids that are already gone', async () => {
    const slot = await Slot.create({ date: dateFromToday(3), time: '10:00' })
    const response = await removeSlots({ ids: [String(slot._id), UNKNOWN_ID] })
    expect(response.status).toBe(200)
    expect(response.body.removed).toHaveLength(1)
    expect(response.body.missing).toBe(1)
  })

  it('puts removed slots back with the same day, time, status and special (Undo)', async () => {
    const day = dateFromToday(4)
    const slots = await Slot.create([
      { date: day, time: '10:00', status: 'pending' },
      { date: day, time: '14:00', status: 'booked', special: true },
    ])
    const removed = await removeSlots({ ids: slots.map((slot) => String(slot._id)) })
    expect(await Slot.countDocuments()).toBe(0)

    const restored = await restoreSlots({ slots: removed.body.removed })

    expect(restored.status).toBe(201)
    expect(restored.body.skipped).toBe(0)
    const after = await Slot.find().sort({ time: 1 }).lean()
    expect(after.map(values)).toEqual([
      { date: day, time: '10:00', status: 'pending', special: false },
      { date: day, time: '14:00', status: 'booked', special: true },
    ])
    expect(restored.body.created.map(values)).toEqual(after.map(values))
  })

  it('skips a slot that exists again instead of overwriting it', async () => {
    const day = dateFromToday(5)
    await Slot.create({ date: day, time: '10:00', status: 'booked' })

    const response = await restoreSlots({
      slots: [
        { date: day, time: '10:00', status: 'open', special: false },
        { date: day, time: '14:00', status: 'open', special: false },
        { date: day, time: '14:00', status: 'open', special: false }, // listed twice
      ],
    })

    expect(response.status).toBe(201)
    expect(response.body.created).toHaveLength(1)
    expect(response.body.skipped).toBe(2)
    expect((await Slot.findOne({ date: day, time: '10:00' })).status).toBe('booked')
    expect(await Slot.countDocuments()).toBe(2)
  })

  it('shows removed and restored slots on the very next public read', async () => {
    const day = dateFromToday(2)
    const slot = await Slot.create({ date: day, time: '10:00' })
    const publicTimes = async () => {
      const response = await request(app).get(`/api/slots?month=${day.slice(0, 7)}`)
      return response.body.map((s) => s.id)
    }

    expect(await publicTimes()).toContain(`${day}T10:00`) // now remembered for a minute
    const removed = await removeSlots({ ids: [String(slot._id)] })
    expect(await publicTimes()).not.toContain(`${day}T10:00`)
    await restoreSlots({ slots: removed.body.removed })
    expect(await publicTimes()).toContain(`${day}T10:00`)
  })

  it('refuses both when sent from another website', async () => {
    const slot = await Slot.create({ date: dateFromToday(2), time: '10:00' })
    const evil = 'https://evil.example'
    const remove = await removeSlots({ ids: [String(slot._id)] }, evil)
    const restore = await restoreSlots(
      { slots: [{ date: dateFromToday(2), time: '14:00', status: 'open', special: false }] },
      evil,
    )
    expect(remove.status).toBe(403)
    expect(restore.status).toBe(403)
    expect(await Slot.countDocuments()).toBe(1)
  })

  it.each([
    ['no list', {}],
    ['an empty list', { ids: [] }],
    ['ids that are not a list', { ids: UNKNOWN_ID }],
    ['an id that is not a database id', { ids: ['not-an-id'] }],
    ['a query operator as an id', { ids: [{ $ne: '' }] }],
    ['more than 100 ids', { ids: Array(101).fill(UNKNOWN_ID) }],
  ])('rejects removing with %s (400)', async (label, body) => {
    const slot = await Slot.create({ date: dateFromToday(2), time: '10:00' })
    const response = await removeSlots(body)
    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
    expect(await Slot.findById(slot._id)).not.toBeNull()
  })

  // A slot that may be restored, to change one value at a time.
  const good = () => ({ date: dateFromToday(6), time: '10:00', status: 'open', special: false })

  it.each([
    ['no list', () => ({})],
    ['an empty list', () => ({ slots: [] })],
    ['slots that are not a list', () => ({ slots: good() })],
    ['a slot that is not an object', () => ({ slots: ['2099-01-01T10:00'] })],
    ['a bad date', () => ({ slots: [{ ...good(), date: '2026-02-31' }] })],
    ['a bad time', () => ({ slots: [{ ...good(), time: '2pm' }] })],
    ['an unknown status', () => ({ slots: [{ ...good(), status: 'cancelled' }] })],
    ['a query operator as the status', () => ({ slots: [{ ...good(), status: { $ne: '' } }] })],
    ['special that is not true or false', () => ({ slots: [{ ...good(), special: 'yes' }] })],
    ['no special at all', () => ({ slots: [{ ...good(), special: undefined }] })],
    ['a day in the past', () => ({ slots: [{ ...good(), date: dateFromToday(-1) }] })],
    ['a day over 12 months ahead', () => ({ slots: [{ ...good(), date: dateFromToday(400) }] })],
    ['more than 100 slots', () => ({ slots: Array(101).fill(good()) })],
  ])('rejects restoring %s (400)', async (label, makeBody) => {
    const response = await restoreSlots(makeBody())
    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
    expect(await Slot.countDocuments()).toBe(0)
  })

  it('stores only the four slot values, whatever else is sent', async () => {
    const response = await restoreSlots({
      slots: [{ ...good(), id: UNKNOWN_ID, _id: UNKNOWN_ID, name: 'A customer', note: 'hi' }],
    })
    expect(response.status).toBe(201)
    const stored = await Slot.findOne().lean()
    expect(String(stored._id)).not.toBe(UNKNOWN_ID)
    expect(Object.keys(stored).sort()).toEqual(['__v', '_id', 'date', 'special', 'status', 'time'])
  })

  it('keeps the single-slot routes working alongside', async () => {
    const slot = await Slot.create({ date: dateFromToday(2), time: '10:00' })
    await agent.delete(`/api/admin/slots/${slot._id}`).set('Origin', ORIGIN).expect(204)
    const removed = await removeSlots({ ids: [String(slot._id)] })
    expect(removed.body).toEqual({ removed: [], missing: 1 })
  })
})
