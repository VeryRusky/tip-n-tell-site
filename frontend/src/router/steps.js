// The booking steps in order. Each step's route has meta.step set to its number.
// Used by the router guard and by the step indicator (BookingSteps.vue).
export const bookingSteps = [
  { step: 1, name: 'book-slot', label: 'Time' },
  { step: 2, name: 'book-service', label: 'Service' },
  { step: 3, name: 'book-design', label: 'Design' },
  { step: 4, name: 'book-send', label: 'Send' },
]
