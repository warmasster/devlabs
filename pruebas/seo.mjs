// Uso: node pruebas/seo.mjs   (tras compilar la web con npm run build en web/)
// Revisa las páginas públicas de web/dist. Enlaces y anclas internos que no existen, datos para Google
// (JSON-LD) que no se leen, títulos y descripciones repetidos, páginas sin canonical o sin un solo h1, y
// direcciones del sitemap que no existen. Saca el largo del título y de la descripción de cada página.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = process.argv[2] ?? fileURLToPath(new URL('../web/dist', import.meta.url));
const paginas = ['inicio.html','blog.html','temario.html','herramientas.html','sobre.html','404.html', ...fs.readdirSync(dist+'/blog').map(f=>'blog/'+f), ...fs.readdirSync(dist+'/herramientas').map(f=>'herramientas/'+f)];
const existe = (ruta) => { const p = ruta.split(/[?#]/)[0]; if (p === '/') return true; const n = p.slice(1); return [n, n+'.html'].some(f => fs.existsSync(path.join(dist,f)) && fs.statSync(path.join(dist,f)).isFile()); };
const privadas = new Set(['/entrar','/curso','/leccion']);
let malos = 0; const titulos = new Map(), descs = new Map();
for (const f of paginas) {
  const h = fs.readFileSync(path.join(dist,f),'utf8');
  const ids = new Set([...h.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]));
  for (const [, href] of h.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(href)) continue;
    if (href.startsWith('#')) { if (!ids.has(href.slice(1))) { malos++; console.log(f, 'ancla rota', href); } continue; }
    if (!existe(href) && !privadas.has(href.split('?')[0])) { malos++; console.log(f, 'enlace roto', href); }
    const [ruta, ancla] = href.split('#');
    if (ancla && ruta && existe(ruta)) {
      const dest = ruta === '/' ? 'inicio.html' : ruta.slice(1)+'.html';
      const hh = fs.existsSync(path.join(dist,dest)) ? fs.readFileSync(path.join(dist,dest),'utf8') : '';
      if (hh && !hh.includes(`id="${ancla}"`)) { malos++; console.log(f, 'ancla rota en otra página', href); }
    }
  }
  for (const [, j] of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(j); } catch (e) { malos++; console.log(f, 'JSON-LD roto', e.message); } }
  const t = h.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''; const d = h.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (titulos.has(t)) { malos++; console.log('título repetido', t); } titulos.set(t, f);
  if (descs.has(d)) { malos++; console.log('descripción repetida', f); } descs.set(d, f);
  const h1 = (h.match(/<h1/g) ?? []).length; if (h1 !== 1) { malos++; console.log(f, h1, 'h1'); }
  if (!h.includes('rel="canonical"')) { malos++; console.log(f, 'sin canonical'); }
  console.log(String(t.length).padStart(3), String(d.replace(/&[a-z]+;/g,'x').length).padStart(3), f, '|', t);
}
const sm = fs.readFileSync(dist+'/sitemap.xml','utf8'); const locs = [...sm.matchAll(/<loc>https:\/\/relavops\.org([^<]*)<\/loc>/g)].map(m=>m[1]);
for (const l of locs) if (!existe(l)) { malos++; console.log('sitemap con ruta que no existe', l); }
console.log(locs.length, 'en el sitemap ·', malos, 'problemas');
process.exitCode = malos ? 1 : 0;
