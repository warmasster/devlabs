import { defineConfig } from 'vite';
import { prepararSeo, seo } from './seo/plugin.ts';

const paginas = ['index', 'curso', 'leccion', 'chuleta', 'arcade', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'disenos', 'juegos', 'juego', 'entrar', 'cuenta', 'profe', 'admin', 'inicio'];
const resolve = (_: string, f: string) => new URL(f, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const __dirname = '';

// Las páginas públicas (blog, temario, herramientas y 404) salen de contenido/ y de seo/. Ver seo/LEEME.md.
const publicas = prepararSeo(resolve(__dirname, '.'));

export default defineConfig({
  plugins: [seo(publicas)],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: { ...Object.fromEntries(paginas.map((p) => [p, resolve(__dirname, `${p}.html`)])), ...publicas.entradas },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
});
