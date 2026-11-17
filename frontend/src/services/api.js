// Every piece of data the site shows comes through this file.
//
// Two modes, chosen by VITE_API_URL (see .env.example):
//   - not set (the GitHub Pages demo): each function returns sample data from src/data/.
//   - set, e.g. '/api' (development with the backend, and the live site): slots and
//     designs come from the Express + MongoDB API with Axios.
// Function names and the shape of what they return are the same in both modes,
// so stores and components never need to know which one is in use.
//
// Prices stay on sample data in both modes: they are edited in src/data/prices.js.

import { sampleOpenMonths, sampleSlots } from '@/data/slots'
import { sampleServices, sampleAddOns, sampleSpecialSlotFee } from '@/data/prices'
import { sampleDesigns } from '@/data/designs'

const useApi = !!import.meta.env.VITE_API_URL

// Waits a moment and returns a copy, like a real request would.
// The copy stops pages from accidentally changing the sample data.
function fakeRequest(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(data)), 150)
  })
}

// GET from the real API. Axios (in ./http.js) is only loaded the first time this runs,
// so the sample-data demo never downloads it.
async function apiGet(path, params) {
  const { http } = await import('./http')
  const response = await http.get(path, { params })
  return response.data
}

// Months that have slots, e.g. ['2026-12', '2027-01'].
export async function getOpenMonths() {
  if (useApi) return apiGet('/slots/months')
  return fakeRequest(sampleOpenMonths)
}

// All slots in one month. `month` looks like '2026-12'.
// Each slot: { id: '2026-12-12T14:00', date, time, status: 'open' | 'pending' | 'booked', special }
export async function getSlots(month) {
  if (useApi) return apiGet('/slots', { month })
  return fakeRequest(sampleSlots.filter((slot) => slot.date.startsWith(month)))
}

export async function getServices() {
  return fakeRequest(sampleServices)
}

export async function getAddOns() {
  return fakeRequest(sampleAddOns)
}

export async function getSpecialSlotFee() {
  return fakeRequest(sampleSpecialSlotFee)
}

// Each design: { id: 3, name: 'Cherry bows', image: '/uploads/….webp' or null, colors: [a, b] }
export async function getDesigns() {
  if (useApi) return apiGet('/designs')
  return fakeRequest(sampleDesigns)
}
