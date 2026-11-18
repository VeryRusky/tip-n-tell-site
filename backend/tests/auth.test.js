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

// Settings for a correctly configured live server (on the same test database).
const LIVE_ENV = {
  NODE_ENV: 'production',
  ALLOW_DEV_LOGIN: 'false',
  MONGODB_URI: 'mongodb://example.invalid/tipntell',
  TRUST_PROXY: '1',
}

// The session cookie from a response, to send to another copy of the server.
function sessionCookie(response) {
  return response.headers['set-cookie'].map((cookie) => cookie.split(';')[0]).join('; ')
}

// Every route that needs the owner to be signed in.
const ADMIN_ROUTES = [
  ['get', '/api/admin/slots?month=2026-12'],
  ['post', '/api/admin/slots'],
  ['post', '/api/admin/slots/remove'],
  ['post', '/api/admin/slots/restore'],
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
    const { app: liveApp } = await buildApp(LIVE_ENV)
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

describe('production is the safe default (NODE_ENV)', () => {
  it.each([['Production'], ['prod'], ['production '], [''], [undefined]])(
    'counts NODE_ENV=%j as production and refuses the dev login',
    (nodeEnv) => {
      const env = { ...TEST_ENV, ...LIVE_ENV, NODE_ENV: nodeEnv, ALLOW_DEV_LOGIN: 'true' }
      delete env.MONGODB_URI // so the only problem is the dev login in production
      expect(() => loadConfig(env)).toThrow(
        /ALLOW_DEV_LOGIN=true only works with NODE_ENV=development/,
      )
    },
  )

  it.each([['Production'], ['prod'], ['production '], [''], [undefined]])(
    'gives NODE_ENV=%j every production check',
    (nodeEnv) => {
      const config = loadConfig({ ...TEST_ENV, ...LIVE_ENV, NODE_ENV: nodeEnv })
      expect(config.isProduction).toBe(true)
      expect(config.devLogin).toBe(false)
      expect(() =>
        loadConfig({ ...TEST_ENV, NODE_ENV: nodeEnv, ALLOW_DEV_LOGIN: 'false' }),
      ).toThrow(/MONGODB_URI is required/)
    },
  )

  it('accepts development and test with any capitals and spaces', () => {
    expect(loadConfig({ ...TEST_ENV, NODE_ENV: ' Development ' }).mode).toBe('development')
    expect(loadConfig({ ...TEST_ENV, NODE_ENV: 'TEST' }).mode).toBe('test')
  })
})

describe('dev login limits', () => {
  it('refuses to start with a real database, and says what to do', () => {
    const env = { ...TEST_ENV, NODE_ENV: 'development', MONGODB_URI: 'mongodb+srv://x/tipntell' }
    expect(() => loadConfig(env)).toThrow(/sign in with Google/)
    expect(() => loadConfig(env)).toThrow(/remove MONGODB_URI/)
  })

  it('answers 404 to a request that came through a proxy', async () => {
    const response = await request(app)
      .post('/api/admin/session/dev')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', '203.0.113.7')
    expect(response.status).toBe(404)
    expect(response.headers['set-cookie']).toBeUndefined()
  })
})

describe('TRUST_PROXY in production', () => {
  it.each([['true'], [''], ['0'], ['1.5'], ['loopback']])('refuses TRUST_PROXY=%j', (value) => {
    expect(() => loadConfig({ ...TEST_ENV, ...LIVE_ENV, TRUST_PROXY: value })).toThrow(
      /TRUST_PROXY must be a whole number of 1 or more/,
    )
  })

  it('accepts a whole number of proxies', () => {
    expect(loadConfig({ ...TEST_ENV, ...LIVE_ENV, TRUST_PROXY: '2' }).trustProxy).toBe(2)
    // Measured on Render's onrender.com address (Nov 2026).
    expect(loadConfig({ ...TEST_ENV, ...LIVE_ENV, TRUST_PROXY: '3' }).trustProxy).toBe(3)
  })
})

describe('sessions are tied to how they were made and to ADMIN_EMAIL', () => {
  it('a dev-login session does not work on a production copy sharing the database', async () => {
    const login = await request(app).post('/api/admin/session/dev').set('Origin', ORIGIN)
    const cookie = sessionCookie(login)
    await request(app).get('/api/admin/designs').set('Cookie', cookie).expect(200)

    const { app: liveApp } = await buildApp(LIVE_ENV)
    await request(liveApp).get('/api/admin/designs').set('Cookie', cookie).expect(401)
    // The session was deleted, so it no longer works anywhere.
    await request(app).get('/api/admin/designs').set('Cookie', cookie).expect(401)
  })

  it('a dev-login session does not work where the dev login is switched off', async () => {
    const login = await request(app).post('/api/admin/session/dev').set('Origin', ORIGIN)
    const { app: plainApp } = await buildApp({ ALLOW_DEV_LOGIN: 'false' })
    const session = await request(plainApp)
      .get('/api/admin/session')
      .set('Cookie', sessionCookie(login))
    expect(session.body).toEqual({ signedIn: false })
  })

  it('a Google session ends when ADMIN_EMAIL changes', async () => {
    verifyGoogleToken.mockResolvedValueOnce({ email: 'owner@example.com', email_verified: true })
    // A fresh copy, so the earlier tests' sign-ins don't count towards its login limit.
    const { app: freshApp } = await buildApp()
    const login = await request(freshApp)
      .post('/api/admin/session/google')
      .set('Origin', ORIGIN)
      .send({ credential: 'good-token' })
    const cookie = sessionCookie(login)

    const { app: liveApp } = await buildApp(LIVE_ENV)
    await request(liveApp).get('/api/admin/designs').set('Cookie', cookie).expect(200)

    const { app: newOwnerApp } = await buildApp({ ...LIVE_ENV, ADMIN_EMAIL: 'new@example.com' })
    const session = await request(newOwnerApp).get('/api/admin/session').set('Cookie', cookie)
    expect(session.body).toEqual({ signedIn: false })
    await request(liveApp).get('/api/admin/designs').set('Cookie', cookie).expect(401)
  })
})
