import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@shared': `${workspaceRoot}src/shared`,
      '@desktop': `${workspaceRoot}src/main`
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
    exclude: ['node_modules/**', 'android/**']
  }
})
