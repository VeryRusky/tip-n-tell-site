import path from 'node:path'
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { loadConfig } from '../config.js'
import { createApp } from '../app.js'
import { TEST_ENV, SITE_PAGE, startDatabase, stopDatabase, buildApp } from './helpers.js'

// The server also serves the built website (production, or SERVE_FRONTEND=true).
// helpers.js makes a tiny stand-in for frontend/dist.

// Settings for a correctly configured live server (on the same test database).
const LIVE_ENV = {
  NODE_ENV: 'production',
  ALLOW_DEV_LOGIN: 'false',
  MONGODB_URI: 'mongodb://example.invalid/tipntell',
  TRUST_PROXY: '1',
}

let app

beforeAll(async () => {
  await startDatabase()
  app = (await buildApp({ SERVE_FRONTEND: 'true' })).app
})

afterAll(stopDatabase)

describe('serving the website', () => {
  it.each([['/'], ['/policies'], ['/book/time'], ['/admin'], ['/admin/designs']])(
    'answers %s with the page, never cached',
    async (address) => {
      const response = await request(app).get(address)
      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toMatch(/text\/html/)
      expect(response.text).toBe(SITE_PAGE)
      expect(response.headers['cache-control']).toBe('no-store')
    },
  )

  it('tells search engines not to list the admin pages, only those', async () => {
    for (const address of ['/admin', '/admin/login', '/Admin/designs']) {
      const response = await request(app).get(address)
      expect(response.headers['x-robots-tag']).toBe('noindex')
    }
    for (const address of ['/', '/book/time', '/administrator']) {
      const response = await request(app).get(address)
      expect(response.headers['x-robots-tag']).toBeUndefined()
    }
  })

  it('serves hashed files from assets/ with a long cache, other files with a short one', async () => {
    const script = await request(app).get('/assets/index-AbC123.js')
    expect(script.status).toBe(200)
    expect(script.headers['content-type']).toMatch(/javascript/)
    expect(script.headers['cache-control']).toBe('public, max-age=31536000, immutable')

    const icon = await request(app).get('/favicon.svg')
    expect(icon.status).toBe(200)
    expect(icon.headers['cache-control']).toBe('no-cache')
  })

  it('answers a missing file in assets/ with 404, not the page', async () => {
    const response = await request(app).get('/assets/old-XyZ789.js')
    expect(response.status).toBe(404)
    expect(response.text).not.toBe(SITE_PAGE)
  })

  it('never answers an /api or /uploads address with the page', async () => {
    for (const address of ['/api/nothing-here', '/API/Nothing', '/api', '/uploads/nope.webp']) {
      const response = await request(app).get(address)
      expect(response.status).toBe(404)
      expect(response.headers['content-type']).toMatch(/application\/json/)
      expect(response.body).toEqual({ error: 'Not found.' })
    }
  })

  it('only answers GET (and HEAD) with the page', async () => {
    expect((await request(app).head('/book/time')).status).toBe(200)
    expect((await request(app).post('/book/time')).status).toBe(404)
  })
})

describe('headers', () => {
  it('sends the page headers that let Google sign-in work (security review M4)', async () => {
    const response = await request(app).get('/admin/login')
    const csp = response.headers['content-security-policy']
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' https://accounts.google.com/gsi/client")
    expect(csp).toContain('frame-src https://accounts.google.com/gsi/')
    expect(csp).toContain("connect-src 'self' https://accounts.google.com/gsi/")
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style")
    expect(csp).toContain("img-src 'self' data: blob: https://res.cloudinary.com")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    // Scripts stay strict.
    expect(csp).not.toMatch(/script-src[^;]*unsafe/)
    // Not on http://localhost (it would break every request there).
    expect(csp).not.toContain('upgrade-insecure-requests')

    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups')
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(response.headers['strict-transport-security']).toBe('max-age=31536000')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['permissions-policy']).toBe(
      'geolocation=(), microphone=(), camera=(), payment=()',
    )
  })

  it('sends the same headers on the site files', async () => {
    const response = await request(app).get('/assets/index-AbC123.js')
    expect(response.headers['content-security-policy']).toContain(
      'https://accounts.google.com/gsi/client',
    )
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it("keeps helmet's strict defaults on API answers", async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    const csp = response.headers['content-security-policy']
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain('accounts.google.com')
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
  })

  it('adds upgrade-insecure-requests on the live (HTTPS) site', async () => {
    const { app: liveApp } = await buildApp(LIVE_ENV)
    const response = await request(liveApp).get('/')
    expect(response.status).toBe(200)
    expect(response.headers['content-security-policy']).toContain('upgrade-insecure-requests')
  })
})

describe('when the website is served', () => {
  it('is served in production without SERVE_FRONTEND', () => {
    expect(loadConfig({ ...TEST_ENV, ...LIVE_ENV }).serveFrontend).toBe(true)
  })

  it('is not served on a development or test server unless SERVE_FRONTEND=true', async () => {
    expect(loadConfig(TEST_ENV).serveFrontend).toBe(false)
    const { app: plainApp } = await buildApp()
    expect((await request(plainApp).get('/book/time')).status).toBe(404)
  })

  it('looks for frontend/dist next to the backend folder, wherever the server starts', () => {
    const backendFolder = path.resolve(import.meta.dirname, '..')
    expect(loadConfig(TEST_ENV).frontendDir).toBe(
      path.resolve(backendFolder, '..', 'frontend', 'dist'),
    )
  })

  it('refuses to start, with a clear message, if the site was not built', () => {
    const config = loadConfig({
      ...TEST_ENV,
      ...LIVE_ENV,
      FRONTEND_DIR: path.join(import.meta.dirname, 'no-such-folder'),
    })
    expect(() => createApp(config)).toThrow(/The built website was not found/)
  })
})
