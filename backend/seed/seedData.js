import { Slot } from '../models/Slot.js'
import { Design } from '../models/Design.js'
import { sampleSlots } from './sampleSlots.js'
import { sampleDesigns } from './sampleDesigns.js'

// Fills EMPTY collections with the sample slots and designs.
// A collection that already has anything in it is left exactly as it is,
// so this can never overwrite her real calendar or gallery.
export async function seedIfEmpty() {
  const result = { slots: 0, designs: 0 }

  if ((await Slot.countDocuments()) === 0) {
    await Slot.insertMany(sampleSlots)
    result.slots = sampleSlots.length
  }

  if ((await Design.countDocuments()) === 0) {
    const designs = sampleDesigns.map((design, index) => ({
      number: design.id,
      name: design.name,
      colors: design.colors,
      image: null, // no photo yet: the site draws a placeholder from the colours
      hidden: false,
      order: index,
    }))
    await Design.insertMany(designs)
    result.designs = designs.length
  }

  return result
}
