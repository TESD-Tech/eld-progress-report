# PowerSchool Svelte 5 Plugin Review

Review the following Svelte component or Vite config for PowerSchool SIS plugin compatibility:

- Does it avoid all iframe usage by using custom elements with `<svelte:options customElement=...>`?
- Are styles strictly contained (Shadow DOM, no leaked global CSS unless intentionally reset)?
- Is the Vite config set for a unique base folder, emits all assets, and applies `noEmptyChunks`?
- Are dev proxies correctly set up only for endpoints needed in dev, matching production API structure?
- Is debug functionality gated with `import.meta.env.DEV`?
- Are assets and bundled output configured for PowerSchool’s plugin directory structure?

---

```svelte
<!-- Paste your component or config below for full review! -->
```
