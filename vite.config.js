import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  base: './', // Important for Electron - use relative paths
  test: {
    include: ['electron/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['build-electron/**', 'node_modules/**', 'scripts/**']
  }
})
