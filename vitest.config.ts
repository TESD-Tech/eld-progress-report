import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import * as path from 'path'

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    conditions: ['browser'],
    alias: {
      '$lib': path.resolve(__dirname, 'src/lib'),
    },
  },
  define: {
    'import.meta.env.DEV': true,
    'import.meta.env.BASE_URL': '"/eld-progress-report/"',
  },
})
