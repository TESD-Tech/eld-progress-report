<script lang="ts">
  import type { Student } from '$lib/data'
  import { formatName } from '$lib/utils'

  let {
    currentPortal = 'admin',
    currentPage = 'dashboard',
    students = [],
    currentDcid = '',
  } = $props<{
    currentPortal?: string
    currentPage?: 'dashboard' | 'report'
    students?: Student[]
    currentDcid?: string
  }>()

  let portal = $state(currentPortal)
  let page = $state(currentPage)
  let selectedDcid = $state(currentDcid)
  let search = $state('')
  let collapsed = $state(false)

  let filteredStudents = $derived(
    search
      ? students.filter(s => {
          const q = search.toLowerCase()
          return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
            String(s.student_number).includes(q)
        })
      : students
  )

  const portals = ['admin', 'teachers', 'guardian']
  const pagesForPortal = $derived(portal === 'guardian' ? ['report'] : ['dashboard', 'report'])

  function navigate() {
    const base = '/src/powerschool/WEB_ROOT'
    if (page === 'report' && selectedDcid) {
      location.href = `${base}/${portal}/eld-progress-report/report.html?student_dcid=${selectedDcid}`
    } else if (page === 'dashboard') {
      location.href = `${base}/${portal}/eld-progress-report/dashboard.html`
    }
  }
</script>

<div class="dev-toolbar" class:collapsed>
  <div class="toolbar-header" role="button" tabindex="0" onclick={() => collapsed = !collapsed} onkeydown={e => e.key === 'Enter' && (collapsed = !collapsed)}>
    <span>🛠 Dev Tools</span>
    <span class="toggle">{collapsed ? '▲' : '▼'}</span>
  </div>

  {#if !collapsed}
    <div class="toolbar-body">
      <label class="row">
        <span class="lbl">Portal</span>
        <select bind:value={portal} onchange={() => { if (!pagesForPortal.includes(page)) page = pagesForPortal[0] }}>
          {#each portals as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </label>

      <label class="row">
        <span class="lbl">Page</span>
        <select bind:value={page}>
          {#each pagesForPortal as pg}
            <option value={pg}>{pg}</option>
          {/each}
        </select>
      </label>

      {#if page === 'report'}
        <div class="row">
          <span class="lbl">Student</span>
          <div class="student-picker">
            <input
              type="text"
              placeholder="Search..."
              bind:value={search}
              class="search-input"
            />
            <select bind:value={selectedDcid} size={4} class="student-list">
              {#each filteredStudents as s}
                <option value={s.student_dcid}>{formatName(s)}</option>
              {/each}
            </select>
          </div>
        </div>
      {/if}

      <button class="go-btn" >Go</button>
    </div>
  {/if}
</div>

<style>
  .dev-toolbar {
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 10000;
    background: #1e1e1e;
    color: #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    font-size: 12px;
    min-width: 220px;
    max-width: 280px;
  }
  .toolbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 8px;
    user-select: none;
  }
  .toolbar-header:hover { background: #2a2a2a; }
  .toggle { opacity: 0.6; font-size: 10px; }
  .toolbar-body {
    padding: 10px 12px 12px;
    border-top: 1px solid #333;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .lbl {
    width: 52px;
    flex-shrink: 0;
    padding-top: 4px;
    color: #aaa;
    font-size: 11px;
  }
  select, .search-input {
    flex: 1;
    background: #2d2d2d;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
  }
  .student-picker {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .student-list {
    height: 80px;
    padding: 2px;
  }
  .go-btn {
    align-self: flex-end;
    padding: 6px 16px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    font-weight: 600;
  }
  .go-btn:hover { background: #1565c0; }
</style>
