import mongoose from 'mongoose'

// One design reference in her gallery.
const designSchema = new mongoose.Schema({
  // The public number customers quote ("Design: #3 Cherry bows"). It never changes
  // and is never given to another design, even after this one is deleted.
  number: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
  // The photo, or null to show a drawn placeholder instead.
  //   url: where browsers load it from, key: the file name in storage (used to delete it)
  image: {
    type: { url: String, key: String },
    default: null,
    _id: false,
  },
  // Two colours ('#rrggbb'), used to paint the placeholder and the hand in the story card.
  colors: {
    type: [String],
    validate: (list) => list.length === 2 && list.every((c) => /^#[0-9a-f]{6}$/i.test(c)),
  },
  hidden: { type: Boolean, default: false }, // hidden designs are not shown to customers
  order: { type: Number, default: 0 }, // smaller numbers are shown first
})

export const Design = mongoose.model('Design', designSchema)
