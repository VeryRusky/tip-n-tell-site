import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDiskStorage } from './diskStorage.js'

// Picks where photos are stored, from STORAGE_DRIVER in .env.
const backendFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const defaultUploadsFolder = path.join(backendFolder, 'uploads')

export function createStorage(config) {
  if (config.storageDriver === 'local') {
    return createDiskStorage(config.uploadsDir || defaultUploadsFolder)
  }

  // ------------------------------------------------------------------
  // TODO (deploy session): Cloudinary driver goes here.
  //   Add services/storage/cloudinaryStorage.js with the same two functions,
  //   save(buffer) -> { url, key } and remove(key), using CLOUDINARY_URL from .env,
  //   then return it here when config.storageDriver === 'cloudinary'.
  //   Rules for it (from the security review, L1 and L7):
  //   - Upload ONLY the cleaned buffer from processPhoto() in services/images.js,
  //     never req.file or the original upload.
  //   - Give each photo a random public_id (e.g. crypto.randomBytes(16).toString('hex')),
  //     never the original file name.
  //   - In remove(key), check the key matches the pattern this driver makes before
  //     calling destroy(), and pass { invalidate: true } so Cloudinary's CDN forgets it.
  // ------------------------------------------------------------------
  throw new Error(`Unknown STORAGE_DRIVER "${config.storageDriver}". Use "local".`)
}
