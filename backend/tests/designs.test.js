import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import request from 'supertest'
import sharp from 'sharp'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Design } from '../models/Design.js'
import { Counter } from '../models/Counter.js'
import {
  ORIGIN,
  startDatabase,
  stopDatabase,
  buildApp,
  signedInAgent,
  makePhoneJpeg,
  exifHasGps,
} from './helpers.js'

let app
let agent
let uploadsDir

beforeAll(async () => {
  await startDatabase()
  const built = await buildApp()
  app = built.app
  uploadsDir = built.uploadsDir
  agent = await signedInAgent(app)
})

afterAll(stopDatabase)

beforeEach(async () => {
  await Design.deleteMany({})
  app.locals.publicCache.clear() // these tests change the database directly
  await Counter.deleteMany({})
})

// Adds a design as the signed-in owner (a form upload, like the admin page sends).
function addDesign(name, photo, filename = 'photo.jpg') {
  return agent
    .post('/api/admin/designs')
    .set('Origin', ORIGIN)
    .field('name', name)
    .attach('image', photo, filename)
}

describe('design photos', () => {
  it('removes all EXIF data, including GPS, and turns the photo upright', async () => {
    const original = await makePhoneJpeg()
    // Check the test photo really does carry GPS and a rotation flag.
    const before = await sharp(original).metadata()
    expect(exifHasGps(before.exif)).toBe(true)
    expect(before.orientation).toBe(6)

    const response = await addDesign('Cherry bows', original)
    expect(response.status).toBe(201)
    expect(response.body.image).toMatch(/^\/uploads\/[a-f0-9]{32}\.webp$/)

    // Fetch the stored photo the way a customer's browser would.
    const served = await request(app).get(response.body.image).buffer(true)
    expect(served.status).toBe(200)
    expect(served.headers['x-content-type-options']).toBe('nosniff')
    expect(served.headers['cache-control']).toMatch(/max-age=31536000/)

    const after = await sharp(served.body).metadata()
    expect(after.format).toBe('webp')
    expect(after.exif).toBeUndefined()
    expect(after.xmp).toBeUndefined()
    expect(after.icc).toBeUndefined()
    // 300 x 200 with "rotate 90" becomes an upright 200 x 300.
    expect([after.width, after.height]).toEqual([200, 300])
  })

  it('shrinks large photos to 1600 pixels on the long edge', async () => {
    const big = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .toBuffer()
    const response = await addDesign('Big photo', big)
    const stored = await fs.readFile(path.join(uploadsDir, path.basename(response.body.image)))
    const size = await sharp(stored).metadata()
    expect(Math.max(size.width, size.height)).toBe(1600)
  })

  it('accepts PNG, WebP, GIF and AVIF photos and stores them as WebP', async () => {
    const base = sharp({ create: { width: 40, height: 30, channels: 3, background: '#c4737c' } })
    for (const format of ['png', 'webp', 'gif', 'avif']) {
      const photo = await base.clone().toFormat(format).toBuffer()
      const response = await addDesign(`A ${format} photo`, photo, `photo.${format}`)
      expect(response.status, format).toBe(201)
    }
  })

  it.each([
    [
      'TIFF',
      async () =>
        sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } })
          .tiff()
          .toBuffer(),
    ],
    [
      'SVG',
      async () =>
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"><script>alert(1)</script></svg>',
        ),
    ],
  ])('refuses a %s file without reading it', async (label, makeFile) => {
    const response = await addDesign(label, await makeFile(), 'file.img')
    expect(response.status).toBe(400)
    expect(response.body.error).toMatch(/not a photo we can read/)
  })

  it('gives a picture over 60 megapixels its own "too large" message', async () => {
    // A tiny PNG whose header claims 10,000 x 10,000 pixels (a "decompression bomb").
    const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#fff' } })
      .png()
      .toBuffer()
    png.writeUInt32BE(10000, 16) // width
    png.writeUInt32BE(10000, 20) // height
    png.writeUInt32BE(zlib.crc32(png.subarray(12, 29)), 29) // the header's checksum
    const response = await addDesign('Huge', png, 'huge.png')
    expect(response.status).toBe(400)
    expect(response.body.error).toMatch(/too large \(over 60 megapixels\)/)
  })

  it('rejects a file that is not a picture', async () => {
    const response = await addDesign('Not a photo', Buffer.from('hello, I am text'), 'note.jpg')
    expect(response.status).toBe(400)
    expect(await Design.countDocuments()).toBe(0)
  })

  it('rejects a design without a photo or with a bad name', async () => {
    const noPhoto = await agent.post('/api/admin/designs').set('Origin', ORIGIN).field('name', 'x')
    expect(noPhoto.status).toBe(400)
    const longName = await addDesign('x'.repeat(61), await makePhoneJpeg())
    expect(longName.status).toBe(400)
    const blankName = await addDesign('   ', await makePhoneJpeg())
    expect(blankName.status).toBe(400)
  })

  it('replaces a photo and deletes the old file', async () => {
    const created = await addDesign('Milky pink', await makePhoneJpeg())
    const oldFile = path.join(uploadsDir, path.basename(created.body.image))

    const replaced = await agent
      .put(`/api/admin/designs/${created.body.id}/image`)
      .set('Origin', ORIGIN)
      .attach('image', await makePhoneJpeg(), 'new.jpg')
    expect(replaced.status).toBe(200)
    expect(replaced.body.image).not.toBe(created.body.image)
    expect(replaced.body.number).toBe(created.body.number)
    await expect(fs.access(oldFile)).rejects.toThrow()
  })

  it('deletes the stored photo with the design', async () => {
    const created = await addDesign('Polka dots', await makePhoneJpeg())
    const file = path.join(uploadsDir, path.basename(created.body.image))
    await fs.access(file) // it exists

    await agent.delete(`/api/admin/designs/${created.body.id}`).set('Origin', ORIGIN).expect(204)
    await expect(fs.access(file)).rejects.toThrow()
    expect(await Design.countDocuments()).toBe(0)
  })
})

describe('design numbers, names and order', () => {
  it('never gives a deleted design number to a new design', async () => {
    await Design.create({ number: 8, name: 'Pearl sparkle', colors: ['#ffffff', '#000000'] })
    const nine = await addDesign('Nine', await makePhoneJpeg())
    expect(nine.body.number).toBe(9)

    await agent.delete(`/api/admin/designs/${nine.body.id}`).set('Origin', ORIGIN).expect(204)
    const ten = await addDesign('Ten', await makePhoneJpeg())
    expect(ten.body.number).toBe(10)
  })

  it('renames, hides and reorders designs', async () => {
    const a = await Design.create({
      number: 1,
      name: 'A',
      colors: ['#ffffff', '#000000'],
      order: 0,
    })
    const b = await Design.create({
      number: 2,
      name: 'B',
      colors: ['#ffffff', '#000000'],
      order: 1,
    })

    const renamed = await agent
      .patch(`/api/admin/designs/${a._id}`)
      .set('Origin', ORIGIN)
      .send({ name: '  Chrome   ombré ' })
    expect(renamed.body.name).toBe('Chrome ombré')

    const hidden = await agent
      .patch(`/api/admin/designs/${b._id}`)
      .set('Origin', ORIGIN)
      .send({ hidden: true })
    expect(hidden.body.hidden).toBe(true)

    const reordered = await agent
      .put('/api/admin/designs/order')
      .set('Origin', ORIGIN)
      .send({ ids: [String(b._id), String(a._id)] })
    expect(reordered.body.map((design) => design.number)).toEqual([2, 1])
  })

  it('rejects a new order that leaves a design out', async () => {
    const a = await Design.create({ number: 1, name: 'A', colors: ['#ffffff', '#000000'] })
    await Design.create({ number: 2, name: 'B', colors: ['#ffffff', '#000000'] })
    const response = await agent
      .put('/api/admin/designs/order')
      .set('Origin', ORIGIN)
      .send({ ids: [String(a._id)] })
    expect(response.status).toBe(400)
  })

  it('rejects a name that is not text', async () => {
    const a = await Design.create({ number: 1, name: 'A', colors: ['#ffffff', '#000000'] })
    const response = await agent
      .patch(`/api/admin/designs/${a._id}`)
      .set('Origin', ORIGIN)
      .send({ name: { $set: 'x' } })
    expect(response.status).toBe(400)
  })
})

describe('public designs', () => {
  it('lists visible designs only, in order, by their public number', async () => {
    await Design.create([
      { number: 1, name: 'Shown second', colors: ['#ffffff', '#000000'], order: 2 },
      { number: 2, name: 'Hidden', colors: ['#ffffff', '#000000'], order: 0, hidden: true },
      {
        number: 3,
        name: 'Shown first',
        colors: ['#ffffff', '#000000'],
        order: 1,
        image: { url: '/uploads/abc.webp', key: 'abc.webp' },
      },
    ])

    const response = await request(app).get('/api/designs')
    expect(response.body).toEqual([
      { id: 3, name: 'Shown first', image: '/uploads/abc.webp', colors: ['#ffffff', '#000000'] },
      { id: 1, name: 'Shown second', image: null, colors: ['#ffffff', '#000000'] },
    ])
  })
})
