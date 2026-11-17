import { defineConfig } from 'vitest/config'

// Backend tests run in Node, one file at a time, each with its own temporary database.
export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
