import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import App from '../App.svelte'

describe('eld-progress-report-app portal reactivity', () => {
  it('should react to portal prop changes (admin → guardian → teacher)', async () => {
    const { container, rerender } = render(App, { props: { portal: 'admin' } })

    expect(container.innerHTML).toMatch(/admin/i)

    await rerender({ props: { portal: 'guardian' } })
    expect(container.innerHTML).toMatch(/guardian/i)

    await rerender({ props: { portal: 'teacher' } })
    expect(container.innerHTML).toMatch(/teacher/i)
  })
})
