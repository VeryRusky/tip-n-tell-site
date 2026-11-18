import axios from 'axios'
import router from '@/router'

// Calls for the owner's admin pages. Only the admin pages import this file, and they are
// loaded on demand, so customers never download it.
//
// The login is a session cookie that the browser sends by itself (same website address),
// so nothing here handles tokens or passwords.
const admin = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/admin`,
  timeout: 60000,
})

// If the server says "not signed in" (401) at any point, e.g. the session ran out,
// go to the login page and come back here afterwards.
admin.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const current = router.currentRoute.value
      if (current.name !== 'admin-login') {
        router.push({ name: 'admin-login', query: { next: current.fullPath, expired: '1' } })
      }
    }
    return Promise.reject(error)
  },
)

// A short message to show for a failed request.
export function errorMessage(error, fallback = 'That did not work. Please try again.') {
  if (!error.response) return 'No connection to the site. Check your internet and try again.'
  if ([502, 503, 504].includes(error.response.status)) {
    return 'The site is not responding right now. Please try again in a minute.'
  }
  return error.response.data?.error ?? fallback
}

// ---- Signing in ----

// { googleClientId, devLogin }: what the login page should show.
export async function getLoginOptions() {
  return (await admin.get('/config')).data
}

// { signedIn: true, email } or { signedIn: false }
export async function getSession() {
  return (await admin.get('/session')).data
}

// `credential` is the ID token Google's button gives the page.
export async function signInWithGoogle(credential) {
  return (await admin.post('/session/google', { credential })).data
}

// Only works on a developer's computer (the server has ALLOW_DEV_LOGIN=true).
export async function devSignIn() {
  return (await admin.post('/session/dev')).data
}

export async function signOut() {
  await admin.delete('/session')
}

// ---- Calendar ----

// Every slot in a month, past days included. Each: { id, date, time, status, special }
export async function getMonthSlots(month) {
  return (await admin.get('/slots', { params: { month } })).data
}

// Opens every time on every date. Returns { created: [slots], skipped: number }.
export async function openSlots(dates, times, special = false) {
  return (await admin.post('/slots', { dates, times, special })).data
}

// changes: { status }, { special } and/or { booking } (details, or null to clear them).
// Returns the updated slot.
export async function updateSlot(id, changes) {
  return (await admin.patch(`/slots/${id}`, changes)).data
}

export async function removeSlot(id) {
  await admin.delete(`/slots/${id}`)
}

// The server takes at most 100 slots per request, so bigger jobs are sent in parts.
const SLOTS_PER_REQUEST = 100

function inParts(list) {
  const parts = []
  for (let i = 0; i < list.length; i += SLOTS_PER_REQUEST) {
    parts.push(list.slice(i, i + SLOTS_PER_REQUEST))
  }
  return parts
}

// Removes several slots. Returns the removed slots as they were (for Undo).
export async function removeSlots(ids) {
  const removed = []
  for (const part of inParts(ids)) {
    removed.push(...(await admin.post('/slots/remove', { ids: part })).data.removed)
  }
  return removed
}

// Puts removed slots back with the same status and special (Undo).
// slots: [{ date, time, status, special }]. Returns { created: [slots], skipped: number }.
// Booking details make a slot bigger, so restore requests are also kept under about 8 kB
// (the server accepts at most 10 kB per request).
const MAX_REQUEST_SIZE = 8000

export async function restoreSlots(slots) {
  // Only these values are sent (not the old id).
  const toSend = slots.map((slot) => {
    const copy = { date: slot.date, time: slot.time, status: slot.status, special: slot.special }
    if (slot.booking) copy.booking = slot.booking
    return copy
  })
  // Split into requests of at most 100 slots and about 8 kB each.
  const parts = []
  let part = []
  let size = 0
  for (const slot of toSend) {
    const slotSize = JSON.stringify(slot).length + 1
    if (
      part.length > 0 &&
      (part.length === SLOTS_PER_REQUEST || size + slotSize > MAX_REQUEST_SIZE)
    ) {
      parts.push(part)
      part = []
      size = 0
    }
    part.push(slot)
    size += slotSize
  }
  if (part.length > 0) parts.push(part)

  const result = { created: [], skipped: 0 }
  for (const body of parts) {
    const data = (await admin.post('/slots/restore', { slots: body })).data
    result.created.push(...data.created)
    result.skipped += data.skipped
  }
  return result
}

// ---- Designs ----

// Every design, hidden ones included. Each: { id, number, name, image, colors, hidden, order }
export async function getAdminDesigns() {
  return (await admin.get('/designs')).data
}

// Sends a photo as a form upload. onProgress(0 to 100) is called as it uploads.
function photoForm(photo, name) {
  const form = new FormData()
  if (name !== undefined) form.append('name', name)
  form.append('image', photo, 'photo.jpg')
  return form
}

function progressHandler(onProgress) {
  return (event) => {
    if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
  }
}

export async function addDesign(name, photo, onProgress) {
  const response = await admin.post('/designs', photoForm(photo, name), {
    onUploadProgress: progressHandler(onProgress),
  })
  return response.data
}

// changes: { name } and/or { hidden }
export async function updateDesign(id, changes) {
  return (await admin.patch(`/designs/${id}`, changes)).data
}

export async function replaceDesignPhoto(id, photo, onProgress) {
  const response = await admin.put(`/designs/${id}/image`, photoForm(photo), {
    onUploadProgress: progressHandler(onProgress),
  })
  return response.data
}

// ids: every design id in the new order. Returns the designs in that order.
export async function saveDesignOrder(ids) {
  return (await admin.put('/designs/order', { ids })).data
}

export async function removeDesign(id) {
  await admin.delete(`/designs/${id}`)
}
