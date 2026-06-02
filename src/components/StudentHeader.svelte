<script lang="ts">
  import type { StudentInfo } from '$lib/data'

  let { student } = $props<{ student: StudentInfo }>()
</script>

<header class="profile-header">
  <div class="avatar">
    {student.first_name?.[0] ?? ''}{student.last_name?.[0] ?? ''}
  </div>
  <div class="info">
    <h1>{student.first_name} {student.last_name}</h1>
    <div class="badges">
      <span class="badge primary">ID: {student.student_number}</span>
      <span class="badge secondary">Grade {student.grade_level}</span>
      {#if student.home_room}
        <span class="badge outline">HR: {student.home_room}</span>
      {/if}
    </div>
  </div>
  <div class="actions">
    <button class="btn">Log Intervention</button>
  </div>
</header>

<style>
  .profile-header {
    display: flex;
    align-items: center;
    gap: 24px;
    background: #fff;
    border-radius: 20px;
    padding: 28px 32px;
    border: 1px solid #f3f4f6;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    margin-bottom: 24px;
  }

  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 1px;
    flex-shrink: 0;
  }

  .info { flex: 1; }

  h1 {
    margin: 0 0 10px;
    font-size: 26px;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.5px;
  }

  .badges { display: flex; gap: 8px; flex-wrap: wrap; }

  .badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
  }

  .primary  { background: #eff6ff; color: #1d4ed8; }
  .secondary { background: #f3f4f6; color: #4b5563; }
  .outline  { border: 1px solid #e5e7eb; color: #6b7280; }

  .btn {
    background: #111827;
    color: #fff;
    border: none;
    padding: 11px 22px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .btn:hover { background: #374151; }
</style>
