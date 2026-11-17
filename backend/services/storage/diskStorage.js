import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

// Stores photos as files in a folder on this computer (backend/uploads/ by default).
// Good for development. On a free host the disk is wiped on every deploy, so the
// live site will use the Cloudinary driver instead (see index.js).
//
// Every driver has the same two functions:
//   save(buffer) -> { url, key }   url: where browsers load it, key: used to delete it
//   remove(key)
export function createDiskStorage(folder) {
  // Only names this driver made itself are accepted, so a key can never point
  // outside the uploads folder (e.g. '../server.js').
  const KEY_PATTERN = /^[a-f0-9]{32}\.webp$/

  return {
    folder,

    async save(buffer) {
      await fs.mkdir(folder, { recursive: true })
      // A random name: it cannot be guessed and says nothing about the photo.
      const key = `${crypto.randomBytes(16).toString('hex')}.webp`
      await fs.writeFile(path.join(folder, key), buffer)
      return { url: `/uploads/${key}`, key }
    },

    async remove(key) {
      if (typeof key !== 'string' || !KEY_PATTERN.test(key)) return
      try {
        await fs.unlink(path.join(folder, key))
      } catch (error) {
        if (error.code !== 'ENOENT') throw error // already gone is fine
      }
    },
  }
}
