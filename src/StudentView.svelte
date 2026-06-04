<svelte:options customElement="student-dashboard-view" />
<script lang="ts">
  import { onMount } from 'svelte'
  import { loadData, currentYearId, type DashboardData } from '$lib/data'
  import StudentHeader from './components/StudentHeader.svelte'
  import ScheduleCard from './components/ScheduleCard.svelte'
  import AttendanceCard from './components/AttendanceCard.svelte'
  import EnrollmentCard from './components/EnrollmentCard.svelte'
  import PlaceholderCard from './components/PlaceholderCard.svelte'
  import BenchmarksCard from './components/BenchmarksCard.svelte'
  import InterventionsCard from './components/InterventionsCard.svelte'
  import TestScoresCard from './components/TestScoresCard.svelte'

  let data = $state<DashboardData | null>(null)
  let loading = $state(true)
  let error = $state<string | null>(null)

  onMount(async () => {
    try {
      data = await loadData()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data'
    } finally {
      loading = false
    }
  })

  const yearId = $derived(currentYearId(data?.student.school_enrollment))

  // Derive the school year start date (August 1 of the year yearId maps to)
  // PS yearId 35 → school year starting August 2025 (yearId + 1990 = calendar year)
  const yearStart = $derived(
    yearId ? `${yearId + 1990}-08-01` : '1900-01-01'
  )

  // Shared selected year — driven by ScheduleCard switcher, reflected in EnrollmentCard
  let selectedYear = $state(0)
  $effect(() => { if (yearId) selectedYear = yearId })
</script>

<div class="wrapper">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      Loading student profile…
    </div>
  {:else if error}
    <div class="error"><strong>Error:</strong> {error}</div>
  {:else if data?.student}
    {@const s = data.student}

    {#if import.meta.env.DEV}
      <StudentHeader student={s} />
    {/if}

    <div class="bento-grid">
      <div class="col-span-2">
        <ScheduleCard schedule={s.student_schedule ?? []} enrollment={s.school_enrollment ?? []} {yearId} gradeLevel={s.grade_level} bind:selectedYear />
      </div>

      <div class="row-span-2">
        <EnrollmentCard enrollment={s.school_enrollment ?? []} bind:highlightYear={selectedYear} />
      </div>

      <div class="col-span-2">
        <AttendanceCard
          records={s.attendance_records ?? []}
          {selectedYear}
        />
      </div>

      <div class="col-span-full">
        {#if s.benchmarks?.length}
          <BenchmarksCard records={s.benchmarks} />
        {:else}
          <PlaceholderCard title="Benchmarks" />
        {/if}
      </div>

      <TestScoresCard scores={s.test_scores} />
      <div class="side-stack">
        <PlaceholderCard title="Discipline Records" />
        {#if s.intervention_history?.length}
          <InterventionsCard records={s.intervention_history} />
        {:else}
          <PlaceholderCard title="Intervention History" />
        {/if}
      </div>
    </div>

    {#if import.meta.env.DEV}
      <details class="debug">
        <summary>Raw JSON</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    {/if}
  {:else}
    <div class="error">No student data available.</div>
  {/if}
</div>

<style>
  :host {
    display: block;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f3f4f6;
    min-height: 100vh;
  }

  .wrapper {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px;
    box-sizing: border-box;
    color: #1f2937;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 64px;
    background: #fff;
    border-radius: 20px;
    font-weight: 500;
    color: #4b5563;
  }

  .spinner {
    width: 26px;
    height: 26px;
    border: 3px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .error {
    background: #fef2f2;
    border: 1px solid #f87171;
    color: #b91c1c;
    padding: 20px;
    border-radius: 12px;
    font-weight: 500;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }

  @media (min-width: 1024px) {
    .bento-grid   { grid-template-columns: 1fr 1fr 1fr; }
    .col-span-2   { grid-column: span 2; }
    .col-span-full{ grid-column: 1 / -1; }
    .row-span-2   { grid-row: span 2; align-self: stretch; }
    .row-span-2 > :global(*) { height: 100%; }
  }

  .side-stack {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .debug {
    margin-top: 32px;
    background: #fff;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .debug summary {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
  }

  .debug pre {
    margin-top: 12px;
    font-size: 11px;
    background: #1f2937;
    color: #a7f3d0;
    padding: 16px;
    border-radius: 8px;
    overflow: auto;
    max-height: 300px;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>