import multer from 'multer'

// Reads one photo from a form upload (field name "image") into memory.
// Nothing is written to disk here: services/images.js cleans the photo first.
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

const reader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 1, // one photo per request
    fields: 5, // a few small text fields (the name)
    fieldSize: 1024,
    parts: 6,
  },
})

// Like reader.single('image'), but turns multer's errors into short, clear answers.
export function readOnePhoto(req, res, next) {
  reader.single('image')(req, res, (error) => {
    if (!error) return next()
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'That photo is too large (8 MB at most).' })
    }
    res.status(400).json({ error: 'Please upload one photo.' })
  })
}
