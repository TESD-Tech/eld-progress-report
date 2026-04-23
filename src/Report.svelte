<svelte:options customElement="eld-report" />
<script lang="ts">
  import { onMount } from 'svelte'
  import { loadStudents, type Student } from '$lib/data'
  import { parseStudentDcid, formatName, formatDate, calculateProgress, getMetadataFields } from '$lib/utils'
  import { printReport } from '$lib/printUtils'
  import AssessmentGrid from './components/AssessmentGrid.svelte'
  import DebugBar from './components/DebugBar.svelte'

  let { portal = 'admin', student_dcid = '', onNavigate } = $props<{ 
    portal?: string
    student_dcid?: string
    onNavigate?: (view: string, params?: Record<string, string>) => void 
  }>()

  let student = $state<Student | null>(null)
  let students = $state<Student[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  function handleDashboardClick(event: Event) {
    // If we have SPA navigation, use it instead of href navigation
    if (onNavigate) {
      event.preventDefault()
      onNavigate('dashboard')
    }
    // Otherwise, let the href handle navigation (fallback)
  }

  function dashboardHref() {
    const devPrefix = import.meta.env.DEV ? '/src/powerschool/WEB_ROOT' : ''
    if (portal === 'admin') return `${devPrefix}/admin/eld-progress-report/dashboard.html`
    if (portal === 'teachers') return `${devPrefix}/teachers/eld-progress-report/dashboard.html`
    return '#'
  }

  onMount(async () => {
    if (!student_dcid) {
      error = 'No student_dcid provided'
      loading = false
      return
    }
    try {
      students = await loadStudents()
      student = students.find(s => s.student_dcid === student_dcid) ?? null
      if (!student) error = `Student ${student_dcid} not found`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data'
    } finally {
      loading = false
    }
  })
</script>

<div class="eld">
  {#if portal !== 'guardian'}
    <div class="breadcrumb">
      <a href={dashboardHref()} onclick={handleDashboardClick}>← Back to Dashboard</a>
    </div>
  {/if}

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      Loading report…
    </div>
  {:else if error}
    <div class="err"><strong>Error:</strong> {error}</div>
  {:else if student}
    <div class="student-header">
      <h1>{formatName(student)}</h1>
      <div class="meta-grid">
        <div><span class="label">Student ID</span><span class="val">{student.student_number}</span></div>
        <div><span class="label">Grade</span><span class="val">Grade {student.grade_level}</span></div>
        <div><span class="label">Home Room</span><span class="val">{student.home_room || '—'}</span></div>
        <div><span class="label">Assessment Date</span><span class="val">{formatDate(student.response?.submitted_at)}</span></div>
        {#if student.response?.fields}
          {@const p = calculateProgress(student.response.fields)}
          {#if p.total > 0}
            <div>
              <span class="label">Overall Progress</span>
              <span class="val">{p.percent}% ({p.meets}/{p.total} skills meeting expectations)</span>
            </div>
          {/if}
          {@const meta = getMetadataFields(student.response.fields)}
          {#if meta['Proficiency Level']}
            <div><span class="label">Proficiency Level</span><span class="val">{meta['Proficiency Level']}</span></div>
          {/if}
          {#if meta['Current English Proficiency Level']}
            <div><span class="label">Current English Proficiency Level</span><span class="val">{meta['Current English Proficiency Level']}</span></div>
          {/if}
          {#if meta['ELD Teacher']}
            <div><span class="label">ELD Teacher</span><span class="val">{meta['ELD Teacher']}</span></div>
          {/if}
        {/if}
      </div>
    </div>

    <AssessmentGrid fields={student.response?.fields ?? []} />

    <div class="print-row">
      <button onclick={() => printReport(student!)}>Print Report</button>
    </div>
  {/if}
</div>

{#if import.meta.env.DEV}
  <DebugBar />
{/if}

<style>
  :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .eld { max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; min-height: 100vh; box-sizing: border-box; }
  .breadcrumb { margin-bottom: 16px; }
  .breadcrumb a { color: #1976d2; text-decoration: none; font-size: 14px; }
  .breadcrumb a:hover { text-decoration: underline; }
  .loading {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 48px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,.08);
    color: #444;
    font-size: 15px;
  }
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #e0e0e0;
    border-top-color: #1976d2;
    border-radius: 50%;
    animation: spin .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .err {
    background: #ffebee;
    border: 1px solid #f44336;
    color: #c62828;
    padding: 16px;
    border-radius: 8px;
  }
  .student-header {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 4px rgba(0,0,0,.08);
    margin-bottom: 24px;
  }
  .student-header h1 { margin: 0 0 16px; font-size: 22px; color: #1976d2; }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  .meta-grid div { display: flex; flex-direction: column; gap: 3px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; }
  .val { font-weight: 600; font-size: 14px; color: #333; }
  .print-row { text-align: center; margin-top: 24px; }
  .print-row button {
    padding: 10px 24px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  }
  .print-row button:hover { background: #1565c0; }
  @media print {
    .breadcrumb, .print-row { display: none; }
    .eld { background: white; padding: 0; }
  }
</style>
