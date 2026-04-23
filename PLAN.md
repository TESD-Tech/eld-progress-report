# ELD Progress Report — Developer Guide

## What This Plugin Does

This is a PowerSchool plugin that shows teachers, admins, and guardians a student's
Elementary English Language Development (ELD) assessment results. It has two views:

- **Dashboard** — a table of all students with filters (search, grade, room) and a
  progress summary. Admin sees everyone; teachers see their class; guardians don't
  have a dashboard.
- **Report** — one student's full assessment grid: every skill area × every marking
  period, with ✓ / ● / / symbols indicating performance.

---

## Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI framework | Svelte 5 | Compiles to a self-contained web component; no framework conflict with PowerSchool's page |
| Build tool | Vite 8 | Fast, simple, first-class Svelte support |
| Language | TypeScript | Catches mistakes before runtime; same pattern as tesd-field-trips |
| Packaging | @tesd-tech/ps-package | Merges `src/powerschool/` + `dist/WEB_ROOT/` → ZIP for PS upload |
| CSS | Shadow DOM injected | `emitCss: false` — styles are bundled in the JS; PowerSchool's CSS can't clash |

---

## Key Architectural Decisions

### 1. Svelte custom elements (web components)

Each Svelte component that starts with `<svelte:options customElement="tag-name" />`
compiles to a standard HTML custom element. This means the page just has:

```html
<eld-dashboard portal="admin"></eld-dashboard>
```

PowerSchool has no idea what that tag does. The script below it imports our JS, which
registers the custom element, and the browser renders it. This is the same pattern used
in `~/Projects/tesd-field-trips`.

### 2. Dev vs production data loading

In **dev** (`pnpm dev`): Vite serves `public/eld.json` at `/eld.json`. This is 6,803
real-shaped test students so you can develop with realistic data.

In **production** (uploaded to PowerSchool): each HTML page lives next to an `eld.json`
file that is a PowerSchool wildcard — it runs a SQL query and returns live student data.
The JS uses `./eld.json` (relative path) to fetch it.

The switch happens automatically in `src/lib/data.ts`:

```ts
const isDev = import.meta.env.DEV   // Vite sets this
// BASE_URL = '/eld-progress-report/' in dev (matches the base: config option)
// Vite serves public/ files under the base path, so public/eld.json → /eld-progress-report/eld.json
export const DATA_URL = isDev ? `${import.meta.env.BASE_URL}eld.json` : './eld.json'
```

**Why not just `/eld.json`?** With `base: '/eld-progress-report/'` in vite.config.ts, Vite serves
`public/` files under that prefix. So `public/eld.json` is at `/eld-progress-report/eld.json`
in the dev server, not at `/eld.json`. Using `import.meta.env.BASE_URL` handles this
automatically regardless of what the base path is set to.

### 3. Dev vs production script loading

Each HTML page detects localhost and either loads the raw TypeScript source (Vite
compiles it on the fly) or the built bundle:

```js
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
const path = isDev ? '/src/Dashboard.svelte' : '/eld-progress-report/dashboard.js?v=~(random16)'
import(path).catch(e => console.error('ELD load failed:', e))
```

`~(random16)` is a PowerSchool substitution that inserts a random string for cache
busting on every page load — so teachers always get the latest version after an update.

---

## Project Layout

```
eld-progress-report/
├── public/
│   └── eld.json               ← 6,803-student test dataset (dev only)
│
├── src/
│   ├── Dashboard.svelte        ← custom element <eld-dashboard portal="...">
│   ├── Report.svelte           ← custom element <eld-report portal="...">
│   │
│   ├── components/
│   │   ├── SummaryStats.svelte ← 4 stat cards (total/with data/needs data/avg %)
│   │   ├── FilterBar.svelte    ← search input + grade select + room select
│   │   ├── StudentTable.svelte ← sortable table with View Report links
│   │   ├── ProgressBar.svelte  ← mini bar + "72% (36/50)" label
│   │   └── AssessmentGrid.svelte ← skill × period table + legend
│   │
│   ├── lib/
│   │   ├── data.ts             ← Student type, loadStudents(), filterStudents(), getDashboardSummary()
│   │   └── utils.ts            ← formatName(), formatDate(), calculateProgress(),
│   │                              groupAssessmentFields(), getMarkingPeriods(),
│   │                              parseStudentDcid(), getUniqueGrades(), getUniqueRooms(),
│   │                              getAssessmentLabel()
│   │
│   └── powerschool/
│       └── WEB_ROOT/
│           ├── admin/eld-progress-report/
│           │   ├── dashboard.html   ← admin dashboard page
│           │   ├── report.html      ← admin student report page
│           │   └── eld.json         ← PS wildcard → runs SQL, returns student JSON
│           ├── teachers/eld-progress-report/
│           │   ├── dashboard.html
│           │   ├── report.html
│           │   └── eld.json
│           ├── guardian/eld-progress-report/
│           │   ├── report.html      ← guardians only see a report (no dashboard)
│           │   └── eld.json
│           └── wildcards/eld-progress-report/
│               └── eld.json.txt     ← the actual SQL query template
│
├── dist/                       ← generated by pnpm build (don't edit)
│   └── WEB_ROOT/eld-progress-report/
│       ├── dashboard.js         ← built bundle for <eld-dashboard>
│       ├── report.js            ← built bundle for <eld-report>
│       └── assets/utils-*.js   ← shared Svelte runtime chunk
│
├── plugin_archive/             ← ZIPs ready to upload to PowerSchool
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json           ← TypeScript config for src/
└── tsconfig.node.json          ← TypeScript config for vite.config.ts
```

---

## Data Shape

PowerSchool runs the SQL in `wildcards/eld-progress-report/eld.json.txt` and returns:

```json
[{
  "FULL_JSON": {
    "data": [
      {
        "student_dcid": "42318",
        "student_number": 2034095,
        "first_name": "Jane",
        "last_name": "Smith",
        "grade_level": 4,
        "home_room": "15",
        "response": {
          "id": "34798535",
          "submitted_at": "2026-02-27T09:14:14Z",
          "fields": [
            {
              "key": null,
              "title": "Marking Period 1",
              "container_title": "Follows classroom expectations",
              "value": "✓"
            },
            {
              "title": "Marking Period 2",
              "container_title": "Follows classroom expectations",
              "value": "●"
            }
          ]
        }
      }
    ]
  }
}]
```

`loadStudents()` in `src/lib/data.ts` unwraps the outer array/FULL_JSON wrapper and
returns a plain `Student[]`.

Assessment field `value` meanings:
- `✓` — Meets Expectation
- `●` — Approaching Expectation
- `/` — Below Expectation
- `+` — Exceeds Expectation
- (empty/null) — Not Yet Assessed

Fields with `title !== "Marking Period 1|2"` are metadata (Teacher name, Proficiency
Level, etc.) and are filtered out when building the assessment grid.

---

## Setup (first time)

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

### Why there's a root `index.html`

Vite redirects `http://localhost:5173/` → `http://localhost:5173/eld-progress-report/` because
of the `base` setting. It then looks for `index.html` at the project root to serve at that URL.
Without a root `index.html`, the redirect 404s.

The `index.html` uses a static `<script type="module" src="/src/Dashboard.svelte">` — Vite
statically rewrites this to include the base path. It is **not** included in the production
build (the build uses explicit `rollupOptions.input` entries, not `index.html`).

The portal HTML pages (`src/powerschool/WEB_ROOT/**/*.html`) use a **dynamic** `import(path)`
instead — Vite cannot rewrite those at build time, which is intentional: those pages need the
`isDev` runtime branch to switch between the TypeScript source and the built `.js` bundle.

### Dev URLs

After `pnpm dev`:
- `http://localhost:5173/eld-progress-report/` → admin dashboard (via root `index.html`)
- `http://localhost:5173/src/powerschool/WEB_ROOT/admin/eld-progress-report/dashboard.html` → admin dashboard with PS chrome
- Click "View Report" on any student → report page
- `http://localhost:5173/src/powerschool/WEB_ROOT/teachers/eld-progress-report/dashboard.html`
- `http://localhost:5173/src/powerschool/WEB_ROOT/guardian/eld-progress-report/report.html?student_dcid=42318`

---

## Common Development Tasks

### Change what columns appear in the student table
Edit `src/components/StudentTable.svelte`. The `<th>` headers and `<td>` cells are
straightforward HTML inside an `{#each students as s}` loop.

### Change what shows on the report page
Edit `src/Report.svelte` (student info header) and `src/components/AssessmentGrid.svelte`
(the skill × period table).

### Change how progress is calculated
Edit `calculateProgress()` in `src/lib/utils.ts`. Currently it counts fields where
`title` is "Marking Period 1" or "Marking Period 2" and `value === '✓'`.

### Add a new filter (e.g. by teacher name)
1. Extract teacher names in `getUniqueTeachers()` in `src/lib/utils.ts` — look for
   fields where `title === "ELD Teacher"` and collect their `value`.
2. Add a `teacher` prop to `FilterBar.svelte` (copy the grade dropdown pattern).
3. Add a `teacher` filter condition to `filterStudents()` in `src/lib/data.ts`.
4. Wire it up in `Dashboard.svelte` — add `let teacher = $state('')` and pass it
   to `FilterBar` and `filterStudents`.

---

## Build & Deploy

```bash
# Build the JS bundles
pnpm build
# → dist/WEB_ROOT/eld-progress-report/dashboard.js
# → dist/WEB_ROOT/eld-progress-report/report.js
# → dist/WEB_ROOT/eld-progress-report/assets/utils-*.js

# Build + create PowerSchool ZIP
pnpm package
# → plugin_archive/eld-progress-report-26.04.03.zip (or similar)
```

Upload the ZIP in PowerSchool: System > System Settings > Plugin Management Configuration.

---

## Svelte 5 Patterns Used

### Props (replacing Svelte 4's `export let`)
```svelte
let { portal = 'admin' } = $props<{ portal?: string }>()
```

### Reactive state
```svelte
let students = $state<Student[]>([])
let search = $state('')
```

### Derived values (auto-recalculated when dependencies change)
```svelte
let filtered = $derived(filterStudents(students, search, grade, room))
```

### Two-way binding between components
In parent:
```svelte
<FilterBar bind:search bind:grade bind:room {grades} {rooms} />
```
In FilterBar.svelte:
```svelte
let { search = $bindable(''), ... } = $props<...>()
```

### Lifecycle
```svelte
import { onMount } from 'svelte'
onMount(async () => {
  students = await loadStudents()
})
```

---

## How `pnpm package` Works

`@tesd-tech/ps-package` does these steps automatically:
1. Reads `package.json` for the project name and version
2. Copies `dist/WEB_ROOT/` (the compiled JS) into the output
3. Merges `src/powerschool/` (the HTML pages, SQL wildcards, plugin.xml) into the output
4. Zips the result as a PowerSchool plugin package in `plugin_archive/`

No extra configuration needed — the directory structure IS the configuration.

---

## Status (as of 2026-04-23)

- [x] package.json updated (`type: module`, dev deps, scripts)
- [x] vite.config.ts created
- [x] TypeScript configs created (tsconfig.json / app / node)
- [x] src/lib/data.ts — Student type + data loading + filtering
- [x] src/lib/utils.ts — formatting + grouping + parsing helpers
- [x] src/components/SummaryStats.svelte
- [x] src/components/FilterBar.svelte
- [x] src/components/StudentTable.svelte
- [x] src/components/ProgressBar.svelte
- [x] src/components/AssessmentGrid.svelte
- [x] src/Dashboard.svelte (`<eld-dashboard>` custom element)
- [x] src/Report.svelte (`<eld-report>` custom element)
- [x] 5 HTML loader pages (admin dashboard+report, teachers dashboard+report, guardian report)
- [x] admin/eld-progress-report/eld.json wildcard created
- [x] Old lit-html / vanilla JS pages deleted
- [x] `pnpm build` succeeds — dashboard.js (11 kB) + report.js (8.5 kB) emitted
- [x] root `index.html` created (Vite needs this to serve the base-path redirect)
- [x] `src/vite-env.d.ts` added (`/// <reference types="vite/client" />`)
- [x] `DATA_URL` fixed — uses `import.meta.env.BASE_URL` so dev fetch hits `/eld-progress-report/eld.json`
- [x] End-to-end dev server test — dashboard renders 6,803 students, filters work
- [ ] Click "View Report" and verify assessment grid on report page
- [ ] `pnpm package` → upload ZIP to PowerSchool staging
- [ ] Production smoke test
