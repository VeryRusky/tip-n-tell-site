import mongoose from 'mongoose'

// Remembers the last number handed out, e.g. { _id: 'designNumber', value: 8 }.
// Design numbers come from here, so a deleted design's number is never reused.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  value: { type: Number, default: 0 },
})

export const Counter = mongoose.model('Counter', counterSchema)
