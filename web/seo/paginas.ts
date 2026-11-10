// Las páginas públicas, ya escritas en HTML para que Google las lea sin ejecutar nada. El blog, cada
// artículo, el temario, las herramientas y el 404. También el sitemap, el RSS, robots.txt y llms.txt,
// y lo que se rellena en la portada (inicio.html) al compilar.
import fs from 'node:fs';
import path from 'node:path';
import { NIVELES, type Modulo, type Nivel } from '../src/curso/temario.ts';
import type { Articulo } from './contenido.ts';
import { esc, slug } from './markdown.ts';
import { SITIO, url } from './sitio.ts';

export interface Datos {
  raiz: string;
  articulos: Articulo[];
  listas: Set<string>; // lecciones jugables
  hoy: string;
}
export interface Pagina {
  fichero: string; // dentro de generado/ y luego en dist/ (blog/permisos-linux-chmod.html)
  ruta: string; // /blog/permisos-linux-chmod
  html: string;
  lastmod: string;
  sitemap: boolean;
}

// ---------- Ayudas
const fechaLarga = (f: string) =>
  new Date(`${f}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const json = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');
export const idModulo = (id: string) => `m-${id.replace(/\./g, '-').toLowerCase()}`;
export const idCinturon = (n: Nivel) => `cinturon-${slug(n.cinturon)}`;
const CLAROS = ['#e7e9ee', '#fde047', '#fb923c', '#4ade80', '#60a5fa', '#c084fc'];
const tinta = (c: string) => (CLAROS.includes(c) ? '#111' : '#fff');
const FASES: Record<string, string> = { Base: 'Fase 1 · La base, Linux y redes', Construir: 'Fase 2 · Construir y desplegar', Operar: 'Fase 3 · Operar a lo grande' };
const leccionHref = (id: string) => `/entrar?registro=1&vuelta=${encodeURIComponent(`/leccion?m=${id}`)}`;
const boss = (s: string) => s.replace(/(^|· )B: /g, '$1Boss · ');
const max = (...f: string[]) => f.filter(Boolean).sort().at(-1) ?? '';
const dia = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function buscaModulo(id: string): { nivel: Nivel; mod: Modulo } | null {
  for (const nivel of NIVELES) for (const mod of nivel.modulos) if (mod.id === id) return { nivel, mod };
  return null;
}

function imagen(raiz: string, nombre: string): string {
  for (const n of [nombre, 'relavops']) if (fs.existsSync(path.join(raiz, 'public', 'og', `${n}.png`))) return `/og/${n}.png`;
  return '';
}

// La fecha de la última vez que cambió el temario o una lección, para el lastmod del sitemap.
function cambioTemario(raiz: string): string {
  const dir = path.join(raiz, 'src', 'curso', 'lecciones');
  const ms = [path.join(raiz, 'src', 'curso', 'temario.ts'), ...fs.readdirSync(dir).map((f) => path.join(dir, f))].map((f) => fs.statSync(f).mtimeMs);
  return dia(Math.max(...ms));
}

// ---------- Datos para Google (schema.org)
const ORG_ID = `${SITIO.url}/#org`;
export const ORG = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITIO.nombre,
  url: url('/'),
  logo: { '@type': 'ImageObject', url: url('/icono-512.png'), width: 512, height: 512 },
  description: SITIO.descripcion,
  founder: { '@id': `${url('/sobre')}#autor` },
};
// Quien firma los artículos (seo/sitio.ts). Su página es /sobre.
export const AUTOR = {
  '@type': 'Person',
  '@id': `${url('/sobre')}#autor`,
  name: SITIO.autor.nombre,
  url: SITIO.autor.url,
  worksFor: { '@id': ORG_ID },
  knowsAbout: ['Linux', 'Bash', 'Redes', 'DevOps', 'Docker', 'Kubernetes', 'Git'],
  ...(SITIO.autor.perfiles.length ? { sameAs: SITIO.autor.perfiles } : {}),
};
export const WEB = {
  '@type': 'WebSite',
  '@id': `${SITIO.url}/#web`,
  name: SITIO.nombre,
  alternateName: 'relavops.org',
  url: url('/'),
  inLanguage: 'es',
  publisher: { '@id': ORG_ID },
};
const autor = () => ({ '@type': 'Person', '@id': AUTOR['@id'], name: SITIO.autor.nombre, url: SITIO.autor.url });
const firma = () => `<a href="/sobre" rel="author">${esc(SITIO.autor.nombre)}</a>`;

function curso(d: Datos) {
  return {
    '@type': 'Course',
    '@id': `${url('/temario')}#curso`,
    name: 'Curso de DevOps con máquinas de verdad',
    description: 'Linux, Bash, redes, contenedores, Kubernetes y SRE desde cero, con una máquina Linux real en cada lección y un boss al final de cada módulo.',
    url: url('/temario'),
    inLanguage: 'es',
    educationalLevel: 'Desde cero',
    provider: { '@id': ORG_ID },
    teaches: NIVELES.map((n) => n.titulo),
    hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'Online', inLanguage: 'es' }],
    syllabusSections: NIVELES.map((n) => ({ '@type': 'Syllabus', name: `Cinturón ${n.cinturon.toLowerCase()}. ${n.titulo}`, description: n.objetivo })),
    numberOfLessons: d.listas.size,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', category: 'Free', price: '0', priceCurrency: 'EUR' },
  };
}

type Miga = [string, string];
const migas = (items: Miga[]) =>
  `<nav class="pb-migas" aria-label="Migas de pan"><ol>${items
    .map(([t, h], i) => `<li>${i < items.length - 1 ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}</li>`)
    .join('')}</ol></nav>`;
const migasDatos = (items: Miga[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([t, h], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: url(h) })),
});

// ---------- Cabeza, cabecera y pie
export const ICONOS = `<link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/icono-192.png" type="image/png" sizes="192x192" />
  <link rel="apple-touch-icon" href="/icono-180.png" />`;

export const verificacion = () =>
  [SITIO.google && `<meta name="google-site-verification" content="${esc(SITIO.google)}" />`, SITIO.bing && `<meta name="msvalidate.01" content="${esc(SITIO.bing)}" />`]
    .filter(Boolean)
    .join('\n  ');

interface Cabeza {
  titulo: string;
  social?: string;
  descripcion: string;
  ruta: string;
  imagen?: string;
  tipo?: 'website' | 'article';
  publicado?: string;
  actualizado?: string;
  datos?: object[];
  noindex?: boolean;
}

function cabeza(c: Cabeza): string {
  const u = url(c.ruta);
  const social = c.social ?? c.titulo;
  const img = c.imagen ? url(c.imagen) : '';
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#17123a" />
  <title>${esc(c.titulo)}</title>
  <meta name="description" content="${esc(c.descripcion)}" />
  <link rel="canonical" href="${u}" />
  <meta name="robots" content="${c.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />
  ${verificacion()}
  <meta property="og:site_name" content="${SITIO.nombre}" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:type" content="${c.tipo ?? 'website'}" />
  <meta property="og:title" content="${esc(social)}" />
  <meta property="og:description" content="${esc(c.descripcion)}" />
  <meta property="og:url" content="${u}" />${
    img
      ? `
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(social)}" />`
      : ''
  }
  <meta name="twitter:card" content="summary_large_image" />${
    c.publicado
      ? `
  <meta property="article:published_time" content="${c.publicado}" />
  <meta property="article:modified_time" content="${c.actualizado ?? c.publicado}" />`
      : ''
  }
  ${ICONOS}
  <link rel="alternate" type="application/rss+xml" title="Blog de relavops" href="/feed.xml" />${
    c.datos?.length ? `\n  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': c.datos })}</script>` : ''
  }
</head>`;
}

const NAV: Miga[] = [['Temario', '/temario'], ['Blog', '/blog'], ['Herramientas', '/herramientas'], ['Para profes', '/#profes']];
export const nav = (activa = '') =>
  `<nav class="pt-nav" aria-label="Principal">${NAV.map(([t, h]) => `<a href="${h}"${h === activa ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;

const cabecera = (activa: string) => `<header class="pt-cab">
    <a class="pt-logo" href="/">relavops<span class="pt-cursor"></span></a>
    ${nav(activa)}
    <div class="pt-acceso" id="acceso"><a class="pt-boton fantasma" href="/entrar">Entrar</a><a class="pt-boton" href="/entrar?registro=1">Crear cuenta</a></div>
  </header>`;

export function pie(d: Datos): string {
  const blog = d.articulos.filter((a) => a.tipo === 'blog').slice(0, 7);
  const herr = d.articulos.filter((a) => a.tipo === 'herramienta');
  const enlace = (a: Articulo) => `<a href="${a.ruta}">${esc(a.corto)}</a>`;
  return `<footer class="pb-pie">
    <div class="pb-pie-marca"><a class="pt-logo peque" href="/">relavops</a><p>${esc(SITIO.lema)}. Cada lección trae su propio Linux al lado.</p></div>
    <nav aria-label="Aprende"><b>Aprende</b><a href="/temario">Temario completo</a><a href="/blog">Todos los artículos</a>${blog.map(enlace).join('')}</nav>
    <nav aria-label="Herramientas"><b>Herramientas</b>${herr.map(enlace).join('')}<a href="/herramientas">Todas las herramientas</a></nav>
    <nav aria-label="relavops"><b>relavops</b><a href="/entrar?registro=1">Crear cuenta</a><a href="/entrar">Entrar</a><a href="/#profes">Para profes</a><a href="/sobre">Sobre relavops</a><a href="/feed.xml">RSS del blog</a></nav>
  </footer>`;
}

function documento(c: Cabeza, activa: string, cuerpo: string, d: Datos, scripts: string[] = []): string {
  return `<!doctype html>
<!-- Generado por web/seo al compilar. No se edita a mano, se cambia en web/contenido o en web/seo. -->
<html lang="es">
${cabeza(c)}
<body class="pt pb-pag">
  <a class="pb-saltar" href="#contenido">Saltar al contenido</a>
  ${cabecera(activa)}
${cuerpo}
  ${pie(d)}
  <script type="module" src="/src/publico/publico.ts"></script>${scripts.map((s) => `\n  <script type="module" src="/src/publico/${s}.ts"></script>`).join('')}
</body>
</html>
`;
}

export const tarjeta = (a: Articulo, h = 'h3') =>
  `<a class="pb-tarjeta" href="${a.ruta}"><span class="pb-cat">${esc(a.categoria)}</span><${h}>${esc(a.titulo)}</${h}><p>${esc(a.descripcion)}</p>` +
  `<span class="pb-tarjeta-pie">${a.tipo === 'herramienta' ? 'Herramienta gratis, sin cuenta' : `${a.minutos} min de lectura`}${a.modulo ? ` · Módulo ${a.modulo}` : ''}</span></a>`;

// ---------- Artículos y herramientas
function llamada(a: Articulo, d: Datos): string {
  const m = a.modulo ? buscaModulo(a.modulo) : null;
  if (m && d.listas.has(m.mod.id)) {
    return `<aside class="pb-cta">
        <span class="pb-cta-chip">Lección ${m.mod.id} · Cinturón ${esc(m.nivel.cinturon.toLowerCase())} · Gratis</span>
        <h2>Practícalo en una máquina de verdad</h2>
        <p>La lección «${esc(m.mod.titulo)}» trae su propio Linux al lado. Escribes los comandos de este artículo y la lección comprueba que te salen. Al final hay un boss que te rompe el lab para que lo arregles. Es gratis y no hay que instalar nada.</p>
        <div class="pt-ctas"><a class="pt-boton grande" href="${esc(leccionHref(m.mod.id))}">Abrir la lección ${m.mod.id}</a><a class="pt-boton grande fantasma" href="/temario#${idModulo(m.mod.id)}">Ver el temario</a></div>
      </aside>`;
  }
  const donde = m
    ? `Este tema es el módulo ${m.mod.id} del cinturón ${esc(m.nivel.cinturon.toLowerCase())}, que se está construyendo. Mientras tanto, el cinturón blanco te deja la terminal lista para llegar ahí.`
    : 'El cinturón blanco empieza desde cero, con la terminal, los ficheros y los permisos.';
  return `<aside class="pb-cta">
        <span class="pb-cta-chip">Curso gratis</span>
        <h2>Aprende con una máquina de verdad</h2>
        <p>relavops es un curso gratis donde cada lección trae su propio Linux. Escribes en la terminal y la lección ve lo que pasa. ${donde}</p>
        <div class="pt-ctas"><a class="pt-boton grande" href="${esc(leccionHref('0.0'))}">Empezar por la lección 0.0</a><a class="pt-boton grande fantasma" href="${m ? `/temario#${idModulo(m.mod.id)}` : '/temario'}">Ver el temario</a></div>
      </aside>`;
}

function paginaArticulo(a: Articulo, d: Datos): Pagina {
  const blog = a.tipo === 'blog';
  const items: Miga[] = [['Inicio', '/'], blog ? ['Blog', '/blog'] : ['Herramientas', '/herramientas'], [a.corto, a.ruta]];
  const img = imagen(d.raiz, a.slug);
  for (const s of a.relacionados) if (!d.articulos.some((x) => x.slug === s)) throw new Error(`${a.ruta}: relacionados tiene «${s}», que no existe`);
  if (a.modulo && !buscaModulo(a.modulo)) throw new Error(`${a.ruta}: el módulo ${a.modulo} no está en el temario`);

  const principal = blog
    ? {
        '@type': 'BlogPosting',
        '@id': `${url(a.ruta)}#articulo`,
        headline: a.titulo,
        description: a.descripcion,
        ...(img ? { image: [url(img)] } : {}),
        datePublished: a.fecha,
        dateModified: a.actualizado,
        author: autor(),
        publisher: { '@id': ORG_ID },
        mainEntityOfPage: url(a.ruta),
        inLanguage: 'es',
        articleSection: a.categoria,
        wordCount: a.palabras,
        isPartOf: { '@type': 'Blog', '@id': `${url('/blog')}#blog`, name: 'Blog de relavops' },
      }
    : {
        '@type': 'WebApplication',
        '@id': `${url(a.ruta)}#herramienta`,
        name: a.titulo,
        description: a.descripcion,
        url: url(a.ruta),
        ...(img ? { image: url(img) } : {}),
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cualquiera, en el navegador',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        inLanguage: 'es',
        publisher: { '@id': ORG_ID },
        dateModified: a.actualizado,
      };
  const datos: object[] = [ORG, AUTOR, migasDatos(items), principal];
  if (a.preguntas.length)
    datos.push({
      '@type': 'FAQPage',
      mainEntity: a.preguntas.map((p) => ({ '@type': 'Question', name: p.q, acceptedAnswer: { '@type': 'Answer', text: p.a } })),
    });

  const indice = a.indice.filter((t) => t.nivel === 2);
  const vistos = new Set<Articulo>([a]);
  const rel: Articulo[] = [];
  for (const x of [
    ...a.relacionados.map((s) => d.articulos.find((y) => y.slug === s)!),
    ...d.articulos.filter((y) => y.categoria === a.categoria),
    ...d.articulos,
  ]) {
    if (rel.length === 3) break;
    if (!vistos.has(x)) { vistos.add(x); rel.push(x); }
  }

  const cuerpo = `  <main class="pb" id="contenido">
    ${migas(items)}
    <article class="pb-art">
      <header class="pb-art-cab">
        <span class="pb-cat">${esc(a.categoria)}</span>
        <h1>${esc(a.titulo)}</h1>
        <p class="pb-entrada">${esc(a.descripcion)}</p>
        <p class="pb-meta">${a.actualizado !== a.fecha ? 'Actualizado el' : 'Publicado el'} <time datetime="${a.actualizado}">${fechaLarga(a.actualizado)}</time>${
          blog ? ` · ${a.minutos} min de lectura` : ' · Gratis y sin cuenta'
        } · ${firma()}</p>
      </header>
      <div class="pb-art-cuerpo${indice.length >= 3 ? ' con-indice' : ''}">
        ${
          indice.length >= 3
            ? `<nav class="pb-indice" aria-label="En esta página"><b>En esta página</b><ol>${indice.map((t) => `<li><a href="#${t.id}">${esc(t.texto)}</a></li>`).join('')}</ol></nav>`
            : ''
        }
        <div class="pb-texto">
${a.html}
        </div>
      </div>
      ${llamada(a, d)}
    </article>
    <section class="pb-mas" aria-labelledby="sigue">
      <h2 id="sigue">Sigue aprendiendo</h2>
      <div class="pb-tarjetas">${rel.map((x) => tarjeta(x)).join('')}</div>
    </section>
  </main>`;

  return {
    fichero: `${a.ruta.slice(1)}.html`,
    ruta: a.ruta,
    lastmod: a.actualizado,
    sitemap: true,
    html: documento(
      {
        titulo: a.tituloSeo.length <= 52 ? `${a.tituloSeo} · relavops` : a.tituloSeo,
        social: a.titulo,
        descripcion: a.descripcion,
        ruta: a.ruta,
        imagen: img,
        tipo: blog ? 'article' : 'website',
        publicado: blog ? a.fecha : undefined,
        actualizado: a.actualizado,
        datos,
      },
      blog ? '/blog' : '/herramientas',
      cuerpo,
      d,
      a.script ? [a.script] : [],
    ),
  };
}

// ---------- Índice del blog
function paginaBlog(d: Datos): Pagina {
  const posts = d.articulos.filter((a) => a.tipo === 'blog');
  const destacado = posts.find((a) => a.destacado);
  const cats = [...new Set(posts.map((a) => a.categoria))];
  const items: Miga[] = [['Inicio', '/'], ['Blog', '/blog']];
  const ruta = '/blog';
  const cuerpo = `  <main class="pb" id="contenido">
    ${migas(items)}
    <header class="pb-cab-pag">
      <h1>Aprende Linux, redes y DevOps</h1>
      <p class="pb-entrada">Guías cortas y prácticas, con los comandos de verdad y lo que sale en la pantalla. Cada una enlaza con su lección, donde lo practicas en una máquina Linux real.</p>
      <nav class="pb-saltos" aria-label="Temas">${cats.map((c) => `<a href="#${slug(c)}">${esc(c)}</a>`).join('')}</nav>
    </header>
    ${
      destacado
        ? `<a class="pb-destacado" href="${destacado.ruta}"><span class="pb-cat">Empieza aquí</span><h2>${esc(destacado.titulo)}</h2><p>${esc(destacado.descripcion)}</p><span class="pt-boton">Leer la ruta</span></a>`
        : ''
    }
    ${cats
      .map(
        (c) => `<section class="pb-grupo" id="${slug(c)}">
      <h2>${esc(c)}</h2>
      <div class="pb-tarjetas">${posts.filter((a) => a.categoria === c).map((a) => tarjeta(a)).join('')}</div>
    </section>`,
      )
      .join('\n    ')}
  </main>`;
  const lastmod = max(...posts.map((a) => a.actualizado));
  return {
    fichero: 'blog.html',
    ruta,
    lastmod,
    sitemap: true,
    html: documento(
      {
        titulo: 'Blog de Linux, redes y DevOps en español · relavops',
        social: 'Blog de relavops. Linux, redes y DevOps',
        descripcion: 'Guías gratis en español para aprender Linux, Bash, redes, Git, Docker y DevOps desde cero. Con los comandos de verdad y ejemplos que puedes probar.',
        ruta,
        imagen: imagen(d.raiz, 'blog'),
        datos: [
          ORG,
          migasDatos(items),
          {
            '@type': 'Blog',
            '@id': `${url('/blog')}#blog`,
            name: 'Blog de relavops',
            url: url('/blog'),
            inLanguage: 'es',
            publisher: { '@id': ORG_ID },
            blogPost: posts.map((a) => ({ '@type': 'BlogPosting', headline: a.titulo, url: url(a.ruta), datePublished: a.fecha, dateModified: a.actualizado })),
          },
        ],
      },
      '/blog',
      cuerpo,
      d,
    ),
  };
}

// ---------- Herramientas
function paginaHerramientas(d: Datos): Pagina {
  const herr = d.articulos.filter((a) => a.tipo === 'herramienta');
  const items: Miga[] = [['Inicio', '/'], ['Herramientas', '/herramientas']];
  const cuerpo = `  <main class="pb" id="contenido">
    ${migas(items)}
    <header class="pb-cab-pag">
      <h1>Herramientas para Linux y redes</h1>
      <p class="pb-entrada">Calculadoras que se usan sin cuenta y sin instalar nada. Cada una explica lo que calcula, para que la próxima vez lo saques tú de cabeza.</p>
    </header>
    <div class="pb-tarjetas">${herr.map((a) => tarjeta(a, 'h2')).join('')}</div>
  </main>`;
  return {
    fichero: 'herramientas.html',
    ruta: '/herramientas',
    lastmod: max(...herr.map((a) => a.actualizado)),
    sitemap: herr.length > 0,
    html: documento(
      {
        titulo: 'Herramientas gratis para Linux y redes · relavops',
        descripcion: 'Calculadora de permisos chmod, calculadora de subredes IPv4 y más. Gratis, en español y sin cuenta. Cada una explica lo que calcula.',
        ruta: '/herramientas',
        imagen: imagen(d.raiz, 'herramientas'),
        datos: [
          ORG,
          migasDatos(items),
          {
            '@type': 'ItemList',
            itemListElement: herr.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: url(a.ruta), name: a.titulo })),
          },
        ],
      },
      '/herramientas',
      cuerpo,
      d,
    ),
  };
}

// ---------- Temario
function paginaTemario(d: Datos): Pagina {
  const mods = NIVELES.flatMap((n) => n.modulos.filter((m) => !m.side));
  const listos = mods.filter((m) => d.listas.has(m.id)).length;
  const porModulo = new Map<string, Articulo[]>();
  for (const a of d.articulos) if (a.modulo) porModulo.set(a.modulo, [...(porModulo.get(a.modulo) ?? []), a]);
  const items: Miga[] = [['Inicio', '/'], ['Temario', '/temario']];
  let fase = '';
  let html = '';
  for (const n of NIVELES) {
    if (n.fase !== fase) {
      fase = n.fase;
      html += `\n    <p class="pb-fase">${FASES[n.fase] ?? n.fase}</p>`;
    }
    const hechos = n.modulos.filter((m) => !m.side && d.listas.has(m.id)).length;
    html += `
    <section class="pb-cint" id="${idCinturon(n)}" style="--c:${n.color};--t:${tinta(n.color)}">
      <div class="pb-cint-cab"><span class="pt-cint-n">${n.n}</span><div><span class="pb-cint-nombre">Cinturón ${esc(n.cinturon.toLowerCase())}${hechos ? ` · ${hechos} listos` : ''}</span><h2>${esc(n.titulo)}</h2></div></div>
      <p class="pb-cint-obj">${esc(n.objetivo)}</p>
      <ol class="pb-mods">${n.modulos
        .map((m) => {
          const lista = d.listas.has(m.id);
          const arts = porModulo.get(m.id) ?? [];
          return `
        <li id="${idModulo(m.id)}"${lista ? ' class="lista"' : ''}>
          <div class="pb-mod-cab"><span class="pb-mod-id">${m.id}</span><h3>${esc(m.titulo)}</h3>${
            lista ? '<span class="pb-chip si">Lista para jugar</span>' : m.side ? '<span class="pb-chip">Misión extra</span>' : '<span class="pb-chip">En la forja</span>'
          }</div>
          <p><b>Teoría.</b> ${esc(m.teoria)}</p>
          <p><b>Práctica.</b> ${esc(boss(m.practica))}</p>${
            arts.length || lista
              ? `
          <p class="pb-mod-enlaces">${arts.map((a) => `<a href="${a.ruta}">${a.tipo === 'herramienta' ? 'Usar' : 'Leer'} «${esc(a.corto)}»</a>`).join('')}${
                  lista ? `<a href="${esc(leccionHref(m.id))}">Abrir la lección ${m.id}</a>` : ''
                }</p>`
              : ''
          }
        </li>`;
        })
        .join('')}
      </ol>
    </section>`;
  }
  const cuerpo = `  <main class="pb pb-ancho" id="contenido">
    ${migas(items)}
    <header class="pb-cab-pag">
      <h1>Temario del curso de DevOps</h1>
      <p class="pb-entrada">Del primer <code>ls</code> a operar sistemas a escala, en 9 cinturones y ${mods.length} módulos. Cada módulo tiene su teoría, su práctica en una máquina Linux de verdad y un boss que te rompe el lab para que lo arregles.</p>
      <p class="pb-entrada peque">Es gratis. Hay ${listos} lecciones listas para jugar y el resto se va construyendo en este orden.</p>
      <nav class="pb-saltos" aria-label="Cinturones">${NIVELES.map((n) => `<a href="#${idCinturon(n)}" style="--c:${n.color}">${esc(n.cinturon)}</a>`).join('')}</nav>
    </header>${html}
    <aside class="pb-cta">
      <span class="pb-cta-chip">Lección 0.0</span>
      <h2>Empieza por el cinturón blanco</h2>
      <p>Diez minutos para conocer la pantalla con tu primera máquina. Nada se da por sabido.</p>
      <div class="pt-ctas"><a class="pt-boton grande" href="${esc(leccionHref('0.0'))}">Crear cuenta gratis y empezar</a><a class="pt-boton grande fantasma" href="/blog/aprender-devops-desde-cero">Leer la ruta para aprender DevOps</a></div>
    </aside>
  </main>`;
  return {
    fichero: 'temario.html',
    ruta: '/temario',
    lastmod: cambioTemario(d.raiz),
    sitemap: true,
    html: documento(
      {
        titulo: 'Temario del curso de DevOps gratis, de Linux a Kubernetes',
        social: 'Temario del curso de DevOps de relavops',
        descripcion: `Temario del curso gratis de DevOps, de la terminal de Linux a Kubernetes y SRE. 9 cinturones y ${mods.length} módulos con teoría, práctica en una máquina real y boss.`,
        ruta: '/temario',
        imagen: imagen(d.raiz, 'temario'),
        datos: [ORG, AUTOR, migasDatos(items), curso(d)],
      },
      '/temario',
      cuerpo,
      d,
    ),
  };
}

// ---------- Sobre relavops y quién lo hace. Es la página de la firma de los artículos.
function paginaSobre(d: Datos): Pagina {
  const items: Miga[] = [['Inicio', '/'], ['Sobre relavops', '/sobre']];
  const posts = d.articulos.filter((a) => a.tipo === 'blog');
  const cuerpo = `  <main class="pb" id="contenido">
    ${migas(items)}
    <article class="pb-art">
      <header class="pb-art-cab">
        <h1>Sobre relavops</h1>
        <p class="pb-entrada">relavops es un curso gratis de Linux, redes y DevOps en español. Cada lección trae su propia máquina Linux y comprueba lo que haces en ella.</p>
      </header>
      <div class="pb-art-cuerpo">
        <div class="pb-texto">
<h2 id="quien">Quién lo hace</h2>
<p>relavops lo hace <strong>${esc(SITIO.autor.nombre)}</strong>. Escribe las lecciones, los labs y las guías del blog, y mantiene el servidor donde corren las máquinas.</p>
<h2 id="como">Cómo funciona por dentro</h2>
<p>Cada lección abre un Linux real y aislado, solo para ti. Sale de un grupo de máquinas que ya están encendidas, así que tarda milisegundos. La terminal te llega al navegador y escribes en ella como en cualquier servidor.</p>
<p>Mientras tanto, la lección mira la máquina. Cuando vuelve el prompt, comprueba si has hecho lo que pide el paso, por ejemplo que un fichero tenga los permisos correctos o que un puerto esté abierto. Si está bien, se abre el siguiente. Cada módulo acaba con un boss, un fallo que se mete en el lab para que lo arregles tú.</p>
<h2 id="temario">Qué se aprende</h2>
<p>Del primer <code>ls</code> a Kubernetes y SRE, en nueve cinturones. Linux, Bash, redes, cifrado, contenedores, despliegues, monitorización y operación a escala. Está todo en el <a href="/temario">temario</a>, módulo a módulo.</p>
<h2 id="blog">Las guías del blog</h2>
<p>Cada guía explica un tema con los comandos de verdad y enlaza con la lección del temario que enseña lo mismo, donde lo practicas en una máquina. Ahora hay ${posts.length}, y la primera que conviene leer es <a href="/blog/aprender-devops-desde-cero">cómo aprender DevOps desde cero</a>.</p>
<h2 id="profes">Para profes</h2>
<p>Un profe puede crear una clase, repartir su código y ver el progreso de cada alumno. También puede crear cuentas de golpe para alumnos sin correo. Todo eso también es gratis.</p>
        </div>
      </div>
      <aside class="pb-cta">
        <span class="pb-cta-chip">Lección 0.0 · Gratis</span>
        <h2>Empieza por el cinturón blanco</h2>
        <p>Diez minutos para conocer la pantalla con tu primera máquina. Nada se da por sabido.</p>
        <div class="pt-ctas"><a class="pt-boton grande" href="${esc(leccionHref('0.0'))}">Crear cuenta gratis</a><a class="pt-boton grande fantasma" href="/blog">Leer el blog</a></div>
      </aside>
    </article>
  </main>`;
  return {
    fichero: 'sobre.html',
    ruta: '/sobre',
    lastmod: max(...posts.map((a) => a.actualizado)),
    sitemap: true,
    html: documento(
      {
        titulo: 'Sobre relavops y quién lo hace · relavops',
        descripcion: `Quién hace relavops, cómo funciona por dentro y qué se aprende. Un curso gratis de Linux, redes y DevOps hecho por ${SITIO.autor.nombre}.`,
        ruta: '/sobre',
        imagen: imagen(d.raiz, 'relavops'),
        datos: [ORG, AUTOR, migasDatos(items), { '@type': 'AboutPage', '@id': `${url('/sobre')}#pagina`, url: url('/sobre'), name: 'Sobre relavops', inLanguage: 'es', about: { '@id': ORG_ID }, mainEntity: { '@id': AUTOR['@id'] } }],
      },
      '',
      cuerpo,
      d,
    ),
  };
}

// ---------- 404
function pagina404(d: Datos): Pagina {
  const cuerpo = `  <main class="pb" id="contenido">
    <header class="pb-cab-pag pb-404">
      <p class="pb-404-cod"><code>bash: cd: esa página: No such file or directory</code></p>
      <h1>Esta página no existe</h1>
      <p class="pb-entrada">Puede que el enlace esté mal escrito o que la página se haya movido. Desde aquí llegas a todo lo que hay.</p>
      <div class="pt-ctas"><a class="pt-boton grande" href="/">Ir a la portada</a><a class="pt-boton grande fantasma" href="/blog">Ver el blog</a><a class="pt-boton grande fantasma" href="/temario">Ver el temario</a></div>
    </header>
  </main>`;
  return {
    fichero: '404.html',
    ruta: '/404',
    lastmod: d.hoy,
    sitemap: false,
    html: documento({ titulo: 'Esta página no existe · relavops', descripcion: 'La página que buscas no existe.', ruta: '/404', noindex: true }, '', cuerpo, d),
  };
}

export function generarPaginas(d: Datos): Pagina[] {
  return [
    paginaBlog(d),
    paginaHerramientas(d),
    paginaTemario(d),
    paginaSobre(d),
    pagina404(d),
    ...d.articulos.map((a) => paginaArticulo(a, d)),
  ];
}

// ---------- La portada (inicio.html). Se rellena al compilar, así el temario y los artículos están en
// el HTML y la portada no tiene que cargar las lecciones para contarlas.
export function portada(html: string, d: Datos): string {
  const mods = NIVELES.flatMap((n) => n.modulos.filter((m) => !m.side));
  const listos = mods.filter((m) => d.listas.has(m.id)).length;
  let cint = '';
  let fase = '';
  for (const n of NIVELES) {
    const ms = n.modulos.filter((m) => !m.side);
    const hechos = ms.filter((m) => d.listas.has(m.id)).length;
    if (n.fase !== fase) {
      fase = n.fase;
      cint += `<div class="pt-fase">${FASES[n.fase] ?? n.fase}</div>`;
    }
    cint += `<a class="pt-cint" href="/temario#${idCinturon(n)}" style="--c:${n.color};--t:${tinta(n.color)}">
        <div class="pt-cint-cab"><span class="pt-cint-n">${n.n}</span><b>Cinturón ${esc(n.cinturon.toLowerCase())}</b></div>
        <h3>${esc(n.titulo)}</h3>
        <p>${esc(n.objetivo)}</p>
        <div class="pt-cint-pie">${hechos ? `<span class="listo">${hechos} de ${ms.length} listos</span>` : `<span>${ms.length} módulos en la forja</span>`}<span class="pt-cint-barra"><i style="width:${Math.round((hechos / ms.length) * 100)}%"></i></span></div>
      </a>`;
  }
  const posts = d.articulos.filter((a) => a.tipo === 'blog').slice(0, 6);
  const reemplazos: [string, string][] = [
    ['<!-- seo:cabeza -->', `${verificacion()}\n  ${ICONOS}\n  <link rel="alternate" type="application/rss+xml" title="Blog de relavops" href="/feed.xml" />\n  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': [ORG, AUTOR, WEB, curso(d)] })}</script>`],
    ['<!-- seo:nav -->', nav()],
    ['<!-- seo:intro -->', `Del primer <code>ls</code> a operar sistemas a escala, en ${mods.length} módulos. Cada uno tiene su teoría, su práctica y su boss. Hay ${listos} listos para jugar y el resto se va construyendo.`],
    ['<!-- seo:cinturones -->', cint],
    ['<!-- seo:listos -->', String(listos)],
    ['<!-- seo:blog -->', posts.map((a) => tarjeta(a)).join('')],
    ['<!-- seo:pie -->', pie(d)],
  ];
  for (const [marca, por] of reemplazos) {
    if (!html.includes(marca)) throw new Error(`inicio.html no tiene la marca ${marca}`);
    html = html.split(marca).join(por);
  }
  return html;
}

// ---------- Para los buscadores
export function sitemap(paginas: Pagina[], d: Datos): string {
  const posts = d.articulos.filter((a) => a.tipo === 'blog');
  const inicio = max(cambioTemario(d.raiz), ...posts.map((a) => a.actualizado), dia(fs.statSync(path.join(d.raiz, 'inicio.html')).mtimeMs));
  const urls = [{ ruta: '/', lastmod: inicio }, ...paginas.filter((p) => p.sitemap)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((p) => `  <url><loc>${url(p.ruta)}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export function rss(d: Datos): string {
  const posts = d.articulos.filter((a) => a.tipo === 'blog').sort((a, b) => b.fecha.localeCompare(a.fecha) || a.orden - b.orden);
  const fecha = (f: string) => new Date(`${f}T08:00:00Z`).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Blog de relavops</title>
  <link>${url('/blog')}</link>
  <description>Guías prácticas para aprender Linux, redes y DevOps en español.</description>
  <language>es</language>
  <atom:link href="${url('/feed.xml')}" rel="self" type="application/rss+xml" />
${posts
  .map(
    (a) => `  <item>
    <title>${esc(a.titulo)}</title>
    <link>${url(a.ruta)}</link>
    <guid isPermaLink="true">${url(a.ruta)}</guid>
    <pubDate>${fecha(a.fecha)}</pubDate>
    <category>${esc(a.categoria)}</category>
    <description>${esc(a.descripcion)}</description>
  </item>`,
  )
  .join('\n')}
</channel>
</rss>
`;
}

export const robots = () => `# relavops. Todo lo público se puede leer. Lo de dentro del curso pide cuenta.
User-agent: *
Allow: /
Disallow: /api/
Disallow: /ws/
Disallow: /admin
Disallow: /profe
Disallow: /cuenta

Sitemap: ${url('/sitemap.xml')}
`;

// llms.txt (llmstxt.org). Un resumen para los asistentes de IA que buscan en la web.
export function llms(d: Datos): string {
  const linea = (a: Articulo) => `- [${a.titulo}](${url(a.ruta)}): ${a.descripcion}`;
  return `# relavops

> ${SITIO.descripcion}

relavops es un curso de DevOps en español que se aprende tocando. Cada lección abre una máquina Linux real al lado del texto. El alumno escribe en la terminal y la lección comprueba lo que pasa en la máquina. Cada módulo acaba con un boss, un fallo que hay que arreglar en el lab. Los profes pueden crear clases y ver el progreso de cada alumno.

## Curso

- [Portada](${url('/')}): qué es relavops y cómo funciona.
- [Temario](${url('/temario')}): 9 cinturones, de la terminal de Linux a Kubernetes y SRE, con la teoría y la práctica de cada módulo.

## Blog

${d.articulos.filter((a) => a.tipo === 'blog').map(linea).join('\n')}

## Herramientas

${d.articulos.filter((a) => a.tipo === 'herramienta').map(linea).join('\n')}
`;
}
