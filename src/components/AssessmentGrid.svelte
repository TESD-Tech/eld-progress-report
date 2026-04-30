<script lang="ts">
  import { groupAssessmentFields, getMarkingPeriods, getAssessmentLabel } from '$lib/utils'
  import type { StudentField, FieldMetadata } from '$lib/data'

  let { fields = [], metadata = {} } = $props<{
    fields?: StudentField[]
    metadata?: Record<string, FieldMetadata>
  }>()

  let grouped = $derived(groupAssessmentFields(fields, metadata))
  let periods = $derived(getMarkingPeriods(fields, metadata))
  let skills = $derived(Array.from(grouped.keys()))
</script>

<div class="grid-wrap">
  <h2>Assessment Results</h2>

  <div class="legend">
    <span class="l-meets">✓</span> Meets &nbsp;&nbsp;
    <span class="l-approaching">●</span> Approaching &nbsp;&nbsp;
    <span class="l-below">/</span> Below &nbsp;&nbsp;
    <span class="l-empty">—</span> Not Yet Assessed
  </div>

  {#if skills.length === 0}
    <p class="empty">No assessment data available for this student.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="skill-col">Skill Area</th>
            {#each periods as period}
              <th class="period-col">{period}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each skills as skill}
            {@const periodMap = grouped.get(skill)!}
            <tr>
              <td class="skill-name">{skill}</td>
              {#each periods as period}
                {@const lbl = getAssessmentLabel(periodMap.get(period))}
                <td class="cell {lbl.cssClass}" title={lbl.meaning}>{lbl.symbol}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .grid-wrap {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 4px rgba(0,0,0,.08);
  }
  h2 { margin: 0 0 16px; font-size: 18px; color: #333; }
  .legend {
    font-size: 13px;
    color: #555;
    margin-bottom: 20px;
    padding: 12px 16px;
    background: #f8f8f8;
    border-radius: 6px;
  }
  .l-meets { color: #388e3c; font-weight: 700; }
  .l-approaching { color: #f57c00; font-weight: 700; }
  .l-below { color: #d32f2f; font-weight: 700; }
  .l-empty { color: #aaa; font-weight: 700; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
  }
  th {
    background: #fafafa;
    font-weight: 600;
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: .04em;
    white-space: nowrap;
  }
  .skill-col { min-width: 240px; }
  .period-col { text-align: center; min-width: 120px; }
  .skill-name { font-weight: 500; }
  .cell { text-align: center; font-weight: 700; font-size: 16px; }
  .val-meets { background: #e8f5e9; color: #2e7d32; }
  .val-approaching { background: #fff8e1; color: #e65100; }
  .val-below { background: #ffebee; color: #c62828; }
  .val-exceeds { background: #e3f2fd; color: #0d47a1; }
  .val-empty { background: #fafafa; color: #bbb; }
  tr:last-child td { border-bottom: none; }
  .empty { color: #aaa; text-align: center; padding: 32px 0; margin: 0; }
  @media print {
    .grid-wrap { box-shadow: none; padding: 0; }
  }
</style>
