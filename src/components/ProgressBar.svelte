<script lang="ts">
  let { percent = 0, meets = 0, total = 0 } = $props<{
    percent?: number
    meets?: number
    total?: number
  }>()
</script>

<div class="wrap">
  <div class="bar-track">
    <div class="bar-fill" style="width:{percent}%"></div>
  </div>
  <div class="pct">{percent}%</div>
  <div class="detail">({meets}/{total})</div>
</div>

<style>
  .wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .bar-track {
    width: 60px;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .bar-fill {
    height: 100%;
    background: #4caf50;
    border-radius: 4px;
  }
  .pct {
    font-weight: 600;
    color: #333;
  }
  .detail {
    color: #888;
    font-size: 12px;
  }
</style>
