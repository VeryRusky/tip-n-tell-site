import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config.js'
import { TEST_ENV } from './helpers.js'

// Settings used by a hosted copy (Render): ALLOWED_ORIGINS from Render's own address,
// and the photo storage driver. Only loadConfig is tested here: no database needed.

// A correctly configured live server, apart from what each test changes.
const LIVE_ENV = {
  ...TEST_ENV,
  NODE_ENV: 'production',
  ALLOW_DEV_LOGIN: 'false',
  MONGODB_URI: 'mongodb://example.invalid/tipntell',
  TRUST_PROXY: '1',
  STORAGE_DRIVER: 'cloudinary',
  CLOUDINARY_URL: 'cloudinary://123456:abcDEF-secret_1@demo-cloud',
}

describe('ALLOWED_ORIGINS on Render', () => {
  it("uses Render's own address when ALLOWED_ORIGINS is not set", () => {
    const env = {
      ...LIVE_ENV,
      ALLOWED_ORIGINS: '',
      RENDER_EXTERNAL_URL: 'https://tipntell.onrender.com',
    }
    expect(loadConfig(env).allowedOrigins).toEqual(['https://tipntell.onrender.com'])
  })

  it('drops a slash at the end, to match what browsers send', () => {
    const env = { ...LIVE_ENV, ALLOWED_ORIGINS: '', RENDER_EXTERNAL_URL: 'https://x.onrender.com/' }
    expect(loadConfig(env).allowedOrigins).toEqual(['https://x.onrender.com'])
  })

  it('prefers ALLOWED_ORIGINS when it is set (e.g. her own domain)', () => {
    const env = {
      ...LIVE_ENV,
      ALLOWED_ORIGINS: 'https://tipntell.example.com',
      RENDER_EXTERNAL_URL: 'https://tipntell.onrender.com',
    }
    expect(loadConfig(env).allowedOrigins).toEqual(['https://tipntell.example.com'])
  })

  it('still refuses to start in production with neither', () => {
    const env = { ...LIVE_ENV, ALLOWED_ORIGINS: ' , ' }
    delete env.RENDER_EXTERNAL_URL
    expect(() => loadConfig(env)).toThrow(/ALLOWED_ORIGINS is required in production/)
    expect(() => loadConfig({ ...env, RENDER_EXTERNAL_URL: '  ' })).toThrow(
      /ALLOWED_ORIGINS is required/,
    )
  })
})

describe('photo storage settings', () => {
  it('accepts the Cloudinary driver with its CLOUDINARY_URL', () => {
    const config = loadConfig(LIVE_ENV)
    expect(config.storageDriver).toBe('cloudinary')
    expect(config.cloudinaryUrl).toBe(LIVE_ENV.CLOUDINARY_URL)
    expect(config.warnings).toEqual([])
  })

  it.each([
    [''],
    [undefined],
    ['https://cloudinary.com/console'],
    ['cloudinary://only-a-key@demo'],
  ])('refuses STORAGE_DRIVER=cloudinary with CLOUDINARY_URL=%j', (value) => {
    expect(() => loadConfig({ ...LIVE_ENV, CLOUDINARY_URL: value })).toThrow(
      /STORAGE_DRIVER=cloudinary needs CLOUDINARY_URL/,
    )
  })

  it('never prints CLOUDINARY_URL in the error', () => {
    let message = ''
    try {
      loadConfig({ ...LIVE_ENV, CLOUDINARY_URL: 'cloudinary://key-only-no-secret@demo' })
    } catch (error) {
      message = error.message
    }
    expect(message).toMatch(/needs CLOUDINARY_URL/)
    expect(message).not.toContain('key-only-no-secret')
  })

  it('refuses an unknown driver', () => {
    expect(() => loadConfig({ ...TEST_ENV, STORAGE_DRIVER: 's3' })).toThrow(
      /STORAGE_DRIVER must be "local" or "cloudinary"/,
    )
  })

  it('warns (but starts) when production keeps photos on the local disk', () => {
    const config = loadConfig({ ...LIVE_ENV, STORAGE_DRIVER: 'local', CLOUDINARY_URL: '' })
    expect(config.storageDriver).toBe('local')
    expect(config.warnings).toHaveLength(1)
    expect(config.warnings[0]).toMatch(/wipes its disk/)
  })

  it('does not warn on your own computer', () => {
    expect(loadConfig(TEST_ENV).warnings).toEqual([])
    expect(loadConfig(TEST_ENV).storageDriver).toBe('local')
  })
})
