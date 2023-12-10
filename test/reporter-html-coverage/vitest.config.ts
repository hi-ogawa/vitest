import { defineConfig } from 'vitest/config'

// test report mode
//   pnpm test run
//   pnpm exec vite preview --outDir html

// test ui mode
//   pnpm test -- --ui

export default defineConfig({
  test: {
    reporters: ["html"],
    coverage: {
      enabled: true,
      reporter: ['text', 'html'],
      reportsDirectory: "html/coverage"
    },
  },
})
