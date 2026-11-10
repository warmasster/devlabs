// Markdown mínimo para los artículos del blog y las herramientas. Solo lo que usan: títulos ## a ####,
// párrafos, listas, código con ```, tablas, notas con > y HTML tal cual (una línea que empieza por <
// abre un bloque de HTML hasta la siguiente línea en blanco). En línea, `código`, **negrita**, *cursiva*
// y [enlaces](/ruta). Sin dependencias, para que la web no cargue nada de esto.
import { SITIO } from './sitio.ts';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

export const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// El texto sin marcas, para descripciones, el índice y los datos para Google.
export const texto = (s: string) =>
  s.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|\W)\*([^*\s][^*]*)\*/g, '$1$2');

export function enLinea(s: string): string {
  const guardado: string[] = [];
  const guarda = (h: string) => `\u0000${guardado.push(h) - 1}\u0000`;
  s = s.replace(/`([^`]+)`/g, (_, c: string) => guarda(`<code>${esc(c)}</code>`));
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, u: string) => {
    const fuera = /^https?:\/\//.test(u) && !u.startsWith(SITIO.url);
    return `${guarda(`<a href="${u}"${fuera ? ' rel="noopener"' : ''}>`)}${t}${guarda('</a>')}`;
  });
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^\w*])\*([^*\s](?:[^*]*[^*\s])?)\*(?![\w*])/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => guardado[Number(i)]);
}

const celdas = (fila: string) =>
  fila.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());

export interface Titulo { id: string; texto: string; nivel: number }

export function markdown(md: string, ids = new Set<string>()): { html: string; indice: Titulo[] } {
  const L = md.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  const indice: Titulo[] = [];
  const esLista = (l: string) => /^\s{0,3}([-*]|\d+\.)\s+/.test(l);
  const especial = (l: string) => /^(```|#{2,4}\s|>|\|)/.test(l) || esLista(l) || /^<\/?[a-zA-Z]/.test(l);
  let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m: RegExpMatchArray | null;

    if ((m = l.match(/^```([\w-]*)\s*$/))) {
      const lengua = m[1];
      const c: string[] = [];
      i++;
      while (i < L.length && !/^```\s*$/.test(L[i])) c.push(L[i++]);
      i++;
      out.push(`<pre class="cod"${lengua ? ` data-lang="${lengua}"` : ''}><code>${esc(c.join('\n'))}</code></pre>`);
      continue;
    }

    if ((m = l.match(/^(#{2,4})\s+(.+?)\s*$/))) {
      const nivel = m[1].length;
      const base = slug(texto(m[2])) || 'seccion';
      let id = base;
      for (let k = 2; ids.has(id); k++) id = `${base}-${k}`;
      ids.add(id);
      indice.push({ id, texto: texto(m[2]), nivel });
      out.push(`<h${nivel} id="${id}">${enLinea(m[2])}</h${nivel}>`);
      i++;
      continue;
    }

    if (/^<\/?[a-zA-Z]/.test(l)) {
      const b: string[] = [];
      while (i < L.length && L[i].trim()) b.push(L[i++]);
      out.push(b.join('\n'));
      continue;
    }

    if (l.startsWith('>')) {
      const b: string[] = [];
      while (i < L.length && L[i].startsWith('>')) b.push(L[i++].replace(/^>\s?/, ''));
      out.push(`<aside class="nota">${markdown(b.join('\n'), ids).html}</aside>`);
      continue;
    }

    if (l.startsWith('|')) {
      const filas: string[][] = [];
      while (i < L.length && L[i].startsWith('|')) filas.push(celdas(L[i++]));
      const [cab, sep, ...resto] = filas;
      if (!sep || !sep.every((c) => /^:?-{3,}:?$/.test(c))) throw new Error(`Tabla sin línea de separación: ${l}`);
      out.push(
        `<div class="tabla"><table><thead><tr>${cab.map((c) => `<th>${enLinea(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${resto.map((f) => `<tr>${f.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
      );
      continue;
    }

    if (esLista(l)) {
      const etiqueta = /^\s*\d+\./.test(l) ? 'ol' : 'ul';
      const items: string[] = [];
      while (i < L.length) {
        const x = L[i];
        if (esLista(x)) items.push(x.replace(/^\s{0,3}([-*]|\d+\.)\s+/, ''));
        else if (x.trim() && /^\s{2,}/.test(x) && items.length) items[items.length - 1] += ' ' + x.trim();
        else break;
        i++;
      }
      out.push(`<${etiqueta}>${items.map((t) => `<li>${enLinea(t)}</li>`).join('')}</${etiqueta}>`);
      continue;
    }

    const b: string[] = [];
    while (i < L.length && L[i].trim() && !especial(L[i])) b.push(L[i++].trim());
    if (!b.length) b.push(L[i++].trim()); // una línea rara que no encaja en nada sale como párrafo
    out.push(`<p>${enLinea(b.join(' '))}</p>`);
  }
  return { html: out.join('\n'), indice };
}

// Las preguntas de la sección «## Preguntas frecuentes», cada una con su «### pregunta».
export function preguntas(md: string): { q: string; a: string }[] {
  const sec = md.replace(/\r/g, '').split(/^## /m).find((s) => s.startsWith('Preguntas frecuentes'));
  if (!sec) return [];
  return sec.split(/^### /m).slice(1).map((b) => {
    const [q, ...r] = b.split('\n');
    const a = r.join('\n').replace(/```[\s\S]*?```/g, ' ').replace(/^\s*[-*]\s+/gm, '').replace(/\s+/g, ' ').trim();
    return { q: texto(q.trim()), a: texto(a) };
  });
}

export function frontmatter(src: string): { datos: Record<string, string>; cuerpo: string } {
  const s = src.replace(/\r/g, '').replace(/^﻿/, '');
  const m = s.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { datos: {}, cuerpo: s };
  const datos: Record<string, string> = {};
  for (const l of m[1].split('\n')) {
    const k = l.indexOf(':');
    if (k > 0) datos[l.slice(0, k).trim()] = l.slice(k + 1).trim();
  }
  return { datos, cuerpo: s.slice(m[0].length) };
}
