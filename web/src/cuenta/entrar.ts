// Página de entrar y crear cuenta. A la izquierda, una red de máquinas con paquetes que viajan y una
// terminal que reacciona a lo que escribes. A la derecha, los formularios, con las comprobaciones en vivo
// contra el Worker de cuentas (nombre libre, correo libre, código de clase).
import './entrar.css';
import { Red } from './red';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const params = new URLSearchParams(location.search);
// A dónde volver tras entrar, solo dentro de esta web. No basta con mirar que empiece por / y no por //:
// el navegador lee \ como / y quita tabuladores, así que /\otra.web acababa en otra web.
const vuelta = (() => {
  const v = params.get('vuelta');
  if (!v || !v.startsWith('/') || /[\u0000-\u001f\\]/.test(v)) return '';
  try {
    const u = new URL(v, location.origin);
    // La ruta ya normalizada tampoco puede empezar por // (de "/.//otra.web" sale //otra.web).
    return u.origin === location.origin && !u.pathname.startsWith('//') ? u.pathname + u.search + u.hash : '';
  } catch {
    return '';
  }
})();
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============================== La terminal ==============================

const DEMO: [string, string[]][] = [
  ['ping -c 1 web', ['64 bytes from web (10.0.0.20): icmp_seq=1 ttl=64 time=0.06 ms']],
  ['ss -tln | grep 80', ['LISTEN 0  511  0.0.0.0:80  0.0.0.0:*']],
  ['git log --oneline -1', ['3f2a9c1 arregla el puerto del balanceador']],
  ['systemctl is-active nginx', ['active']],
  ['df -h / | tail -1', ['/dev/sda1   40G   12G   28G  30% /']],
];

class Terminal {
  private demo = true;
  private vivoEl: HTMLElement | null = null;
  constructor(private cuerpo: HTMLElement, private caja: HTMLElement) {
    if (!quieto && getComputedStyle(caja).display !== 'none') this.bucleDemo();
  }

  private linea(texto: string, clase = '') {
    const d = document.createElement('div');
    if (clase) d.className = clase;
    d.textContent = texto;
    this.cuerpo.append(d);
    while (this.cuerpo.children.length > 7) this.cuerpo.firstElementChild!.remove();
    return d;
  }

  private prompt(cmd: string, clase = 'c') {
    const d = this.linea('', clase);
    const p = document.createElement('span');
    p.className = 'p';
    p.textContent = 'tu@relavops:~$ ';
    d.append(p, document.createTextNode(cmd));
    return d;
  }

  private async bucleDemo() {
    await espera(500);
    for (let i = 0; this.demo; i = (i + 1) % DEMO.length) {
      const [cmd, salida] = DEMO[i];
      const d = this.prompt('');
      const txt = d.lastChild as Text;
      for (const ch of cmd) {
        if (!this.demo) return;
        txt.data += ch;
        await espera(45 + Math.random() * 60);
      }
      await espera(250);
      if (!this.demo) return;
      d.classList.remove('c');
      for (const s of salida) this.linea(s, 's');
      await espera(1700);
    }
  }

  // A partir de aquí la terminal sigue lo que hace la persona.
  tomar(titulo: string) {
    if (!this.demo && this.cuerpo.dataset.titulo === titulo) return;
    this.demo = false;
    this.cuerpo.dataset.titulo = titulo;
    this.cuerpo.innerHTML = '';
    this.vivoEl = null;
    this.linea(`# ${titulo}`, 's');
  }

  // La última línea cambia mientras se escribe.
  vivo(cmd: string, prompt = true) {
    if (!this.vivoEl) this.vivoEl = prompt ? this.prompt('') : this.linea('', 'c');
    const ultimo = this.vivoEl.lastChild as Text | null;
    if (prompt && ultimo && ultimo.nodeType === 3) ultimo.data = cmd;
    else this.vivoEl.textContent = cmd;
  }

  fijar() {
    this.vivoEl?.classList.remove('c');
    this.vivoEl = null;
  }

  decir(texto: string, clase = 's') {
    this.fijar();
    this.linea(texto, clase);
  }

  marcar(clase: '' | 'bien' | 'mal') {
    this.caja.classList.remove('bien', 'mal');
    void this.caja.offsetWidth;
    if (clase) this.caja.classList.add(clase);
  }
}

// ============================== Formularios ==============================

const red = new Red($('.en-red') as HTMLCanvasElement);
const term = new Terminal($('.en-term-cuerpo'), $('.en-term'));
const tarjeta = $('#tarjeta');
const pestanas = $('.en-pestanas');

type Vista = 'entrar' | 'alta' | 'olvido' | 'nueva' | 'sin';
function vista(v: Vista) {
  for (const id of ['entrar', 'alta', 'olvido', 'nueva', 'sin']) $(`#v-${id}`).hidden = id !== v;
  pestanas.classList.toggle('alta', v === 'alta');
  pestanas.classList.toggle('oculta', v === 'olvido' || v === 'nueva' || v === 'sin');
  $('#p-entrar').setAttribute('aria-selected', String(v === 'entrar'));
  $('#p-alta').setAttribute('aria-selected', String(v === 'alta'));
  const form = $(`#v-${v}`);
  form.querySelectorAll('.en-error').forEach((e) => ((e as HTMLElement).hidden = true));
  history.replaceState(null, '', location.pathname + (vuelta ? `?vuelta=${encodeURIComponent(vuelta)}` : '') + (v === 'alta' ? `${vuelta ? '&' : '?'}registro=1` : ''));
}

function sacudir() {
  tarjeta.classList.remove('mal');
  void tarjeta.offsetWidth;
  tarjeta.classList.add('mal');
}

function error(form: HTMLElement, texto: string) {
  const e = $('.en-error', form);
  e.textContent = texto;
  e.hidden = !texto;
  if (texto) sacudir();
}

async function api<T = any>(ruta: string, metodo = 'GET', datos?: unknown): Promise<T> {
  const r = await fetch(ruta, {
    method: metodo, credentials: 'same-origin',
    headers: datos ? { 'content-type': 'application/json' } : {},
    body: datos ? JSON.stringify(datos) : undefined,
  });
  const j = await r.json().catch(() => ({ error: 'El servidor de cuentas no responde. Prueba en un momento.' }));
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { campo: j.campo, estado: r.status });
  return j;
}

function cargando(b: HTMLButtonElement, si: boolean) {
  b.disabled = si;
  b.classList.toggle('cargando', si);
}

function ojos() {
  document.querySelectorAll<HTMLButtonElement>('.en-ojo').forEach((b) => {
    b.onclick = () => {
      const i = b.previousElementSibling as HTMLInputElement;
      const ver = i.type === 'password';
      i.type = ver ? 'text' : 'password';
      b.classList.toggle('visto', ver);
      b.setAttribute('aria-label', ver ? 'Esconder la contraseña' : 'Enseñar la contraseña');
      i.focus();
    };
  });
}

const puntos = (n: number) => '●'.repeat(Math.min(n, 24));

async function irDentro(nombre: string, destino: string) {
  term.decir(`Bienvenido, ${nombre}. Tu lab te espera.`, 'ok');
  term.marcar('bien');
  red.poner('bien');
  await espera(quieto ? 100 : 900);
  location.href = destino;
}

// ---------- Entrar

const fEntrar = $('#v-entrar') as HTMLFormElement;
const iUsuario = fEntrar.elements.namedItem('usuario') as HTMLInputElement;
const iClave = fEntrar.elements.namedItem('clave') as HTMLInputElement;

iUsuario.addEventListener('focus', () => { term.tomar('entra en tu cuenta'); term.vivo(`ssh ${iUsuario.value || ''}@relavops.org`); red.poner('tecleo', 1500); });
iUsuario.addEventListener('input', () => { term.vivo(`ssh ${iUsuario.value}@relavops.org`); red.poner('tecleo', 1200); });
iClave.addEventListener('focus', () => {
  term.tomar('entra en tu cuenta');
  term.vivo(`ssh ${iUsuario.value}@relavops.org`);
  term.fijar();
  term.vivo(`${iUsuario.value || 'tu'}@relavops.org's password: ${puntos(iClave.value.length)}`, false);
});
iClave.addEventListener('input', () => { term.vivo(`${iUsuario.value || 'tu'}@relavops.org's password: ${puntos(iClave.value.length)}`, false); red.poner('tecleo', 1200); });

fEntrar.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const boton = $('.en-boton', fEntrar) as HTMLButtonElement;
  if (!iUsuario.value.trim() || !iClave.value) {
    error(fEntrar, 'Escribe tu usuario y tu contraseña.');
    (iUsuario.value.trim() ? iClave : iUsuario).focus();
    return;
  }
  error(fEntrar, '');
  cargando(boton, true);
  term.decir('Conectando…', 'l');
  try {
    const r = await api('/api/cuenta/entrar', 'POST', {
      usuario: iUsuario.value.trim(), clave: iClave.value, recordar: (fEntrar.elements.namedItem('recordar') as HTMLInputElement).checked,
    });
    boton.classList.add('hecho');
    await irDentro(r.usuario.nombre, vuelta || (r.usuario.rol === 'admin' ? '/admin' : '/curso'));
  } catch (e: any) {
    cargando(boton, false);
    term.decir(e.estado === 401 ? 'Permission denied, please try again.' : e.message, 'no');
    term.marcar('mal');
    red.poner('mal', 900);
    error(fEntrar, e.message);
    iClave.select();
  }
});

// ---------- Crear cuenta

let cfg = { registro: 'abierto', profes: 'abierto', verificar_correo: false, recuperar: false };
const pasoTipo = $('#paso-tipo');
const fDatos = $('#paso-datos') as HTMLFormElement;
const campo = (n: string) => fDatos.elements.namedItem(n) as HTMLInputElement;
const caja = (n: string) => campo(n).closest('.en-campo') as HTMLElement;
const ayuda = (n: string) => $(`[data-de='${n}']`, fDatos);
const AYUDAS: Record<string, string> = {};
fDatos.querySelectorAll<HTMLElement>('[data-de]').forEach((e) => (AYUDAS[e.dataset.de!] = e.textContent ?? ''));
let tipo: 'libre' | 'clase' | 'profe' = 'libre';
const ok: Record<string, boolean> = {};

function estadoCampo(n: string, e: '' | 'mirando' | 'bien' | 'mal', texto?: string) {
  const c = caja(n);
  c.classList.remove('mirando', 'bien', 'mal');
  if (e) c.classList.add(e);
  ayuda(n).textContent = texto ?? AYUDAS[n];
  ok[n] = e === 'bien';
}

function elegirTipo(t: typeof tipo) {
  tipo = t;
  pasoTipo.hidden = true;
  fDatos.hidden = false;
  fDatos.classList.toggle('tipo-clase', t === 'clase');
  $('#alta-titulo').textContent = { libre: 'Tu cuenta', clase: 'Entra en tu clase', profe: 'Tu cuenta de profe' }[t];
  $('#alta-sub').textContent = {
    libre: 'Tres datos y listo. Tu progreso se guarda en tu cuenta.',
    clase: 'Escribe el código que te ha dado tu profe y elige tu nombre.',
    profe: 'Luego creas tus clases y repartes un código a cada una.',
  }[t];
  $('#correo-label').textContent = t === 'clase' ? 'Correo (opcional)' : 'Correo';
  // Sin envío de correo no se puede recuperar la cuenta con él. No se promete lo que aún no hay.
  ayuda('correo').textContent = AYUDAS.correo = cfg.recuperar
    ? (t === 'clase' ? 'Si lo pones, podrás recuperar la cuenta tú solo.' : 'Para recuperar la cuenta si olvidas la contraseña.')
    : (t === 'clase' ? 'Opcional. Si no lo pones y olvidas la contraseña, te la cambia tu profe.' : 'Es tu forma de contacto. Si olvidas la contraseña, de momento te la cambia el admin.');
  $('#nota-profe').hidden = !(t === 'profe' && cfg.profes === 'aprobacion');
  term.tomar('crea tu cuenta');
  term.vivo(`sudo useradd --create-home ${campo('nombre').value}`);
  (t === 'clase' && !campo('codigo').value ? campo('codigo') : campo('nombre')).focus();
}

document.querySelectorAll<HTMLButtonElement>('.en-tipo').forEach((b) => (b.onclick = () => elegirTipo(b.dataset.tipo as typeof tipo)));
$('#volver').onclick = () => { fDatos.hidden = true; pasoTipo.hidden = false; };

// Reglas del nombre, las mismas que en el Worker, para avisar antes de preguntar.
function revisarNombre(n: string): string | null {
  if (n.length < 3) return 'Tres letras o más.';
  if (!/^[a-zA-Z]/.test(n)) return 'Empieza por una letra.';
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(n)) return 'Solo letras sin tilde, números, punto, guion y guion bajo.';
  if (/[_.-]{2}/.test(n) || /[_.-]$/.test(n)) return 'No acabes en símbolo ni pongas dos seguidos.';
  return null;
}

function retardo<A extends unknown[]>(f: (...a: A) => void, ms: number) {
  let t = 0;
  return (...a: A) => { clearTimeout(t); t = window.setTimeout(() => f(...a), ms); };
}

let pidiendoNombre = 0;
const mirarNombre = retardo(async (n: string) => {
  const mio = ++pidiendoNombre;
  try {
    const r = await api(`/api/cuenta/libre?nombre=${encodeURIComponent(n)}`);
    if (mio !== pidiendoNombre) return;
    estadoCampo('nombre', r.libre ? 'bien' : 'mal', r.libre ? `${n} está libre. Es tuyo.` : r.motivo);
  } catch (e: any) {
    if (mio === pidiendoNombre) estadoCampo('nombre', 'mal', e.message);
  }
}, 350);

campo('nombre').addEventListener('input', () => {
  const n = campo('nombre').value.trim();
  term.vivo(`sudo useradd --create-home ${n}`);
  red.poner('tecleo', 1000);
  if (!n) return estadoCampo('nombre', '');
  const mal = revisarNombre(n);
  if (mal) { pidiendoNombre++; return estadoCampo('nombre', n.length < 3 ? '' : 'mal', mal); }
  estadoCampo('nombre', 'mirando', 'Mirando si está libre…');
  mirarNombre(n);
});

let pidiendoCorreo = 0;
const mirarCorreo = retardo(async (c: string) => {
  const mio = ++pidiendoCorreo;
  try {
    const r = await api(`/api/cuenta/libre?correo=${encodeURIComponent(c)}`);
    if (mio === pidiendoCorreo) estadoCampo('correo', r.libre ? 'bien' : 'mal', r.libre ? 'Perfecto.' : r.motivo);
  } catch (e: any) {
    if (mio === pidiendoCorreo) estadoCampo('correo', 'mal', e.message);
  }
}, 500);

campo('correo').addEventListener('input', () => {
  const c = campo('correo').value.trim();
  if (!c) return estadoCampo('correo', '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)) { pidiendoCorreo++; return estadoCampo('correo', '', 'Sigue, todavía no parece un correo.'); }
  estadoCampo('correo', 'mirando', 'Comprobando…');
  mirarCorreo(c);
});

const mirarCodigo = retardo(async (c: string) => {
  try {
    const r = await api(`/api/cuenta/clase?codigo=${encodeURIComponent(c)}`);
    if (!r.abierta) {
      estadoCampo('codigo', 'mal', 'Esa clase ya no admite alumnos nuevos. Pide otro código a tu profe.');
      $('#clase-vista').hidden = true;
      return;
    }
    estadoCampo('codigo', 'bien', 'Código correcto.');
    const v = $('#clase-vista');
    v.innerHTML = '<span class="en-clase-ic"></span><div><b></b><small></small></div>';
    $('.en-clase-ic', v).textContent = r.nombre.slice(0, 1).toUpperCase();
    $('b', v).textContent = r.nombre;
    $('small', v).textContent = `con ${r.profe}`;
    v.hidden = false;
    term.decir(`usermod -aG ${r.nombre.toLowerCase().replace(/[^a-z0-9ñ]+/g, '-')} ${campo('nombre').value || 'tu'}`, 'l');
    red.poner('bien', 900);
  } catch (e: any) {
    estadoCampo('codigo', 'mal', e.estado === 404 ? 'No hay ninguna clase con ese código. Revisa las letras.' : e.message);
    $('#clase-vista').hidden = true;
  }
}, 250);

campo('codigo').addEventListener('input', () => {
  const i = campo('codigo');
  const limpio = i.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  i.value = limpio.length > 4 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
  $('#clase-vista').hidden = true;
  if (limpio.length < 8) return estadoCampo('codigo', '');
  estadoCampo('codigo', 'mirando', 'Buscando tu clase…');
  mirarCodigo(i.value);
});

const TONTAS = new Set(['12345678', '123456789', '1234567890', 'password', 'contraseña', 'contrasena', 'qwertyui', 'qwerty123', '11111111', '00000000',
  'abcd1234', 'iloveyou', 'password1', '87654321', 'relavops', 'asdfghjk']);

function fuerza(c: string, nombre: string): [number, string] {
  if (!c) return [0, ''];
  if (c.length < 8) return [1, `Te ${8 - c.length === 1 ? 'falta 1 carácter' : `faltan ${8 - c.length} caracteres`}.`];
  if (TONTAS.has(c.toLowerCase()) || /^(.)\1+$/.test(c)) return [1, 'Esa es de las primeras que se prueban. Elige otra.'];
  if (nombre && c.toLowerCase() === nombre.toLowerCase()) return [1, 'No uses tu nombre de usuario.'];
  let p = 0;
  if (c.length >= 11) p++;
  if (c.length >= 15) p++;
  if (/[a-z]/.test(c) && /[A-Z]/.test(c)) p += 0.5;
  if (/\d/.test(c)) p += 0.5;
  if (/[^A-Za-z0-9]/.test(c)) p += 0.5;
  if (new Set(c).size / c.length < 0.45) p -= 1;
  const n = Math.max(2, Math.min(4, 1 + Math.round(p)));
  return [n, ['', '', 'Vale. Más larga sería mejor.', 'Buena.', 'Muy buena.'][n]];
}

function pintarFuerza(input: HTMLInputElement, nombre: string) {
  const [n, t] = fuerza(input.value, nombre);
  const barra = input.closest('.en-campo')!.querySelector('.en-fuerza') as HTMLElement;
  barra.dataset.n = String(n);
  return [n, t] as const;
}

campo('clave').addEventListener('focus', () => {
  term.fijar();
  term.decir(`sudo passwd ${campo('nombre').value || 'tu'}`, 'l');
  term.vivo(`Nueva contraseña: ${puntos(campo('clave').value.length)}`, false);
});
campo('clave').addEventListener('input', () => {
  const [n, t] = pintarFuerza(campo('clave'), campo('nombre').value);
  term.vivo(`Nueva contraseña: ${puntos(campo('clave').value.length)}`, false);
  red.poner('tecleo', 900);
  if (!campo('clave').value) return estadoCampo('clave', '');
  estadoCampo('clave', n >= 2 ? 'bien' : 'mal', t);
});

fDatos.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const boton = $('.en-boton', fDatos) as HTMLButtonElement;
  const nombre = campo('nombre').value.trim();
  const correo = campo('correo').value.trim();
  const clave = campo('clave').value;
  const faltas: [string, string][] = [];
  if (tipo === 'clase' && !ok.codigo) faltas.push(['codigo', 'Escribe el código de tu clase.']);
  if (!nombre || revisarNombre(nombre)) faltas.push(['nombre', revisarNombre(nombre) ?? 'Elige un nombre de usuario.']);
  if (tipo !== 'clase' && !correo) faltas.push(['correo', 'Pon tu correo.']);
  if (fuerza(clave, nombre)[0] < 2) faltas.push(['clave', fuerza(clave, nombre)[1] || 'Elige una contraseña.']);
  if (faltas.length) {
    for (const [n, t] of faltas) estadoCampo(n, 'mal', t);
    campo(faltas[0][0]).focus();
    error(fDatos, 'Revisa lo que está en rojo.');
    return;
  }
  error(fDatos, '');
  cargando(boton, true);
  term.fijar();
  term.decir('Creando tu cuenta…', 'l');
  try {
    const r = await api('/api/cuenta/registro', 'POST', {
      tipo, nombre, correo, clave, codigo: campo('codigo').value, web: campo('web').value,
      recordar: (fDatos.elements.namedItem('recordar') as HTMLInputElement).checked,
    });
    boton.classList.add('hecho');
    term.decir(`useradd: cuenta ${r.usuario.nombre} creada${r.clase ? ` en ${r.clase.nombre}` : ''}`, 'ok');
    await irDentro(r.usuario.nombre, vuelta || (r.usuario.rol === 'profe' ? '/profe' : '/curso'));
  } catch (e: any) {
    cargando(boton, false);
    if (e.campo && fDatos.elements.namedItem(e.campo)) { estadoCampo(e.campo, 'mal', e.message); campo(e.campo).focus(); }
    error(fDatos, e.message);
    term.decir(`useradd: ${e.message}`, 'no');
    term.marcar('mal');
    red.poner('mal', 900);
  }
});

// ---------- Olvidé la contraseña y contraseña nueva

const fOlvido = $('#v-olvido') as HTMLFormElement;
$('#olvido').onclick = () => {
  vista('olvido');
  $('#olvido-con-correo').hidden = !cfg.recuperar;
  $('#olvido-sin-correo').hidden = cfg.recuperar;
  term.tomar('recupera tu cuenta');
  term.vivo('passwd --help');
  if (cfg.recuperar) (fOlvido.elements.namedItem('correo') as HTMLInputElement).focus();
};
fOlvido.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const boton = $('.en-boton', fOlvido) as HTMLButtonElement;
  cargando(boton, true);
  try {
    await api('/api/cuenta/recuperar', 'POST', { correo: (fOlvido.elements.namedItem('correo') as HTMLInputElement).value });
    $('.en-bien', fOlvido).hidden = false;
    error(fOlvido, '');
    term.decir('mail: enlace enviado', 'ok');
  } catch (e: any) {
    error(fOlvido, e.message);
  }
  cargando(boton, false);
});

const fNueva = $('#v-nueva') as HTMLFormElement;
const iNueva = fNueva.elements.namedItem('clave') as HTMLInputElement;
iNueva.addEventListener('input', () => pintarFuerza(iNueva, ''));
fNueva.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const [n, t] = fuerza(iNueva.value, '');
  if (n < 2) return error(fNueva, t || 'Elige una contraseña.');
  const boton = $('.en-boton', fNueva) as HTMLButtonElement;
  cargando(boton, true);
  try {
    await api('/api/cuenta/recuperar/nueva', 'POST', { t: params.get('recuperar'), clave: iNueva.value });
    await irDentro('otra vez', '/curso');
  } catch (e: any) {
    cargando(boton, false);
    error(fNueva, e.message);
  }
});

// ---------- Pestañas y arranque

$('#p-entrar').onclick = () => { vista('entrar'); iUsuario.focus(); };
$('#p-alta').onclick = () => vista('alta');
document.querySelectorAll<HTMLElement>('[data-ir]').forEach((b) => (b.onclick = () => { vista(b.dataset.ir as Vista); if (b.dataset.ir === 'entrar') iUsuario.focus(); }));
ojos();

(async () => {
  const r = await fetch('/api/cuenta/config').catch(() => null);
  if (!r || !r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return vista('sin');
  cfg = await r.json();
  if (params.get('recuperar')) {
    vista('nueva');
    iNueva.focus();
    return;
  }
  // Si ya has entrado, a donde ibas.
  const yo = await fetch('/api/cuenta/yo').catch(() => null);
  if (yo?.ok) {
    const j = await yo.json();
    return void (location.href = vuelta || (j.usuario.rol === 'admin' ? '/admin' : '/curso'));
  }
  const cerrada = $('#alta-cerrada');
  if (cfg.registro !== 'abierto') {
    document.querySelectorAll<HTMLButtonElement>('.en-tipo').forEach((b) => (b.disabled = cfg.registro === 'cerrado' || b.dataset.tipo !== 'clase'));
    cerrada.textContent = cfg.registro === 'cerrado' ? 'Ahora mismo no se pueden crear cuentas nuevas.' : 'Ahora mismo solo se crean cuentas con el código de una clase.';
    cerrada.hidden = false;
  }
  const codigo = params.get('clase');
  if (codigo) {
    vista('alta');
    campo('codigo').value = codigo;
    elegirTipo('clase');
    campo('codigo').dispatchEvent(new Event('input'));
    campo('nombre').focus();
  } else if (params.get('registro')) {
    vista('alta');
    // La portada puede pedir ya el tipo (Soy profe). Solo si ese tipo está permitido ahora.
    const t = params.get('tipo');
    const boton = t ? document.querySelector<HTMLButtonElement>(`.en-tipo[data-tipo="${t}"]`) : null;
    if (boton && !boton.disabled) elegirTipo(t as typeof tipo);
  } else {
    vista('entrar'); // sin foco de entrada, para que la terminal de la izquierda siga con su demo
  }
})();
