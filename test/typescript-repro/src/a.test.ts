import { expect, test } from 'vitest'

test('type error in normal test file', () => {
  expect(true * 2).toBe(2)
})
