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
    ['special that is not true or false', { dates: ['2099-01-01'], times: ['10:00'], special: 'yes' }],
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
    const response = await agent.patch(`/api/admin/slots/${slot._id}`).set('Origin', ORIGIN).send(body)
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
