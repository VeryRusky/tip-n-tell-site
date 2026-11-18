import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Where the backend runs in development. Usually port 8000. To use a second copy of the
// API (e.g. on port 8020), start Vite with API_PROXY_TARGET=http://localhost:8020.
// This is only read here, on your computer; it is never sent to the browser.
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // In development, send API calls and uploaded photos to the backend (backend/).
  // The browser only ever talks to this one address, so the login cookie stays first-party
  // and no CORS set-up is needed.
  server: {
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
  },
})
