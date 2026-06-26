import { expect, test, type Page } from '@playwright/test'

const views = ['Timer', 'Entries', 'Projects', 'Export'] as const

async function selectView(page: Page, view: (typeof views)[number]) {
  await page.getByRole('tab', { name: view }).click()
  await expect(page.getByRole('tab', { name: view })).toHaveAttribute('aria-selected', 'true')
}

test.describe('mobile layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('does not create page or nav horizontal overflow', async ({ page }) => {
    for (const view of views) {
      await selectView(page, view)

      await expect
        .poll(() =>
          page.evaluate(() => ({
            bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
            navOverflow:
              document.querySelector('.nav-list')!.scrollWidth -
              document.querySelector('.nav-list')!.clientWidth,
            pageOverflow:
              document.documentElement.scrollWidth - document.documentElement.clientWidth,
          })),
        )
        .toEqual({
          bodyOverflow: 0,
          navOverflow: 0,
          pageOverflow: 0,
        })
    }
  })

  test('keeps the mobile navigation fixed at the bottom across views', async ({ page }) => {
    for (const view of views) {
      await selectView(page, view)

      await expect
        .poll(() =>
          page.evaluate(() => {
            const sidebar = document.querySelector('.sidebar')!
            const main = document.querySelector('.main-content')!
            const sidebarRect = sidebar.getBoundingClientRect()

            return {
              bottomOffset: Math.round(window.innerHeight - sidebarRect.bottom),
              contentPaddingCoversNav:
                Number.parseFloat(getComputedStyle(main).paddingBottom) >= sidebarRect.height + 16,
              position: getComputedStyle(sidebar).position,
              topIsInBottomHalf: sidebarRect.top > window.innerHeight / 2,
            }
          }),
        )
        .toEqual({
          bottomOffset: 0,
          contentPaddingCoversNav: true,
          position: 'fixed',
          topIsInBottomHalf: true,
        })
    }
  })

  test('renders form controls large enough to avoid mobile focus zoom', async ({ page }) => {
    for (const view of views) {
      await selectView(page, view)

      const fontSizes = await page
        .locator('.field input, .field select')
        .evaluateAll((controls) =>
          controls.map((control) => Number.parseFloat(getComputedStyle(control).fontSize)),
        )

      expect(fontSizes.length).toBeGreaterThan(0)
      expect(fontSizes.every((fontSize) => fontSize >= 16)).toBe(true)
    }
  })
})
