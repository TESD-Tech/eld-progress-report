<svelte:options customElement="eld-dashboard" />
<script lang="ts">
  import { onMount } from 'svelte'
  import { loadStudents, filterStudents, getDashboardSummary, type Student } from '$lib/data'
  import { getUniqueGrades, getUniqueRooms } from '$lib/utils'
  import SummaryStats from './components/SummaryStats.svelte'
  import FilterBar from './components/FilterBar.svelte'
  import StudentTable from './components/StudentTable.svelte'

  let { portal = 'admin' } = $props<{ portal?: string }>()

  let students = $state<Student[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let search = $state('')
  let grade = $state('')
  let room = $state('')

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
    <FilterBar bind:search bind:grade bind:room {grades} {rooms} />
    <StudentTable students={filtered} {portal} />
  {/if}
</div>

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
</style>
