// Makes a phone photo smaller in the browser before it is uploaded, so adding a design
// is quick on mobile data. A 12-megapixel photo (4 MB+) becomes about 1600 px on the long
// edge (a few hundred kB). Drawing it on a canvas also leaves behind its hidden details
// (EXIF, GPS). The server still cleans every photo again, so this is only a speed-up.
//
// If the browser cannot read the file, the original is returned and the server decides.
export async function shrinkPhoto(file, maxEdge = 1600, quality = 0.85) {
  try {
    // 'from-image' turns the photo upright using the rotation the phone stored in it.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file
  }
}
