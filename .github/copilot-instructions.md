# Copilot Instructions for `eld-progress-report`

## Build, test, and type-check commands

```bash
pnpm dev                 # Vite dev server
pnpm build               # Build web components into dist/WEB_ROOT/eld-progress-report/
pnpm package             # Build + PowerSchool packaging into plugin_archive/
pnpm test                # Full automated suite (Vitest + Playwright)
pnpm test:watch          # Vitest watch mode
pnpm test:run            # Single CI-style test run
pnpm test:coverage       # Coverage run
pnpm test:e2e            # Playwright E2E tests
pnpm test:all            # Unit + E2E
pnpm exec tsc --noEmit   # Type-check (no dedicated lint script)
```

Run a single test file:

```bash
pnpm test:run src/test/routing.test.ts
```

Run a single test case:

```bash
pnpm test:run src/test/routing.test.ts -t "entryUrl generates relative page URLs"
```

Run a single Playwright spec:

```bash
pnpm test:e2e e2e/dashboard.spec.ts
```

## High-level architecture

- **Runtime target:** Svelte 5 custom elements rendered inside PowerSchool portal pages (`admin`, `teachers`, `guardian`) and mounted as `<eld-progress-report-app ...>`.
- **Entrypoint flow:** `src/main.ts` exports `App.svelte`; `App.svelte` defines the custom element and hands rendering to `src/lib/components/EldLayout.svelte`.
- **View composition:** `EldLayout.svelte` switches between dashboard/report/print component states in-app using selected student/print state.
- **Data source pipeline:** PowerSchool wildcard SQL (`src/powerschool/WEB_ROOT/wildcards/eld-progress-report/eld.json.txt`) emits JSON; `src/lib/data.ts` fetches from `./eld.json` in production or `${import.meta.env.BASE_URL}eld.json` in dev.
- **Portal integration:** Portal HTML pages in `src/powerschool/WEB_ROOT/**/eld-progress-report/*.html` load `/src/main.ts` in localhost dev and `/eld-progress-report/app.js` in production.
- **Packaging model:** Vite outputs to `dist/WEB_ROOT/eld-progress-report/`; `pnpm package` combines built assets with `src/powerschool/` via `@tesd-tech/ps-package` into plugin ZIPs.

## Key conventions in this repository

- **Shadow DOM CSS is JS-injected:** `vite.config.ts` sets `emitCss: false`; styles are injected via `src/lib/injectShadowCss.ts` on mount.
- **Use Svelte 5 runes:** follow existing `$state`, `$derived`, `$props` patterns (not legacy reactive syntax).
- **Handle attribute casing variants for custom elements:** props often alias camelCase and hyphenated attributes (example in `App.svelte`).
- **Use URL helpers, not hardcoded links:** build internal page links with `src/lib/utils/linkHelpers.ts` (`entryUrl`, `reportUrl`, `dashboardUrl`, `printUrl`).
- **Keep plugin versions synchronized:** `package.json` version must match both `plugin.xml` and `schema/plugin.xml` (date format `YY.MM.DD`).
- **Preserve `$lib` imports:** alias is configured in both `vite.config.ts` and `vitest.config.ts`.
