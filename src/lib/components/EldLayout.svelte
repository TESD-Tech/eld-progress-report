<script lang="ts">
  import Dashboard from '../../Dashboard.svelte';
  import Report from '../../Report.svelte';
  import PrintPage from '../../PrintPage.svelte';

  let { userRole = 'admin', yearId } = $props<{
    userRole?: string;
    yearId?: string;
  }>();

  let selectedStudentDcid = $state<string | null>(null);
  let printingStudentDcids = $state<string[] | null>(null);

  function handleStudentSelect(dcid: string) {
    selectedStudentDcid = dcid;
    printingStudentDcids = null;
  }

  function handlePrintStudent(dcid: string) {
    printingStudentDcids = [dcid];
  }

  function handleBulkPrint(dcids: string[]) {
    printingStudentDcids = dcids;
  }

  function handlePrintBack() {
    printingStudentDcids = null;
  }
</script>

<div class="eld-layout" data-role={userRole} data-year-id={yearId}>
  {#if printingStudentDcids}
    <PrintPage studentDcids={printingStudentDcids} onNavigate={handlePrintBack}/>
  {:else if selectedStudentDcid}
    <Report
      portal={userRole}
      student_dcid={selectedStudentDcid}
      onBack={() => { selectedStudentDcid = null }}
      onPrint={handlePrintStudent}
    />
  {:else}
    <Dashboard
      portal={userRole}
      onStudentSelect={handleStudentSelect}
      onPrintSelected={handleBulkPrint}
    />
  {/if}
</div>

<style>
  .eld-layout {
    width: 100%;
    min-height: 100vh;
    background: var(--color-surface-alt, #f5f5f5);
  }
</style>
