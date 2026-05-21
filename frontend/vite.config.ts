import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/upload':  'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/jobs':    'http://localhost:8000',
      '/results': 'http://localhost:8000',
      '/files':   'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
