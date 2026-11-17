import { Design } from '../models/Design.js'
import { Counter } from '../models/Counter.js'
import { processPhoto } from '../services/images.js'
import { BadRequest, check, cleanName, isId } from '../services/validate.js'

// The owner's design gallery: add, rename, hide, reorder, replace photo, delete.

function toAdminDesign(design) {
  return {
    id: String(design._id),
    number: design.number,
    name: design.name,
    image: design.image?.url ?? null,
    colors: design.colors,
    hidden: design.hidden,
    order: design.order,
  }
}

// The next public design number: one more than any number given out before.
// The counter remembers numbers of deleted designs, so they are never reused.
export async function nextDesignNumber() {
  const highest = await Design.findOne().sort({ number: -1 }).lean()
  // Make sure the counter is at least the highest number in use (e.g. after seeding)...
  await Counter.updateOne(
    { _id: 'designNumber' },
    { $max: { value: highest?.number ?? 0 } },
    { upsert: true },
  )
  // ...then add one and take it in a single step, so two requests never get the same number.
  const counter = await Counter.findOneAndUpdate(
    { _id: 'designNumber' },
    { $inc: { value: 1 } },
    { returnDocument: 'after' },
  )
  return counter.value
}

// GET /api/admin/designs -> every design, hidden ones included, in order.
export async function list(req, res) {
  const designs = await Design.find().sort({ order: 1, number: 1 }).lean()
  res.json(designs.map(toAdminDesign))
}

// POST /api/admin/designs  (a form upload: "name", and the photo in "image")
// A new design goes first in the gallery, where customers will notice it.
export async function create(req, res) {
  const name = cleanName(req.body?.name)
  if (!req.file) throw new BadRequest('Please choose a photo.')

  const photo = await processPhoto(req.file.buffer)
  const storage = req.app.locals.storage
  const image = await storage.save(photo.buffer)

  try {
    const first = await Design.findOne().sort({ order: 1 }).lean()
    const design = await Design.create({
      number: await nextDesignNumber(),
      name,
      image,
      colors: photo.colors,
      hidden: false,
      order: first ? first.order - 1 : 0,
    })
    res.status(201).json(toAdminDesign(design))
  } catch (error) {
    await storage.remove(image.key) // don't leave an unused photo behind
    throw error
  }
}

// PATCH /api/admin/designs/:id  body: { name?, hidden? }
export async function update(req, res) {
  check(isId(req.params.id), 'Unknown design.')
  const { name, hidden } = req.body ?? {}
  const changes = {}
  if (name !== undefined) changes.name = cleanName(name)
  if (hidden !== undefined) {
    check(typeof hidden === 'boolean', 'hidden must be true or false.')
    changes.hidden = hidden
  }
  check(Object.keys(changes).length > 0, 'Nothing to change.')

  const design = await Design.findByIdAndUpdate(
    req.params.id,
    { $set: changes },
    { returnDocument: 'after' },
  ).lean()
  if (!design) return res.status(404).json({ error: 'That design no longer exists.' })
  res.json(toAdminDesign(design))
}

// PUT /api/admin/designs/:id/image  (a form upload with the new photo in "image")
// The design keeps its number, name and colours; only the photo changes.
export async function replaceImage(req, res) {
  check(isId(req.params.id), 'Unknown design.')
  if (!req.file) throw new BadRequest('Please choose a photo.')
  const design = await Design.findById(req.params.id)
  if (!design) return res.status(404).json({ error: 'That design no longer exists.' })

  const photo = await processPhoto(req.file.buffer)
  const storage = req.app.locals.storage
  const oldKey = design.image?.key
  design.image = await storage.save(photo.buffer)
  await design.save()
  if (oldKey) await storage.remove(oldKey)
  res.json(toAdminDesign(design))
}

// PUT /api/admin/designs/order  body: { ids: [every design id, in the new order] }
export async function reorder(req, res) {
  const ids = req.body?.ids
  check(Array.isArray(ids) && ids.every(isId), 'ids must be a list of design ids.')
  check(new Set(ids).size === ids.length, 'Each design can only appear once.')

  const all = await Design.find().select('_id').lean()
  const known = new Set(all.map((design) => String(design._id)))
  check(
    ids.length === known.size && ids.every((id) => known.has(id)),
    'The list must include every design.',
  )

  await Design.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
    })),
  )
  const designs = await Design.find().sort({ order: 1, number: 1 }).lean()
  res.json(designs.map(toAdminDesign))
}

// DELETE /api/admin/designs/:id  (also deletes its stored photo)
export async function remove(req, res) {
  check(isId(req.params.id), 'Unknown design.')
  const design = await Design.findByIdAndDelete(req.params.id).lean()
  if (!design) return res.status(404).json({ error: 'That design no longer exists.' })
  if (design.image?.key) await req.app.locals.storage.remove(design.image.key)
  res.status(204).end()
}
