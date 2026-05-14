import { describe, expect, it } from 'vitest'
import { getDashboardSummary, type FieldMetadata, type Student } from '../lib/data'
import { calculateProgress, getAssessmentLabel } from '../lib/utils'

const metadata: Record<string, FieldMetadata> = {
  mp1: { title: 'Marking Period 1', container_title: 'Listening' },
  mp2: { title: 'Marking Period 2', container_title: 'Listening' },
}

describe('performance indicator rubric', () => {
  it('treats "/" as not assessed in assessment labels', () => {
    const label = getAssessmentLabel('/')
    expect(label.meaning).toBe('Not assessed at this time')
    expect(label.cssClass).toBe('val-empty')
  })

  it('defaults null assessment values to "/"', () => {
    const label = getAssessmentLabel(null)
    expect(label.symbol).toBe('/')
    expect(label.meaning).toBe('Not assessed at this time')
  })

  it('excludes "/" from progress totals and counts "+" as meeting', () => {
    const progress = calculateProgress(
      [
        { element_id: 'mp1', value: '+' },
        { element_id: 'mp2', value: '/' },
      ],
      metadata,
    )

    expect(progress.meets).toBe(1)
    expect(progress.total).toBe(1)
    expect(progress.percent).toBe(100)
  })

  it('excludes "/" from dashboard averages', () => {
    const students: Student[] = [
      {
        student_dcid: '1',
        student_number: 1001,
        first_name: 'Ada',
        last_name: 'Teacher',
        grade_level: 4,
        home_room: '10',
        response: {
          id: 'r1',
          submitted_at: '2024-01-01T00:00:00Z',
          fields: [
            { element_id: 'mp1', value: '✓' },
            { element_id: 'mp2', value: '/' },
          ],
        },
      },
    ]

    const summary = getDashboardSummary(students, metadata)
    expect(summary.avgProgress).toBe(100)
  })
})
