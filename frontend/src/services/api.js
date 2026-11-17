// Every piece of data the site shows comes through this file.
//
// Today each function returns sample data from src/data/.
// When the Express + MongoDB API exists, replace each body with an Axios call, e.g.
//
//   const response = await axios.get(`${API_URL}/slots`, { params: { month } })
//   return response.data
//
// Stores and components only call these functions, so nothing else has to change.

import { sampleOpenMonths, sampleSlots } from '@/data/slots'
import { sampleServices, sampleAddOns, sampleSpecialSlotFee } from '@/data/prices'
import { sampleDesigns } from '@/data/designs'

// Waits a moment and returns a copy, like a real request would.
// The copy stops pages from accidentally changing the sample data.
function fakeRequest(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(data)), 150)
  })
}

// Months that have slots, e.g. ['2026-12', '2027-01'].
export async function getOpenMonths() {
  return fakeRequest(sampleOpenMonths)
}

// All slots in one month. `month` looks like '2026-12'.
export async function getSlots(month) {
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

export async function getDesigns() {
  return fakeRequest(sampleDesigns)
}
