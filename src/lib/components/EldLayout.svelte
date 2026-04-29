<script lang="ts">
  import Dashboard from '../../Dashboard.svelte';
  import Report from '../../Report.svelte';

  let { userRole = 'admin', yearId } = $props<{
    userRole?: string;
    yearId?: string;
  }>();

  let selectedStudentDcid = $state<string | null>(null);
</script>

<div class="eld-layout" data-role={userRole} data-year-id={yearId}>
  {#if selectedStudentDcid}
    <Report
      portal={userRole}
      student_dcid={selectedStudentDcid}
      onBack={() => { selectedStudentDcid = null }}
    />
  {:else}
    <Dashboard
      portal={userRole}
      onStudentSelect={(dcid) => { selectedStudentDcid = dcid }}
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
