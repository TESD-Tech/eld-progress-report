<script lang="ts">
  import { onMount } from 'svelte';
  let events: Array<any> = [];
  let env = {};
  let showDetails = false;
  let hoverTimeout: number | null = null;

  onMount(() => {
    // Initialize eldDebug if it doesn't exist
    if (!window.eldDebug) {
      window.eldDebug = { 
        enabled: import.meta.env.DEV,
        events: [],
        log: (type: string, ...args: any[]) => {
          window.eldDebug.events.push([type, Date.now(), ...args]);
          if (window.eldDebug._debugBarUpdater) {
            window.eldDebug._debugBarUpdater();
          }
        },
        error: (...args: any[]) => window.eldDebug.log('error', ...args),
        warn: (...args: any[]) => window.eldDebug.log('warn', ...args),
        info: (...args: any[]) => window.eldDebug.log('info', ...args)
      };
    }

    events = window.eldDebug?.events?.slice(-12) ?? [];
    env = {
      BASE_URL: (import.meta.env && import.meta.env.BASE_URL) || '',
      PATH: window.location.pathname,
      DEBUG: window.eldDebug?.enabled,
    };
    
    // Listen for event appends
    window.eldDebug._debugBarUpdater = () => {
      events = window.eldDebug?.events?.slice(-12) ?? [];
    };
  });

  function copyDebug() {
    navigator.clipboard.writeText(
      'Recent ELD debug events:\n' +
      events.map(e => `[${e[0]}] ${new Date(e[1]).toLocaleTimeString()} ${e.slice(2).join(' ')}`).join('\n')
    );
  }

  function handleMouseEnter() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      showDetails = true;
    }, 300); // Small delay to avoid accidental triggers
  }

  function handleMouseLeave() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      showDetails = false;
    }, 200); // Quick hide when leaving
  }

  function handleClick() {
    showDetails = !showDetails;
  }
</script>

<style>
  .eld-debug-container {
    position: fixed; bottom: 20px; right: 20px; z-index: 99999;
  }
  
  .eld-debug-pill {
    background: rgba(26,58,92,0.92); color: #fff; border-radius: 22px;
    border: none; padding: 8px 14px; font-size: 13px;
    box-shadow: 0 2px 8px rgba(28,28,30,0.24);
    cursor: pointer; opacity: 0.68; transition: opacity 0.15s;
    display: flex; align-items: center; gap: 6px;
  }
  
  .eld-debug-pill:hover { opacity: 1; }
  .eld-debug-pill[data-haserr="true"] { background: #c62828; color: #fffbe0; }
  
  .eld-debug-flyout {
    position: absolute; bottom: 50px; right: 0;
    background: #fff; color: #222; border-radius: 9px;
    box-shadow: 0 6px 20px rgba(28,28,60,0.19); padding: 15px; font-size: 13px;
    border: 1.5px solid #f5bc14;
    width: 340px; max-height: 400px; overflow-y: auto;
    opacity: 0; transform: translateY(10px) scale(0.95);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
  }
  
  .eld-debug-flyout.visible {
    opacity: 1; transform: translateY(0) scale(1);
    pointer-events: all;
  }
  
  .eld-debug-header {
    font-weight: 600; margin-bottom: 12px; padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0; color: #333;
    display: flex; justify-content: space-between; align-items: center;
  }
  
  .eld-debug-env { 
    color: #493e1a; margin-bottom: 8px; font-size: 12px;
  }
  
  .eld-debug-events {
    margin: 8px 0; font-family: var(--font-mono, monospace); 
    line-height: 1.3; font-size: 11px; 
    background: #f8f8f8; padding: 8px; border-radius: 4px;
    max-height: 200px; overflow-y: auto;
  }
  
  .eld-debug-err { color: #c0392b; font-weight: bold; }
  
  .eld-copy-btn {
    background: #1976d2; color: white; border: none; border-radius: 4px;
    padding: 6px 12px; font-size: 12px; cursor: pointer;
    transition: background 0.15s;
  }
  
  .eld-copy-btn:hover { background: #1565c0; }
  
  .eld-event-count {
    background: rgba(255,255,255,0.2); border-radius: 10px;
    padding: 2px 6px; font-size: 11px; font-weight: bold;
  }
</style>

<div class="eld-debug-container" 
     onmouseenter={handleMouseEnter} 
     onmouseleave={handleMouseLeave}>
  
  <button class="eld-debug-pill" 
          data-haserr={!!events.find(e=>e[0]==='error')} 
          onclick={handleClick}>
    🐞 Debug
    {#if events.length > 0}
      <span class="eld-event-count">{events.length}</span>
    {/if}
    {#if events.find(e=>e[0]==='error')}
      ⚠️
    {/if}
  </button>

  <div class="eld-debug-flyout" class:visible={showDetails}>
    <div class="eld-debug-header">
      ELD Plugin Debug
      <button class="eld-copy-btn" onclick={copyDebug}>Copy Events</button>
    </div>
    
    <div class="eld-debug-env">
      {#each Object.entries(env) as [k,v]}
        <div><strong>{k}:</strong> {v+''}</div>
      {/each}
    </div>
    
    <div class="eld-debug-events">
      {#if events.length === 0}
        <em>No debug events yet</em>
      {:else}
        {#each events.slice().reverse() as ev}
          <div class:eld-debug-err={ev[0] === 'error'}>
            [{ev[0]}] {new Date(ev[1]).toLocaleTimeString()} {ev.slice(2).join(' ')}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>