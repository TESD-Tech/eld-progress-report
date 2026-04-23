import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
const projectName = pkg.name  // 'eld-progress-report'

function noEmptyChunks() {
  return {
    name: 'no-empty-chunks',
    generateBundle(_: unknown, bundle: Record<string, { type: string; code?: string }>) {
      for (const chunk of Object.values(bundle))
        if (chunk.type === 'chunk' && !chunk.code?.trim()) chunk.code = 'export{}'
    }
  }
}

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: { customElement: true, dev: true },
      emitCss: false,
    }),
  ],
  base: `/${projectName}/`,
  resolve: { alias: { '$lib': path.resolve(__dirname, 'src/lib') } },
  build: {
    outDir: `dist/WEB_ROOT/${projectName}/`,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        app: path.resolve(__dirname, 'src/main.ts'),
      },
      plugins: [noEmptyChunks()],
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
