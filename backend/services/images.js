import sharp from 'sharp'
import { BadRequest } from './validate.js'

// Every uploaded photo goes through here before it is stored. This step cannot be
// skipped: it is what guarantees that hidden details in a phone photo (such as the
// GPS location where it was taken, which would be her home) never reach the public site.
//
//   1. decode the file (anything that is not a real picture is rejected)
//   2. turn it the right way up (phones store rotation in the photo's EXIF data)
//   3. shrink it to at most 1600 pixels on the long edge
//   4. save it as a brand-new WebP file. sharp copies NO metadata (EXIF, GPS, camera
//      details, ICC profile) into the new file unless asked to, and we never ask.

const MAX_EDGE = 1600
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'heif', 'gif']

// Turns { r, g, b } into '#rrggbb'.
function toHex({ r, g, b }) {
  return '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
}

export async function processPhoto(buffer) {
  let format
  try {
    // limitInputPixels stops "decompression bombs" (tiny files that unpack to huge images).
    const metadata = await sharp(buffer, { limitInputPixels: 60_000_000 }).metadata()
    format = metadata.format
  } catch {
    throw new BadRequest(
      'That file is not a photo we can read. Please choose a JPEG, PNG or WebP picture.',
    )
  }
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new BadRequest('Please choose a JPEG, PNG or WebP picture.')
  }

  try {
    const image = sharp(buffer, { limitInputPixels: 60_000_000 })
      .rotate() // with no angle: turn upright using the EXIF orientation
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })

    const output = await image.clone().webp({ quality: 82 }).toBuffer()

    // Two colours from the photo for the drawn pictures (story card hand, tints):
    // the most common colour, and the average colour.
    const stats = await image.clone().stats()
    const average = {
      r: stats.channels[0].mean,
      g: stats.channels[1]?.mean ?? stats.channels[0].mean,
      b: stats.channels[2]?.mean ?? stats.channels[0].mean,
    }
    const colors = [toHex(stats.dominant), toHex(average)]

    return { buffer: output, colors }
  } catch {
    throw new BadRequest('That photo could not be processed. Please try a different picture.')
  }
}
