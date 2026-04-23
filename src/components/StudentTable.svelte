<script lang="ts">
  import { formatName, formatDate, calculateProgress } from '$lib/utils'
  import ProgressBar from './ProgressBar.svelte'
  import type { Student } from '$lib/data'

  let { students = [], portal = 'admin' } = $props<{
    students?: Student[]
    portal?: string
  }>()

  function reportHref(dcid: string) {
    return `/${portal}/eld-progress-report/report.html?student_dcid=${dcid}`
  }
</script>

<div class="table-wrap">
  {#if students.length === 0}
    <p class="empty">No students match the current filters.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Grade</th>
          <th>Room</th>
          <th>Last Assessment</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each students as s}
          {@const p = s.response?.fields ? calculateProgress(s.response.fields) : null}
          <tr>
            <td>
              <div class="name">{formatName(s)}</div>
              <div class="sid">ID: {s.student_number}</div>
            </td>
            <td>{s.grade_level ?? '—'}</td>
            <td>{s.home_room || '—'}</td>
            <td>{formatDate(s.response?.submitted_at)}</td>
            <td>
              {#if p && p.total > 0}
                <ProgressBar percent={p.percent} meets={p.meets} total={p.total} />
              {:else}
                <span class="na">No data</span>
              {/if}
            </td>
            <td>
              <a href={reportHref(s.student_dcid)} class="btn">View Report</a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .table-wrap {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,.08);
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
  }
  th, td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
  }
  th {
    background: #fafafa;
    font-weight: 600;
    font-size: 13px;
    color: #555;
    position: sticky;
    top: 0;
    white-space: nowrap;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f5f9ff; }
  .name { font-weight: 600; font-size: 14px; }
  .sid { font-size: 12px; color: #888; margin-top: 2px; }
  .na { color: #aaa; font-size: 13px; }
  .btn {
    display: inline-block;
    padding: 5px 12px;
    background: #1976d2;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 13px;
    white-space: nowrap;
  }
  .btn:hover { background: #1565c0; }
  .empty {
    padding: 48px;
    text-align: center;
    color: #aaa;
    margin: 0;
  }
</style>
