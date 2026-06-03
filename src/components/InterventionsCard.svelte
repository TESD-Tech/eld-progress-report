<script lang="ts">
  import type { InterventionRecord } from '$lib/interventionsApi'

  let { records } = $props<{ records: InterventionRecord[] }>()

  function formatDate(iso: string | null): string {
    if (!iso) return 'Present'
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Group by year descending
  const byYear = $derived.by(() => {
    const map = new Map<number, InterventionRecord[]>()
    for (const r of records) {
      if (!map.has(r.year)) map.set(r.year, [])
      map.get(r.year)!.push(r)
    }
    return [...map.entries()].sort(([a], [b]) => b - a)
  })
</script>

<section class="card">
  <div class="card-header">
    <h2>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
      Intervention History
    </h2>
    <span class="count">{records.length} record{records.length !== 1 ? 's' : ''}</span>
  </div>

  {#if records.length === 0}
    <div class="card-content"><p class="empty">No intervention records found.</p></div>
  {:else}
    <div class="timeline">
      {#each byYear as [year, entries]}
        <div class="year-group">
          <div class="year-label">{year}–{year + 1}</div>
          {#each entries as r}
            <div class="entry">
              <div class="entry-header">
                <span class="intervention-name">{r.intervention}</span>
                <span class="dates">{formatDate(r.startDate)} – {formatDate(r.endDate)}</span>
              </div>
              {#if r.teacher}
                <div class="meta"><span class="label">Teacher</span> {r.teacher}</div>
              {/if}
              {#if r.studentGroup}
                <div class="meta"><span class="label">Group</span> {r.studentGroup}</div>
              {/if}
              {#if r.readingLevel}
                <div class="meta"><span class="label">Reading Level</span> {r.readingLevel}</div>
              {/if}
              {#if r.goal}
                <div class="meta"><span class="label">Goal</span> {r.goal}</div>
              {/if}
              {#if r.comments}
                <div class="meta"><span class="label">Notes</span> {r.comments}</div>
              {/if}
            </div>
          {/each}
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

  .count {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 3px 10px;
    border-radius: 20px;
  }

  .card-content { padding: 20px 24px; }

  .timeline {
    padding: 16px 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .year-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .year-label {
    font-size: 11px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-bottom: 4px;
    border-bottom: 1px solid #f3f4f6;
  }

  .entry {
    background: #f9fafb;
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
  }

  .intervention-name {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
  }

  .dates {
    font-size: 12px;
    color: #6b7280;
    white-space: nowrap;
  }

  .meta {
    font-size: 12px;
    color: #4b5563;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .label {
    font-weight: 600;
    color: #9ca3af;
    min-width: 80px;
  }

  .empty { margin: 0; color: #9ca3af; font-size: 14px; font-style: italic; }
</style>
