// La barra de abajo del móvil, en las páginas del curso que no son la lección (mapa, chuleta, arcade).
// En pantallas grandes no sale: ahí los mismos enlaces están en la cabecera. El estilo está en estilo.css.
const SITIOS: [string, string, string][] = [
  ['mapa', 'Mapa', '/curso'],
  ['chuleta', 'Chuleta', '/chuleta'],
  ['arcade', 'Arcade', '/arcade'],
  ['cuenta', 'Cuenta', '/cuenta'],
];

export function navMovil(aqui: string, conCuenta = true) {
  const n = document.createElement('nav');
  n.className = 'rv-nav';
  n.setAttribute('aria-label', 'Secciones');
  n.innerHTML = SITIOS.filter(([k]) => conCuenta || k !== 'cuenta')
    .map(([k, t, href]) => `<a href="${href}" ${k === aqui ? 'aria-current="page"' : ''}>${t}</a>`).join('');
  document.body.append(n);
  document.body.classList.add('con-nav');
  // Sin cuentas (labd en local), /cuenta no existe. Se quita el enlace.
  fetch('/api/cuenta/yo', { credentials: 'same-origin' }).then((r) => {
    if (!(r.headers.get('content-type') ?? '').includes('json')) n.querySelector('a[href="/cuenta"]')?.remove();
  }).catch(() => n.querySelector('a[href="/cuenta"]')?.remove());
}
