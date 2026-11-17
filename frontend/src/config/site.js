// Brand and business settings in one place.
// A non-developer can change the text and numbers here without touching any page.
// Prices, designs and slots are NOT here: they come from src/services/api.js.

export const site = {
  brandName: 'tip n tell',
  tagline: 'Nail sets at nail model prices',

  // Her Instagram username (confirmed). Customers send their request to this account.
  instagramHandle: '_tipntell',

  // Only the area is public. Never put her home address or WhatsApp number here.
  area: 'Pasir Ris',

  // The middle session (24-hour clock). Long sets booked here can run into the next slot.
  midSessionTime: '14:00',
  midSessionAdvice:
    'The 2pm session is not recommended for complicated designs, because a long set can run into the next slot. Choose 10am or 4pm if your design is detailed.',

  // Key used to keep an unfinished request in this browser (choices only, no personal data).
  storageKey: 'tipntell-request',
}

// Her terms, lightly rewritten for the web. Prices are not here: the Pricing
// section is built from the live price list. `onHome: true` also shows it on the home page.
export const policies = [
  {
    id: 'duration',
    title: 'Duration',
    text: 'Sets take 2 to 4 hours, depending on the design. Please book only if you are comfortable with that.',
    onHome: true,
  },
  {
    id: 'how-to-book',
    title: 'How to book',
    text: 'Pick an open time on this site and send me your request on Instagram. Your slot is confirmed only when I reply.',
    onHome: false,
  },
  {
    id: 'design',
    title: 'Design reference',
    text: 'Choose a design from my references and tell me which one you would like. You can also bring your own design, and I will quote the price in DM.',
    onHome: false,
  },
  {
    id: 'on-time',
    title: 'Be considerate',
    text: 'Please be on time. If you are more than 15 minutes late, your slot may be shortened.',
    onHome: true,
  },
  {
    id: 'cancel',
    title: 'Cancelling or rescheduling',
    text: 'Let me know at least 24 hours before if you need to cancel or reschedule.',
    onHome: true,
  },
  {
    id: 'preferences',
    title: 'Allergies and preferences',
    text: 'Tell me about any allergies, sensitivities or preferences in your DM before the appointment.',
    onHome: true,
  },
]

// Links built from the handle above.
// Her profile works everywhere; customers tap "Message" there to DM her.
export const instagramProfileUrl = `https://www.instagram.com/${site.instagramHandle}/`
// Opens her chat directly in the Instagram app on phones (tested by the student, 17 Nov 2026).
// On a laptop browser it loads forever, so it is only used on phones and tablets.
// Adding ?text=... does not pre-fill the message, so the site copies it instead.
export const instagramChatUrl = `https://ig.me/m/${site.instagramHandle}`
