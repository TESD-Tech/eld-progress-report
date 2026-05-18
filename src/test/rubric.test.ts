import { describe, expect, it } from 'vitest'
import { getDashboardSummary, normalizeELDStudents, type FieldMetadata, type Student } from '../lib/data'
import { calculateProgress, getAssessmentLabel, getMarkingPeriods, groupAssessmentFields } from '../lib/utils'

const metadata: Record<string, FieldMetadata> = {
  mp1: { title: 'Marking Period 1', container_title: 'Listening' },
  mp2: { title: 'Marking Period 2', container_title: 'Listening' },
  mp3: { title: 'Marking Period 3', container_title: 'Listening' },
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
        { element_id: 'mp3', value: '✓' },
      ],
      metadata,
    )

    expect(progress.meets).toBe(2)
    expect(progress.total).toBe(2)
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
            { element_id: 'mp3', value: '✓' },
          ],
        },
      },
    ]

    const summary = getDashboardSummary(students, metadata)
    expect(summary.avgProgress).toBe(100)
  })

  it('merges duplicate student rows into one response with all fields', () => {
    const students: Student[] = [
      {
        student_dcid: '57922',
        student_number: 2035592,
        first_name: 'Kangaroo',
        last_name: 'Tester',
        grade_level: 3,
        home_room: '8',
        response: {
          id: '34799696',
          submitted_at: '2026-02-27T09:46:57Z',
          fields: [{ element_id: 'mp1', value: '✓' }, { element_id: 'mp2', value: '✓' }],
        },
      },
      {
        student_dcid: '57922',
        student_number: 2035592,
        first_name: 'Mandrill',
        last_name: 'Tester',
        grade_level: 3,
        home_room: '8',
        response: {
          id: '35513800',
          submitted_at: '2026-05-13T15:11:29Z',
          fields: [{ element_id: 'mp3', value: '+' }],
        },
      },
    ]

    const merged = normalizeELDStudents(students)

    expect(merged).toHaveLength(1)
    expect(merged[0].first_name).toBe('Mandrill')
    expect(merged[0].response?.id).toBe('35513800')
    expect(merged[0].response?.fields).toHaveLength(3)
    expect(merged[0].response?.fields.map(f => f.element_id)).toEqual(['mp3', 'mp1', 'mp2'])
  })

  it('includes marking period 3 in grouped assessments', () => {
    const grouped = groupAssessmentFields(
      [
        { element_id: 'mp1', value: '✓' },
        { element_id: 'mp3', value: '+' },
      ],
      metadata,
    )

    expect(getMarkingPeriods(
      [
        { element_id: 'mp1', value: '✓' },
        { element_id: 'mp3', value: '+' },
      ],
      metadata,
    )).toEqual(['Marking Period 1', 'Marking Period 3'])
    expect(grouped.get('Listening')?.get('Marking Period 3')).toBe('+')
  })
})
