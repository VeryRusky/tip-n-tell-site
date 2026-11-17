import axios from 'axios'

// The Axios instance for the public API (slots and designs).
// VITE_API_URL is '/api': the same website address, so no CORS is needed. In development,
// Vite's dev server forwards /api to the backend on port 8000 (see vite.config.js).
//
// The timeout is long on purpose: a free host may be asleep and take up to a minute to wake.
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000,
})
