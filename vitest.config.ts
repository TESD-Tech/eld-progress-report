import { configDefaults, defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import * as path from 'path'

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    conditions: ['browser'],
    alias: {
      '$lib': path.resolve(__dirname, 'src/lib'),
    },
  },
  define: {
    'import.meta.env.DEV': true,
    'import.meta.env.BASE_URL': '"/student-dashboard/"',
  },
})
