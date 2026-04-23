<script lang="ts">
  let {
    search = $bindable(''),
    grade = $bindable(''),
    room = $bindable(''),
    grades = [],
    rooms = [],
  } = $props<{
    search?: string
    grade?: string
    room?: string
    grades?: string[]
    rooms?: string[]
  }>()
</script>

<div class="filter-bar">
  <div class="filter-group">
    <label for="eld-search">Search</label>
    <input
      id="eld-search"
      type="search"
      placeholder="Name or student ID…"
      bind:value={search}
    />
  </div>
  <div class="filter-group">
    <label for="eld-grade">Grade</label>
    <select id="eld-grade" bind:value={grade}>
      <option value="">All Grades</option>
      {#each grades as g}
        <option value={g}>Grade {g}</option>
      {/each}
    </select>
  </div>
  <div class="filter-group">
    <label for="eld-room">Room</label>
    <select id="eld-room" bind:value={room}>
      <option value="">All Rooms</option>
      {#each rooms as r}
        <option value={r}>Room {r}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .filter-bar {
    background: white;
    border-radius: 8px;
    padding: 16px 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,.08);
    margin-bottom: 24px;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 16px;
    align-items: end;
  }
  @media (max-width: 600px) {
    .filter-bar { grid-template-columns: 1fr; }
  }
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  input, select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    width: 100%;
    box-sizing: border-box;
    background: white;
  }
  input:focus, select:focus {
    outline: none;
    border-color: #1976d2;
  }
</style>
