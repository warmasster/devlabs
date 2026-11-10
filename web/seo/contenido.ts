// Lee los artículos del blog (contenido/blog/*.md) y las herramientas (contenido/herramientas/*.md).
// Lo usan el generador de páginas (plugin.ts), el de imágenes para redes (scripts/og.mjs) y IndexNow.
import fs from 'node:fs';
import path from 'node:path';
import { frontmatter, markdown, preguntas, type Titulo } from './markdown.ts';

export interface Articulo {
  tipo: 'blog' | 'herramienta';
  slug: string;
  ruta: string; // /blog/permisos-linux-chmod
  titulo: string; // el h1
  tituloSeo: string; // el <title>, si hace falta más corto o con otras palabras
  corto: string; // para las migas y el pie de página
  descripcion: string;
  fecha: string; // AAAA-MM-DD
  actualizado: string;
  categoria: string;
  modulo?: string; // el módulo del temario que enseña lo mismo (0.4)
  comando?: string; // el comando que sale en la imagen para redes
  script?: string; // herramientas, el fichero de src/publico/ que las hace funcionar
  destacado: boolean;
  orden: number;
  relacionados: string[];
  html: string;
  indice: Titulo[];
  preguntas: { q: string; a: string }[];
  palabras: number;
  minutos: number;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function leerContenido(raiz: string): Articulo[] {
  const out: Articulo[] = [];
  for (const [carpeta, tipo] of [['blog', 'blog'], ['herramientas', 'herramienta']] as const) {
    const dir = path.join(raiz, 'contenido', carpeta);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
      const donde = `contenido/${carpeta}/${f}`;
      const { datos: d, cuerpo } = frontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const k of ['titulo', 'descripcion', 'fecha', 'categoria']) if (!d[k]) throw new Error(`${donde}: falta «${k}»`);
      if (!FECHA.test(d.fecha) || (d.actualizado && !FECHA.test(d.actualizado))) throw new Error(`${donde}: las fechas van como 2026-11-07`);
      const slug = f.replace(/\.md$/, '');
      const { html, indice } = markdown(cuerpo);
      const palabras = cuerpo.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      out.push({
        tipo,
        slug,
        ruta: `/${carpeta}/${slug}`,
        titulo: d.titulo,
        tituloSeo: d.titulo_seo || d.titulo,
        corto: d.corto || d.titulo,
        descripcion: d.descripcion,
        fecha: d.fecha,
        actualizado: d.actualizado || d.fecha,
        categoria: d.categoria,
        modulo: d.modulo || undefined,
        comando: d.comando || undefined,
        script: d.script || undefined,
        destacado: d.destacado === 'si',
        orden: Number(d.orden || 100),
        relacionados: (d.relacionados || '').split(',').map((s) => s.trim()).filter(Boolean),
        html,
        indice,
        preguntas: preguntas(cuerpo),
        palabras,
        minutos: Math.max(2, Math.round(palabras / 200)),
      });
    }
  }
  return out.sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'));
}

// Las lecciones que ya se pueden jugar, por su número del temario (0.4). Son los ficheros 0-4.ts.
export function leccionesListas(raiz: string): Set<string> {
  const dir = path.join(raiz, 'src', 'curso', 'lecciones');
  return new Set(fs.readdirSync(dir).map((f) => f.match(/^(\d+)-(\d+)\.ts$/)).filter((m) => m).map((m) => `${m![1]}.${m![2]}`));
}
