// Plugin de Vite que monta las páginas públicas. Al cargar vite.config.ts, prepararSeo() escribe el HTML
// de cada página en generado/ y Vite las compila como el resto. Al final, el plugin las saca de
// generado/ (generado/blog/x.html acaba en dist/blog/x.html), rellena la portada, precarga la letra y
// deja el sitemap, el RSS, robots.txt, llms.txt y la clave de IndexNow en la raíz de dist/.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { leccionesListas, leerContenido } from './contenido.ts';
import { generarPaginas, llms, portada, robots, rss, sitemap, type Datos, type Pagina } from './paginas.ts';
import { SITIO } from './sitio.ts';

export interface Seo {
  datos: Datos;
  paginas: Pagina[];
  entradas: Record<string, string>; // para rollupOptions.input
}

export function prepararSeo(raiz: string): Seo {
  const datos: Datos = { raiz, articulos: leerContenido(raiz), listas: leccionesListas(raiz), hoy: new Date().toISOString().slice(0, 10) };
  const paginas = generarPaginas(datos);
  const dir = path.join(raiz, 'generado');
  fs.rmSync(dir, { recursive: true, force: true });
  for (const p of paginas) {
    const f = path.join(dir, p.fichero);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, p.html);
  }
  fs.writeFileSync(path.join(dir, 'LEEME.md'), '# generado/\n\nLo escribe `seo/plugin.ts` en cada compilación. No se edita a mano. Se cambia en `contenido/` o en `seo/`.\n');
  const entradas = Object.fromEntries(paginas.map((p) => [`pub-${p.fichero.replace(/\.html$/, '').replace(/\//g, '-')}`, path.join(dir, p.fichero)]));
  return { datos, paginas, entradas };
}

const PUBLICAS = new Set(['inicio.html', 'entrar.html']);

export function seo(s: Seo): Plugin {
  return {
    name: 'relavops-seo',
    enforce: 'post',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => (ctx.filename.replace(/\\/g, '/').endsWith('/inicio.html') ? portada(html, s.datos) : html),
    },
    generateBundle(_, bundle) {
      // La letra de los títulos se pide pronto, antes de que llegue el CSS. Así el texto grande no salta.
      const letra = Object.keys(bundle).find((k) => /fredoka-latin-wght-normal-[\w-]+\.woff2$/.test(k));
      const precarga = letra ? `<link rel="preload" href="/${letra}" as="font" type="font/woff2" crossorigin />` : '';
      for (const k of Object.keys(bundle)) {
        const f = bundle[k];
        const generada = k.startsWith('generado/');
        if (f.type !== 'asset' || !k.endsWith('.html') || !(generada || PUBLICAS.has(k))) continue;
        let html = typeof f.source === 'string' ? f.source : new TextDecoder().decode(f.source);
        if (precarga) html = html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n  ${precarga}`);
        if (generada) {
          delete bundle[k];
          this.emitFile({ type: 'asset', fileName: k.slice('generado/'.length), source: html });
        } else {
          f.source = html;
        }
      }
      const fuera: Record<string, string> = {
        'sitemap.xml': sitemap(s.paginas, s.datos),
        'feed.xml': rss(s.datos),
        'robots.txt': robots(),
        'llms.txt': llms(s.datos),
        [`${SITIO.indexnow}.txt`]: SITIO.indexnow,
      };
      for (const [fileName, source] of Object.entries(fuera)) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}
