<script lang="ts">
  import type { PairsSummary, PairsAssessment } from '$lib/pairsApi'

  let { data }: { data: PairsSummary } = $props()

  const IRI_CRITERIA = ['Flash', 'Untimed', 'Context', 'Oral', 'Silent', 'Average']

  // Sort newest first
  const assessments = $derived(
    [...data.assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  )

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function isIri(a: PairsAssessment): boolean {
    return a.assessment_name.includes('IRI')
  }

  // IRI: build level→criteria→value lookup
  function iriGrid(a: PairsAssessment) {
    const levels = [...new Set(a.results.map(r => r.area))]
      .sort((x, y) => {
        const order: Record<string, number> = { PP: 0, PP1: 1, PP2: 2, PP3: 3, P: 4 }
        const nx = order[x] ?? (parseFloat(x) + 10)
        const ny = order[y] ?? (parseFloat(y) + 10)
        return nx - ny
      })
    const map = new Map<string, Map<string, string>>()
    for (const r of a.results) {
      if (!map.has(r.area)) map.set(r.area, new Map())
      if (r.result) map.get(r.area)!.set(r.criteria, r.result)
    }
    return { levels, map }
  }

  // Screening: group by area
  function screeningGroups(a: PairsAssessment) {
    const groups = new Map<string, { criteria: string; result: string }[]>()
    for (const r of a.results) {
      if (!r.result) continue
      if (!groups.has(r.area)) groups.set(r.area, [])
      groups.get(r.area)!.push({ criteria: r.criteria, result: r.result })
    }
    return groups
  }

  let expanded = $state(new Set([assessments[0]?.id]))

  function toggle(id: number) {
    if (expanded.has(id)) expanded.delete(id)
    else expanded.add(id)
    expanded = new Set(expanded)
  }
</script>

<section class="card">
  <div class="card-header">
    <h2>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      PAIRS Reading
    </h2>
    <span class="count">{assessments.length} assessment{assessments.length !== 1 ? 's' : ''}</span>
  </div>

  <div class="list">
    {#each assessments as a (a.id)}
      {@const open = expanded.has(a.id)}
      <div class="assessment" class:open>
        <button class="assessment-header" onclick={() => toggle(a.id)}>
          <div class="assessment-meta">
            <span class="assessment-name">{a.assessment_name}</span>
            <span class="assessment-date">{formatDate(a.date)} · Gr. {a.grade}</span>
          </div>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {#if open}
          <div class="assessment-body">
            {#if isIri(a)}
              {@const { levels, map } = iriGrid(a)}
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th class="level-col">Level</th>
                      {#each IRI_CRITERIA as c}<th>{c}</th>{/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each levels as level}
                      <tr>
                        <td class="level-cell">{level}</td>
                        {#each IRI_CRITERIA as c}
                          <td>{map.get(level)?.get(c) ?? '—'}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {:else}
              {@const groups = screeningGroups(a)}
              {#each groups.entries() as [area, items]}
                <div class="screen-group">
                  <div class="screen-area">{area}</div>
                  <div class="screen-items">
                    {#each items as item}
                      <div class="screen-item">
                        <span class="screen-criteria">{item.criteria}</span>
                        <span class="screen-result">{item.result}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if data.interventions?.length}
    <div class="interventions-section">
      <div class="interventions-label">PAIRS Interventions</div>
      {#each data.interventions as iv}
        <div class="iv-entry">
          <span class="iv-name">{iv.intervention_name}</span>
          <span class="iv-year">{iv.year}–{iv.year + 1}</span>
        </div>
      {/each}
    </div>
  {/if}
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

  .count {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 3px 10px;
    border-radius: 20px;
  }

  .list { display: flex; flex-direction: column; }

  .assessment { border-bottom: 1px solid #f3f4f6; }
  .assessment:last-child { border-bottom: none; }

  .assessment-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 24px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    gap: 12px;
  }

  .assessment-header:hover { background: #f9fafb; }

  .assessment-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .assessment-name {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
  }

  .assessment-date {
    font-size: 12px;
    color: #9ca3af;
  }

  .chevron {
    color: #9ca3af;
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  .assessment.open .chevron { transform: rotate(180deg); }

  .assessment-body {
    padding: 4px 24px 16px;
  }

  /* IRI grid */
  .table-wrap { overflow-x: auto; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 340px;
  }

  thead th {
    padding: 6px 8px;
    font-weight: 600;
    color: #9ca3af;
    text-align: center;
    border-bottom: 1px solid #f3f4f6;
    white-space: nowrap;
  }

  .level-col { text-align: left; }

  tbody td {
    padding: 6px 8px;
    text-align: center;
    color: #374151;
    border-bottom: 1px solid #f9fafb;
  }

  .level-cell {
    text-align: left;
    font-weight: 700;
    color: #6b7280;
  }

  /* Screening groups */
  .screen-group { margin-bottom: 10px; }

  .screen-area {
    font-size: 11px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 6px;
  }

  .screen-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .screen-item {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #f9fafb;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 12px;
  }

  .screen-criteria { color: #6b7280; }

  .screen-result {
    font-weight: 700;
    color: #1f2937;
  }

  /* PAIRS interventions footer */
  .interventions-section {
    border-top: 1px solid #f3f4f6;
    padding: 14px 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .interventions-label {
    font-size: 11px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .iv-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }

  .iv-name { font-weight: 600; color: #374151; }
  .iv-year { color: #9ca3af; }
</style>
