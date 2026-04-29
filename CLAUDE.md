# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PowerSchool plugin for Elementary English Language Development (ELD) assessment reporting. Built with Svelte 5 custom elements (web components) and Vite, deployed into PowerSchool portals for teachers, admins, and guardians.

## Commands

```bash
pnpm dev          # Start Vite dev server at http://localhost:5173/eld-progress-report/
pnpm build        # Compile Svelte → JS web components into dist/
pnpm package      # build + run ps-package → creates ZIP in plugin_archive/
pnpm test         # Vitest in watch mode
pnpm test:run     # Single test run (CI)
pnpm test:coverage
```

No explicit lint script — TypeScript strict mode (`tsconfig.json`) handles type checking. Run `pnpm exec tsc --noEmit` for a type check pass.

## Architecture

### Svelte 5 Custom Elements with Shadow DOM

All UI components compile to standard HTML custom elements. Shadow DOM encapsulation prevents PowerSchool page styles from leaking in. Key implication: **all CSS must be bundled into JS** (`emitCss: false` in `vite.config.ts`) and injected at mount via `src/lib/injectShadowCss.ts`.

Root element: `<eld-progress-report-app>` (defined in `src/App.svelte`). PowerSchool HTML pages instantiate this element and pass PowerSchool template variables as attributes:

```html
<eld-progress-report-app portal="admin" year-id="~(curyearid)">
```

### SPA Routing

Client-side routing via URL query params — no page reloads. `src/lib/components/EldLayout.svelte` reads `?view=dashboard|report|print&student_dcid=...` and renders the appropriate view. Always use helpers from `src/lib/utils/linkHelpers.ts` for navigation (`reportUrl()`, `goToReport()`, `dashboardUrl()`, etc.) rather than hardcoding paths.

### Data Flow

1. PowerSchool wildcard (`src/powerschool/WEB_ROOT/wildcards/eld-progress-report/eld.json.txt`) executes SQL and returns JSON
2. `src/lib/data.ts` fetches from `./eld.json` (relative to HTML page in prod) or from Vite's dev server (`public/eld.json`) in dev
3. `loadStudents()` → `filterStudents()` → components render

Dev vs. prod data URL:
```typescript
const DATA_URL = isDev
  ? `${import.meta.env.BASE_URL}eld.json`   // → /eld-progress-report/eld.json (Vite)
  : './eld.json'                             // relative to HTML page
```

### Build & Packaging Pipeline

`pnpm build` outputs to `dist/WEB_ROOT/eld-progress-report/` (entry: `app.js`).

`pnpm package` runs `@tesd-tech/ps-package` which merges `src/powerschool/` + `dist/WEB_ROOT/` and zips into two archives in `plugin_archive/`:
- `TE_Tech_ELD_Progress_Report-{version}.zip` — UI plugin
- `DATA-TE_Tech_ELD_Progress_Report-{version}.zip` — Schema/data plugin

Version in `package.json` and both `plugin.xml` files must stay in sync (format: `YY.MM.DD`).

### PowerSchool HTML Pages

Each portal (`admin/`, `teachers/`, `guardian/`) has HTML pages that:
1. Include PowerSchool headers/footers via `~[wc:...]` wildcards
2. Mount the `<eld-progress-report-app>` custom element
3. Dynamically load the JS — raw TypeScript in dev, bundled `app.js` in prod:

```html
<script type="module">
  const isDev = location.hostname === 'localhost'
  const path = isDev
    ? '/src/main.ts'
    : '/eld-progress-report/app.js?v=~(random16)'
  import(path).catch(e => console.error('ELD load failed:', e))
</script>
```

## Key Patterns

**Svelte 5 runes** (`$state`, `$derived`, `$props`) are used throughout — avoid Svelte 4 reactive syntax.

**Prop aliasing** — custom elements receive hyphenated HTML attributes; handle multiple casings:
```typescript
let { userType, usertype, 'user-type': userTypeAttr } = $props()
```

**`$lib` alias** resolves to `src/lib/` (configured in `tsconfig.app.json` and `vite.config.ts`).

**Tests** use JSDOM (configured in `vitest.config.ts`); setup file at `src/test/setup.ts`.
