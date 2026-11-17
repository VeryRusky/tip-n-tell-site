import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import mongoose from 'mongoose'
import request from 'supertest'
import sharp from 'sharp'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { loadConfig } from '../config.js'
import { createApp } from '../app.js'
import { todayInSingapore } from '../services/dates.js'

// Shared set-up for the backend tests: a temporary database, a temporary uploads
// folder, and the app built with test settings.

// The site's own address, sent as the Origin header on changes.
export const ORIGIN = 'http://localhost:5173'

export const TEST_ENV = {
  NODE_ENV: 'test',
  ALLOW_DEV_LOGIN: 'true',
  ADMIN_EMAIL: 'owner@example.com',
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  SESSION_SECRET: 'a-test-secret-that-is-at-least-32-characters-long',
  ALLOWED_ORIGINS: ORIGIN,
}

let memoryServer = null
let uploadsDir = ''

export async function startDatabase() {
  memoryServer = await MongoMemoryServer.create()
  await mongoose.connect(memoryServer.getUri('tipntell-test'))
}

export async function stopDatabase() {
  await mongoose.disconnect()
  await memoryServer?.stop()
  if (uploadsDir) await fs.rm(uploadsDir, { recursive: true, force: true })
}

// Builds the app. `env` replaces any of the test settings above.
export async function buildApp(env = {}) {
  if (!uploadsDir) uploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tipntell-uploads-'))
  const config = loadConfig({ ...TEST_ENV, UPLOADS_DIR: uploadsDir, ...env })
  return { app: createApp(config), config, uploadsDir }
}

// A supertest "agent" keeps cookies between requests, like a browser.
// This one has signed in with the dev login.
export async function signedInAgent(app) {
  const agent = request.agent(app)
  await agent.post('/api/admin/session/dev').set('Origin', ORIGIN).expect(200)
  return agent
}

export async function clearCollections() {
  const collections = await mongoose.connection.db.collections()
  for (const collection of collections) await collection.deleteMany({})
}

// A date `days` days from today in Singapore, as 'YYYY-MM-DD' (negative = in the past).
export function dateFromToday(days) {
  const [year, month, day] = todayInSingapore().split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

// A small JPEG that, like a phone photo, carries EXIF data: the phone model, a
// rotation flag and a GPS position (a public landmark, not a real home).
export async function makePhoneJpeg() {
  return sharp({ create: { width: 300, height: 200, channels: 3, background: '#c4737c' } })
    .withExif({
      IFD0: { Make: 'TestPhone', Model: 'Camera 1' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '1/1 17/1 1248/100',
        GPSLongitudeRef: 'E',
        GPSLongitude: '103/1 51/1 1620/100',
      },
    })
    .withMetadata({ orientation: 6 }) // "turn 90 degrees to show upright"
    .jpeg()
    .toBuffer()
}

// Does this EXIF block contain a GPS section? Reads the first list of EXIF tags
// (IFD0) and looks for tag 0x8825, which points to the GPS data.
export function exifHasGps(exif) {
  if (!exif) return false
  const start = exif.indexOf('Exif\0\0') === 0 ? 6 : 0
  const little = exif.toString('latin1', start, start + 2) === 'II'
  const read16 = (at) => (little ? exif.readUInt16LE(start + at) : exif.readUInt16BE(start + at))
  const read32 = (at) => (little ? exif.readUInt32LE(start + at) : exif.readUInt32BE(start + at))
  const ifd0 = read32(4)
  const count = read16(ifd0)
  for (let i = 0; i < count; i++) {
    if (read16(ifd0 + 2 + i * 12) === 0x8825) return true
  }
  return false
}
