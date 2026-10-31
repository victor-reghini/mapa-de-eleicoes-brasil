import react from '@vitejs/plugin-react'
import { defineConfig, type PluginOption } from 'vite'

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [react()];

  // Carrega o plugin da API SQLite local apenas durante desenvolvimento (vite serve)
  if (command === 'serve') {
    try {
      const { buApiPlugin } = await import('./server/buApiPlugin.ts');
      plugins.push(buApiPlugin());
    } catch (err) {
      console.warn('buApiPlugin não carregado (modo estático ativado):', err);
    }
  }

  return {
    plugins,
    server: {
      proxy: {
        '/tse-api': {
          target: 'https://resultados.tse.jus.br',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/tse-api/, '')
        }
      }
    }
  };
})
