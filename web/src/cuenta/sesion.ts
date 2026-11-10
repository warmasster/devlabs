// La cuenta en el navegador. Quién eres, el menú con tu nombre, salir y el progreso guardado en tu cuenta.
// Las cuentas las lleva el Worker de Cloudflare (carpeta cuentas/). Si labd corre sin -cuentas, /api/cuenta/yo
// no existe y todo esto se queda quieto, como antes.
import { ic } from '../iconos';
import { leer, reemplazar, alGuardar } from '../curso/progreso';
import './sesion.css';

export interface Usuario {
  id: string; nombre: string; correo: string | null; rol: 'alumno' | 'profe' | 'admin'; correo_ok: boolean; pide_profe: boolean; origen: string; creado: number;
}
export interface Yo {
  usuario: Usuario;
  clases: { id: string; nombre: string; profe: string }[];
  mis_clases: number;
  aviso: string;
  correo: boolean;
  verificar_correo: boolean;
}
export type Estado = { tipo: 'sin-cuentas' } | { tipo: 'fuera' } | { tipo: 'dentro'; yo: Yo };

let estado: Promise<Estado> | null = null;

export const irAEntrar = () => {
  location.href = `/entrar?vuelta=${encodeURIComponent(location.pathname + location.search)}`;
};

export async function pedir<T = any>(ruta: string, metodo = 'GET', datos?: unknown): Promise<T> {
  const r = await fetch(ruta, {
    method: metodo,
    headers: datos !== undefined ? { 'content-type': 'application/json' } : {},
    body: datos !== undefined ? JSON.stringify(datos) : undefined,
    credentials: 'same-origin',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { estado: r.status, campo: j.campo, motivo: j.motivo });
  return j as T;
}

export function cuenta(forzar = false): Promise<Estado> {
  if (estado && !forzar) return estado;
  estado = (async (): Promise<Estado> => {
    try {
      const r = await fetch('/api/cuenta/yo', { credentials: 'same-origin' });
      if (r.status === 401) return { tipo: 'fuera' };
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return { tipo: 'sin-cuentas' };
      return { tipo: 'dentro', yo: await r.json() };
    } catch {
      return { tipo: 'sin-cuentas' };
    }
  })();
  return estado;
}

// Al salir se borra del navegador todo lo de esta cuenta: el progreso, el paso de cada lección y sus
// máquinas. Ya está guardado en la cuenta. Antes se quedaba, y en un ordenador compartido el siguiente
// que entraba se lo llevaba a la suya. Las preferencias (tema, colores, la isla) se quedan.
const DE_LA_CUENTA = [/^relavops\.curso(\.dueno)?$/, /^relavops\.leccion\./, /^relavops\.sesion\./];

export async function salir(todos = false) {
  if (pendiente) await subir().catch(() => null); // lo último que quedara por guardar
  await pedir(todos ? '/api/cuenta/salir-todo' : '/api/cuenta/salir', 'POST').catch(() => {});
  try {
    for (const k of Object.keys(localStorage)) if (DE_LA_CUENTA.some((r) => r.test(k))) localStorage.removeItem(k);
  } catch {}
  location.href = '/entrar';
}

// --- El pase de labd dura una hora. Con la página abierta se renueva solo cada 20 minutos.
let renovando = 0;
export function renovarPase() {
  if (Date.now() - renovando < 30_000) return;
  renovando = Date.now();
  fetch('/api/cuenta/yo', { credentials: 'same-origin' }).catch(() => {});
}

// --- Progreso: el del navegador se mezcla con el de la cuenta y luego se guarda solo al cambiar.
const DUENO = 'relavops.curso.dueno';
let pendiente = 0;

async function subir(keepalive = false) {
  const r = await fetch('/api/cuenta/progreso', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datos: leer() }), keepalive, credentials: 'same-origin',
  });
  if (!r.ok) return null;
  return (await r.json()).datos;
}

// El progreso tal como estaba al cargar la página, que es el que han pintado el mapa y la lección.
const pintado = JSON.stringify(leer());

async function sincronizar(u: Usuario) {
  let dueno: string | null = null;
  try { dueno = localStorage.getItem(DUENO); } catch {}
  if (dueno && dueno !== u.id) {
    // Este navegador tenía el progreso de otra cuenta. No se mezcla, se cambia por el de esta.
    reemplazar({ modulos: {}, xp: 0, dias: [], records: {} }, false);
  }
  try { localStorage.setItem(DUENO, u.id); } catch {}
  // Lo que ya está pintado en la página es lo de antes de cambiar de cuenta. Si cambia, se repinta.
  const antes = pintado;
  const mezclado = await subir().catch(() => null);
  if (mezclado) {
    reemplazar(mezclado, false);
    if (JSON.stringify(leer()) !== antes) dispatchEvent(new CustomEvent('relavops:progreso'));
  }
  alGuardar(() => {
    clearTimeout(pendiente);
    pendiente = window.setTimeout(() => subir().catch(() => {}), 2500);
  });
  addEventListener('pagehide', () => { if (pendiente) subir(true).catch(() => {}); });
}

// --- El menú de la cuenta, arriba a la derecha.

const inicial = (n: string) => n.slice(0, 1).toUpperCase();
// Un color estable por nombre, para el círculo.
export function colorDe(n: string) {
  let h = 0;
  for (const c of n.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 62%)`;
}
export const ROL: Record<string, string> = { alumno: 'Alumno', profe: 'Profe', admin: 'Admin' };

function aviso(texto: string) {
  if (!texto || document.querySelector('.rv-aviso')) return;
  const d = document.createElement('div');
  d.className = 'rv-aviso';
  d.innerHTML = `${ic('triangle-alert')}<span></span>`;
  d.querySelector('span')!.textContent = texto;
  document.body.prepend(d);
}

let arrancado = false;
export function chipCuenta(): HTMLElement {
  const raiz = document.createElement('span');
  raiz.className = 'rv-chip-raiz';
  cuenta().then((e) => {
    if (e.tipo === 'fuera') {
      raiz.innerHTML = `<a class="btn primario" href="/entrar?vuelta=${encodeURIComponent(location.pathname + location.search)}">${ic('user')} Entrar</a>`;
      return;
    }
    if (e.tipo !== 'dentro') return;
    const { usuario: u, clases } = e.yo;
    if (!arrancado) {
      arrancado = true;
      sincronizar(u);
      setInterval(renovarPase, 20 * 60_000);
      aviso(e.yo.aviso);
    }
    const clase = clases[0];
    raiz.innerHTML = `<button class="rv-chip" aria-haspopup="menu" aria-expanded="false" title="Tu cuenta">
        <span class="rv-avatar" style="--c:${colorDe(u.nombre)}">${inicial(u.nombre)}</span>
        <span class="rv-chip-txt"><b></b><small></small></span>
      </button>
      <div class="rv-menu" role="menu" hidden>
        <div class="rv-menu-cab"><span class="rv-avatar grande" style="--c:${colorDe(u.nombre)}">${inicial(u.nombre)}</span><div><b></b><small></small></div></div>
        <a role="menuitem" href="/cuenta">${ic('user')} Mi cuenta</a>
        ${u.rol !== 'alumno' ? `<a role="menuitem" href="/profe">${ic('users')} Mis clases</a>` : ''}
        ${u.rol === 'admin' ? `<a role="menuitem" href="/admin">${ic('gauge')} Panel de admin</a>` : ''}
        <hr class="rv-menu-sep" />
        <a role="menuitem" href="/curso">${ic('map')} El curso</a>
        <a role="menuitem" href="/juegos">${ic('swords')} Exámenes</a>
        <a role="menuitem" href="/muestrario">${ic('flask-conical')} Muestrario</a>
        <a role="menuitem" href="/cuenta#preferencias">${ic('cog')} Preferencias</a>
        <a role="menuitem" href="/">${ic('house')} Portada de relavops</a>
        <hr class="rv-menu-sep" />
        <button role="menuitem" class="rv-salir">${ic('door-open')} Salir</button>
      </div>`;
    raiz.querySelectorAll('.rv-chip-txt b, .rv-menu-cab b').forEach((b) => (b.textContent = u.nombre));
    raiz.querySelector('.rv-chip-txt small')!.textContent = clase ? clase.nombre : ROL[u.rol];
    raiz.querySelector('.rv-menu-cab small')!.textContent = clase ? `${ROL[u.rol]} en ${clase.nombre}` : `${ROL[u.rol]}${u.origen === 'libre' ? ' por libre' : ''}`;
    const boton = raiz.querySelector('.rv-chip') as HTMLButtonElement;
    const menu = raiz.querySelector('.rv-menu') as HTMLElement;
    const abrir = (si: boolean) => { menu.hidden = !si; boton.setAttribute('aria-expanded', String(si)); };
    boton.onclick = (ev) => { ev.stopPropagation(); abrir(menu.hidden); };
    document.addEventListener('click', (ev) => { if (!raiz.contains(ev.target as Node)) abrir(false); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') abrir(false); });
    (raiz.querySelector('.rv-salir') as HTMLElement).onclick = () => salir();
  });
  return raiz;
}
