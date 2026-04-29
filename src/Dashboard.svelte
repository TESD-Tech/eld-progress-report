<svelte:options customElement="eld-dashboard" />
<script lang="ts">
  import { onMount } from 'svelte'
  import { loadStudents, filterStudents, getDashboardSummary, type Student } from '$lib/data'
  import { getUniqueGrades, getUniqueRooms } from '$lib/utils'
  import { printMultipleReports } from '$lib/printUtils'
  import SummaryStats from './components/SummaryStats.svelte'
  import FilterBar from './components/FilterBar.svelte'
  import StudentTable from './components/StudentTable.svelte'
  import DebugBar from './components/DebugBar.svelte'

  let { portal = 'admin', onStudentSelect } = $props<{
    portal?: string
    onStudentSelect?: (dcid: string) => void
  }>()

  let students = $state<Student[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let search = $state('')
  let grade = $state('')
  let room = $state('')
  let selected = $state<Student[]>([])

  let filtered = $derived(filterStudents(students, search, grade, room))
  let summary = $derived(getDashboardSummary(students))
  let grades = $derived(getUniqueGrades(students))
  let rooms = $derived(getUniqueRooms(students))

  onMount(async () => {
    try {
      students = await loadStudents()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data'
    } finally {
      loading = false
    }
  })
</script>

<div class="eld">
  <header class="eld-header">
    <h1>ELD Progress Report</h1>
    <p class="subtitle">
      {portal === 'admin' ? 'Administrative Dashboard — All Students' : 'Teacher Dashboard — My Students'}
    </p>
  </header>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      Loading students…
    </div>
  {:else if error}
    <div class="err"><strong>Error:</strong> {error}</div>
  {:else}
    <SummaryStats {...summary} />

    <div class="filter-row">
      <FilterBar bind:search bind:grade bind:room {grades} {rooms} />
    </div>

    {#if selected.length > 0}
      <div class="print-bar">
        <span>{selected.length} student{selected.length === 1 ? '' : 's'} selected</span>
        <button onclick={() => printMultipleReports(selected)}>Print Selected</button>
        <button class="clear-btn" onclick={() => { selected = [] }}>Clear</button>
      </div>
    {/if}

    <StudentTable students={filtered} {portal} onSelect={(s) => { selected = s }} {onStudentSelect} />
  {/if}
</div>

{#if import.meta.env.DEV}
  <DebugBar />
{/if}

<style>
  :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .eld { max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; min-height: 100vh; box-sizing: border-box; }
  .eld-header { background: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,.08); }
  .eld-header h1 { margin: 0 0 6px; color: #1976d2; font-size: 24px; }
  .subtitle { margin: 0; color: #666; font-size: 14px; }
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
  .filter-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  .filter-row :global(.filter-bar) {
    flex: 1;
    margin-bottom: 0;
  }
  .print-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: #e3f2fd;
    border: 1px solid #90caf9;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #1565c0;
  }
  .print-bar button {
    padding: 5px 14px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
  }
  .print-bar button:hover { background: #1565c0; }
  .clear-btn { background: #78909c !important; }
  .clear-btn:hover { background: #607d8b !important; }
</style>
