/**
 * Tests for StudentTable component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import StudentTable from '../components/StudentTable.svelte'
import type { Student } from '../lib/data'

const mockStudents: Student[] = [
  {
    student_dcid: '42318',
    student_number: 2034095,
    first_name: 'Fizz',
    last_name: 'Tester',
    grade_level: 4,
    home_room: '15',
    response: {
      id: '123',
      submitted_at: '2024-01-01T00:00:00Z',
      fields: []
    }
  },
  {
    student_dcid: '42319',
    student_number: 2034096,
    first_name: 'Buzz',
    last_name: 'Tester',
    grade_level: 5,
    home_room: '16',
    response: {
      id: '124',
      submitted_at: '2024-01-01T00:00:00Z',
      fields: []
    }
  }
]

describe('StudentTable', () => {
  it('renders student data correctly', () => {
    render(StudentTable, { students: mockStudents })
    expect(screen.getByText('Fizz Tester')).toBeInTheDocument()
    expect(screen.getByText('Buzz Tester')).toBeInTheDocument()
    expect(screen.getByText('ID: 2034095')).toBeInTheDocument()
  })

  it('renders a View Report button for each student', () => {
    render(StudentTable, { students: mockStudents })
    const buttons = screen.getAllByText('View Report')
    expect(buttons).toHaveLength(2)
    // Buttons — not links — so no href
    buttons.forEach(btn => expect(btn.tagName).toBe('BUTTON'))
  })

  it('calls onStudentSelect with the correct dcid when View Report is clicked', async () => {
    const onStudentSelect = vi.fn()
    render(StudentTable, { students: mockStudents, onStudentSelect })

    const buttons = screen.getAllByText('View Report')
    await fireEvent.click(buttons[0])
    expect(onStudentSelect).toHaveBeenCalledWith('42318')

    await fireEvent.click(buttons[1])
    expect(onStudentSelect).toHaveBeenCalledWith('42319')
  })

  it('shows empty state when no students match', () => {
    render(StudentTable, { students: [] })
    expect(screen.queryByText('View Report')).not.toBeInTheDocument()
    expect(screen.getByText('No students match the current filters.')).toBeInTheDocument()
  })
})
