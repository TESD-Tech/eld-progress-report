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

## Navigation, BASE_URL, and Multipage Link Patterns

### TL;DR (Intern Quickstart Cheat Sheet)
- **Never hardcode dev-only paths** (like `/src/...`); use relative entrypoint links everywhere.
- **Centralize navigation**: Use a helper (see `src/lib/utils/linkHelpers.ts` in this repo) to generate all inter-page links. Pass query params as needed.
- **Always use `import.meta.env.BASE_URL`** as your root for static entrypoints. Vite injects this (e.g. `/eld-progress-report/`) in both dev and prod.

#### Example for a "View Report" link:
```ts
import { reportUrl } from '$lib/utils/linkHelpers'
// ...
<a href={reportUrl(student_dcid)}>View Report</a>
```

#### Example for print page in JS:
```ts
import { printUrl } from '$lib/utils/linkHelpers'
window.open(printUrl(), '_blank')
```

- **Vite config must always set** `base: '/your-plugin-name/'` — BASE_URL gets injected accordingly in all code.
- If any page must reload or navigate, always use the centralized helper for consistency.
- All top-level `report.html`, `dashboard.html`, etc are always at BASE_URL root in dev and prod. Make sure they're copied (or symlinked) in both modes.
- If you do need context (admin/teacher/guardian), add a param to the helper and build the URL accordingly.

### Why This? (Lessons learned from tesd-field-trips and here)
- Old pattern of linking directly to `/src/` in dev is brittle and will break on build and when Vite structure changes.
- BASE_URL-aware helpers give perfect parity between dev and production, no code branching required for navigation.
- See `src/lib/utils/environment.ts` for centralized dev/prod/context detection—never use `import.meta.env.DEV` in more than one place! It also gives you the base path, host, and other meta fields.
- All team members and future interns should just call one link-building function and forget the rest.

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

## Dev Toolbar / Dev Panel Patterns

### Purpose
The dev toolbar is a floating modal in the lower left that lets you rapidly switch between contexts (admin, teacher, guardian), render dashboard/report as any user, and pick a current student to simulate navigation.

### Key features
- Portal (admin/teacher/guardian) and page (dashboard/report) selectors
- Student picker with search, to rapidly load a particular student's report
- A single "Go" button triggers the navigation
- Can be collapsed to keep out of the way when not needed

### Navigation implementation
- The toolbar should call the same centralized helpers as the rest of the app for navigation—never hardcode `/src/` or any context path directly!
- Example:
```ts
import { reportUrl, dashboardUrl } from '$lib/utils/linkHelpers'
location.href = page === 'report' ? reportUrl(selectedDcid) : dashboardUrl()
```
- Update the dev toolbar to use the real link helpers—so it always builds production-correct links in both dev and prod.

### Adapt for new apps
- Copy the pattern, but always route all navigation through project-standard link helpers.
- Give yourself a toggle (`import.meta.env.DEV`) so the toolbar hides/renders only in dev mode—not in production.

---

## Testing Strategy

### Overview
PowerSchool plugins require robust testing due to their dual environment nature (dev + production) and complex path/URL handling. This plugin uses **Vitest** for comprehensive testing that catches the most common deployment issues before they reach production.

### Test Framework
- **Vitest** (chosen over Jest for better Vite integration)
- **@testing-library/svelte** for component testing
- **@testing-library/jest-dom** for DOM assertions
- **happy-dom** as jsdom alternative

### Test Categories

#### 1. BASE_URL Compliance Testing
**Critical for PowerSchool deployment success**

```bash
pnpm test:routing  # Validates all URL patterns
```

Tests that catch common deployment failures:
- **HTML files** — ensures all script imports use BASE_URL-aware paths, not hardcoded `/src/`
- **Component links** — validates navigation uses `linkHelpers` not direct hardcoded paths  
- **Data fetching** — confirms fetch URLs work in both dev and production
- **Print page URLs** — validates window.open() paths are environment-aware

**Example test patterns caught:**
```javascript
// ❌ FAILS TEST (hardcoded dev path)
import('/src/Dashboard.svelte')

// ✅ PASSES TEST (BASE_URL aware)
const basePath = window.location.pathname.includes('/eld-progress-report/') ? '/eld-progress-report' : ''
const path = isDev ? `${basePath}/src/Dashboard.svelte` : '/eld-progress-report/dashboard.js'
```

#### 2. Component Testing
**Validates Svelte component behavior**

```bash
pnpm test:components  # Component unit tests
```

- **StudentTable** — filtering, sorting, report link generation
- **AssessmentGrid** — data display, progress calculation
- **DashboardStats** — filtering counts, ELD student detection
- **Custom elements** — proper mounting and data flow

#### 3. File-based Pattern Testing
**Automated antipattern detection**

```bash
pnpm test:html  # Scans all HTML files for compliance
```

Automatically scans HTML files for:
- Hardcoded `/src/` imports
- Missing BASE_URL handling
- Incorrect script tag patterns
- Dev-only paths in production builds

#### 4. Integration Testing
**End-to-end workflow validation**

```bash
pnpm test:e2e  # Full user journey testing
```

- Dashboard loads → Student filtering works → View Report navigation → Assessment display
- Print functionality works across all pages
- Data fetching succeeds in both environments

### Test Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts']
  }
})
```

### Running Tests

```bash
# Full test suite
pnpm test

# Watch mode during development  
pnpm test:watch

# Specific test categories
pnpm test:routing      # BASE_URL compliance only
pnpm test:components   # Svelte component tests only
pnpm test:html         # HTML file pattern validation
```

### Why This Testing Strategy?

**Lessons learned from PowerSchool plugin deployments:**

1. **95% of deployment failures** are path/URL related — BASE_URL compliance testing catches these
2. **HTML file patterns** are easy to get wrong when copying between dev/prod — automated scanning prevents this
3. **Component navigation** breaks silently — explicit link testing finds issues early
4. **Build differences** between dev and prod are subtle — file-based tests catch antipatterns

### Test-Driven Development Workflow

1. **Write failing test** for new navigation/URL feature
2. **Implement feature** until test passes
3. **Run full test suite** to catch regressions
4. **Build and manually verify** in dev server
5. **Deploy to staging** with confidence

### Common Test Failures & Fixes

**"Hardcoded path detected"** → Use BASE_URL-aware pattern:
```javascript
// Instead of: '/src/Dashboard.svelte'
const path = isDev ? `${basePath}/src/Dashboard.svelte` : '/eld-progress-report/dashboard.js'
```

**"Component navigation broken"** → Use linkHelpers:
```typescript
// Instead of: `report.html?student_dcid=${student.dcid}`
reportUrl: linkHelpers.reportUrl(student.dcid)
```

**"Data fetch 404 in dev"** → Use BASE_URL in fetch:
```typescript
// Instead of: fetch('/eld.json')
fetch(`${import.meta.env.BASE_URL}eld.json`)
```

---

## Debug Mode (Runtime Diagnostics)

This plugin supports a robust debug mode for deployment in uncertain environments (like PowerSchool) and for easier troubleshooting/non-console users.

- **Enable via** query string (`?eld_debug=1`), `localStorage` (`eld_debug`), or automatically in dev build.
- **Effect:**
  - Adds a floating DebugBar overlay with real-time health/status, mounting events, errors, and useful environment info (BASE_URL, view, etc.)
  - Captures every debug event/error via a shared `window.eldDebug` object.
  - All debug logs/errors use `eldDebug.log/error()`—never scattered `console.log`s.
  - Users/devs can see and copy error details even if they can't open the browser console.

**Best practices:**
- Add a debug log for every critical lifecycle event: script load, mount, missing element, API fail, view change, etc.
- Avoid showing debug overlay in production unless enabled by user/dev.
- In field-trips style, prefer in-app runtime diagnostics over buried console noise, especially for support and version tracking.

---

## Visual Style Guide

This project uses a modern, minimal, readable design that matches PowerSchool’s admin/teacher UI, with a focus on clarity and accessibility.

### Fonts
- **Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Font sizes:**
  - Page/content text: 15px–16px
  - Subtitles: 14px
  - Labels/meta: 11px–13px
  - Headings: 22px–24px

### Colors
- **Primary blue:** #1976d2
- **Subdued blue:** #1565c0
- **Highlight (background):** #e3f2fd
- **Error:** #c62828 (text on #ffebee background)
- **Success/OK:** system default
- **Text:** #333 on #fff/#f5f5f5 backgrounds; #666/#888 for secondary

### Spacing & Borders
- **Border-radius:** 4px–8px on cards, buttons, header boxes
- **Box shadow:** soft, `0 2px 4px rgba(0,0,0,.08)` on cards/headers
- **Padding/margin:** 12–24px on headers, cards, filter rows
- **Table row hover:** #f5f9ff background

### Buttons
- **Primary (blue):** background #1976d2, white text
- **Secondary (gray):** background #78909c, white text
- **Shape:** Rounded corners, font 13px
- **Hover:** Darker tone

### Layout
- **Max width:** 1200px (centered)
- **Cards:** White backgrounds, shadow, padding
- **Dashboard grid/stat cards**: 4-column responsive

### General Principles
- Consistent use of CSS variables and classes
- Easy to expand/adapt style for new plugins
- Styles scoped to `.eld` and components to avoid global leak

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

---

## NEXT-GEN ARCHITECTURE ROADMAP (Field Trips → ELD)

Based on analysis in `FIELD-TRIP-COMPARISON.md`, the following patterns from our gold-standard field-trips project need to be adopted:

### Phase 1: CRITICAL Foundation (Do First) 🔥

#### Custom Element Architecture Upgrade
- [ ] **Convert App.svelte to custom element pattern**
  - `<svelte:options customElement="eld-progress-report-app" />`
  - Replace `<eld-dashboard>` with `<eld-progress-report-app portal="admin" year-id="~(curyearid)">`
  - Multi-attribute prop handling (user-type, user-role, year-id)
  - Shadow DOM support

#### Props-Based Configuration System
- [ ] **Implement field-trips prop pattern**
  - Support kebab-case and camelCase attributes
  - Fallback chain for missing props
  - PowerSchool template variable integration
  - Type-safe configuration with derived reactive state

#### Multi-Agent Development Infrastructure
- [ ] **Create `AGENTS.md`** — AI development best practices
- [ ] **Set up `TODO.md` system** — shared coordination between AI agents
- [ ] **Add `AGENT_STATUS.md`** — heartbeat tracking
- [ ] **Voice notification integration** — `vox` command for human escalation
- [ ] **Environment validation script** — `scripts/validate-dev-env.js`

#### Test-Driven Development Workflow
- [ ] **Enforce TDD practices** — write tests first, then implement
- [ ] **Component test templates** — standardized testing patterns
- [ ] **Continuous validation** — automated test running
- [ ] **Coverage requirements** — maintain test coverage standards

### Phase 2: HIGH Priority Architecture (Do Next) ⚡

#### Layout Component Architecture
- [ ] **Create `EldLayout.svelte`** — role-based layout switching
- [ ] **Separate App.svelte concerns** — delegate to layout component
- [ ] **Role-based routing** — admin/teacher/guardian specific layouts
- [ ] **Clean component hierarchy**

#### Shadow DOM CSS Injection
- [ ] **Implement `injectShadowCss` pattern**
- [ ] **PowerSchool CSS isolation** — prevent style conflicts
- [ ] **Professional styling integration**
- [ ] **Shadow root detection and handling**

#### Sophisticated Store Architecture
- [ ] **Create user role store** — centralized role management
- [ ] **Reactive state patterns** — Svelte 5 + store integration
- [ ] **Derived state management** — computed values from stores
- [ ] **State synchronization** — props ↔ stores coordination

#### Enhanced Debug Tooling
- [ ] **Debug toolbar for development**
- [ ] **Print route detection** — special handling for print views  
- [ ] **Environment-aware debugging** — dev vs prod tooling
- [ ] **Error boundary patterns** — graceful error handling

### Phase 3: MEDIUM Priority Features (Nice to Have) ✨

#### Context7 Integration
- [ ] **Developer reference API access**
- [ ] **Best practices queries** — automated documentation lookup
- [ ] **TDD-specific Context7 queries**
- [ ] **Authentication setup**

#### Advanced PowerSchool Integration
- [ ] **Cache busting patterns** — `~(random16)` integration
- [ ] **Sophisticated dev/prod script loading**
- [ ] **Error handling improvements**
- [ ] **Console logging standards**

#### File Organization Restructure
- [ ] **Role-based component folders**
  - `src/lib/components/ui/` — reusable components
  - `src/lib/components/eld/admin/` — admin-specific
  - `src/lib/components/eld/teacher/` — teacher-specific
  - `src/lib/components/eld/guardian/` — guardian-specific
  - `src/lib/components/debug/` — development tools

### Phase 4: INNOVATION Opportunities (Beyond Field Trips) 🚀

#### Enhanced Routing
- [ ] **Better SPA routing** — improve current URL param system
- [ ] **History API integration** — browser back/forward support
- [ ] **Deep linking** — bookmarkable URLs

#### Performance Optimization
- [ ] **Bundle optimization** — code splitting strategies
- [ ] **Lazy loading** — component-level lazy loading
- [ ] **Caching strategies** — intelligent data caching

#### Component Library Foundation
- [ ] **Reusable UI components** — for other TESD plugins
- [ ] **Design system** — consistent styling patterns
- [ ] **Accessibility improvements** — better a11y than current

#### State Management Evolution
- [ ] **Advanced reactive patterns** — sophisticated Svelte 5 usage
- [ ] **Cross-component communication** — better than current approach
- [ ] **Data flow optimization** — efficient data management

---

## Current Status (as of 2026-04-23)

### ✅ COMPLETED - Basic Svelte 5 Implementation
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

### 🔄 NEXT IMMEDIATE TASKS
- [ ] Click "View Report" and verify assessment grid on report page
- [ ] `pnpm package` → upload ZIP to PowerSchool staging  
- [ ] Production smoke test
- [ ] **BEGIN PHASE 1** — Custom element architecture upgrade
