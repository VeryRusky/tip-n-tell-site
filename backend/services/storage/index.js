import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDiskStorage } from './diskStorage.js'
import { createCloudinaryStorage } from './cloudinaryStorage.js'

// Picks where photos are stored, from STORAGE_DRIVER in .env:
//   local      -> files in backend/uploads/ (your computer)
//   cloudinary -> Cloudinary, using CLOUDINARY_URL (the live site)
const backendFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const defaultUploadsFolder = path.join(backendFolder, 'uploads')

export function createStorage(config) {
  if (config.storageDriver === 'local') {
    return createDiskStorage(config.uploadsDir || defaultUploadsFolder)
  }

  // The live site: photos on Cloudinary (rules in cloudinaryStorage.js).
  if (config.storageDriver === 'cloudinary') {
    return createCloudinaryStorage(config.cloudinaryUrl)
  }

  throw new Error(`Unknown STORAGE_DRIVER "${config.storageDriver}". Use "local" or "cloudinary".`)
}
