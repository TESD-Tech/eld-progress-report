<script lang="ts">
  let {
    totalStudents = 0,
    studentsWithData = 0,
    studentsWithoutData = 0,
    avgProgress = 0,
  } = $props<{
    totalStudents?: number
    studentsWithData?: number
    studentsWithoutData?: number
    avgProgress?: number
  }>()
</script>

<div class="stats">
  <div class="card">
    <div class="label">Total Students</div>
    <div class="value">{totalStudents}</div>
  </div>
  <div class="card">
    <div class="label">With ELD Data</div>
    <div class="value">{studentsWithData}</div>
  </div>
  <div class="card">
    <div class="label">Need Assessment</div>
    <div class="value">{studentsWithoutData}</div>
  </div>
  <div class="card">
    <div class="label">Avg Progress</div>
    <div class="value">{avgProgress}%</div>
  </div>
</div>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  @media (max-width: 600px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
  }
  .card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,.08);
    text-align: center;
  }
  .label {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 6px;
  }
  .value {
    font-size: 28px;
    font-weight: 700;
    color: #1976d2;
  }
</style>
