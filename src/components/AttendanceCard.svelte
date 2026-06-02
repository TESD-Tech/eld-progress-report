<script lang="ts">
  import type { AttendanceRecord } from '$lib/data'

  let { records, yearStart } = $props<{
    records: AttendanceRecord[]
    /** ISO date string for the start of the current school year (e.g. "2025-08-01") */
    yearStart: string
  }>()

  // Codes considered negative events worth surfacing
  const ABSENCE_CODES = new Set(['A', 'UNA', 'EMA', 'EPI'])
  const TARDY_CODES   = new Set(['TUX', 'TEX'])

  const currentYear = $derived(
    records.filter(r => r.att_date >= yearStart)
  )

  function dedup(list: typeof currentYear) {
    const seen = new Set<string>()
    return list.filter(r => {
      const key = `${r.att_date}|${r.attendance_school}|${r.att_code}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const absences = $derived(dedup(currentYear.filter(r => ABSENCE_CODES.has(r.att_code ?? ''))))
  const tardies  = $derived(dedup(currentYear.filter(r => TARDY_CODES.has(r.att_code ?? ''))))

  const status = $derived.by(() => {
    const n = absences.length
    if (n >= 10) return { label: 'At Risk',  cls: 'danger'  }
    if (n >= 5)  return { label: 'Warning',  cls: 'warning' }
    return           { label: 'On Track', cls: 'success' }
  })

  // Format ISO date string (YYYY-MM-DD) → MM/DD/YYYY
  function fmtDate(iso: string): string {
    const [y, m, d] = iso.split('-')
    return `${m}/${d}/${y}`
  }

  // Combined list of absences + tardies, sorted newest-first (both already deduped)
  const sortedEvents = $derived(
    [...absences, ...tardies].sort((a, b) => b.att_date.localeCompare(a.att_date))
  )

  // Derive school year label from a date string (YYYY-MM-DD)
  // Aug 1+ → that year is the start; Jan–Jul → previous year is the start
  function schoolYear(iso: string): string {
    const [y, m] = iso.split('-').map(Number)
    const start = m >= 8 ? y : y - 1
    return `${start}–${String(start + 1).slice(2)}`
  }
  let rubricOpen = $state(false)
</script>

<section class="card">
  <div class="card-header">
    <h2>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8"  y1="2" x2="8"  y2="6"/>
        <line x1="3"  y1="10" x2="21" y2="10"/>
      </svg>
      Attendance
    </h2>
    <div class="status-wrap">
      <button
        class="status status-{status.cls}"
        onclick={() => rubricOpen = !rubricOpen}
        aria-expanded={rubricOpen}
      >{status.label}</button>
      {#if rubricOpen}
        <div class="rubric" role="tooltip">
          <button class="rubric-close" onclick={() => rubricOpen = false} aria-label="Close">✕</button>
          <p class="rubric-title">Absence Thresholds</p>
          <ul>
            <li><span class="dot success"></span> <strong>On Track</strong> — fewer than 5 absences</li>
            <li><span class="dot warning"></span> <strong>Warning</strong> — 5 to 9 absences</li>
            <li><span class="dot danger"></span>  <strong>At Risk</strong> — 10 or more absences</li>
          </ul>
          <p class="rubric-note">Tardies are tracked separately and do not affect this status.</p>
        </div>
      {/if}
    </div>
  </div>
  <div class="card-content">
    <div class="metrics">
      <div class="metric">
        <span class="val">{absences.length}</span>
        <span class="lbl">Absences</span>
      </div>
      <div class="metric">
        <span class="val">{tardies.length}</span>
        <span class="lbl">Tardies</span>
      </div>
    </div>

    {#if sortedEvents.length > 0}
      <table class="event-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Year</th>
            <th>Location</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedEvents as r}
            <tr class:tardy={TARDY_CODES.has(r.att_code ?? '')}>
              <td class="date">{fmtDate(r.att_date)}</td>
              <td class="year">{schoolYear(r.att_date)}</td>
              <td class="loc">{r.attendance_school ?? '—'}</td>
              <td class="reason">{r.att_code_name ?? r.att_code ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

<style>
  .card {
    background: #fff;
    border-radius: 20px;
    border: 1px solid #f3f4f6;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    overflow: hidden;
  }

  .card-header {
    padding: 18px 24px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h2 svg { color: #6b7280; flex-shrink: 0; }

  .status-success { background: #dcfce7; color: #166534; }
  .status-warning { background: #fef9c3; color: #854d0e; }
  .status-danger  { background: #fee2e2; color: #991b1b; }

  .status-wrap {
    position: relative;
  }

  .status {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: none;
    cursor: pointer;
  }

  .rubric {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    padding: 16px 18px;
    width: 300px;
    z-index: 10;
    font-size: 13px;
  }

  .rubric-close {
    position: absolute;
    top: 10px;
    right: 12px;
    background: none;
    border: none;
    font-size: 12px;
    color: #9ca3af;
    cursor: pointer;
    line-height: 1;
    padding: 2px;
  }

  .rubric-title {
    margin: 0 0 10px;
    font-weight: 700;
    font-size: 13px;
    color: #374151;
  }

  .rubric ul {
    list-style: none;
    padding: 0;
    margin: 0 0 10px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .rubric li {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #374151;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot.success { background: #22c55e; }
  .dot.warning { background: #eab308; }
  .dot.danger  { background: #ef4444; }

  .rubric-note {
    margin: 0;
    font-size: 11px;
    color: #9ca3af;
    border-top: 1px solid #f3f4f6;
    padding-top: 10px;
  }

  .card-content { padding: 20px 24px; }

  .metrics {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  .metric {
    flex: 1;
    background: #f9fafb;
    border-radius: 12px;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border: 1px solid #f3f4f6;
  }

  .val {
    font-size: 28px;
    font-weight: 800;
    color: #111827;
    line-height: 1;
  }

  .lbl {
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .event-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .event-table thead th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 0 8px 8px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .event-table tbody tr {
    border-bottom: 1px solid #f3f4f6;
  }

  .event-table tbody tr:last-child { border: none; }

  .event-table td {
    padding: 9px 8px 9px 0;
    vertical-align: middle;
  }

  .date   { color: #374151; font-weight: 500; white-space: nowrap; }
  .year   { color: #6b7280; white-space: nowrap; }
  .loc    { color: #6b7280; }
  .reason { color: #374151; }

  tr.tardy .reason { color: #b45309; }
</style>
