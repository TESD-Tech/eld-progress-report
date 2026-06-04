<script lang="ts">
  import type { AttendanceRecord } from '$lib/data'

  let { records, selectedYear } = $props<{
    records: AttendanceRecord[]
    selectedYear: number   // PS yearId (e.g., 35 = 2025–26)
  }>()

  const ABSENCE_CODES = new Set(['A', 'UNA', 'EMA', 'EPI'])
  const TARDY_CODES   = new Set(['TUX', 'TEX'])
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS   = ['Mon','Tue','Wed','Thu','Fri']

  function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const todayStr = toDateStr(new Date())

  // 2D array: weeks[w][d] = date string or null (out of school-year range)
  const weeks = $derived.by(() => {
    if (!selectedYear) return []
    const calYear  = selectedYear + 1990
    const rangeStart = new Date(calYear,     7,  1) // Aug 1
    const rangeEnd   = new Date(calYear + 1, 5, 30) // Jun 30

    // Rewind to the Monday on or before rangeStart
    const cur = new Date(rangeStart)
    cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7))

    const result: (string | null)[][] = []
    while (cur <= rangeEnd) {
      const week: (string | null)[] = []
      for (let d = 0; d < 5; d++) {
        const day = new Date(cur)
        day.setDate(day.getDate() + d)
        week.push(day >= rangeStart && day <= rangeEnd ? toDateStr(day) : null)
      }
      result.push(week)
      cur.setDate(cur.getDate() + 7)
    }
    return result
  })

  // Where each month label should appear (first week that contains a day in that month)
  const monthLabels = $derived.by(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    for (let w = 0; w < weeks.length; w++) {
      const first = weeks[w].find(d => d !== null)
      if (!first) continue
      const month = parseInt(first.slice(5, 7)) - 1
      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], col: w })
        lastMonth = month
      }
    }
    return labels
  })

  // Map of dateStr → deduplicated events for quick lookup
  const eventMap = $derived.by(() => {
    const map = new Map<string, AttendanceRecord[]>()
    for (const r of records) {
      if (!r.att_date) continue
      const key = r.att_date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      const list = map.get(key)!
      const isDupe = list.some(
        e => e.att_code === r.att_code && e.attendance_school === r.attendance_school
      )
      if (!isDupe) list.push(r)
    }
    return map
  })

  type CellKind = 'absent' | 'tardy' | 'other' | 'ok' | 'future' | 'empty'

  function cellKind(dateStr: string | null): CellKind {
    if (!dateStr)             return 'empty'
    if (dateStr > todayStr)   return 'future'
    const evts = eventMap.get(dateStr)
    if (!evts?.length)        return 'ok'
    if (evts.some(e => ABSENCE_CODES.has(e.att_code ?? ''))) return 'absent'
    if (evts.some(e => TARDY_CODES.has(e.att_code ?? '')))   return 'tardy'
    return 'other'
  }

  function cellTitle(dateStr: string | null): string {
    if (!dateStr) return ''
    const evts = eventMap.get(dateStr)
    if (!evts?.length) return dateStr
    const labels = [...new Set(evts.map(e => e.att_code_name || e.att_code))]
    return `${dateStr}: ${labels.join(', ')}`
  }

  // Metrics scoped to selected year
  const yearRecords = $derived.by(() => {
    if (!selectedYear) return []
    const calYear = selectedYear + 1990
    const start = `${calYear}-08-01`
    const end   = `${calYear + 1}-07-01`
    return records.filter(r => r.att_date >= start && r.att_date < end)
  })

  function dedup(list: AttendanceRecord[]) {
    const seen = new Set<string>()
    return list.filter(r => {
      const key = `${r.att_date}|${r.att_code}`
      return seen.has(key) ? false : (seen.add(key), true)
    })
  }

  const absences = $derived(dedup(yearRecords.filter(r => ABSENCE_CODES.has(r.att_code ?? ''))))
  const tardies  = $derived(dedup(yearRecords.filter(r => TARDY_CODES.has(r.att_code ?? ''))))

  const status = $derived.by(() => {
    const n = absences.length
    if (n >= 10) return { label: 'At Risk', cls: 'danger'  }
    if (n >= 5)  return { label: 'Warning',  cls: 'warning' }
    return             { label: 'On Track', cls: 'success' }
  })

  const yearLabel = $derived(
    selectedYear
      ? `${selectedYear + 1990}–${String(selectedYear + 1991).slice(2)}`
      : '—'
  )

  let rubricOpen = $state(false)

  // ── Tooltip ──────────────────────────────────────────────────────────────
  type TooltipData = {
    dateStr: string
    events: AttendanceRecord[]
    x: number
    y: number
  }
  let tooltip = $state<TooltipData | null>(null)

  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const MONTH_FULL = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']

  function fmtDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return `${WEEKDAYS[dt.getDay()]}, ${MONTH_FULL[m-1]} ${d}, ${y}`
  }

  function showTip(e: MouseEvent, dateStr: string | null) {
    if (!dateStr || dateStr > todayStr) { tooltip = null; return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    tooltip = {
      dateStr,
      events: eventMap.get(dateStr) ?? [],
      x: rect.left + rect.width / 2,
      y: rect.top,
    }
  }

  function hideTip() { tooltip = null }
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
      <span class="year-badge">{yearLabel}</span>
    </h2>
    <div class="header-right">
      <div class="metric-pill">
        <span class="val">{absences.length}</span>
        <span class="lbl">absences</span>
      </div>
      <div class="metric-pill">
        <span class="val">{tardies.length}</span>
        <span class="lbl">tardies</span>
      </div>
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
              <li><span class="dot warning"></span> <strong>Warning</strong>  — 5 to 9 absences</li>
              <li><span class="dot danger"></span>  <strong>At Risk</strong>  — 10 or more absences</li>
            </ul>
            <p class="rubric-note">Tardies are tracked separately and do not affect this status.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="calendar-wrap">
    {#if weeks.length}
      <div class="cal">
        <!-- Month labels row -->
        <div class="month-row">
          <div class="axis-spacer"></div>
          {#each weeks as _week, wi}
            {@const lbl = monthLabels.find(m => m.col === wi)}
            <div class="month-cell">{lbl ? lbl.label : ''}</div>
          {/each}
        </div>

        <!-- Day rows: Mon → Fri -->
        {#each DAYS as day, di}
          <div class="day-row">
            <div class="day-label">{day}</div>
            {#each weeks as week}
              {@const ds = week[di]}
              {@const kind = cellKind(ds)}
              <div
                class="cell cell-{kind}"
                onmouseenter={(e) => showTip(e, ds)}
                onmouseleave={hideTip}
              ></div>
            {/each}
          </div>
        {/each}
      </div>

      <div class="legend">
        <span class="leg absent"></span> Absent
        <span class="leg tardy"></span>  Tardy
        <span class="leg other"></span>  Other event
        <span class="leg ok"></span>     No issue
        <span class="leg future"></span> Upcoming
      </div>
    {:else}
      <p class="empty">No calendar data.</p>
    {/if}
  </div>
</section>

{#if tooltip}
  {@const kind = cellKind(tooltip.dateStr)}
  <div
    class="tip"
    style:left="{tooltip.x}px"
    style:top="{tooltip.y}px"
  >
    <p class="tip-date">{fmtDate(tooltip.dateStr)}</p>
    {#if tooltip.events.length === 0}
      <p class="tip-ok">No attendance events</p>
    {:else}
      {#each tooltip.events as evt}
        <div class="tip-event tip-{kind}">
          <span class="tip-code">{evt.att_code ?? '—'}</span>
          <span class="tip-name">{evt.att_code_name ?? 'Unknown'}</span>
          {#if evt.attendance_school}
            <span class="tip-school">{evt.attendance_school}</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}

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
    flex-wrap: wrap;
    gap: 10px;
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

  .year-badge {
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .metric-pill {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  .val {
    font-size: 20px;
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

  .status-wrap { position: relative; }

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

  .status-success { background: #dcfce7; color: #166534; }
  .status-warning { background: #fef9c3; color: #854d0e; }
  .status-danger  { background: #fee2e2; color: #991b1b; }

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
    position: absolute; top: 10px; right: 12px;
    background: none; border: none;
    font-size: 12px; color: #9ca3af; cursor: pointer;
  }

  .rubric-title { margin: 0 0 10px; font-weight: 700; font-size: 13px; color: #374151; }

  .rubric ul {
    list-style: none; padding: 0; margin: 0 0 10px;
    display: flex; flex-direction: column; gap: 7px;
  }

  .rubric li { display: flex; align-items: center; gap: 8px; color: #374151; }

  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dot.success { background: #22c55e; }
  .dot.warning { background: #eab308; }
  .dot.danger  { background: #ef4444; }

  .rubric-note {
    margin: 0; font-size: 11px; color: #9ca3af;
    border-top: 1px solid #f3f4f6; padding-top: 10px;
  }

  /* ── Calendar ─────────────────────────────── */

  .calendar-wrap {
    padding: 16px 24px 20px;
    overflow-x: auto;
  }

  .cal {
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
    min-width: 100%;
  }

  .month-row {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    margin-bottom: 4px;
  }

  .axis-spacer {
    width: 28px;
    flex-shrink: 0;
  }

  .month-cell {
    width: 13px;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    /* overflow visible so adjacent cells show the label */
    overflow: visible;
    white-space: nowrap;
  }

  .day-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .day-label {
    width: 28px;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    color: #d1d5db;
    text-align: right;
    padding-right: 6px;
  }

  .cell {
    width: 13px;
    height: 13px;
    border-radius: 3px;
    flex-shrink: 0;
    cursor: default;
    transition: transform 0.08s, box-shadow 0.08s;
  }

  .cell:hover { transform: scale(1.5); box-shadow: 0 2px 6px rgba(0,0,0,0.18); z-index: 1; position: relative; }

  .cell-ok     { background: #d1fae5; }
  .cell-absent { background: #fca5a5; }
  .cell-tardy  { background: #fde68a; }
  .cell-other  { background: #bfdbfe; }
  .cell-future { background: #f3f4f6; }
  .cell-empty  { background: transparent; }

  /* ── Legend ────────────────────────────────── */

  .legend {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 12px;
    font-size: 11px;
    color: #6b7280;
    flex-wrap: wrap;
  }

  .leg {
    display: inline-block;
    width: 11px; height: 11px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .leg.absent { background: #fca5a5; }
  .leg.tardy  { background: #fde68a; }
  .leg.other  { background: #bfdbfe; }
  .leg.ok     { background: #d1fae5; }
  .leg.future { background: #f3f4f6; border: 1px solid #e5e7eb; }

  .empty { color: #9ca3af; font-size: 13px; font-style: italic; padding: 20px 0; }

  /* ── Tooltip ───────────────────────────────── */

  .tip {
    position: fixed;
    transform: translate(-50%, calc(-100% - 10px));
    background: #1f2937;
    color: #f9fafb;
    border-radius: 10px;
    padding: 10px 13px;
    font-size: 12px;
    pointer-events: none;
    z-index: 20;
    min-width: 170px;
    max-width: 260px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    line-height: 1.4;
  }

  /* caret */
  .tip::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-bottom: none;
    border-top-color: #1f2937;
  }

  .tip-date {
    margin: 0 0 7px;
    font-weight: 700;
    font-size: 12px;
    color: #e5e7eb;
    border-bottom: 1px solid #374151;
    padding-bottom: 6px;
  }

  .tip-ok { margin: 0; color: #9ca3af; font-style: italic; }

  .tip-event {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 6px;
    padding: 4px 0;
    border-bottom: 1px solid #374151;
  }

  .tip-event:last-child { border-bottom: none; padding-bottom: 0; }

  .tip-code {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    background: #374151;
    color: #f9fafb;
    white-space: nowrap;
  }

  .tip-absent .tip-code { background: #7f1d1d; color: #fecaca; }
  .tip-tardy  .tip-code { background: #78350f; color: #fde68a; }
  .tip-other  .tip-code { background: #1e3a5f; color: #bfdbfe; }

  .tip-name   { color: #d1d5db; flex: 1; }
  .tip-school { color: #6b7280; font-size: 11px; width: 100%; }
</style>
