import { chromium, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { beforeAll, describe, test } from 'vitest'
import { preview } from 'vite'
import { startVitest } from 'vitest/node'

const port = 9001
const pageUrl = `http://localhost:${port}/`

describe('html report', () => {
  let page: Page

  beforeAll(async () => {
    // generate vitest html report
    await startVitest('test', [], {
      root: './fixtures',
      run: true,
      reporters: 'html',
      coverage: {
        enabled: true,
        reportsDirectory: 'html/coverage',
      },
    })

    // run vite preview server
    const previewServer = await preview({
      build: { outDir: 'fixtures/html' },
      preview: { port, strictPort: true },
    })

    const browser = await chromium.launch({
      headless: !process.env.PW_HEADED,
    })
    page = await browser.newPage()

    return async () => {
      await browser.close()
      await new Promise<void>((resolve, reject) => {
        previewServer.httpServer.close((err) => {
          err ? reject(err) : resolve()
        })
      })
    }
  })

  test('basic', async () => {
    const pageErrors: unknown[] = []
    page.on('pageerror', error => pageErrors.push(error))

    await page.goto(pageUrl)

    // dashbaord
    await expect(page.locator('[aria-labelledby=tests]')).toContainText('5 Pass 1 Fail 6 Total')

    // unhandled errors
    await expect(page.getByTestId('unhandled-errors')).toContainText(
      'Vitest caught 2 errors during the test run. This might cause false positive tests. '
      + 'Resolve unhandled errors to make sure your tests are not affected.',
    )

    await expect(page.getByTestId('unhandled-errors-details')).toContainText('Error: error')
    await expect(page.getByTestId('unhandled-errors-details')).toContainText('Unknown Error: 1')

    // report
    await page.getByTestId('details-panel').getByText('sample.test.ts').click()
    await page.getByText('All tests passed in this file').click()
    await expect(page.getByTestId('filenames')).toContainText('sample.test.ts')

    // graph tab
    await page.getByTestId('btn-graph').click()
    await expect(page.locator('[data-testid=graph] text')).toContainText('sample.test.ts')

    // console tab
    await page.getByTestId('btn-console').click()
    await expect(page.getByTestId('console')).toContainText('log test')

    expect(pageErrors).toEqual([])
  })

  test('coverage', async () => {
    await page.goto(pageUrl)
    await page.getByLabel('Show coverage').click()
    await page.frameLocator('#vitest-ui-coverage').getByRole('heading', { name: 'All files' }).click()
  })

  test('error', async () => {
    await page.goto(pageUrl)
    await page.getByText('error.test.ts').click()
    await expect(page.getByTestId('diff')).toContainText('- Expected + Received + <style>* {border: 2px solid green};</style>')
  })
})
