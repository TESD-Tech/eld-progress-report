---
name: powerschool-svelte5-bestpractices
description: Essential best practices for building and deploying Svelte 5 apps as PowerSchool SIS plugins (no iframes, custom web components, vite/asset/CSS integration, and smoother dev/prod flows).
---

# PowerSchool Svelte 5 Best Practices

## Absolutely avoid iframes
- Never use iframes—**always** use Svelte custom elements (`<svelte:options customElement=... >`).
- PowerSchool plugins work best as native web components (custom elements); enables full style and script isolation and avoids edge-case event/CSS issues.

## CSS Encapsulation & Shadow DOM
- Use Svelte custom elements to encapsulate logic and styling in Shadow DOM.
- Only inject global CSS fixes if required by PowerSchool base styles. Favor `reset` and feature/utility class isolation.

## Vite Config Do’s
- Use a unique `base` path in `vite.config.ts` (e.g., `/your-app/`) to avoid asset collision.
- Always output to a subfolder, never root. Use the Rollup plugin to ensure no empty chunks: PowerSchool can silently error on empty bundles.
- Set `customElement: true` and `emitCss: false` in Svelte plugin config for proper bundling.
- Alias all internal imports from `$lib` for maintainable code.

## Assets & Directory Structure
- All assets should resolve relative to your unique base path in PowerSchool.
- Test deployment from a subdir (`/WEB_ROOT/your-app`) to confirm asset and import correctness.
- **In all Svelte 5 PowerSchool apps:** Source HTML for plugin entry points (dashboard.html, report.html, etc.) live in `src/powerschool/WEB_ROOT/[role]/[plugin]/`, never in `dist/` (which is for build output only). Always make edits to entry HTML in `src/powerschool/WEB_ROOT` so your changes are preserved on rebuild.

## Proxy/Dev Server
- Only proxy critical endpoints, and always match PowerSchool production URLs as closely as possible.
- Keep SSL verification disabled only for dev.

## Dev Features
- Debug features/components (toolbars, etc.) should display only in `import.meta.env.DEV`.

## Reference Example
- Use the `tesd-field-trips` repo as a live blueprint for config, CSS, custom elements, asset handling, and PowerSchool deployment workflow.

---

## HTML Entry & Bundle Loading
- **Never edit files in `dist/`!** Always update your HTML entry points in `src/powerschool/WEB_ROOT/[role]/[plugin]/` only.
- All plugin pages (dashboard.html, report.html, print.html, etc.) must load the same single production bundle: `/[plugin]/app.js`.
- In dev, continue to load from `/src/main.ts` for hot module reload support.
- Do NOT attempt per-page bundles like `report.js` or `dashboard.js` unless your Vite config expressly emits those files, which is almost never necessary or recommended.
- This mirrors the robust single-bundle approach in tesd-field-trips, avoids 404s, and guarantees every route/role properly registers your custom elements.

## Role/Portal Configuration & Extensibility (DRY)

- Centralize all role logic in a single config object:

```ts
// portal-config.ts or at top of +page.svelte / App.svelte
export const portalConfigs = {
  admin:    { label: 'Administrative Dashboard', subtitle: 'All Students', canPrint: true, showAllStudents: true },
  teachers: { label: 'Teacher Dashboard',        subtitle: 'My Students',  canPrint: true, showAllStudents: false },
  guardian: { label: 'Guardian Dashboard',       subtitle: 'My Children',  canPrint: false, showAllStudents: false }
  // future roles: add here!
};
```

- Reference config in UI (never hardcoded):

```svelte
<script lang="ts">
  import { portalConfigs } from './portal-config';
  export let portal = 'admin'; // or prop/user/environment
</script>

<h1>{portalConfigs[portal]?.label ?? 'Dashboard'}</h1>
<p class="subtitle">{portalConfigs[portal]?.subtitle ?? ''}</p>
```

- Access data based on role:

```ts
function filterStudentsByPortal(portal, students, user) {
  switch (portal) {
    case 'admin': return students;
    case 'teachers': return students.filter(s => s.teacherId === user.id);
    case 'guardian': return students.filter(s => s.guardianId === user.id);
    // future roles: extend here only!
    default: return [];
  }
}
```

- Fully generalized navigation example:

```ts
// Svelte: {#if view === 'dashboard'} <Dashboard {portal} ... /> {/if}

function navigateTo(view, params = {}) {
  $view = { page: view, portal: params.portal || $portal };
}
```

- **Never branch on roles in UI.** All UX, navigation, and features are DRY and config-driven.

---

> **Extending for new roles:**  
> - Add config to `portalConfigs`.
> - Add handler (if needed) to filtering/data/feature methods.
> - No additional UI/logic branches required.

---

### Copy these patterns for all future plugins!
