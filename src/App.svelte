<script lang="ts">
  import { onMount } from 'svelte';
  import EldLayout from './lib/components/EldLayout.svelte';
  import DebugToolbar from './components/DebugToolbar.svelte';
  import './assets/global.css';
  import { injectShadowCss } from './lib/injectShadowCss';

  // Svelte 5 best practice: Explicit prop declaration for custom elements
  let { 
    userType,
    userRole,
    usertype,
    portal = 'admin',
    'user-type': userTypeAttr,
    'user-role': userRoleAttr,
    'year-id': yearIdAttr
  } = $props<{
    userType?: string;
    userRole?: string;
    usertype?: string;
    portal?: string;
    'user-type'?: string;
    'user-role'?: string;
    'year-id'?: string;
  }>();

  // Local state using $state rune (Svelte 5 best practice)
  let loading = $state(true);
  let error = $state(false);

  function isPrintRoute(): boolean {
    return window.location.pathname.endsWith('/print') || window.location.pathname.includes('/print/');
  }

  // Fallback configuration for ELD Progress Report
  const fallbackConfig = {
    portal: 'admin',
    yearId: new Date().getFullYear().toString()
  };

  async function loadConfig() {
    try {
      loading = false; // Stub - instant load (replace with ELD config if needed)
      error = false;
    } catch (e) {
      console.error('[ELD] Config load failed:', e);
      error = true;
      loading = false;
    }
  }

  // Svelte 5 $derived for computed values (best practice)
  const effectiveUserType = $derived(() => {
    return userType || usertype || userTypeAttr || userRole || userRoleAttr || portal || 'admin';
  });

  const effectiveYearId = $derived(() => {
    return yearIdAttr || fallbackConfig.yearId;
  });

  // Bind a reference element so we can walk up to the shadow root.
  let mainEl: HTMLElement | undefined = $state();

  onMount(() => {
    loadConfig();
    // Shadow DOM CSS injection for PowerSchool integration
    if (mainEl) {
      const sr = mainEl.getRootNode();
      if (sr instanceof ShadowRoot) {
        // Custom element shadow DOM requires injected CSS
        injectShadowCss(sr, '');
      }
    }
  });
</script>

<svelte:options customElement="eld-progress-report-app" />

<main bind:this={mainEl}>
  {#if isPrintRoute()}
    <p>ELD Progress Report Print View coming soon</p>
  {:else if loading}
    <p>Loading...</p>
  {:else if error}
    <p style="color: red; text-align: center; padding: 1rem;">
      Error loading configuration.
    </p>
  {:else}
    <EldLayout userRole={effectiveUserType()} yearId={effectiveYearId()} />
  {/if}
  {#if import.meta.env.DEV && !isPrintRoute()}
    <DebugToolbar />
  {/if}
</main>

<style>
  main {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    display: block;
  }
  p {
    padding: 2rem;
    text-align: center;
    font-style: italic;
    color: #555;
  }
</style>