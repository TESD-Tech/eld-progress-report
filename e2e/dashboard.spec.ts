import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const eldJsonPath = path.resolve(process.cwd(), 'public/eld.json')
const mockEldData = JSON.parse(readFileSync(eldJsonPath, 'utf-8')) as {
  data?: Array<{
    student_dcid: string
    first_name?: string
    last_name?: string
  }>
}
const students = mockEldData.data ?? []

if (students.length === 0) {
  throw new Error('public/eld.json must include at least one student in data[] for E2E tests.')
}

const firstStudent = students[0]
const secondStudent = students[1]
const guardianSubtitle = students.length > 1 ? 'Guardian View — Your Children' : 'Guardian View — Your Child'

function studentDisplayName(student: { first_name?: string; last_name?: string }) {
  return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Unknown Student'
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {}
  })

  await page.route('**/eld.json', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEldData),
    })
  })
})

async function openDashboardForPortal(page: Page, portal: 'admin' | 'teacher' | 'guardian') {
  await page.goto('/')
  await page.evaluate((targetPortal) => {
    const app = document.querySelector('eld-progress-report-app')
    if (!app) throw new Error('ELD app custom element not found')
    app.setAttribute('portal', targetPortal)
  }, portal)
}

async function captureValidationScreenshot(page: Page, testInfo: TestInfo, filename: string) {
  await test.step('capture validation screenshot', async () => {
    const screenshotPath = testInfo.outputPath(filename)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach(filename, {
      path: screenshotPath,
      contentType: 'image/png',
    })
  })
}

test('loads dashboard student table and supports filtering', async ({ page }, testInfo) => {
  await openDashboardForPortal(page, 'admin')

  const firstStudentName = studentDisplayName(firstStudent)

  await expect(page.getByRole('heading', { name: 'ELD Progress Report' })).toBeVisible()
  await expect(page.getByText(firstStudentName).first()).toBeVisible()
  if (secondStudent) {
    await expect(page.getByText(studentDisplayName(secondStudent)).first()).toBeVisible()
  }
  await expect(page.getByRole('columnheader', { name: 'Student' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Room' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Last Assessment' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible()

  await page.getByLabel('Search').fill(firstStudent.first_name ?? firstStudentName)
  await expect(page.getByText(firstStudentName).first()).toBeVisible()
  if (secondStudent) {
    await expect(page.getByText(studentDisplayName(secondStudent))).toHaveCount(0)
  }
  await captureValidationScreenshot(page, testInfo, 'dashboard-filtered-table.png')
})

test('shows correct student table columns for admin, teacher, and guardian portals', async ({ page }, testInfo) => {
  await openDashboardForPortal(page, 'admin')
  await expect(page.getByText('Administrative Dashboard — All Students')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Progress' })).toBeVisible()

  await page.evaluate(() => {
    document.querySelector('eld-progress-report-app')?.setAttribute('portal', 'teacher')
  })
  await expect(page.getByText('Teacher Dashboard — My Students')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Progress' })).toBeVisible()

  await page.evaluate(() => {
    document.querySelector('eld-progress-report-app')?.setAttribute('portal', 'guardian')
  })
  await expect(page.getByText(guardianSubtitle)).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Progress' })).toHaveCount(0)
  await captureValidationScreenshot(page, testInfo, 'portal-columns-guardian-view.png')
})

test('hides progress column in guardian dashboard', async ({ page }, testInfo) => {
  await openDashboardForPortal(page, 'guardian')

  await expect(page.getByText(guardianSubtitle)).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Student' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Progress' })).toHaveCount(0)
  await expect(page.locator('table tbody tr')).toHaveCount(students.length)

  await captureValidationScreenshot(page, testInfo, 'guardian-no-progress-column.png')
})

test('loads the student report page for a selected student', async ({ page }, testInfo) => {
  await openDashboardForPortal(page, 'teacher')

  await page.getByRole('button', { name: 'View Report' }).first().click()
  await expect(page.getByRole('button', { name: '← Back to Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: studentDisplayName(firstStudent) })).toBeVisible()
  await expect(page.getByText('Student ID')).toBeVisible()
  await expect(page.getByText('Assessment Date')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print Report' })).toBeVisible()
  await expect(page.locator('.student-header')).toBeVisible()
  await captureValidationScreenshot(page, testInfo, 'student-report-view.png')

  await page.getByRole('button', { name: '← Back to Dashboard' }).click()
  await expect(page.getByRole('button', { name: 'View Report' }).first()).toBeVisible()
})

test('renders the print view for a student report', async ({ page }, testInfo) => {
  await openDashboardForPortal(page, 'admin')

  await page.getByRole('button', { name: 'View Report' }).first().click()
  await page.getByRole('button', { name: 'Print Report' }).click()

  await expect(page.getByRole('button', { name: /Back/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ELD Progress Report' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Skill Area' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Marking Period 1' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Marking Period 2' })).toBeVisible()
  await expect(page.getByRole('heading', { name: studentDisplayName(firstStudent) })).toBeVisible()
  await captureValidationScreenshot(page, testInfo, 'print-view.png')
})
