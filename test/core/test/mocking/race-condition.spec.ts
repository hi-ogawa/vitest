import { expect, test, vi } from 'vitest'

vi.mock('./race-condition-mocked', () => ({ default: 'mocked' }))

test('import in parallel', async () => {
  const all = await Promise.all([
    import('./race-condition-mocked').then(v => v.default),
    import('./race-condition-mocked').then(v => v.default),
    import('./race-condition-mocked').then(v => v.default),
    import('./race-condition-mocked').then(v => v.default),
    import('./race-condition-mocked').then(v => v.default),
  ])
  expect(all).toMatchInlineSnapshot(`
    [
      "mocked",
      "mocked",
      "mocked",
      "mocked",
      "mocked",
    ]
  `)
})
