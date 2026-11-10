// Lo poco que hace falta en las páginas públicas (blog, temario, herramientas). El texto ya viene en el
// HTML. Aquí solo la cabecera con sesión, el botón de copiar del código y el índice que sigue al leer.
import './publico.css';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Con sesión abierta, la cabecera lleva al curso.
fetch('/api/cuenta/yo', { credentials: 'same-origin' })
  .then(async (r) => {
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return;
    const j = await r.json();
    const acceso = document.getElementById('acceso');
    if (acceso && j.usuario?.nombre) acceso.innerHTML = `<a class="pt-boton" href="/curso">Ir al curso, ${esc(j.usuario.nombre)}</a>`;
  })
  .catch(() => {});

// Copiar un bloque de código. Las líneas que empiezan por "$ " se copian sin el "$ ".
for (const pre of document.querySelectorAll<HTMLPreElement>('pre.cod')) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pb-copiar';
  b.textContent = 'Copiar';
  b.addEventListener('click', async () => {
    const t = (pre.querySelector('code')?.textContent ?? '').replace(/^\$ /gm, '');
    try {
      await navigator.clipboard.writeText(t);
      b.textContent = 'Copiado';
    } catch {
      b.textContent = 'No se pudo';
    }
    setTimeout(() => (b.textContent = 'Copiar'), 1600);
  });
  pre.append(b);
}

// El índice marca la sección que se está leyendo.
const enlaces = new Map<string, HTMLAnchorElement>();
for (const a of document.querySelectorAll<HTMLAnchorElement>('.pb-indice a')) enlaces.set(a.hash.slice(1), a);
if (enlaces.size && 'IntersectionObserver' in window) {
  const obs = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        for (const a of enlaces.values()) a.classList.remove('aqui');
        enlaces.get(e.target.id)?.classList.add('aqui');
      }
    },
    { rootMargin: '-80px 0px -70% 0px' },
  );
  for (const id of enlaces.keys()) {
    const h = document.getElementById(id);
    if (h) obs.observe(h);
  }
}
