import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadConfig } from '../config.js'
import { verifyGoogleToken } from '../services/googleVerifier.js'
import {
  ORIGIN,
  TEST_ENV,
  startDatabase,
  stopDatabase,
  buildApp,
  signedInAgent,
} from './helpers.js'

// Replace the real Google check with a pretend one, so the tests decide what "Google" says.
vi.mock('../services/googleVerifier.js', () => ({ verifyGoogleToken: vi.fn() }))

const ID = '0123456789abcdef01234567' // any well-formed id

// Every route that needs the owner to be signed in.
const ADMIN_ROUTES = [
  ['get', '/api/admin/slots?month=2026-12'],
  ['post', '/api/admin/slots'],
  ['patch', `/api/admin/slots/${ID}`],
  ['delete', `/api/admin/slots/${ID}`],
  ['get', '/api/admin/designs'],
  ['post', '/api/admin/designs'],
  ['put', '/api/admin/designs/order'],
  ['patch', `/api/admin/designs/${ID}`],
  ['put', `/api/admin/designs/${ID}/image`],
  ['delete', `/api/admin/designs/${ID}`],
]

let app

beforeAll(async () => {
  await startDatabase()
  app = (await buildApp()).app
})

afterAll(stopDatabase)

describe('admin login and access', () => {
  it.each(ADMIN_ROUTES)('%s %s returns 401 without a session', async (method, path) => {
    const response = await request(app)[method](path).set('Origin', ORIGIN).send({})
    expect(response.status).toBe(401)
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('refuses changes sent from another website, even when signed in', async () => {
    const agent = await signedInAgent(app)
    const response = await agent
      .post('/api/admin/slots')
      .set('Origin', 'https://evil.example')
      .send({ dates: ['2099-01-01'], times: ['10:00'] })
    expect(response.status).toBe(403)
  })

  it('refuses changes with no Origin header', async () => {
    const response = await request(app).post('/api/admin/session/dev').send({})
    expect(response.status).toBe(403)
  })

  it('tells the login page what to show', async () => {
    const response = await request(app).get('/api/admin/config')
    expect(response.body).toEqual({ googleClientId: TEST_ENV.GOOGLE_CLIENT_ID, devLogin: true })
  })

  it('signs the owner in with Google and back out', async () => {
    verifyGoogleToken.mockResolvedValueOnce({ email: 'Owner@Example.com', email_verified: true })
    const agent = request.agent(app)

    await agent
      .post('/api/admin/session/google')
      .set('Origin', ORIGIN)
      .send({ credential: 'good-token' })
      .expect(200)
    expect(verifyGoogleToken).toHaveBeenCalledWith('good-token', TEST_ENV.GOOGLE_CLIENT_ID)

    const session = await agent.get('/api/admin/session').expect(200)
    expect(session.body).toEqual({ signedIn: true, email: 'owner@example.com' })
    await agent.get('/api/admin/designs').expect(200)

    await agent.delete('/api/admin/session').set('Origin', ORIGIN).expect(204)
    await agent.get('/api/admin/designs').expect(401)
  })

  it('sets a session cookie that scripts cannot read and other sites cannot send', async () => {
    const response = await request(app).post('/api/admin/session/dev').set('Origin', ORIGIN)
    const cookie = response.headers['set-cookie'].join(';')
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
  })

  it('rejects a Google account that is not the owner', async () => {
    verifyGoogleToken.mockResolvedValueOnce({ email: 'someone@example.com', email_verified: true })
    const agent = request.agent(app)
    const response = await agent
      .post('/api/admin/session/google')
      .set('Origin', ORIGIN)
      .send({ credential: 'token' })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('not-owner')
    expect(response.headers['set-cookie']).toBeUndefined()
    await agent.get('/api/admin/designs').expect(401)
  })

  it('rejects the owner email when Google has not verified it', async () => {
    verifyGoogleToken.mockResolvedValueOnce({ email: 'owner@example.com', email_verified: false })
    const response = await request(app)
      .post('/api/admin/session/google')
      .set('Origin', ORIGIN)
      .send({ credential: 'token' })
    expect(response.status).toBe(403)
  })

  it('rejects a token Google does not accept', async () => {
    verifyGoogleToken.mockRejectedValueOnce(new Error('Wrong audience'))
    const response = await request(app)
      .post('/api/admin/session/google')
      .set('Origin', ORIGIN)
      .send({ credential: 'forged' })
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Google sign-in failed. Please try again.' })
  })

  it('rejects a credential that is not a string', async () => {
    const response = await request(app)
      .post('/api/admin/session/google')
      .set('Origin', ORIGIN)
      .send({ credential: { $ne: '' } })
    expect(response.status).toBe(400)
  })
})

describe('dev login safety', () => {
  it('does not exist when ALLOW_DEV_LOGIN is not true', async () => {
    const { app: plainApp } = await buildApp({ ALLOW_DEV_LOGIN: 'false' })
    const response = await request(plainApp).post('/api/admin/session/dev').set('Origin', ORIGIN)
    expect(response.status).toBe(404)
    const config = await request(plainApp).get('/api/admin/config')
    expect(config.body.devLogin).toBe(false)
  })

  it('does not exist in production mode', async () => {
    const { app: liveApp } = await buildApp({
      NODE_ENV: 'production',
      ALLOW_DEV_LOGIN: 'false',
      MONGODB_URI: 'mongodb://example.invalid/tipntell',
    })
    const response = await request(liveApp).post('/api/admin/session/dev').set('Origin', ORIGIN)
    expect(response.status).toBe(404)
  })

  it('stops the server starting when turned on in production', () => {
    const env = {
      ...TEST_ENV,
      NODE_ENV: 'production',
      ALLOW_DEV_LOGIN: 'true',
      MONGODB_URI: 'mongodb://example.invalid/tipntell',
    }
    expect(() => loadConfig(env)).toThrow(/ALLOW_DEV_LOGIN/)
  })
})

describe('settings checks', () => {
  it('refuses a session secret shorter than 32 characters', () => {
    expect(() => loadConfig({ ...TEST_ENV, SESSION_SECRET: 'too-short' })).toThrow(/32/)
  })

  it('refuses to start in production without a session secret', () => {
    const env = { ...TEST_ENV, NODE_ENV: 'production', ALLOW_DEV_LOGIN: 'false', MONGODB_URI: 'x' }
    delete env.SESSION_SECRET
    expect(() => loadConfig(env)).toThrow(/SESSION_SECRET/)
  })

  it('refuses to start in production without a database', () => {
    const env = { ...TEST_ENV, NODE_ENV: 'production', ALLOW_DEV_LOGIN: 'false' }
    expect(() => loadConfig(env)).toThrow(/MONGODB_URI/)
  })
})
