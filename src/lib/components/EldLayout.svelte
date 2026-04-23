<script lang="ts">
  import Dashboard from '../../Dashboard.svelte';
  import Report from '../../Report.svelte';
  import PrintPage from '../../PrintPage.svelte';
  import { onMount } from 'svelte';

  // Svelte 5 best practice: Explicit prop types
  let { userRole = 'admin', yearId } = $props<{
    userRole?: string;
    yearId?: string;
  }>();

  // Router state (keeping existing ELD routing logic)
  let currentView = $state('dashboard');
  let params = $state<Record<string, string>>({});

  // Parse URL and update state
  function updateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view') || 'dashboard';
    
    // Extract all params
    const newParams: Record<string, string> = {};
    for (const [key, value] of urlParams.entries()) {
      if (key !== 'view') {
        newParams[key] = value;
      }
    }
    
    currentView = view;
    params = newParams;
  }

  // Navigate to a view with params
  function navigate(view: string, newParams: Record<string, string> = {}) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    
    // Clear existing params and set new ones
    const paramsToKeep = ['view'];
    for (const key of Array.from(url.searchParams.keys())) {
      if (!paramsToKeep.includes(key)) {
        url.searchParams.delete(key);
      }
    }
    
    for (const [key, value] of Object.entries(newParams)) {
      url.searchParams.set(key, value);
    }
    
    window.history.pushState({}, '', url.toString());
    updateFromURL();
  }

  // Handle browser back/forward
  function handlePopState() {
    updateFromURL();
  }

  onMount(() => {
    updateFromURL();
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });

  // Make navigate function available globally for linkHelpers
  if (typeof window !== 'undefined') {
    (window as any).eldNavigate = navigate;
  }

  // Role-based view logic
  function shouldShowDashboard(role: string): boolean {
    // Guardians don't get dashboard in ELD system
    return role === 'admin' || role === 'teacher';
  }

  function getDefaultView(role: string): string {
    // Guardians go straight to report view
    return shouldShowDashboard(role) ? 'dashboard' : 'report';
  }

  // Ensure guardians don't see dashboard
  $effect(() => {
    if (!shouldShowDashboard(userRole) && currentView === 'dashboard') {
      navigate(getDefaultView(userRole), params);
    }
  });
</script>

<div class="eld-layout" data-role={userRole} data-year-id={yearId}>
  {#if currentView === 'dashboard' && shouldShowDashboard(userRole)}
    <Dashboard onNavigate={navigate} />
  {:else if currentView === 'report'}
    <Report student_dcid={params.student_dcid || ''} onNavigate={navigate} />
  {:else if currentView === 'print'}
    <PrintPage student_dcid={params.student_dcid || ''} onNavigate={navigate} />
  {:else}
    <!-- Fallback based on user role -->
    {#if shouldShowDashboard(userRole)}
      <Dashboard onNavigate={navigate} />
    {:else}
      <Report student_dcid={params.student_dcid || ''} onNavigate={navigate} />
    {/if}
  {/if}
</div>

<style>
  .eld-layout {
    width: 100%;
    min-height: 100vh;
    background: var(--color-surface-alt, #f5f5f5);
  }

  /* Role-specific styling */
  .eld-layout[data-role="admin"] {
    /* Admin-specific styles if needed */
  }

  .eld-layout[data-role="teacher"] {
    /* Teacher-specific styles if needed */
  }

  .eld-layout[data-role="guardian"] {
    /* Guardian-specific styles if needed */
  }
</style>