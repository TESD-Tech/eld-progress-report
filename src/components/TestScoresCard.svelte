<script lang="ts">
  import type { TestScoreRecord } from '$lib/data'

  interface Props {
    scores?: TestScoreRecord[] | null
  }

  let { scores = null }: Props = $props()

  // All unique test names for filtering
  const allTests = $derived.by(() => {
    if (!scores?.length) return []
    return [...new Set(scores.map(s => s.test))].sort()
  })

  let selectedTests = $state<Set<string>>(new Set())

  // If no filter active, show all
  const filtered = $derived.by(() => {
    if (!scores?.length) return []
    const base = selectedTests.size === 0
      ? scores
      : scores.filter(s => selectedTests.has(s.test))
    return [...base].sort((a, b) => b.year - a.year || a.test.localeCompare(b.test))
  })

  function toggleTest(test: string) {
    const next = new Set(selectedTests)
    if (next.has(test)) next.delete(test)
    else next.add(test)
    selectedTests = next
  }

  function formatTestName(name: string): string {
    return name.replace(/_/g, ' ')
  }

  function levelClass(level: string | null): string {
    if (!level) return 'level-unknown'
    const trimmed = level.trim()
    // Numeric levels: 4=blue(Advanced), 3=green(Proficient), 2=yellow(Basic), 1=red(Below Basic)
    if (trimmed === '4') return 'level-advanced'
    if (trimmed === '3') return 'level-proficient'
    if (trimmed === '2') return 'level-basic'
    if (trimmed === '1') return 'level-below'
    // Text-based levels
    const l = trimmed.toLowerCase()
    if (l.includes('advanced')) return 'level-advanced'
    if (l.includes('proficient')) return 'level-proficient'
    if (l.includes('basic') && !l.includes('below')) return 'level-basic'
    if (l.includes('below')) return 'level-below'
    // WIDA scale
    if (l.includes('bridging') || l.includes('reaching')) return 'level-advanced'
    if (l.includes('expanding')) return 'level-proficient'
    if (l.includes('developing')) return 'level-basic'
    if (l.includes('entering') || l.includes('emerging')) return 'level-below'
    return 'level-unknown'
  }
</script>

<section class="card">
  <header class="card-header">
    <h2>Test Scores</h2>
    {#if scores?.length}
      <span class="count-badge">{scores.length}</span>
    {/if}
  </header>

  {#if !scores?.length}
    <p class="empty">No test score records found.</p>
  {:else}
    {#if allTests.length > 1}
      <div class="filter-bar">
        {#each allTests as test (test)}
          <button
            class="filter-pill"
            class:active={selectedTests.has(test)}
            onclick={() => toggleTest(test)}
          >
            {formatTestName(test)}
          </button>
        {/each}
        {#if selectedTests.size > 0}
          <button class="filter-clear" onclick={() => (selectedTests = new Set())}>
            Clear
          </button>
        {/if}
      </div>
    {/if}

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Year</th>
            <th class="num">Score</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as row (row.test + row.year)}
            <tr>
              <td class="test-name">{formatTestName(row.test)}</td>
              <td class="year">{row.year}</td>
              <td class="num">{row.scale_score ?? '—'}</td>
              <td>
                {#if row.achievement_level}
                  <span class="level-badge {levelClass(row.achievement_level)}">
                    {row.achievement_level}
                  </span>
                {:else}
                  <span class="na">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .card {
    background: var(--card-bg, #fff);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text, #111827);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .count-badge {
    background: var(--border, #e5e7eb);
    color: var(--muted, #6b7280);
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.1em 0.45em;
    border-radius: 999px;
  }

  .empty {
    font-size: 0.8rem;
    color: var(--muted, #6b7280);
    margin: 0;
  }

  /* Filter pills */
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }

  .filter-pill {
    font-size: 0.7rem;
    padding: 0.2em 0.6em;
    border-radius: 999px;
    border: 1px solid var(--border, #e5e7eb);
    background: transparent;
    color: var(--muted, #6b7280);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .filter-pill:hover {
    border-color: var(--accent, #6366f1);
    color: var(--accent, #6366f1);
  }

  .filter-pill.active {
    background: var(--accent, #6366f1);
    border-color: var(--accent, #6366f1);
    color: #fff;
  }

  .filter-clear {
    font-size: 0.7rem;
    padding: 0.2em 0.5em;
    border: none;
    background: none;
    color: var(--muted, #6b7280);
    cursor: pointer;
    text-decoration: underline;
  }

  /* Table */
  .table-wrap {
    overflow: auto;
    flex: 1;
    min-height: 0;
  }

  table {
    width: 100%;
    min-width: 320px;
    border-collapse: collapse;
    font-size: 0.78rem;
  }

  th {
    text-align: left;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--muted, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.3rem 0.4rem;
    border-bottom: 1px solid var(--border, #e5e7eb);
    position: sticky;
    top: 0;
    background: var(--card-bg, #fff);
  }

  th.num, td.num {
    text-align: right;
  }

  td {
    padding: 0.35rem 0.4rem;
    border-bottom: 1px solid var(--border-subtle, #f3f4f6);
    color: var(--text, #111827);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .test-name {
    font-weight: 500;
  }

  .year {
    color: var(--muted, #6b7280);
    white-space: nowrap;
    width: 3rem;
  }

  td.num {
    width: 4rem;
  }

  .na {
    color: var(--muted, #6b7280);
  }

  /* Achievement level badges */
  .level-badge {
    display: inline-block;
    padding: 0.15em 0.5em;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .level-advanced  { background: #dbeafe; color: #1d4ed8; }
  .level-proficient { background: #dcfce7; color: #166534; }
  .level-basic     { background: #fef9c3; color: #854d0e; }
  .level-below     { background: #fee2e2; color: #991b1b; }
  .level-unknown   { background: var(--border, #e5e7eb); color: var(--muted, #6b7280); }
</style>
