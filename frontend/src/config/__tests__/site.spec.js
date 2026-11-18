import { describe, it, expect, afterEach, vi } from 'vitest'

// The "Demo site" notice is set when the site is built, with VITE_DEMO_MODE.
// Each test loads site.js again with a different value.
async function demoModeWith(value) {
  vi.resetModules()
  if (value !== undefined) vi.stubEnv('VITE_DEMO_MODE', value)
  const { site } = await import('../site.js')
  return site.demoMode
}

afterEach(() => vi.unstubAllEnvs())

describe('demo notice (VITE_DEMO_MODE)', () => {
  it('is on when VITE_DEMO_MODE is not set (the GitHub Pages demo)', async () => {
    expect(await demoModeWith(undefined)).toBe(true)
  })

  it('is off only when VITE_DEMO_MODE is exactly "false"', async () => {
    expect(await demoModeWith('false')).toBe(false)
  })

  it.each([['true'], [''], ['False'], ['no'], ['0']])(
    'stays on for VITE_DEMO_MODE=%j',
    async (value) => {
      expect(await demoModeWith(value)).toBe(true)
    },
  )
})
