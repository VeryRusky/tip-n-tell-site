import crypto from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'

// Stores photos on Cloudinary (an image hosting service with a free plan). Used on the
// live site, because a free host wipes its own disk on every deploy, restart and sleep.
//
// Same two functions as diskStorage.js:
//   save(buffer) -> { url, key }   url: https://res.cloudinary.com/..., key: the public id
//   remove(key)
//
// Rules from the security review (L1, L7):
// - Only the CLEANED photo from processPhoto() (services/images.js) is uploaded, never the
//   original upload, so the location and other metadata never leave this server.
// - Each photo gets a random name; the customer's or owner's file name is never used.
// - remove() only deletes names this driver made, and asks Cloudinary's CDN to forget it.

// All design photos go in one folder on Cloudinary.
const FOLDER = 'tipntell-designs'
// Only names this driver made: the folder, then 32 random hex characters.
const KEY_PATTERN = /^tipntell-designs\/[a-f0-9]{32}$/

// cloudinaryUrl looks like cloudinary://<api key>:<api secret>@<cloud name>
// (config.js has already checked the format).
export function createCloudinaryStorage(cloudinaryUrl) {
  const url = new URL(cloudinaryUrl)
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: decodeURIComponent(url.username),
    api_secret: decodeURIComponent(url.password),
    secure: true, // always https:// addresses
  })

  return {
    async save(buffer) {
      const publicId = `${FOLDER}/${crypto.randomBytes(16).toString('hex')}`
      // The cleaned WebP photo, sent as a "data URL" (the bytes written as text).
      const result = await cloudinary.uploader.upload(
        `data:image/webp;base64,${buffer.toString('base64')}`,
        {
          public_id: publicId,
          resource_type: 'image',
          overwrite: false, // never replace another photo
        },
      )
      return { url: result.secure_url, key: result.public_id }
    },

    async remove(key) {
      if (typeof key !== 'string' || !KEY_PATTERN.test(key)) return
      // invalidate: also remove the copies Cloudinary's CDN keeps around the world.
      // Already gone is fine: Cloudinary answers "not found" without an error.
      await cloudinary.uploader.destroy(key, { resource_type: 'image', invalidate: true })
    },
  }
}
