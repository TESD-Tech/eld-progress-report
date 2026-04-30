<svelte:options customElement="eld-print-page" />
<script lang="ts">
  import { onMount } from 'svelte'
  import { formatName, formatDate, getMetadataFields, getAssessmentLabel, groupAssessmentFields, getMarkingPeriods } from '$lib/utils'
  import type { Student } from '$lib/data'
  import { loadStudents } from '$lib/data';
  import Legend from './components/Legend.svelte';

  let { studentDcids = [], onNavigate } = $props<{
    studentDcids?: string[];
    onNavigate?: (view: string, params?: Record<string, string>) => void;
  }>()

  let students = $state<Student[]>([])
  let error = $state<string | null>(null)

  onMount(async () => {
    try {
      if (studentDcids && studentDcids.length) {
        const all = await loadStudents();
        students = all.filter(stu => studentDcids.includes(stu.student_dcid));
        if (students.length === 0) error = 'No students found for printing.';
      } else {
        error = 'No students selected for printing.';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load print data';
      return;
    }
    let didPrint = false;
    setTimeout(() => {
      if (!didPrint) {
        window.print();
        didPrint = true;
      }
    }, 300);
  });
</script>

{#if error}
  <div class="print-error">{error}</div>
{:else}
  <div class="print-back-row">
    <button class="print-back" onclick={() => onNavigate?.()}>← Back</button>
  </div>
  {#each students as student, i}
    <div class="page" class:page-break={i < students.length - 1}>
      <div class="page-header">
        <h1>ELD Progress Report</h1>
      </div>

      <div class="student-info">
        <h2>{formatName(student)}</h2>
        <div class="info-row">
          <span>ID: {student.student_number}</span>
          <span>Grade {student.grade_level}</span>
          {#if student.home_room}
            <span>Room: {student.home_room}</span>
          {/if}
          <span>{formatDate(student.response?.submitted_at)}</span>
        </div>
        {#if student.response?.fields}
          {@const meta = getMetadataFields(student.response.fields)}
          {#if meta['Proficiency Level'] || meta['Current English Proficiency Level']}
            <div class="meta-row">
              <strong>Proficiency:</strong> {meta['Proficiency Level'] ?? meta['Current English Proficiency Level']}
            </div>
          {/if}
          {#if meta['ELD Teacher']}
            <div class="meta-row">
              <strong>ELD Teacher:</strong> {meta['ELD Teacher']}
            </div>
          {/if}
        {/if}
      </div>

      {#if student.response?.fields}
        {@const grouped = groupAssessmentFields(student.response.fields)}
        {@const periods = getMarkingPeriods(student.response.fields)}
        {@const skills = Array.from(grouped.keys())}
        {#if skills.length > 0}
          <Legend />
          <table class="assessment-table">
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
          <Legend />
        {/if}
      {:else}
        <p class="no-data">No assessment data available.</p>
      {/if}
    </div>
  {/each}
{/if}

<style>
  :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }
  .page-break { page-break-after: always; }

  .page-header h1 {
    font-size: 20px;
    color: #1976d2;
    margin: 0 0 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #1976d2;
  }

  .student-info {
    margin-bottom: 20px;
  }
  .student-info h2 {
    font-size: 18px;
    margin: 0 0 8px;
    color: #222;
  }
  .info-row {
    display: flex;
    gap: 20px;
    font-size: 13px;
    color: #555;
    flex-wrap: wrap;
  }
  .meta-row {
    margin-top: 6px;
    font-size: 13px;
    color: #333;
  }

  .assessment-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-bottom: 16px;
  }
  .assessment-table th, .assessment-table td {
    padding: 7px 10px;
    border: 1px solid #ddd;
  }
  .assessment-table th {
    background: #f5f5f5;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .skill-col { min-width: 220px; }
  .period-col { text-align: center; min-width: 90px; }
  .skill-name { font-weight: 500; }
  .cell { text-align: center; font-weight: 700; font-size: 15px; }

  .val-meets { background: #e8f5e9; color: #2e7d32; }
  .val-approaching { background: #fff8e1; color: #e65100; }
  .val-below { background: #ffebee; color: #c62828; }
  .val-exceeds { background: #e3f2fd; color: #0d47a1; }
  .val-empty { background: #fafafa; color: #bbb; }

  .no-data { color: #aaa; font-size: 13px; }
  .print-error {
    padding: 24px;
    color: #c62828;
    font-size: 14px;
  }

  @media print {
    @page { margin: 0.5in; }
    .page { padding: 0; max-width: none; }
    .page-break { page-break-after: always; }
  }
.print-back-row {
  max-width: 800px;
  display: inline;
  /* margin: 0 auto 12px auto; */
  text-align: left;
}
.print-back {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.print-back:hover {
  color: #125699;
}

@media print {
  .print-back-row { display: none; }
  .print-back { display: none; }
}
</style>
