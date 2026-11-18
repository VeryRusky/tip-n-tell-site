import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { Slot } from '../models/Slot.js'
import { Design } from '../models/Design.js'
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
  await Design.deleteMany({})
  app.locals.publicCache.clear()
  vi.restoreAllMocks()
})

describe('public answers are remembered for a minute', () => {
  it('reads the designs from the database only once for repeated visits', async () => {
    await Design.create({ number: 1, name: 'Chrome ombré', colors: ['#d9d4dd', '#8f8794'] })
    const find = vi.spyOn(Design, 'find')

    const first = await request(app).get('/api/designs').expect(200)
    const second = await request(app).get('/api/designs').expect(200)

    expect(second.body).toEqual(first.body)
    expect(find).toHaveBeenCalledTimes(1)
  })

  it('reads each month and the month list from the database only once', async () => {
    const day = dateFromToday(3)
    await Slot.create({ date: day, time: '10:00' })
    const find = vi.spyOn(Slot, 'find')
    const distinct = vi.spyOn(Slot, 'distinct')

    for (let i = 0; i < 3; i++) {
      await request(app).get('/api/slots/months').expect(200)
      await request(app)
        .get(`/api/slots?month=${day.slice(0, 7)}`)
        .expect(200)
    }

    expect(distinct).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledTimes(1)
  })

  it('shows her slot change on the very next public read', async () => {
    const day = dateFromToday(3)
    const slot = await Slot.create({ date: day, time: '14:00' })
    const path = `/api/slots?month=${day.slice(0, 7)}`
    const before = await request(app).get(path)
    expect(before.body[0].status).toBe('open')

    await agent
      .patch(`/api/admin/slots/${slot._id}`)
      .set('Origin', ORIGIN)
      .send({ status: 'pending' })
      .expect(200)

    const after = await request(app).get(path)
    expect(after.body[0].status).toBe('pending')
  })

  it('shows newly opened days on the very next public read', async () => {
    const before = await request(app).get('/api/slots/months')
    expect(before.body).toEqual([])

    const day = dateFromToday(5)
    await agent
      .post('/api/admin/slots')
      .set('Origin', ORIGIN)
      .send({ dates: [day], times: ['10:00'] })
      .expect(201)

    const after = await request(app).get('/api/slots/months')
    expect(after.body).toEqual([day.slice(0, 7)])
  })

  it('takes a hidden design off the public list straight away', async () => {
    const design = await Design.create({
      number: 2,
      name: 'French tips',
      colors: ['#ffffff', '#000000'],
    })
    expect((await request(app).get('/api/designs')).body).toHaveLength(1)

    await agent
      .patch(`/api/admin/designs/${design._id}`)
      .set('Origin', ORIGIN)
      .send({ hidden: true })
      .expect(200)

    expect((await request(app).get('/api/designs')).body).toEqual([])
  })
})

describe('public rate limit', () => {
  it('allows 120 requests a minute from one address, then answers 429', async () => {
    const { app: freshApp } = await buildApp()
    for (let i = 0; i < 120; i++) {
      await request(freshApp).get('/api/designs').expect(200)
    }
    const blocked = await request(freshApp).get('/api/slots/months')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toMatch(/Too many requests/)
  })

  it('never limits the health check', async () => {
    const { app: freshApp } = await buildApp()
    for (let i = 0; i < 125; i++) {
      await request(freshApp).get('/api/health').expect(200)
    }
  })
})
