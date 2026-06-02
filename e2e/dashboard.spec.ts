import { expect, test } from '@playwright/test'

// TODO: Update these tests as the Student Dashboard data shape is finalized.
// public/data.json should contain a representative student fixture.

test('student dashboard loads without errors', async ({ page }) => {
  await page.goto('/')
  // The custom element should be present
  const appEl = page.locator('student-dashboard-app')
  await expect(appEl).toBeAttached()
})

