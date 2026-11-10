// Avisa a Bing, Yandex, Seznam y Naver de que hay páginas nuevas o cambiadas (IndexNow). Google no usa
// IndexNow. Para Google está el sitemap en Search Console. Ver seo/LEEME.md.
//
//   cd web && node scripts/indexnow.mjs                  todas las del sitemap publicado
//   cd web && node scripts/indexnow.mjs /blog/git-basico solo esas
//
// Se lanza después de publicar, cuando la web nueva ya está en relavops.org.
import { SITIO } from '../seo/sitio.ts';

const host = new URL(SITIO.url).host;
let urls = process.argv.slice(2).map((r) => SITIO.url + (r.startsWith('/') ? r : `/${r}`));
if (!urls.length) {
  const r = await fetch(`${SITIO.url}/sitemap.xml`);
  if (!r.ok) throw new Error(`No se pudo leer el sitemap publicado (${r.status})`);
  urls = [...(await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const clave = await fetch(`${SITIO.url}/${SITIO.indexnow}.txt`);
if (!clave.ok || (await clave.text()).trim() !== SITIO.indexnow) throw new Error('La clave de IndexNow no está publicada. Publica la web antes.');

const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: SITIO.indexnow, keyLocation: `${SITIO.url}/${SITIO.indexnow}.txt`, urlList: urls }),
});
// 200 y 202 son que lo ha recibido. 422 suele ser que alguna dirección no es del dominio.
console.log(`IndexNow ${r.status} ${r.statusText}, ${urls.length} direcciones`);
if (r.status >= 300) process.exitCode = 1;
