import './estilo.css';
import './iconos';
import rough from 'roughjs';
import { abrirSesion, eventos, post, type Info } from './api';
import { LabTerminal, avisarAntesDeCerrar } from './terminal';
import { celebrar, confeti, fanfarria, panelAjustes } from './recompensa';

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());
const motor = 'xterm';
const md = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

let info: Info;
const terms = new Map<string, { caja: HTMLElement; term?: LabTerminal }>();
let activo = '';
let ultimoEnter = 0;
let relojTimer = 0;
const checks: number[] = [];

function topologia() {
  const svg = $('topo') as unknown as SVGSVGElement;
  const rc = rough.svg(svg);
  const nodos: [string, number, string][] = [['h1', 90, '10.0.1.10'], ['r1', 340, 'router'], ['r2', 560, 'router'], ['h2', 810, '10.0.2.10']];
  svg.append(rc.line(130, 60, 300, 60, { stroke: '#9aa3b5', seed: 2 }), rc.line(380, 60, 520, 60, { stroke: '#9aa3b5', seed: 3 }), rc.line(600, 60, 770, 60, { stroke: '#9aa3b5', seed: 4 }));
  const t = (x: number, y: number, s: string, c = '#9aa3b5', sz = 12) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    Object.entries({ x, y, fill: c, 'font-size': sz, 'text-anchor': 'middle', 'font-family': 'Cascadia Mono, Consolas, monospace' }).forEach(([k, v]) => e.setAttribute(k, String(v)));
    e.textContent = s;
    return e;
  };
  svg.append(t(215, 50, '10.0.1.0/24'), t(450, 50, '10.0.12.0/30'), t(685, 50, '10.0.2.0/24'));
  nodos.forEach(([id, x, sub], i) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('nodo');
    g.id = `topo-${id}`;
    g.append(rc.rectangle(x - 40, 35, 80, 50, { stroke: id.startsWith('r') ? '#c084fc' : '#7cc4ff', fill: '#1b1f2b', fillStyle: 'solid', strokeWidth: 2, seed: 20 + i }));
    g.append(t(x, 58, id, '#e7e9ee', 16), t(x, 76, sub, '#9aa3b5', 10));
    g.addEventListener('click', () => mostrarTerminal(id));
    svg.append(g);
  });
}

async function mostrarTerminal(nodo: string) {
  activo = nodo;
  document.querySelectorAll('#pestanas button').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.n === nodo)));
  for (const [n, t] of terms) t.caja.classList.toggle('activa', n === nodo);
  const t = terms.get(nodo)!;
  if (!t.term) {
    t.term = await LabTerminal.crear(t.caja.querySelector('.term') as HTMLElement, motor, info.sesion, nodo);
    t.term.onEnter = () => (ultimoEnter = performance.now());
  }
  t.term.focus();
}

function pintarMision() {
  const hechos = info.progreso.hechos;
  const pasos = info.lab.mision;
  const n = pasos.filter((p) => hechos[p.id] !== undefined).length;
  $('barra').style.width = `${(100 * n) / pasos.length}%`;
  $('faltan').textContent = n === pasos.length ? '¡Misión completa! Ahora, el boss.' : `Te faltan ${pasos.length - n} pasos.`;
  $('xp').textContent = `${info.progreso.xp} XP`;
  const actual = pasos.find((p) => hechos[p.id] === undefined)?.id;
  $('pasos').innerHTML = pasos.map((p) => {
    const h = hechos[p.id];
    return `<div class="paso ${h !== undefined ? 'hecho' : ''} ${p.id === actual ? 'actual' : ''}" id="paso-${p.id}">
      <div class="t"><span>${h !== undefined ? '«ic:circle-check»' : p.id === actual ? '«ic:arrow-right»' : '«ic:square»'}</span>${p.titulo} <span style="color:var(--xp);font-size:13px;margin-left:auto">+${p.xp}</span></div>
      <div class="x">${md(p.texto)}</div>
      ${p.pista ? `<div class="pista">$ ${p.pista}</div>` : ''}
      ${h !== undefined ? `<div class="x" style="font-size:12px">validado (comprobación: ${h} ms)</div>` : p.pista ? `<button class="btn" style="margin-top:6px;font-size:12px;padding:3px 10px" data-pista="${p.id}">ver pista</button>` : ''}
    </div>`;
  }).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-pista]').forEach((b) => b.addEventListener('click', () => { $(`paso-${b.dataset.pista}`).classList.add('ver-pista'); b.remove(); }));
  if (actual) {
    const nodo = pasos.find((p) => p.id === actual)?.nodo;
    if (nodo && nodo !== activo && n > 0) mostrarTerminal(nodo);
  }
  const boss = info.lab.boss;
  if (boss) {
    $('boss').hidden = n < pasos.length;
    $('boss-titulo').textContent = boss.titulo;
    $('boss-texto').textContent = boss.texto;
    const b = info.progreso.boss;
    $('boss-inicio').hidden = !!b;
    $('boss-curso').hidden = !b || b.hecho;
    if (b?.pistas) $('boss-pistas').innerHTML = b.pistas.map((p) => `<div class="pista-boss">«ic:lightbulb» ${md(p.texto)} <span style="color:var(--suave)">(−${p.coste} XP)</span></div>`).join('');
    ($('boss-pista') as HTMLButtonElement).disabled = !!b && b.quedan_pistas === 0;
  }
}

function pintarCifras() {
  $('c-arranque').textContent = info.reutilizada ? 'recuperado' : `${info.ms_total} ms`;
  if (checks.length) $('c-check').textContent = `${Math.round(checks.reduce((a, b) => a + b, 0) / checks.length)} ms`;
}

function reloj(inicio: number) {
  clearInterval(relojTimer);
  relojTimer = window.setInterval(() => {
    const s = Math.floor((Date.now() - inicio) / 1000);
    $('reloj').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 250);
}

async function iniciar() {
  topologia();
  info = await abrirSesion('m3-routing');
  for (const n of info.lab.terminales) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.dataset.n = n;
    b.textContent = n;
    b.onclick = () => mostrarTerminal(n);
    $('pestanas').append(b);
    const caja = document.createElement('div');
    caja.className = 'terminal-caja';
    caja.innerHTML = '<div class="term"></div>';
    $('terminales').append(caja);
    terms.set(n, { caja });
  }
  pintarMision();
  pintarCifras();
  eventos(info.sesion, (ev) => {
    if (ev.t === 'paso') {
      info.progreso.hechos[ev.id] = ev.ms;
      info.progreso.xp = ev.total;
      checks.push(ev.ms);
      // Desde que el comando terminó (volvió el prompt) hasta el «ic:check».
      const fin = Math.max(ultimoEnter, terms.get(activo)?.term?.ultimaSalida ?? 0);
      if (fin) $('c-feedback').textContent = `${Math.round(performance.now() - fin)} ms`;
      pintarMision();
      pintarCifras();
      celebrar($(`paso-${ev.id}`), ev.xp);
    }
    if (ev.t === 'boss' && ev.hecho) {
      info.progreso.xp = ev.total;
      clearInterval(relojTimer);
      fanfarria();
      confeti();
      $('boss').classList.add('vencido');
      $('boss-curso').hidden = true;
      $('boss-fin').hidden = false;
      const m = Math.floor(ev.segundos / 60), s = Math.round(ev.segundos % 60);
      $('boss-fin').innerHTML = `<p style="font-size:20px;margin:0"><b>¡Boss vencido!</b> en ${m} min ${s} s · +${ev.xp} XP</p><p style="color:var(--suave)">${md(ev.solucion)}</p><p>«ic:award» Cinturón naranja: <b>routing dinámico</b> desbloqueado.</p>`;
      $('xp').textContent = `${info.progreso.xp} XP`;
    }
  });
  mostrarTerminal(info.lab.mision.find((p) => info.progreso.hechos[p.id] === undefined)?.nodo ?? info.lab.terminales[0]);
}

$('boss-empezar').addEventListener('click', async () => {
  ($('boss-empezar') as HTMLButtonElement).disabled = true;
  const fallo = new URLSearchParams(location.search).get('fallo') ?? '';
  info = { ...(await post<Info>(`/api/sesion/${info.sesion}/boss?fallo=${fallo}`)), reutilizada: info.reutilizada, ms_total: info.ms_total };
  pintarMision();
  reloj(Date.now());
  mostrarTerminal('h1');
});
$('boss-pista').addEventListener('click', async () => {
  try {
    const r = await post<{ pista: { texto: string; coste: number }; xp: number }>(`/api/sesion/${info.sesion}/pista`);
    info.progreso.xp = r.xp;
    const b = info.progreso.boss!;
    b.pistas = [...(b.pistas ?? []), r.pista];
    b.quedan_pistas--;
    pintarMision();
  } catch {}
});
avisarAntesDeCerrar(() => !new URLSearchParams(location.search).has('sin-aviso'));
iniciar().catch((e) => { $('faltan').textContent = `Error: ${e.message}`; });
