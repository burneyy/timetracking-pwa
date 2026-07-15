import { expect, test } from '@playwright/test'

test('starts a project card before adding an optional task', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('tab', { name: 'Projects' }).click()
  await page.getByLabel('Name').fill('Client Project')
  await page.getByLabel('Alias').fill('CLIENT')
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Edit Client Project' })).toBeVisible()

  await page.getByRole('tab', { name: 'Timer' }).click()
  await page.getByRole('button', { name: 'Start CLIENT' }).click()

  await expect(page.getByRole('article', { name: 'Active timer' })).toBeVisible()
  await expect(page.getByRole('timer')).toContainText('No task')

  await page.getByLabel('Task (optional)').fill('Planning')
  await expect(page.getByRole('timer')).toContainText('Planning')

  await page.reload()
  await expect(page.getByRole('article', { name: 'Active timer' })).toBeVisible()
  await expect(page.getByRole('timer')).toContainText('Planning')
})
