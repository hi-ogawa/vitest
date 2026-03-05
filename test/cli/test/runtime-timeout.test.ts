import { expect, test } from 'vitest'
import { runInlineTests, ts } from '../../test-utils'

test('context.setTimeout can extend running test timeout', async () => {
  const { errorTree } = await runInlineTests({
    'a.test.ts': ts`
      import { test } from 'vitest'

      test('passes', async (ctx) => {
        ctx.setTimeout(300)
        await new Promise(resolve => setTimeout(resolve, 150))
      }, 50)
    `,
  })

  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "a.test.ts": {
        "passes": "passed",
      },
    }
  `)
})

test('context.setTimeout can shrink running test timeout', async () => {
  const { errorTree } = await runInlineTests({
    'a.test.ts': ts`
      import { test } from 'vitest'

      test('fails', async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 60))
        ctx.setTimeout(30)
        await new Promise(resolve => setTimeout(resolve, 10))
      }, 200)
    `,
  })

  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "a.test.ts": {
        "fails": [
          "Test timed out in 30ms.
    If this is a long-running test, pass a timeout value as the last argument or configure it globally with \"testTimeout\".",
        ],
      },
    }
  `)
})

test('context.setTimeout from beforeEach applies to test body', async () => {
  const { errorTree } = await runInlineTests({
    'a.test.ts': ts`
      import { beforeEach, test } from 'vitest'

      beforeEach((ctx) => {
        ctx.setTimeout(250)
      })

      test('passes', async () => {
        await new Promise(resolve => setTimeout(resolve, 120))
      }, 50)
    `,
  })

  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "a.test.ts": {
        "passes": "passed",
      },
    }
  `)
})
