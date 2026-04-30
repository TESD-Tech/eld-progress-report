<script lang="ts">
  import { onMount } from 'svelte';
  import EldLayout from './lib/components/EldLayout.svelte';
  import DebugToolbar from './components/DebugToolbar.svelte';
  import './assets/global.css';
  import { injectShadowCss } from './lib/injectShadowCss';

  let {
    userType,
    userRole,
    usertype,
    portal: portalProp = 'admin',
    'user-type': userTypeAttr,
    'user-role': userRoleAttr,
    'year-id': yearIdAttr,
  } = $props<{
    userType?: string;
    userRole?: string;
    usertype?: string;
    portal?: string;
    'user-type'?: string;
    'user-role'?: string;
    'year-id'?: string;
  }>();

  let loading = $state(true);
  let error = $state(false);
  let debugPortal = $state<string | null>(null);

  const fallbackConfig = {
    yearId: new Date().getFullYear().toString()
  };

  async function loadConfig() {
    try {
      loading = false;
      error = false;
    } catch (e) {
      console.error('[ELD] Config load failed:', e);
      error = true;
      loading = false;
    }
  }

  const effectiveUserType = $derived.by(() => {
    return debugPortal || userType || usertype || userTypeAttr || userRole || userRoleAttr || portalProp || 'admin';
  });

  const effectiveYearId = $derived.by(() => {
    return yearIdAttr || fallbackConfig.yearId;
  });

  let mainEl: HTMLElement | undefined = $state();

  onMount(() => {
    loadConfig();
    if (mainEl) {
      const sr = mainEl.getRootNode();
      if (sr instanceof ShadowRoot) {
        injectShadowCss(sr, '');
      }
    }
  });
</script>

<svelte:options customElement="eld-progress-report-app" />

<main bind:this={mainEl}>
  {#if loading}
    <p>Loading...</p>
  {:else if error}
    <p style="color: red; text-align: center; padding: 1rem;">
      Error loading configuration.
    </p>
  {:else}
    <EldLayout userRole={effectiveUserType} yearId={effectiveYearId} />
  {/if}
  {#if import.meta.env.DEV}
    <DebugToolbar onPortalChange={(p: string) => { debugPortal = p }} />
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
