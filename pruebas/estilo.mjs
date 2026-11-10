// Uso: node pruebas/estilo.mjs   (avisa de dos puntos y rayas largas en la prosa)
// Busca dos puntos y rayas largas en la prosa de lecciones y labs (fuera de `código`).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('..', import.meta.url)).split('\\').join('/');
const limpio = (t) => t.replace(/`[^`]*`/g, '').replace(/https?:\/\/\S+/g, '');
let n = 0;
for (const f of fs.readdirSync(raiz + 'web/src/curso/lecciones').filter((x) => /^0-/.test(x))) {
  const s = fs.readFileSync(raiz + 'web/src/curso/lecciones/' + f, 'utf8');
  for (const m of s.matchAll(/(md|texto|de|es|titulo|q|porque|nota|pista|que|sub|info): ('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) {
    const t = limpio(m[2].slice(1, -1));
    if (/:(\s|$)/.test(t) || t.includes('—')) { n++; console.log(`${f} ${m[1]} | ${m[2].slice(0, 120)}`); }
  }
}
for (const d of fs.readdirSync(raiz + 'labs').filter((x) => x.startsWith('n0-'))) {
  const s = fs.readFileSync(`${raiz}labs/${d}/lab.yaml`, 'utf8');
  for (const m of s.matchAll(/(titulo|texto|solucion): (.*)$/gm)) {
    if (/, (texto|xp|check):/.test(m[2])) continue; // mapas en una línea: el texto se mira abajo
    const t = limpio(m[2].replace(/^["']|["']$/g, ''));
    if (/:(\s|$)/.test(t) || t.includes('—')) { n++; console.log(`${d} ${m[1]} | ${m[2].slice(0, 120)}`); }
  }
  for (const m of s.matchAll(/texto: "((?:[^"\\]|\\.)*)"/g)) {
    const t = limpio(m[1]);
    if (/:(\s|$)/.test(t) || t.includes('—')) { n++; console.log(`${d} pista | ${m[1].slice(0, 120)}`); }
  }
}
// El blog y las herramientas (web/contenido). Fuera el código, los bloques de HTML y las direcciones.
for (const carpeta of ['blog', 'herramientas']) {
  const dir = `${raiz}web/contenido/${carpeta}`;
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const s = fs.readFileSync(`${dir}/${f}`, 'utf8').replace(/\r/g, '');
    const [, cabeza = '', cuerpo = s] = s.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
    const lineas = [
      ...cabeza.split('\n').map((l) => l.slice(l.indexOf(':') + 1)),
      ...cuerpo.replace(/```[\s\S]*?```/g, '').replace(/^<[\s\S]*?(\n\n|$)/gm, '').split('\n'),
    ];
    for (const l of lineas) {
      const t = limpio(l).replace(/\]\([^)]*\)/g, ']');
      if (/:(\s|$)/.test(t) || t.includes('—')) { n++; console.log(`contenido/${carpeta}/${f} | ${l.trim().slice(0, 120)}`); }
    }
  }
}
console.log(n, 'sitios');
