import { expectTypeOf, test } from 'vitest'

test('basic', () => {
  expectTypeOf<true>().toEqualTypeOf<false>()
})
