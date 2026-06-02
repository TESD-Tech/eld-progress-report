<script lang="ts">
  import type { EnrollmentRecord } from '$lib/data'

  let { enrollment, highlightYear = $bindable(0) } = $props<{
    enrollment: EnrollmentRecord[]
    highlightYear?: number
  }>()

  const sorted = $derived(
    enrollment.slice().sort((a, b) => b.yearid - a.yearid)
  )
</script>

<section class="card">
  <div class="card-header">
    <h2>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      Enrollment History
    </h2>
    <span class="count">{enrollment.length} records</span>
  </div>
  <div class="card-content">
    {#if sorted.length > 0}
      <div class="timeline">
        {#each sorted as enr, i}
          <div
            class="item"
            class:current={enr.yearid === highlightYear}
            role="button"
            tabindex="0"
            onclick={() => highlightYear = enr.yearid}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') highlightYear = enr.yearid }}
          >
            <div class="dot"></div>
            <div class="details">
              <strong>{enr.school_name}</strong>
              <span>Grade {enr.grade_level} · {enr.entrydate.substring(0, 4)}–{enr.exitdate.substring(0, 4)}</span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty">No enrollment history available.</p>
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

  .count {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
  }

  .card-content { padding: 20px 24px; }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: #e5e7eb;
  }

  .item {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 10px 0;
    position: relative;
    cursor: pointer;
    border-radius: 8px;
    padding-left: 0;
    padding-right: 8px;
    transition: background 0.12s;
  }

  .item:hover { background: #f9fafb; }
  .item:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #d1d5db;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px #d1d5db;
    margin-top: 3px;
    flex-shrink: 0;
    z-index: 1;
  }

  .item.current .dot {
    background: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .details strong { font-size: 14px; color: #1f2937; font-weight: 600; }
  .details span   { font-size: 12px; color: #6b7280; }

  .empty { margin: 0; color: #9ca3af; font-size: 14px; font-style: italic; }
</style>
