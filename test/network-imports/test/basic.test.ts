import { expect, test } from 'vitest'

// @ts-expect-error network imports
import React from 'https://esm.sh/react@18.2.0'

test('react', async () => {
  expect(React.version).toBe('18.2.0')
})
