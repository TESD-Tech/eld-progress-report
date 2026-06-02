<script lang="ts">
  import type { BenchmarkRecord } from '$lib/data'
  import { readStorage, writeStorage } from '$lib/utils/storage'

  let { records } = $props<{ records: BenchmarkRecord[] }>()

  // Derive suite from first word of metric_name
  function suiteName(metricName: string): string {
    return metricName.split(/\s/)[0]
  }

  // All unique suites present in the data, sorted
  const suites = $derived(
    [...new Set(records.map(r => suiteName(r.metric_name)))].sort()
  )

  // Multi-select: empty set = show all
  let selectedSuites = $state<Set<string>>(
    (() => {
      try { return new Set(JSON.parse(readStorage('benchmark-suites', '[]'))) }
      catch { return new Set<string>() }
    })()
  )

  function toggleSuite(suite: string) {
    const next = new Set(selectedSuites)
    if (next.has(suite)) next.delete(suite)
    else next.add(suite)
    selectedSuites = next
    writeStorage('benchmark-suites', JSON.stringify([...next]))
  }

  function selectAll() {
    selectedSuites = new Set()
    writeStorage('benchmark-suites', '[]')
  }

  // Records filtered by selected suites (empty = all)
  const filtered = $derived(
    selectedSuites.size === 0
      ? records
      : records.filter(r => selectedSuites.has(suiteName(r.metric_name)))
  )

  const pivot = $derived.by(() => {
    const colMap = new Map<string, { year: string; period: string; colNum: number }>()
    for (const r of filtered) {
      const key = `${r.year}|${r.column_number}`
      if (!colMap.has(key)) colMap.set(key, { year: r.year, period: r.period, colNum: r.column_number })
    }
    const columns = [...colMap.entries()]
      .sort(([, a], [, b]) =>
        a.year !== b.year ? a.year.localeCompare(b.year) : a.colNum - b.colNum
      )
      .map(([key, val]) => ({ key, ...val }))

    const metricOrder = new Map<string, number>()
    for (const r of filtered) {
      if (!metricOrder.has(r.metric_name)) metricOrder.set(r.metric_name, r.row_number)
    }
    const metrics = [...metricOrder.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name]) => name)

    const cells = new Map<string, { score: string; target: string; red: string | null; yellow: string | null; green: string | null; blue: string | null }>()
    for (const r of filtered) {
      cells.set(`${r.metric_name}|${r.year}|${r.column_number}`, {
        score: r.score, target: r.target,
        red: r.red, yellow: r.yellow, green: r.green, blue: r.blue
      })
    }

    return { columns, metrics, cells }
  })

  function displayScore(raw: string): string {
    return raw === '&nbsp;' || raw === '' ? '—' : raw
  }

  function truncPeriod(p: string): string {
    return p.length > 6 ? p.slice(0, 3) + '…' : p
  }

  function scoreColor(
    raw: string,
    red: string | null, yellow: string | null,
    green: string | null, blue: string | null
  ): 'blue' | 'green' | 'yellow' | 'red' | null {
    const n = parseFloat(raw)
    if (isNaN(n)) return null
    const lb = (s: string | null): number | null => {
      if (s == null) return null
      const v = parseFloat(s)
      return isNaN(v) ? null : v
    }
    const blueMin   = lb(blue)
    const greenMin  = lb(green)
    const yellowMin = lb(yellow)
    const redMin    = lb(red)
    if (blueMin   != null && n >= blueMin)   return 'blue'
    if (greenMin  != null && n >= greenMin)  return 'green'
    if (yellowMin != null && n >= yellowMin) return 'yellow'
    if (redMin    != null)                   return 'red'
    return null
  }

  // DOM refs for floating header sync
  let headerWrapEl: HTMLDivElement | null = $state(null)
  let bodyScrollEl: HTMLDivElement | null = $state(null)
  let headerTableEl: HTMLTableElement | null = $state(null)
  let bodyTableEl: HTMLTableElement | null = $state(null)

  // Mirror horizontal scroll from body → header
  $effect(() => {
    if (!bodyScrollEl || !headerWrapEl) return
    const onScroll = () => { headerWrapEl!.scrollLeft = bodyScrollEl!.scrollLeft }
    bodyScrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => bodyScrollEl!.removeEventListener('scroll', onScroll)
  })

  // Sync column widths from rendered body → header; re-run when pivot columns change
  $effect(() => {
    const _dep = pivot.columns.length // reactive dependency
    if (!bodyTableEl || !headerTableEl) return
    const sync = () => {
      const row = bodyTableEl!.querySelector('tbody tr')
      if (!row) return
      const bCells = row.querySelectorAll('td')
      const hCells = headerTableEl!.querySelectorAll('th')
      hCells.forEach((th, i) => {
        const td = bCells[i] as HTMLElement | undefined
        if (td) (th as HTMLElement).style.width = td.getBoundingClientRect().width + 'px'
      })
      headerTableEl!.style.width = bodyTableEl!.getBoundingClientRect().width + 'px'
    }
    // Two rAFs: first lets Svelte flush DOM, second lets browser lay out
    let frame2: number
    const frame = requestAnimationFrame(() => { frame2 = requestAnimationFrame(sync) })
    const ro = new ResizeObserver(sync)
    ro.observe(bodyTableEl!)
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(frame2); ro.disconnect() }
  })
</script>

<section class="card">
  <div class="card-header">
    <h2>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      Benchmarks
    </h2>
    {#if suites.length > 1}
      <div class="suite-filter" role="group" aria-label="Filter by suite">
        <button
          class="suite-pill"
          class:active={selectedSuites.size === 0}
          onclick={selectAll}
          aria-pressed={selectedSuites.size === 0}
        >All</button>
        {#each suites as suite}
          <button
            class="suite-pill"
            class:active={selectedSuites.has(suite)}
            onclick={() => toggleSuite(suite)}
            aria-pressed={selectedSuites.has(suite)}
          >{suite}</button>
        {/each}
      </div>
    {/if}
  </div>

  {#if records.length === 0}
    <div class="card-content"><p class="empty">No benchmark data available.</p></div>
  {:else if pivot.metrics.length === 0}
    <div class="card-content"><p class="empty">No metrics match the current filter.</p></div>
  {:else}
    <!-- Floating sticky header: NOT inside overflow-x container so position:sticky works -->
    <div class="header-wrap" bind:this={headerWrapEl}>
      <table class="pivot-table" bind:this={headerTableEl}>
        <thead>
          <tr>
            <th class="metric-col">Metric</th>
            {#each pivot.columns as col}
              <th>
                <span class="col-year">{col.year}</span>
                <span class="col-period">{truncPeriod(col.period)}</span>
              </th>
            {/each}
          </tr>
        </thead>
      </table>
    </div>

    <!-- Body with horizontal scroll; JS mirrors scrollLeft to header-wrap -->
    <div class="body-scroll" bind:this={bodyScrollEl}>
      <table class="pivot-table" bind:this={bodyTableEl}>
        <tbody>
          {#each pivot.metrics as metric}
            <tr>
              <td class="metric-name">{metric}</td>
              {#each pivot.columns as col}
                {@const cell = pivot.cells.get(`${metric}|${col.year}|${col.colNum}`)}
                <td class="score-cell">
                  {#if cell}
                    {@const color = scoreColor(cell.score, cell.red, cell.yellow, cell.green, cell.blue)}
                    {@const display = displayScore(cell.score)}
                    {#if display === '—'}
                      <span class="no-data">—</span>
                    {:else}
                      <span class="score-chip" class:chip-blue={color === 'blue'} class:chip-green={color === 'green'} class:chip-yellow={color === 'yellow'} class:chip-red={color === 'red'}>
                        {display}
                      </span>
                      {#if cell.target && cell.target !== 'N/A'}
                        <span class="target">/ {cell.target}</span>
                      {/if}
                    {/if}
                  {:else}
                    <span class="no-data">—</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .card {
    background: #fff;
    border-radius: 20px;
    border: 1px solid #f3f4f6;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    overflow: clip;
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

  .suite-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .suite-pill {
    background: none;
    border: 1.5px solid #e5e7eb;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .suite-pill:hover:not(.active) {
    border-color: #9ca3af;
    color: #374151;
  }

  .suite-pill.active {
    background: #1f2937;
    border-color: #1f2937;
    color: #fff;
  }

  .card-content { padding: 20px 24px; }

  /* Sticky floating header — outside overflow-x container so position:sticky works */
  .header-wrap {
    position: sticky;
    top: 0;
    overflow-x: hidden; /* scrollLeft is driven by JS to follow body */
    background: #fff;
    z-index: 2;
    border-bottom: 2px solid #f3f4f6;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    padding: 0 24px;
  }

  /* Body: can scroll horizontally */
  .body-scroll {
    overflow-x: auto;
    padding: 0 24px 20px;
  }

  .pivot-table {
    border-collapse: collapse;
    font-size: 13px;
    table-layout: auto;
  }

  .header-wrap .pivot-table { width: 100%; table-layout: fixed; }

  .header-wrap th {
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 12px 8px 10px;
    white-space: nowrap;
  }

  .header-wrap th.metric-col {
    text-align: left;
    padding-left: 0;
    min-width: 180px;
  }

  .col-year  { display: block; }
  .col-period { display: block; font-weight: 400; color: #d1d5db; }

  .body-scroll .pivot-table tbody tr { border-bottom: 1px solid #f9fafb; }
  .body-scroll .pivot-table tbody tr:last-child { border: none; }

  .body-scroll .pivot-table td {
    padding: 9px 8px;
    vertical-align: middle;
  }

  .body-scroll .pivot-table td:first-child { padding-left: 0; }

  .metric-name { color: #374151; font-size: 12px; min-width: 180px; }

  .score-cell { text-align: center; }

  .score-chip {
    display: inline-block;
    font-weight: 700;
    font-size: 12px;
    padding: 2px 7px;
    border-radius: 6px;
    color: #1f2937;
    background: #f3f4f6;
  }

  .chip-blue   { background: #dbeafe; color: #1d4ed8; }
  .chip-green  { background: #dcfce7; color: #15803d; }
  .chip-yellow { background: #fef9c3; color: #a16207; }
  .chip-red    { background: #fee2e2; color: #b91c1c; }

  .target { font-size: 11px; color: #9ca3af; margin-left: 2px; }
  .no-data { color: #e5e7eb; }

  .empty { margin: 0; color: #9ca3af; font-size: 14px; font-style: italic; }
</style>
