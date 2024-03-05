import { defineConfig } from 'vitest/config'

// debug by page.pause() and PW_HEADED=1 pnpm test-e2e

export default defineConfig({
  test: {
    dir: './test',
    // playwright-like defaults
    watch: false,
    testTimeout: process.env.PW_HEADED ? Number.POSITIVE_INFINITY : 30_000,
  },
})
