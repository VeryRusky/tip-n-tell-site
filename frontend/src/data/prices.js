// Sample price list, taken from her terms (Nov 2026, nail model phase).
// Only src/services/api.js reads this file.

export const sampleServices = [
  {
    id: 'no-extensions',
    name: 'No extensions',
    description: 'A set on your natural nails.',
    price: 25,
  },
  {
    id: 'extensions',
    name: 'Extensions',
    description: 'Adds length with extensions.',
    price: 35,
  },
]

export const sampleAddOns = [
  {
    id: 'foreign-removal',
    name: 'Foreign removal',
    description: 'Removing a set that another nail tech did.',
    price: 10,
  },
]

// Extra charge for a slot she opens outside her usual days.
export const sampleSpecialSlotFee = 10
