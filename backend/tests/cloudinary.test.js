import request from 'supertest'
import sharp from 'sharp'
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { v2 as cloudinary } from 'cloudinary'
import { createCloudinaryStorage } from '../services/storage/cloudinaryStorage.js'
import { Design } from '../models/Design.js'
import {
  ORIGIN,
  startDatabase,
  stopDatabase,
  buildApp,
  signedInAgent,
  makePhoneJpeg,
  exifHasGps,
} from './helpers.js'

// The Cloudinary driver, with the cloudinary package replaced by a pretend one:
// these tests never contact the real service.
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: { upload: vi.fn(), destroy: vi.fn() },
  },
}))

const CLOUDINARY_URL = 'cloudinary://123456:test-secret@demo-cloud'
const KEY = /^tipntell-designs\/[a-f0-9]{32}$/

// What the pretend Cloudinary answers: the address a real upload would get.
function pretendUpload(file, options) {
  return Promise.resolve({
    public_id: options.public_id,
    secure_url: `https://res.cloudinary.com/demo-cloud/image/upload/v1/${options.public_id}.webp`,
  })
}

// The photo bytes that were sent to Cloudinary in upload call number `call`.
function uploadedPhoto(call = 0) {
  const dataUrl = cloudinary.uploader.upload.mock.calls[call][0]
  expect(dataUrl).toMatch(/^data:image\/webp;base64,/)
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

beforeEach(() => {
  vi.clearAllMocks()
  cloudinary.uploader.upload.mockImplementation(pretendUpload)
  cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' })
})

describe('the Cloudinary driver', () => {
  it('reads the account from CLOUDINARY_URL and always uses https', () => {
    createCloudinaryStorage(CLOUDINARY_URL)
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'demo-cloud',
      api_key: '123456',
      api_secret: 'test-secret',
      secure: true,
    })
  })

  it('uploads the buffer under a random name in one folder and returns url and key', async () => {
    const storage = createCloudinaryStorage(CLOUDINARY_URL)
    const buffer = Buffer.from('cleaned photo bytes')
    const first = await storage.save(buffer)
    const second = await storage.save(buffer)

    expect(first.key).toMatch(KEY)
    expect(second.key).not.toBe(first.key) // random each time
    expect(first.url).toBe(
      `https://res.cloudinary.com/demo-cloud/image/upload/v1/${first.key}.webp`,
    )
    expect(uploadedPhoto(0)).toEqual(buffer) // exactly the bytes it was given
    const options = cloudinary.uploader.upload.mock.calls[0][1]
    expect(options).toMatchObject({ public_id: first.key, overwrite: false })
  })

  it('deletes with invalidate, so the CDN forgets the photo too', async () => {
    const storage = createCloudinaryStorage(CLOUDINARY_URL)
    const key = 'tipntell-designs/0123456789abcdef0123456789abcdef'
    await storage.remove(key)
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(key, {
      resource_type: 'image',
      invalidate: true,
    })
  })

  it.each([
    ['../other-folder/photo'],
    ['tipntell-designs/../../everything'],
    ['someone-elses-photo'],
    ['tipntell-designs/0123456789abcdef0123456789abcdef.webp'], // a disk-driver name
    ['TIPNTELL-DESIGNS/0123456789ABCDEF0123456789ABCDEF'],
    [''],
    [null],
    [{ $ne: '' }],
  ])('ignores a key it did not make: %j', async (key) => {
    const storage = createCloudinaryStorage(CLOUDINARY_URL)
    await storage.remove(key)
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled()
  })
})

describe('design routes with the Cloudinary driver', () => {
  let app
  let agent

  beforeAll(async () => {
    await startDatabase()
    app = (await buildApp({ STORAGE_DRIVER: 'cloudinary', CLOUDINARY_URL })).app
    agent = await signedInAgent(app)
  })

  afterAll(stopDatabase)

  function addDesign(name, photo) {
    return agent
      .post('/api/admin/designs')
      .set('Origin', ORIGIN)
      .field('name', name)
      .attach('image', photo, 'IMG_0042.jpg')
  }

  it('uploads only the cleaned photo (no GPS, WebP) and shows the Cloudinary address', async () => {
    const original = await makePhoneJpeg()
    const response = await addDesign('Cherry bows', original)
    expect(response.status).toBe(201)
    expect(response.body.image).toMatch(
      /^https:\/\/res\.cloudinary\.com\/demo-cloud\/image\/upload\/v1\/tipntell-designs\/[a-f0-9]{32}\.webp$/,
    )

    // What reached "Cloudinary" is the re-made photo, not the phone's file.
    const sent = uploadedPhoto(0)
    expect(sent.equals(original)).toBe(false)
    const metadata = await sharp(sent).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.exif).toBeUndefined()
    expect(exifHasGps(metadata.exif)).toBe(false)
    // The phone's file name is never used.
    expect(JSON.stringify(cloudinary.uploader.upload.mock.calls)).not.toContain('IMG_0042')

    // Customers get the same address.
    const publicList = await request(app).get('/api/designs')
    expect(publicList.body.map((design) => design.image)).toContain(response.body.image)
  })

  it('deletes the old photo (with invalidate) when the photo is replaced', async () => {
    const created = await addDesign('Soft pink', await makePhoneJpeg())
    const oldKey = (await Design.findById(created.body.id).lean()).image.key
    expect(oldKey).toMatch(KEY)

    const replaced = await agent
      .put(`/api/admin/designs/${created.body.id}/image`)
      .set('Origin', ORIGIN)
      .attach('image', await makePhoneJpeg(), 'photo.jpg')
    expect(replaced.status).toBe(200)
    expect(replaced.body.image).not.toBe(created.body.image)
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(oldKey, {
      resource_type: 'image',
      invalidate: true,
    })
  })

  it('deletes the photo when the design is deleted', async () => {
    const created = await addDesign('Gold tips', await makePhoneJpeg())
    const key = (await Design.findById(created.body.id).lean()).image.key

    const response = await agent
      .delete(`/api/admin/designs/${created.body.id}`)
      .set('Origin', ORIGIN)
    expect(response.status).toBe(204)
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(key, {
      resource_type: 'image',
      invalidate: true,
    })
  })

  it('removes the uploaded photo again if saving the design fails', async () => {
    const spy = vi.spyOn(Design, 'create').mockRejectedValueOnce(new Error('database down'))
    const response = await addDesign('Will fail', await makePhoneJpeg())
    spy.mockRestore()
    expect(response.status).toBe(500)
    const key = cloudinary.uploader.upload.mock.calls[0][1].public_id
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(key, {
      resource_type: 'image',
      invalidate: true,
    })
  })

  it('does not serve /uploads at all', async () => {
    const response = await request(app).get('/uploads/0123456789abcdef0123456789abcdef.webp')
    expect(response.status).toBe(404)
  })
})
