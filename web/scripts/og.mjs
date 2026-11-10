// Imágenes para redes (public/og/*.png, 1200x630) e iconos (icono-512.png, icono-192.png, icono-180.png
// y favicon.ico). Una imagen por artículo y herramienta de contenido/, más las de la portada, el blog,
// el temario y las herramientas. Usa el Edge del sistema, como las pruebas.
//
//   cd web && node scripts/og.mjs          solo las que faltan
//   cd web && node scripts/og.mjs --todas  todas otra vez
//
// Hay que lanzarlo al añadir un artículo. Si falta su imagen, la página usa la de la portada.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { leerContenido } from '../seo/contenido.ts';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const pub = path.join(raiz, 'public');
const og = path.join(pub, 'og');
fs.mkdirSync(og, { recursive: true });
const todas = process.argv.includes('--todas');

// Las letras van dentro del HTML. Una página hecha con setContent no puede leer ficheros del disco.
const letra = (paquete, fichero) =>
  `data:font/woff2;base64,${fs.readFileSync(path.join(raiz, 'node_modules', '@fontsource-variable', paquete, 'files', fichero)).toString('base64')}`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ESTILO = `
@font-face { font-family: F; src: url(${letra('fredoka', 'fredoka-latin-wght-normal.woff2')}) format('woff2'); font-weight: 300 700; }
@font-face { font-family: M; src: url(${letra('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 800; }
* { box-sizing: border-box; }
body { margin: 0; }`;

const tarjeta = ({ titulo, cat, comando }) => `<!doctype html><meta charset="utf-8"><style>${ESTILO}
body { width: 1200px; height: 630px; position: relative; overflow: hidden; color: #f6f3ff; font-family: F;
  background: radial-gradient(900px 520px at 8% 0%, #2a2163 0, transparent 60%), radial-gradient(800px 520px at 100% 100%, #1f2a66 0, transparent 55%), #100c2c; }
.marco { position: absolute; inset: 26px; border: 3px solid #4a3f8f; border-radius: 38px; }
.logo { position: absolute; left: 74px; top: 66px; display: flex; align-items: center; gap: 5px; font: 700 42px M; letter-spacing: -0.02em; color: #5ff2a8; }
.logo i { display: inline-block; width: 18px; height: 38px; border-radius: 3px; background: #5ff2a8; }
.cat { position: absolute; right: 74px; top: 70px; padding: 8px 20px; border-radius: 999px; font: 700 22px M; letter-spacing: 0.08em; text-transform: uppercase;
  color: #0a2a1a; background: #5ff2a8; border: 3px solid #0d0a26; }
h1 { position: absolute; left: 74px; right: 90px; top: 168px; margin: 0; font-weight: 700; line-height: 1.06; letter-spacing: -0.012em; text-wrap: balance;
  font-size: ${titulo.length > 62 ? 58 : titulo.length > 44 ? 66 : 76}px; }
.pie { position: absolute; left: 74px; right: 74px; bottom: 72px; display: flex; align-items: center; justify-content: space-between; gap: 30px; }
code { font: 500 28px M; color: #e9fff2; background: #0e0b26; border: 3px solid #4a3f8f; border-bottom-width: 6px; border-radius: 18px; padding: 14px 24px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 760px; }
code b { color: #5ff2a8; font-weight: 700; }
.web { font: 600 26px F; color: #b3abe6; white-space: nowrap; }
</style>
<div class="marco"></div>
<div class="logo">relavops<i></i></div>
<div class="cat">${esc(cat)}</div>
<h1>${esc(titulo)}</h1>
<div class="pie"><code><b>$</b> ${esc(comando)}</code><span class="web">relavops.org</span></div>`;

// El icono de la web (public/favicon.svg) sobre el fondo de la portada.
const icono = (lado) => `<!doctype html><meta charset="utf-8"><style>${ESTILO}
body { width: ${lado}px; height: ${lado}px; display: grid; place-items: center; background: transparent; }
div { width: 100%; height: 100%; border-radius: 22%; display: grid; place-items: center; background: radial-gradient(circle at 30% 20%, #2f2766, #17123a 70%); }
svg { width: 72%; height: 72%; }
</style><div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5ff2a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="m7 11 2-2-2-2" /><path d="M11 13h4" /><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /></svg></div>`;

// favicon.ico con un PNG dentro, que es como lo aceptan todos los navegadores desde hace años.
function ico(png, lado) {
  const h = Buffer.alloc(22);
  h.writeUInt16LE(0, 0);
  h.writeUInt16LE(1, 2);
  h.writeUInt16LE(1, 4);
  h[6] = lado;
  h[7] = lado;
  h.writeUInt16LE(1, 10);
  h.writeUInt16LE(32, 12);
  h.writeUInt32LE(png.length, 14);
  h.writeUInt32LE(22, 18);
  return Buffer.concat([h, png]);
}

const fijas = [
  { nombre: 'relavops', titulo: 'Aprende DevOps gratis con máquinas de verdad', cat: 'Curso gratis', comando: 'ping -c 1 web' },
  { nombre: 'blog', titulo: 'Guías para aprender Linux, redes y DevOps', cat: 'Blog', comando: 'ls blog/' },
  { nombre: 'temario', titulo: 'Temario del curso de DevOps, de la terminal a Kubernetes', cat: 'Gratis', comando: 'ls cinturones/' },
  { nombre: 'herramientas', titulo: 'Herramientas gratis para Linux y redes', cat: 'Herramientas', comando: 'chmod 755 · /24' },
];
const piezas = [
  ...fijas,
  ...leerContenido(raiz).map((a) => ({ nombre: a.slug, titulo: a.titulo, cat: a.categoria, comando: a.comando ?? 'ls' })),
];

const nav = await chromium.launch({ channel: 'msedge' });
const pag = await nav.newPage({ viewport: { width: 1200, height: 630 } });
let hechas = 0;
for (const p of piezas) {
  const f = path.join(og, `${p.nombre}.png`);
  if (!todas && fs.existsSync(f)) continue;
  await pag.setContent(tarjeta(p), { waitUntil: 'load' });
  await pag.evaluate(() => document.fonts.ready);
  await pag.screenshot({ path: f, type: 'png' });
  hechas++;
}
for (const lado of [512, 192, 180, 48]) {
  const f = lado === 48 ? path.join(pub, 'favicon.ico') : path.join(pub, `icono-${lado}.png`);
  if (!todas && fs.existsSync(f)) continue;
  const p = await nav.newPage({ viewport: { width: lado, height: lado } });
  await p.setContent(icono(lado), { waitUntil: 'load' });
  const png = await p.screenshot({ type: 'png', omitBackground: true });
  fs.writeFileSync(f, lado === 48 ? ico(png, 48) : png);
  await p.close();
  hechas++;
}
await nav.close();
console.log(`${hechas} imágenes nuevas en public/ (${piezas.length} de redes en public/og)`);
