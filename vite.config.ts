import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buApiPlugin } from './server/buApiPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buApiPlugin()],
  server: {
    proxy: {
      '/tse-api': {
        target: 'https://resultados.tse.jus.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tse-api/, '')
      }
    }
  }
})
