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
  //   Upload the buffer that services/images.js produced (already cleaned of metadata).
  // ------------------------------------------------------------------
  throw new Error(`Unknown STORAGE_DRIVER "${config.storageDriver}". Use "local".`)
}
