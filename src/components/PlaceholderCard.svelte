<script lang="ts">
  let { title } = $props<{ title: string }>()
</script>

<section class="card">
  <div class="card-header">
    <h2>{title}</h2>
  </div>
  <div class="card-content">
    <span class="pending">No records available</span>
  </div>
</section>

<style>
  .card {
    background: #fafafa;
    border-radius: 20px;
    border: 1px dashed #d1d5db;
    overflow: hidden;
  }

  .card-header {
    padding: 18px 24px;
    border-bottom: 1px dashed #e5e7eb;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #9ca3af;
  }

  .card-content {
    padding: 32px 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
  }

  .pending {
    font-size: 13px;
    font-weight: 500;
    color: #d1d5db;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
