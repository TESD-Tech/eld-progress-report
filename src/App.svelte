<script lang="ts">
  import { onMount } from 'svelte';
  import StudentView from './StudentView.svelte';
  import DebugToolbar from './components/DebugToolbar.svelte';
  import './assets/global.css';
  import { injectShadowCss } from './lib/injectShadowCss';

  let mainEl: HTMLElement | undefined = $state();

  onMount(() => {
    if (mainEl) {
      const sr = mainEl.getRootNode();
      if (sr instanceof ShadowRoot) {
        injectShadowCss(sr, '');
      }
    }
  });
</script>

<svelte:options customElement="student-dashboard-app" />

<main bind:this={mainEl}>
  <StudentView />
  {#if import.meta.env.DEV}
    <DebugToolbar onPortalChange={() => {}} />
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
</style>
