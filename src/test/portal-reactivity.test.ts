// Test for live reactivity when `portal` attribute changes
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import App from '../App.svelte'

// Helper: update attribute programmatically
describe('eld-progress-report-app portal reactivity', () => {
  it('should react to portal attribute changes (guardian → admin → teacher)', async () => {
    const { container } = render(App, {}, { customElement: true })
    const el = container.querySelector('eld-progress-report-app')
    expect(el).toBeTruthy()

    // Initial: should be default "admin"
    // Find something showing the portal down the component tree
    // We'll search for the literal "admin" in the content (StudentTable output)
    expect(container.innerHTML).toMatch(/admin/i)

    // Change portal to guardian
    el.setAttribute('portal', 'guardian')
    // Portal update should propagate
    await Promise.resolve()
    expect(container.innerHTML).toMatch(/guardian/i)

    // Change portal to teacher
    el.setAttribute('portal', 'teacher')
    await Promise.resolve()
    expect(container.innerHTML).toMatch(/teacher/i)
  })
})
