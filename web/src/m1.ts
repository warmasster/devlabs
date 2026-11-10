import './estilo.css';
import './iconos';
import { abrirSesion, eventos, type Info } from './api';
import { LabTerminal, modoInmersivo, avisarAntesDeCerrar, type Motor } from './terminal';
import { celebrar, panelAjustes } from './recompensa';

export const BATERIA = [
  { id: 'tab', t: 'TAB completa; doble TAB lista opciones', c: 'cat /etc/os-r + TAB · ls /usr/b + TAB TAB' },
  { id: 'ctrlc', t: 'Ctrl+C corta sleep y ping al instante', c: 'sleep 100 · ping 127.0.0.1' },
  { id: 'ctrld', t: 'Ctrl+D cierra python3 y una shell anidada', c: 'python3 → Ctrl+D · bash → Ctrl+D' },
  { id: 'ctrlz', t: 'Ctrl+Z suspende, fg recupera', c: 'sleep 200 → Ctrl+Z → fg' },
  { id: 'readline', t: 'Ctrl+R, Ctrl+A/E/U/K, Alt+B/F', c: 'Ctrl+R hola · edita una línea larga' },
  { id: 'ctrlw', t: 'Ctrl+W borra palabra (modo inmersivo)', c: 'Solo Chrome/Edge: «ic:maximize» y luego Ctrl+W' },
  { id: 'tui', t: 'vim, nano, htop, less, man y tmux, ratón incluido', c: 'htop y haz clic en una columna' },
  { id: 'resize', t: 'Redimensionar reajusta columnas', c: 'htop abierto y cambia el tamaño de la ventana' },
  { id: 'pegar', t: 'Copiar con selección y pegar bloques largos', c: 'Ctrl+Shift+C / Ctrl+Shift+V (Cmd en Mac)' },
  { id: 'clicderecho', t: 'Clic derecho: pega (o copia si hay selección)', c: 'copia algo fuera y haz clic derecho en la terminal' },
  { id: 'utf8', t: 'Acentos, ñ, emojis y cajas', c: 'cat prueba-utf8.txt · escribe “mañana”' },
  { id: 'scroll', t: 'Scroll del historial con la rueda', c: 'seq 1 2000 y sube con la rueda hasta el 1' },
  { id: 'persist', t: 'Cerrar la pestaña y volver recupera la sesión', c: 'deja htop abierto, recarga la página' },
];

const params = new URLSearchParams(location.search);
// Terminal decidida: xterm.js. ghostty-web solo queda para comparar con ?motor=ghostty.
const motor: Motor = params.get('motor') === 'ghostty' ? 'ghostty' : 'xterm';
let info: Info;
let term: LabTerminal | undefined;
const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());

function pintarMotor() {
  document.querySelectorAll<HTMLButtonElement>('[data-motor]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.motor === motor)));
}

async function montarTerminal() {
  term?.destruir();
  pintarMotor();
  term = await LabTerminal.crear($('term'), motor, info.sesion, 'lab');
  term.onEstado = (e) => {
    const p = $('estado');
    p.textContent = e;
    p.className = `pildora ${e === 'conectado' ? 'ok' : e === 'terminada' ? 'mal' : 'aviso'}`;
  };
  term.onEstado(term.estado); // por si ya conectó antes de asignar el manejador
  pintarBateria();
}

function pintarArranque() {
  const a = $('arranque');
  a.textContent = info.reutilizada
    ? `sesión recuperada en ${info.ms_total} ms`
    : `lab asignado en ${info.ms_total} ms ${info.de_pool ? '(pool en caliente)' : `(creado en ${info.creada_ms} ms)`}`;
  a.className = 'pildora ok';
}

function pintarMision() {
  const ul = $('mision');
  ul.innerHTML = '';
  for (const p of info.lab.mision) {
    const li = document.createElement('li');
    li.id = `paso-${p.id}`;
    const hecho = info.progreso.hechos[p.id];
    if (hecho !== undefined) li.classList.add('hecho');
    li.innerHTML = `<span class="marca">${hecho !== undefined ? '«ic:check»' : ''}</span>
      <div><div>${p.titulo} <span class="detalle">+${p.xp} XP</span></div>
      <div class="detalle">${p.texto.replace(/`([^`]+)`/g, '<code>$1</code>')}</div>
      <div class="detalle ms">${hecho !== undefined ? `validado en ${hecho} ms` : ''}</div></div>`;
    ul.append(li);
  }
  $('xp').textContent = `${info.progreso.xp} XP`;
}

let automaticos: Record<string, Record<string, { ok: boolean; nota?: string }>> = {};
async function cargarAutomaticos() {
  for (const m of ['xterm', 'ghostty']) {
    try {
      const r = await fetch(`/resultados/m1-${m}.json`, { cache: 'no-store' });
      if (r.ok) automaticos[m] = (await r.json()).items;
    } catch {}
  }
}

function pintarBateria() {
  const ul = $('bateria');
  ul.innerHTML = '';
  const manual = JSON.parse(localStorage.getItem(`relavops.bateria.${motor}`) ?? '{}');
  for (const b of BATERIA) {
    const auto = automaticos[motor]?.[b.id];
    const li = document.createElement('li');
    const estado = auto ? (auto.ok ? 'hecho' : 'fallo') : manual[b.id] ? 'hecho' : '';
    if (estado) li.classList.add(estado);
    li.innerHTML = `<span class="marca" role="checkbox" aria-checked="${estado === 'hecho'}">${estado === 'hecho' ? '«ic:check»' : estado === 'fallo' ? '«ic:x»' : ''}</span>
      <div><div>${b.t}</div><div class="detalle">${b.c}</div>
      ${auto ? `<div class="auto">auto: ${auto.ok ? 'pasa' : 'FALLA'}${auto.nota ? ` · ${auto.nota}` : ''}</div>` : manual[b.id] ? '<div class="auto">marcado a mano</div>' : ''}</div>`;
    li.querySelector('.marca')!.addEventListener('click', () => {
      manual[b.id] = !manual[b.id];
      localStorage.setItem(`relavops.bateria.${motor}`, JSON.stringify(manual));
      pintarBateria();
    });
    ul.append(li);
  }
}

setInterval(() => {
  if (!term) return;
  const s = term.stats();
  const f = (v: number) => (Number.isFinite(v) ? `${v.toFixed(v < 10 ? 1 : 0)} ms` : '–');
  $('lat-tecla').textContent = f(s.tecla_p50);
  $('lat-p95').textContent = f(s.tecla_p95);
  $('lat-eco').textContent = f(s.eco_p50);
}, 500);

async function iniciar(nueva = false) {
  info = await abrirSesion('m1-terminal', nueva);
  pintarArranque();
  pintarMision();
  eventos(info.sesion, (ev) => {
    if (ev.t === 'paso') {
      info.progreso.hechos[ev.id] = ev.ms;
      info.progreso.xp = ev.total;
      pintarMision();
      celebrar(document.getElementById(`paso-${ev.id}`)!, ev.xp);
    }
  });
  await cargarAutomaticos();
  await montarTerminal();
}

$('nueva').addEventListener('click', () => iniciar(true));
$('inmersivo').addEventListener('click', async () => {
  const r = await modoInmersivo($('caja'));
  $('estado').textContent = r === 'bloqueado' ? 'inmersivo: teclado bloqueado (mantén Esc para salir)' : r === 'solo-pantalla' ? 'pantalla completa (este navegador no permite Keyboard Lock)' : 'no se pudo';
  term?.focus();
});
avisarAntesDeCerrar(() => term?.estado === 'conectado' && !params.has('sin-aviso'));

iniciar().catch((e) => {
  $('estado').textContent = `error: ${e.message}`;
  $('estado').className = 'pildora mal';
});
