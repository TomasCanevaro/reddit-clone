import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/actuator/health': {
        target: 'http://localhost:8080',
        timeout: 10_000,
        proxyTimeout: 10_000,
      },
    },
  },
})
