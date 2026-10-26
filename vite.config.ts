import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/tse-api': {
        target: 'https://resultados.tse.jus.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tse-api/, '')
      }
    }
  }
})
