<script lang="ts">
  import type { ScheduleCourse, EnrollmentRecord } from '$lib/data'
  import { readStorage, writeStorage } from '$lib/utils/storage'

  let { schedule, enrollment = [], yearId, selectedYear = $bindable(yearId), gradeLevel = 0 } = $props<{
    schedule: ScheduleCourse[]
    enrollment?: EnrollmentRecord[]
    yearId: number
    selectedYear?: number
    gradeLevel?: number
  }>()

  // yearid → school_name lookup from enrollment history
  const schoolByYear = $derived(
    new Map(enrollment.map(e => [e.yearid, e.school_name]))
  )

  const availableYears = $derived(
    [...new Set(schedule.map(c => Math.floor(c.termid / 100)))].sort((a, b) => a - b)
  )

  $effect.pre(() => {
    const stored = parseInt(readStorage('schedule-year', ''), 10)
    if (!isNaN(stored) && availableYears.includes(stored)) selectedYear = stored
  })

  const yearLabel = (y: number) => `${y + 1990}–${y + 1991}`

  const currentIndex = $derived(availableYears.indexOf(selectedYear))
  const canPrev = $derived(currentIndex > 0)
  const canNext = $derived(currentIndex < availableYears.length - 1)

  function prev() { if (canPrev) { selectedYear = availableYears[currentIndex - 1]; writeStorage('schedule-year', String(selectedYear)) } }
  function next() { if (canNext) { selectedYear = availableYears[currentIndex + 1]; writeStorage('schedule-year', String(selectedYear)) } }

  const HIDDEN_COURSES = /^(homeroom|lunch)/i

  // Department color — keyed by credittype when present, otherwise inferred from course name
  const DEPT_COLORS: Record<string, string> = {
    MATH: '#3b82f6', ENG:  '#10b981', SCI:  '#06b6d4', SOC:  '#f59e0b',
    ART:  '#a855f7', MUS:  '#ec4899', PE:   '#f97316', WL:   '#6366f1',
    TECH: '#14b8a6', SPED: '#94a3b8', OSNU: '#94a3b8',
  }

  const KEYWORD_COLORS: [RegExp, string][] = [
    [/math|algebra|geometry|calculus|statistics/i,              '#3b82f6'],
    [/english|reading|writing|language arts|literacy|ela/i,     '#10b981'],
    [/science|biology|chemistry|physics|earth/i,                '#06b6d4'],
    [/social studies|history|geography|civics|economics/i,      '#f59e0b'],
    [/art|drawing|painting|ceramics|design/i,                   '#a855f7'],
    [/music|band|chorus|orchestra|choir/i,                      '#ec4899'],
    [/pe|physical ed|gym|health|fitness/i,                      '#f97316'],
    [/spanish|french|german|mandarin|latin|world lang/i,        '#6366f1'],
    [/technology|computer|coding|programming|stem/i,            '#14b8a6'],
    [/resource|special ed|learning support|emotional support/i, '#94a3b8'],
  ]

  function deptColor(course: ScheduleCourse): string {
    if (course.credittype && DEPT_COLORS[course.credittype]) return DEPT_COLORS[course.credittype]
    for (const [re, color] of KEYWORD_COLORS) {
      if (re.test(course.course_name)) return color
    }
    return '#d1d5db'
  }

  // Current year courses (hidden courses removed)
  const yearCourses = $derived(
    schedule.filter(c =>
      Math.floor(c.termid / 100) === selectedYear &&
      !HIDDEN_COURSES.test(c.course_name)
    )
  )

  const isElementary = $derived(gradeLevel < 5)

  // Unique dept codes present this year, sorted; for elementary, null dept courses show under "All"
  const depts = $derived(
    [...new Set(yearCourses.map(c => c.sched_department).filter((d): d is string => d != null))].sort()
  )

  // Multi-select dept filter — empty = show all
  let selectedDepts = $state<Set<string>>(
    (() => {
      try { return new Set<string>(JSON.parse(readStorage('schedule-depts', '[]'))) }
      catch { return new Set<string>() }
    })()
  )

  function toggleDept(dept: string) {
    const next = new Set(selectedDepts)
    if (next.has(dept)) next.delete(dept)
    else next.add(dept)
    selectedDepts = next
    writeStorage('schedule-depts', JSON.stringify([...next]))
  }

  function selectAllDepts() {
    selectedDepts = new Set()
    writeStorage('schedule-depts', '[]')
  }

  // Reset selectedDepts to only include departments that exist for this student/year.
  // Prevents stale localStorage selections from hiding all tiles on a new student.
  $effect(() => {
    const valid = new Set([...selectedDepts].filter(d => depts.includes(d)))
    if (valid.size !== selectedDepts.size) {
      selectedDepts = valid
      writeStorage('schedule-depts', JSON.stringify([...valid]))
    }
  })

  // Filter then sort: dept alphabetically (null last), then course name
  const courses = $derived(
    (selectedDepts.size === 0
      ? yearCourses.filter(c => isElementary || c.sched_department != null)
      : yearCourses.filter(c => c.sched_department != null && selectedDepts.has(c.sched_department))
    ).sort((a, b) => {
      const da = a.sched_department ?? '\uFFFF'
      const db = b.sched_department ?? '\uFFFF'
      return da !== db ? da.localeCompare(db) : a.course_name.localeCompare(b.course_name)
    })
  )

  // Pivot table data — used when depts are filtered; spans ALL years so user can see history
  const pivot = $derived.by(() => {
    if (selectedDepts.size === 0) return null
    const filtered = schedule.filter(c =>
      !HIDDEN_COURSES.test(c.course_name) &&
      c.sched_department != null &&
      selectedDepts.has(c.sched_department)
    )
    const years = [...new Set(filtered.map(c => Math.floor(c.termid / 100)))].sort((a, b) => a - b)
    const courseFirstYear = new Map<string, number>()
    for (const c of filtered) {
      const yr = Math.floor(c.termid / 100)
      const prev = courseFirstYear.get(c.course_name)
      if (prev === undefined || yr < prev) courseFirstYear.set(c.course_name, yr)
    }
    const courseNames = [...new Set(filtered.map(c => c.course_name))].sort((a, b) => {
      const yDiff = (courseFirstYear.get(b) ?? 0) - (courseFirstYear.get(a) ?? 0)
      return yDiff !== 0 ? yDiff : a.localeCompare(b)
    })
    // cell key: `courseName|yearId` → teacher_name
    const cells = new Map<string, string>()
    for (const c of filtered) {
      const key = `${c.course_name}|${Math.floor(c.termid / 100)}`
      if (!cells.has(key)) cells.set(key, c.teacher_name ?? '✓')
    }
    // Representative course record per course name (most recent year, for color + school)
    const courseRep = new Map<string, ScheduleCourse>()
    for (const c of filtered) {
      const existing = courseRep.get(c.course_name)
      if (!existing || Math.floor(c.termid / 100) > Math.floor(existing.termid / 100)) {
        courseRep.set(c.course_name, c)
      }
    }
    return { years, courseNames, cells, courseRep }
  })
</script>

<section class="card">
  <div class="card-header">
    <h2>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      Schedule
    </h2>
    <div class="year-switcher">
      <button onclick={prev} disabled={!canPrev} aria-label="Previous year">&#8249;</button>
      <span class="year-label">{yearLabel(selectedYear)}</span>
      <button onclick={next} disabled={!canNext} aria-label="Next year">&#8250;</button>
    </div>
    <span class="count">{courses.length} courses</span>
  </div>

  {#if depts.length > 1}
    <div class="filter-bar" role="group" aria-label="Filter by department">
      <button
        class="dept-pill"
        class:active={selectedDepts.size === 0}
        onclick={selectAllDepts}
        aria-pressed={selectedDepts.size === 0}
      >All</button>
      {#each depts as dept}
        <button
          class="dept-pill"
          class:active={selectedDepts.has(dept)}
          onclick={() => toggleDept(dept)}
          aria-pressed={selectedDepts.has(dept)}
        >{dept}</button>
      {/each}
    </div>
  {/if}

  <div class="card-content">
    {#if pivot}
      <div class="table-wrap">
        <table class="pivot-table">
          <thead>
            <tr>
              <th class="course-col">Course</th>
              <th class="school-col">School</th>
              {#each pivot.years as year}
                <th class:selected-col={year === selectedYear}>{yearLabel(year)}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each pivot.courseNames as name}
              {@const rep = pivot.courseRep.get(name)}
              <tr>
                <td class="course-name-cell">
                  {#if rep}
                    <span class="color-dot" style="background:{deptColor(rep)}"></span>
                  {/if}
                  {name}
                </td>
                <td class="school-cell">{rep ? (schoolByYear.get(Math.floor(rep.termid / 100)) ?? '—') : '—'}</td>
                {#each pivot.years as year}
                  {@const section = pivot.cells.get(`${name}|${year}`)}
                  <td class="section-cell" class:selected-col={year === selectedYear}>
                    {#if section}
                      <span class="enrolled">{section}</span>
                    {:else}
                      <span class="absent">—</span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if courses.length > 0}
      <div class="course-grid">
        {#each courses as course}
          <div class="course-item">
            <div class="color-bar" style="background: {deptColor(course)}"></div>
            <div class="course-info">
              <strong>{course.course_name}</strong>
              <span class="meta">{course.course_number}.{course.section_number}</span>
              {#if course.teacher_name}
                <span class="teacher">{course.teacher_name}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty">No active schedule found.</p>
    {/if}
  </div>
</section>

<style>
  .card {
    background: #fff;
    border-radius: 20px;
    border: 1px solid #f3f4f6;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    overflow: hidden;
  }

  .card-header {
    padding: 18px 24px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h2 svg { color: #6b7280; flex-shrink: 0; }

  .count { font-size: 12px; font-weight: 600; color: #9ca3af; }

  .year-switcher { display: flex; align-items: center; gap: 4px; }

  .year-switcher button {
    background: none;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    color: #374151;
    transition: background 0.15s, border-color 0.15s;
  }

  .year-switcher button:hover:not(:disabled) { background: #f3f4f6; border-color: #d1d5db; }
  .year-switcher button:disabled { opacity: 0.3; cursor: default; }

  .year-label {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    min-width: 76px;
    text-align: center;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 12px 24px;
    border-bottom: 1px solid #f3f4f6;
  }

  .dept-pill {
    background: none;
    border: 1.5px solid #e5e7eb;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .dept-pill:hover:not(.active) { border-color: #9ca3af; color: #374151; }

  .dept-pill.active {
    background: #1f2937;
    border-color: #1f2937;
    color: #fff;
  }

  .card-content { padding: 20px 24px; }

  .course-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .course-item {
    display: flex;
    background: #f9fafb;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #f3f4f6;
  }

  .color-bar { width: 5px; flex-shrink: 0; }

  .course-info {
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .course-info strong { font-size: 13px; color: #1f2937; }
  .meta  { font-size: 11px; color: #6b7280; }
  .teacher { font-size: 11px; color: #9ca3af; font-style: italic; }

  .table-wrap { overflow-x: auto; }

  .pivot-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .pivot-table thead th {
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 0 10px 10px;
    border-bottom: 1px solid #f3f4f6;
    white-space: nowrap;
  }

  .pivot-table thead th.course-col { text-align: left; padding-left: 0; min-width: 180px; }
  .pivot-table thead th.school-col { text-align: left; min-width: 60px; }
  .school-cell { font-size: 12px; color: #6b7280; white-space: nowrap; }

  .pivot-table tbody tr { border-bottom: 1px solid #f9fafb; }
  .pivot-table tbody tr:last-child { border: none; }

  .pivot-table td { padding: 8px 10px; vertical-align: middle; }
  .pivot-table td:first-child { padding-left: 0; }

  .course-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #374151;
    font-size: 12px;
    white-space: nowrap;
  }

  .color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .section-cell { text-align: center; }

  /* Highlight the selected year column */
  .pivot-table thead th.selected-col {
    color: #1f2937;
    background: #f3f4f6;
    border-radius: 6px 6px 0 0;
  }

  .pivot-table tbody td.selected-col { background: #f9fafb; }

  .enrolled {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
    background: #e5e7eb;
    padding: 2px 8px;
    border-radius: 6px;
  }

  .absent { color: #e5e7eb; font-size: 13px; }

  .empty { margin: 0; color: #9ca3af; font-size: 14px; font-style: italic; }
</style>
