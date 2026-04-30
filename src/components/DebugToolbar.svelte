<script lang="ts">
  import { onMount } from 'svelte';

  let { onPortalChange } = $props<{ onPortalChange?: (portal: string) => void }>();

  let isOpen = $state(false);
  let selectedRole = $state(
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('portal') || 'admin')
      : 'admin'
  );
  let selectedView = $state('dashboard');
  let selectedStudentDcid = $state('42318');
  let searchStudent = $state('');

  // Sample students for debug testing
  const debugStudents = [
    { dcid: '42318', name: 'Jane Smith', grade: 4 },
    { dcid: '42319', name: 'John Doe', grade: 3 },
    { dcid: '42320', name: 'Alice Johnson', grade: 5 },
    { dcid: '42321', name: 'Bob Wilson', grade: 2 }
  ];

  const filteredStudents = $derived(() => {
    if (!searchStudent) return debugStudents;
    return debugStudents.filter(s => 
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.dcid.includes(searchStudent)
    );
  });

  function navigateToView() {
    onPortalChange?.(selectedRole);
    const params = selectedView === 'report' || selectedView === 'print'
      ? { student_dcid: selectedStudentDcid }
      : {};
    
    // Use the global navigation function if available
    if (typeof window !== 'undefined' && (window as any).eldNavigate) {
      (window as any).eldNavigate(selectedView, params);
    } else {
      // Fallback - construct URL manually
      const url = new URL(window.location.href);
      url.searchParams.set('view', selectedView);
      url.searchParams.set('portal', selectedRole);

      if (selectedView === 'report' || selectedView === 'print') {
        url.searchParams.set('student_dcid', selectedStudentDcid);
      } else {
        url.searchParams.delete('student_dcid');
      }
      
      window.location.href = url.toString();
    }
  }

  function getCurrentContext() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      view: urlParams.get('view') || 'dashboard',
      portal: urlParams.get('portal') || 'unknown',
      student_dcid: urlParams.get('student_dcid') || 'none',
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      baseUrl: import.meta.env.BASE_URL
    };
  }

  let context = $state(getCurrentContext());

  onMount(() => {
    // Restore portal selection from URL on mount (survives full-page reloads)
    const urlPortal = new URLSearchParams(window.location.search).get('portal');
    if (urlPortal) {
      onPortalChange?.(urlPortal);
    }

    // Update context when URL changes
    const updateContext = () => {
      context = getCurrentContext();
    };
    
    window.addEventListener('popstate', updateContext);
    
    // Also update on navigation
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      updateContext();
    };
    
    return () => {
      window.removeEventListener('popstate', updateContext);
      history.pushState = originalPushState;
    };
  });
</script>

<div class="debug-toolbar" class:open={isOpen}>
  <button class="toggle-btn" onclick={() => isOpen = !isOpen}>
    {isOpen ? '×' : '🛠️'}
  </button>
  
  {#if isOpen}
    <div class="debug-panel">
      <h3>🚀 ELD Debug Toolbar</h3>
      
      <div class="section">
        <h4>Current Context</h4>
        <div class="context-grid">
          <span>View:</span> <code>{context.view}</code>
          <span>Portal:</span> <code>{context.portal}</code>
          <span>Student DCID:</span> <code>{context.student_dcid}</code>
          <span>Hostname:</span> <code>{context.hostname}</code>
          <span>Base URL:</span> <code>{context.baseUrl}</code>
        </div>
      </div>

      <div class="section">
        <h4>Navigation</h4>
        <div class="nav-controls">
          <select bind:value={selectedRole}>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="guardian">Guardian</option>
          </select>
          
          <select bind:value={selectedView}>
            <option value="dashboard">Dashboard</option>
            <option value="report">Report</option>
            <option value="print">Print</option>
          </select>
        </div>
      </div>

      {#if selectedView === 'report' || selectedView === 'print'}
        <div class="section">
          <h4>Student Selection</h4>
          <input 
            type="text" 
            placeholder="Search students..." 
            bind:value={searchStudent}
          />
          <select bind:value={selectedStudentDcid}>
            {#each filteredStudents as student}
              <option value={student.dcid}>
                {student.name} (Grade {student.grade}) - DCID: {student.dcid}
              </option>
            {/each}
          </select>
        </div>
      {/if}

      <button class="go-btn" onclick={navigateToView}>
        🚀 Navigate
      </button>
    </div>
  {/if}
</div>

<style>
  .debug-toolbar {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10000;
    font-family: var(--font-mono, 'Monaco', 'Courier New', monospace);
    font-size: 12px;
  }

  .toggle-btn {
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    font-size: 16px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    background: #1565c0;
    transform: scale(1.1);
  }

  .debug-panel {
    position: absolute;
    bottom: 50px;
    left: 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 16px;
    width: 320px;
    max-height: 400px;
    overflow-y: auto;
  }

  .debug-panel h3 {
    margin: 0 0 12px 0;
    color: #1976d2;
    font-size: 14px;
  }

  .debug-panel h4 {
    margin: 12px 0 6px 0;
    color: #333;
    font-size: 12px;
    font-weight: 600;
  }

  .section {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  .section:last-of-type {
    border-bottom: none;
  }

  .context-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 8px;
    font-size: 11px;
  }

  .context-grid code {
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: inherit;
  }

  .nav-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .nav-controls select {
    flex: 1;
    min-width: 0;
  }

  input, select {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 11px;
    margin-bottom: 6px;
  }

  .go-btn {
    width: 100%;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 12px;
    margin-top: 8px;
  }

  .go-btn:hover {
    background: #45a049;
  }
</style>