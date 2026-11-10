// Reproductor de lección. A la izquierda la lección paso a paso; a la derecha el lab de ese paso.
// Un paso no deja seguir mientras alguno de sus widgets espera algo (una tarea en la terminal, un juego…).
// En pantallas pequeñas las dos mitades no caben a la vez: hay tres pestañas abajo (lección, terminal
// y chuleta), la tarea pendiente va fijada encima de la terminal y una barra pone las teclas que el
// teclado del móvil no tiene.
import '../estilo.css';
import '../iconos';
import { ic } from '../iconos';
import { celebrar, modo, panelAjustes } from '../recompensa';
import { cuantasVistas, pintarChuleta } from './chuleta';
import { PERSONAJES, elegido } from './isla/temas';
import { LECCIONES, ORDEN } from './lecciones';
import type { Leccion } from './lecciones/tipos';
import { PanelLab } from './nucleo/panel-lab';
import { avisoAlSalir } from './nucleo/salir';
import { h, md, type Ctx } from './nucleo/tipos';
import { apuntarPaso, apuntarUltimo, leer, marcar, pasoDe, sumarXP } from './progreso';
import { modulo } from './temario';
import { WIDGETS } from './widgets';

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());

const id = new URLSearchParams(location.search).get('m') ?? '0.0';
const lec: Leccion | undefined = LECCIONES[id];
if (!lec) {
  document.querySelector('main')!.innerHTML = `<div class="panel" style="margin:40px auto;max-width:600px"><h2>Este módulo aún está en la forja</h2><p>Vuelve al <a href="/curso">mapa</a>.</p></div>`;
  throw new Error('módulo sin lección');
}
const nivel = modulo(id)?.nivel;
document.title = `${lec.id} ${lec.titulo} · relavops`;
$('titulo').textContent = `${lec.id} · ${lec.titulo}`;
if (nivel) $('cinturon').innerHTML = `<span style="color:${nivel.color}">●</span> Cinturón ${nivel.cinturon.toLowerCase()}`;
const pintarXP = () => ($('xp').textContent = `${leer().xp} XP`);
pintarXP();

const panel = new PanelLab($('panel-lab'));
const CLAVE = `relavops.leccion.${id}`;
const guardado = (() => { try { return JSON.parse(localStorage.getItem(CLAVE) ?? '{}'); } catch { return {}; } })();
// El paso más lejano: el de este navegador o el de la cuenta, el que vaya más allá.
let max: number = Math.min(Math.max(guardado.max ?? 0, pasoDe(id)), lec.pasos.length - 1);
let actual = max;
let turno = 0; // cada ir() tiene el suyo. Si llega otro mientras espera al lab, el viejo no pinta nada
// Si al cargar llega el progreso de la cuenta con un paso más lejano, se apunta sin mover al alumno.
addEventListener('relavops:progreso', () => {
  const p = Math.min(pasoDe(id), lec!.pasos.length - 1);
  if (p > max) { max = p; pintarProgreso(); }
});
let limpiezas: (() => void)[] = [];
let pendientes = 0;

// El lab de un paso es el suyo o el del último paso anterior que lo dijo.
const labDe = (i: number) => { for (let k = i; k >= 0; k--) if (lec.pasos[k].lab) return lec.pasos[k].lab; return undefined; };

// ---------- La chuleta y las tres vistas del móvil ----------
type Vista = 'leccion' | 'terminal' | 'chuleta';
const lc = $('lc');
const chuleta = $('chuleta');
const esMovil = () => matchMedia('(max-width: 900px)').matches;

function abrirChuleta(si: boolean) {
  chuleta.hidden = !si;
  $('chuleta-btn').setAttribute('aria-pressed', String(si));
  if (si) pintarChuleta($('chuleta-cuerpo'), id);
}
function vista(v: Vista) {
  lc.dataset.vista = v;
  $('tabs').querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  abrirChuleta(v === 'chuleta');
  if (v === 'terminal') {
    $('tabs').querySelector('[data-v="terminal"]')!.classList.remove('con-punto');
    panel.terminal(undefined, true);
  } else (document.activeElement as HTMLElement | null)?.blur?.();
}
$('chuleta-btn').onclick = () => abrirChuleta(chuleta.hidden);
$('chuleta-cerrar').onclick = () => abrirChuleta(false);
$('tabs').querySelectorAll<HTMLElement>('button').forEach((b) => (b.onclick = () => vista(b.dataset.v as Vista)));
addEventListener('relavops:chuleta', () => (esMovil() ? vista('chuleta') : abrirChuleta(true)));
addEventListener('relavops:vista', (ev) => vista((ev as CustomEvent).detail));
addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !chuleta.hidden && !esMovil() && chuleta.contains(document.activeElement)) abrirChuleta(false); });

// La tarea pendiente, fijada encima de la terminal en el móvil. Sale de lo que hay pintado en el paso.
function pintarTarea() {
  const t = $('tarea');
  const paso = $('paso');
  const tareas = [...paso.querySelectorAll<HTMLElement>('.w-haz')];
  const pend = tareas.find((x) => !x.classList.contains('hecho') && !x.classList.contains('sin-lab'));
  const seguir = paso.querySelector<HTMLButtonElement>('.lc-seguir');
  const mis = paso.querySelector<HTMLElement>('.w-mis:not(.hecho)');
  const boss = paso.querySelector<HTMLElement>('.w-boss:not(.vencido)');
  let html = '';
  let hecha = false;
  if (pend) html = `<div><small>Tu turno</small>${pend.querySelector('.w-haz-txt')!.innerHTML}</div>`;
  else if (mis) html = `<div><small>Práctica</small>${mis.querySelector('b')?.outerHTML ?? ''} ${mis.querySelector('.w-suave')?.innerHTML ?? ''}</div>`;
  else if (boss?.querySelector('.w-reloj:not([hidden])')) html = `<div><small>Boss</small>${boss.querySelector('.w-boss-t')?.textContent ?? ''}. Las pistas están en la lección.</div>`;
  else if (tareas.length || paso.querySelector('.w-mis, .w-boss.vencido')) {
    const libre = !!seguir && !seguir.disabled;
    hecha = true;
    html = `<div><small>Hecho</small>${libre ? 'Ya puedes seguir.' : 'Vuelve a la lección para acabar el paso.'}</div><button class="btn primario" data-libre="${libre ? 1 : 0}">${libre ? 'Seguir' : 'Ver la lección'}</button>`;
  }
  // Solo se toca si cambia, para no entrar en bucle con el observador ni mover la pantalla.
  if (t.dataset.html !== html) {
    t.dataset.html = html;
    t.innerHTML = html;
    const b = t.querySelector<HTMLElement>('button');
    if (b) b.onclick = () => { vista('leccion'); if (b.dataset.libre === '1') paso.querySelector<HTMLButtonElement>('.lc-seguir')?.click(); };
  }
  t.hidden = !html;
  t.classList.toggle('hecha', hecha);
  $('tabs').querySelector('[data-v="terminal"]')!.classList.toggle('con-punto', !!(pend || mis) && lc.dataset.vista !== 'terminal');
}
let tareaPedida = 0;
new MutationObserver(() => { cancelAnimationFrame(tareaPedida); tareaPedida = requestAnimationFrame(pintarTarea); })
  .observe($('paso'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled', 'hidden'] });

// La barra de teclas. Cada botón manda a la terminal lo que mandaría esa tecla. Ctrl se queda
// armado y cambia la letra siguiente (Ctrl y luego c es Ctrl+C).
const TECLAS: [string, string][] = [
  ['Tab', '\t'], ['Ctrl', 'ctrl'], ['Esc', '\x1b'], ['↑', '\x1b[A'], ['↓', '\x1b[B'], ['←', '\x1b[D'], ['→', '\x1b[C'],
  ['|', '|'], ['/', '/'], ['-', '-'], ['~', '~'], ['$', '$'], ['*', '*'], ['>', '>'], ['&', '&'], ['"', '"'], ["'", "'"], [':', ':'], ['%', '%'],
];
for (const [nombre, sec] of TECLAS) {
  const b = h('button', '', nombre) as HTMLButtonElement;
  b.type = 'button';
  if (sec === 'ctrl') { b.id = 'tecla-ctrl'; b.setAttribute('aria-pressed', 'false'); }
  // pointerdown y no click: así la terminal no pierde el foco y el teclado del móvil no se cierra.
  b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); if (sec === 'ctrl') panel.ctrl(); else panel.escribir(sec); });
  $('teclas').append(b);
}
panel.onCtrl = (si) => $('tecla-ctrl').setAttribute('aria-pressed', String(si));

// Con el teclado del móvil abierto queda poco alto: la página se ajusta a lo que se ve y se esconden
// la cabecera y las pestañas mientras dura.
const vv = window.visualViewport;
if (vv) {
  let alto = vv.height;
  const ajustar = () => {
    alto = Math.max(alto, vv.height);
    document.documentElement.style.setProperty('--alto', `${Math.round(vv.height)}px`);
    document.body.classList.toggle('con-teclado', esMovil() && vv.height < alto - 140);
    if (esMovil()) scrollTo(0, 0);
  };
  vv.addEventListener('resize', ajustar);
  addEventListener('orientationchange', () => { alto = 0; });
  ajustar();
}

// ---------- La lección ----------
function pintarProgreso() {
  ($('barra-prog') as HTMLElement).style.width = `${(100 * (actual + 1)) / lec!.pasos.length}%`;
  $('cuenta').textContent = `${actual + 1} / ${lec!.pasos.length}`;
  // En el modo islas, el personaje anda por la barra hasta el paso actual.
  if (modo() === 'isla') {
    let b = document.querySelector<HTMLElement>('.prog-bicho');
    if (!b) {
      b = h('span', 'prog-bicho', `<svg viewBox="-34 -72 68 76">${elegido(PERSONAJES, 'personaje').svg}</svg>`);
      $('barra-prog').parentElement!.append(b);
    }
    b.style.left = `${(100 * (actual + 1)) / lec!.pasos.length}%`;
  }
  // Los pasos hechos van como números (el título sale al pasar el ratón); el actual, con su título.
  $('hechos').innerHTML = lec!.pasos.slice(0, max + 1).map((p, i) => `<button class="lc-hecho ${i === actual ? 'actual' : ''} ${i < max ? 'hecho' : ''}" data-i="${i}" title="${i + 1}. ${p.titulo.replace(/"/g, '')}">${i < max ? ic('check') : ic('arrow-right')} <span>${i === actual ? `${i + 1}. ${md(p.titulo)}` : i + 1}</span></button>`).join('');
  $('hechos').querySelectorAll<HTMLElement>('.lc-hecho').forEach((b) => (b.onclick = () => ir(Number(b.dataset.i))));
  const act = $('hechos').querySelector<HTMLElement>('.actual');
  if (act) $('hechos').scrollLeft = act.offsetLeft - $('hechos').clientWidth / 2;
}

function botonSeguir(btn: HTMLButtonElement, aviso: HTMLElement) {
  const ultimo = actual === lec!.pasos.length - 1;
  const bloqueado = pendientes > 0 && actual >= max;
  btn.disabled = bloqueado;
  btn.innerHTML = ultimo ? `${ic('flag')} Terminar la lección` : `Seguir ${ic('arrow-right')}`;
  aviso.innerHTML = bloqueado ? `${ic('lock')} Haz lo de arriba para seguir.` : '';
}

async function ir(i: number) {
  const yo = ++turno;
  limpiezas.forEach((f) => { try { f(); } catch {} });
  limpiezas = [];
  pendientes = 0;
  actual = i;
  const paso = lec!.pasos[i];
  const cont = $('paso');
  cont.innerHTML = '';
  const lab = labDe(i);
  if (lab) {
    const antes = panel.con()?.lab;
    if (antes && antes !== lab) cont.append(h('div', 'lc-cambio', `${ic('server')} Cambias de lab. Tienes una máquina nueva en la terminal.`));
    await panel.mostrar(lab);
    // Dos clics seguidos (o Seguir mientras abre el lab) lanzan dos ir(). Solo pinta el último.
    if (yo !== turno) return;
  }
  const tarjeta = h('article', 'lc-tarjeta tiembla', `<header><span class="lc-n">Paso ${i + 1} de ${lec!.pasos.length}</span><h2>${md(paso.titulo)}</h2></header>`);
  const cuerpo = h('div', 'lc-cuerpo');
  tarjeta.append(cuerpo);
  cont.append(tarjeta);
  const pie = h('footer', 'lc-pie');
  const btn = h('button', 'btn primario lc-seguir') as HTMLButtonElement;
  const aviso = h('span', 'w-suave');
  pie.append(btn, aviso);
  const revisando = i < max;
  const ctx: Ctx & { bossVencido?: () => void } = {
    lab: () => panel.con(),
    espera: () => {
      if (revisando) return () => {};
      pendientes++;
      botonSeguir(btn, aviso);
      let hecho = false;
      return () => { if (hecho) return; hecho = true; pendientes--; botonSeguir(btn, aviso); };
    },
    xp: (n, el) => { if (revisando) return; sumarXP(n); if (el) celebrar(el, n); pintarXP(); },
    alSalir: (f) => limpiezas.push(f),
    alTeclear: (f) => limpiezas.push(panel.alTeclear(f)),
    senalar: (z, si) => panel.senalar(z, si),
    terminal: (n) => { panel.terminal(n); },
    bossVencido: () => marcar(id, 'boss', 0),
    leccion: id,
    paso: i,
  };
  for (const w of paso.w) {
    const caja = h('div', `lc-w lc-${w.t}`);
    cuerpo.append(caja);
    const f = WIDGETS[w.t];
    if (!f) { caja.textContent = `(widget desconocido: ${w.t})`; continue; }
    const montar = () => { try { caja.innerHTML = ''; f(caja, w, ctx); } catch (e: any) { caja.textContent = `(error en ${w.t}: ${e.message})`; console.error(e); } };
    // { tras: 'paso' } esconde el widget hasta que el alumno haga ese paso en la terminal.
    // Así lo que hay que descubrir no aparece antes de escribir el comando.
    const lab = panel.con();
    if (w.tras && lab && !lab.hecho(w.tras)) {
      caja.innerHTML = `<div class="lc-tapado">${ic('lock')} Aparece cuando lo hagas tú en la terminal.</div>`;
      limpiezas.push(lab.paso(w.tras, montar));
    } else montar();
    if (w.t === 'mision') limpiezas.push(() => { if (panel.con()?.mision.every((m) => panel.con()!.hecho(m.id))) marcar(id, 'lab', 0); });
  }
  tarjeta.append(pie);
  botonSeguir(btn, aviso);
  btn.onclick = () => {
    if (actual === lec!.pasos.length - 1) return terminar();
    if (actual === max) max++;
    guardar();
    ir(actual + 1);
  };
  guardar();
  pintarProgreso();
  $('chuleta-n').textContent = String(cuantasVistas());
  if (!chuleta.hidden) pintarChuleta($('chuleta-cuerpo'), id);
  $('izq').scrollTo({ top: 0, behavior: 'smooth' });
}

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify({ max })); } catch {}
  apuntarPaso(id, max);
  apuntarUltimo(id, String(actual), `${lec!.id} ${lec!.titulo} · paso ${actual + 1}`);
}

function terminar() {
  terminada = true;
  marcar(id, 'teoria', 20);
  pintarXP();
  const sig = ORDEN[ORDEN.indexOf(id) + 1];
  limpiezas.forEach((f) => f());
  limpiezas = [];
  $('paso').innerHTML = `<article class="lc-tarjeta lc-fin"><h2>${ic('award')} Lección terminada</h2><p>${md(lec!.resumen)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${sig ? `<a class="btn primario" href="/leccion?m=${sig}">Siguiente lección ${ic('arrow-right')}</a>` : ''}<a class="btn" href="/curso">${ic('map')} Mapa</a><a class="btn" href="/chuleta">${ic('clipboard')} Mi chuleta</a><a class="btn" href="/arcade">${ic('gamepad-2')} Arcade</a></div></article>`;
}

$('foco').onclick = () => { document.body.classList.toggle('foco'); $('foco').setAttribute('aria-pressed', String(document.body.classList.contains('foco'))); };
panel.onNuevo = () => ir(actual);
let terminada = false;
avisoAlSalir(() => !!panel.con() && !terminada);
ir(actual);
