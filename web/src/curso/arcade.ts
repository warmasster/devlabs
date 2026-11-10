// Arcade: calentamientos de 60–90 s que se juegan en el navegador, sin lab.
import '../estilo.css';
import '../iconos';
import { celebrar, confeti, ding, fanfarria, panelAjustes } from '../recompensa';
import { JUEGOS } from './juegos-lista';
import { leer, record, sumarXP } from './progreso';

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());
const main = $('main');
const id = new URLSearchParams(location.search).get('j');
const R = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

function error() {
  const ctx = new AudioContext();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = 140; g.gain.value = 0.05;
  o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.12);
}

function menu() {
  const e = leer();
  main.innerHTML = `<h2 style="margin:0 0 4px">Calienta antes del lab</h2><p style="color:var(--suave);margin:0 0 16px">Partidas cortas, récord personal y XP. Ideales para cuando cuesta arrancar.</p>
    <div class="menu">${JUEGOS.map((j) => `<a class="panel" href="?j=${j.id}"><span class="ic">«ic:${j.icono}»</span><b style="font-size:18px">${j.titulo}</b><p>${j.resumen}</p><span class="pildora" style="align-self:flex-start">${j.modulo} · récord ${e.records[j.id] ?? 0}</span></a>`).join('')}</div>`;
}

// ---------- Juegos de ronda con tiempo (octal, subred, capas) ----------
interface Ronda { q: string; s: string; ok: (r: string) => boolean; sol: string }
interface Def { segundos: number; nueva: () => Ronda; botones?: string[][] }

function contrarreloj(jid: string, def: Def) {
  let puntos = 0, combo = 0, aciertos = 0, fallos = 0;
  let fin = performance.now() + def.segundos * 1000;
  let ronda = def.nueva();
  main.innerHTML = `<div class="hud"><span class="big" id="pts">0</span><span class="combo" id="combo"></span>
    <div class="tiempo"><div class="barra"><div id="t" style="width:100%"></div></div></div><span class="pildora" id="seg"></span></div>
    <div class="panel reto"><div class="s" id="s"></div><div class="q" id="q"></div>
      ${def.botones ? `<div class="capas">${def.botones.map(([k, t]) => `<button class="btn" data-k="${k}"><b>${k}</b>${t}</button>`).join('')}</div>` : '<input class="entrada" id="in" autocomplete="off" spellcheck="false" autofocus />'}
      <div class="ultimo" id="ult">Enter para responder · Esc para saltar</div></div>`;
  const pintar = () => { $('q').textContent = ronda.q; $('s').innerHTML = ronda.s; $('pts').textContent = String(puntos); $('combo').textContent = combo >= 3 ? `x${Math.min(4, 1 + Math.floor(combo / 3))} COMBO` : ''; };
  const responder = (r: string) => {
    if (!r.trim()) return;
    if (ronda.ok(r.trim())) {
      combo++; aciertos++;
      const mult = Math.min(4, 1 + Math.floor(combo / 3));
      puntos += 10 * mult;
      fin += 1500; // cada acierto da tiempo
      celebrar($('q'), 10 * mult);
      $('ult').innerHTML = `<span style="color:var(--ok)">«ic:check» ${esc(ronda.sol)}</span> · +1,5 s`;
    } else {
      combo = 0; fallos++;
      error();
      const inp = document.getElementById('in');
      inp?.classList.remove('sacude'); void inp?.offsetWidth; inp?.classList.add('sacude');
      $('ult').innerHTML = `<span style="color:var(--mal)">«ic:x» Era ${esc(ronda.sol)}</span>`;
    }
    ronda = def.nueva();
    const inp = document.getElementById('in') as HTMLInputElement | null;
    if (inp) inp.value = '';
    pintar();
  };
  const inp = document.getElementById('in') as HTMLInputElement | null;
  inp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') responder(inp.value);
    if (e.key === 'Escape') { combo = 0; $('ult').textContent = `Saltada: ${ronda.sol}`; ronda = def.nueva(); inp.value = ''; pintar(); }
  });
  document.querySelectorAll<HTMLButtonElement>('.capas button').forEach((b) => (b.onclick = () => responder(b.dataset.k!)));
  const tecla = (e: KeyboardEvent) => { if (def.botones && /^[1-7]$/.test(e.key)) responder(e.key); };
  addEventListener('keydown', tecla);
  pintar();
  inp?.focus();
  const total = def.segundos * 1000;
  const bucle = () => {
    const queda = fin - performance.now();
    if (queda <= 0) { removeEventListener('keydown', tecla); terminar(jid, puntos, `${aciertos} aciertos · ${fallos} fallos`); return; }
    ($('t') as HTMLElement).style.width = `${Math.min(100, (100 * queda) / total)}%`;
    $('seg').textContent = `${Math.ceil(queda / 1000)} s`;
    requestAnimationFrame(bucle);
  };
  bucle();
}

function terminar(jid: string, puntos: number, detalle: string) {
  const nuevo = record(jid, puntos);
  const xp = Math.round(puntos / 10);
  sumarXP(xp);
  if (nuevo && puntos > 0) { fanfarria(); confeti(); } else ding();
  main.innerHTML = `<div class="panel fin"><div style="color:var(--suave)">${nuevo && puntos > 0 ? '«ic:trophy» ¡NUEVO RÉCORD!' : 'Fin de la partida'}</div><div class="pts">${puntos}</div>
    <p>${detalle} · +${xp} XP · récord ${leer().records[jid] ?? 0}</p>
    <button class="btn primario" id="otra"><i data-ic="rotate-ccw"></i> Otra (R)</button> <a class="btn" href="/arcade">Más juegos</a> <a class="btn" href="/curso">Mapa</a></div>`;
  const otra = () => { removeEventListener('keydown', k); jugar(jid); };
  const k = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'r') otra(); };
  setTimeout(() => addEventListener('keydown', k), 400);
  $('otra').onclick = otra;
}

// Octal: letras → número y número → letras.
const rwx = (d: number) => `${d & 4 ? 'r' : '-'}${d & 2 ? 'w' : '-'}${d & 1 ? 'x' : '-'}`;
const OCTAL: Def = {
  segundos: 60,
  nueva() {
    const comunes = [[7, 5, 5], [6, 4, 4], [7, 0, 0], [6, 0, 0], [7, 5, 0], [6, 4, 0], [7, 7, 0], [7, 7, 5], [4, 4, 4], [5, 5, 5], [6, 6, 0], [7, 1, 1]];
    const d = Math.random() < 0.6 ? pick(comunes) : [R(0, 7), R(0, 7), R(0, 7)];
    const num = d.join(''), letras = d.map(rwx).join('');
    if (Math.random() < 0.6) return { q: `-${letras}`, s: 'Escribe el octal', ok: (r) => r === num || r === `0${num}`, sol: `${letras} = ${num}` };
    return { q: num, s: 'Escribe los 9 permisos (rwx y guiones)', ok: (r) => r.replace(/^-/, '') === letras, sol: `${num} = ${letras}` };
  },
};

// Subnetting.
const ip2n = (s: string) => s.split('.').reduce((a, b) => a * 256 + Number(b), 0);
const n2ip = (n: number) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
const SUBRED: Def = {
  segundos: 90,
  nueva() {
    const pref = pick([8, 16, 20, 22, 23, 24, 24, 25, 26, 26, 27, 27, 28, 29, 30]);
    const base = pick([[10, R(0, 255)], [172, R(16, 31)], [192, 168]]);
    const ip = `${base[0]}.${base[1]}.${R(0, 255)}.${R(1, 254)}`;
    const tam = 2 ** (32 - pref);
    const red = Math.floor(ip2n(ip) / tam) * tam;
    const mask = n2ip(2 ** 32 - tam);
    const tipo = pick(['red', 'broadcast', 'hosts', 'mascara']);
    const q = `${ip}/${pref}`;
    switch (tipo) {
      case 'red': return { q, s: '¿Dirección de <b>red</b>?', ok: (r) => r === n2ip(red), sol: `red ${n2ip(red)}` };
      case 'broadcast': return { q, s: '¿Dirección de <b>broadcast</b>?', ok: (r) => r === n2ip(red + tam - 1), sol: `broadcast ${n2ip(red + tam - 1)}` };
      case 'hosts': return { q, s: '¿Cuántos <b>hosts útiles</b>?', ok: (r) => Number(r.replace(/\./g, '')) === tam - 2, sol: `${tam - 2} hosts (2^${32 - pref} − 2)` };
      default: return { q: `/${pref}`, s: '¿<b>Máscara</b> en decimal?', ok: (r) => r === mask, sol: `/${pref} = ${mask}` };
    }
  },
};

// Capas OSI.
const ITEMS: [string, number][] = [
  ['Cable de cobre y voltajes', 1], ['Fibra óptica', 1], ['Hub', 1], ['Señal wifi en el aire', 1],
  ['Dirección MAC', 2], ['Trama Ethernet', 2], ['Switch', 2], ['Etiqueta VLAN 802.1Q', 2], ['ARP', 2],
  ['Dirección IP', 3], ['Router', 3], ['TTL', 3], ['ICMP (ping)', 3], ['Tabla de rutas', 3], ['Paquete', 3],
  ['Puerto 443', 4], ['Segmento TCP', 4], ['Handshake SYN, SYN-ACK, ACK', 4], ['UDP', 4], ['Ventana de TCP', 4],
  ['Sesión que se reanuda', 5], ['Checkpoints de una transferencia', 5],
  ['Cifrado TLS', 6], ['Codificación UTF-8', 6], ['Compresión gzip', 6],
  ['Petición HTTP GET', 7], ['Consulta DNS', 7], ['SSH', 7], ['Cabecera Host:', 7], ['SMTP', 7],
];
const CAPAS: Def = {
  segundos: 60,
  botones: [['1', 'Física'], ['2', 'Enlace'], ['3', 'Red'], ['4', 'Transporte'], ['5', 'Sesión'], ['6', 'Presentación'], ['7', 'Aplicación']],
  nueva() {
    const [t, c] = pick(ITEMS);
    return { q: t, s: '¿En qué capa OSI vive?', ok: (r) => Number(r) === c, sol: `${t} → capa ${c}` };
  },
};

// ---------- Regex Rush ----------
const NIVELES_RE: { t: string; si: string[]; no: string[] }[] = [
  { t: 'Calentamiento: lo que contiene "error"', si: ['error de disco', 'hay un error', 'error'], no: ['todo ok', 'aviso', 'err0r'] },
  { t: 'Solo las que EMPIEZAN por ERROR', si: ['ERROR disco', 'ERROR: red', 'ERROR'], no: ['WARN ERROR', 'info', ' ERROR con espacio'] },
  { t: 'Exactamente 3 dígitos, nada más', si: ['404', '200', '503'], no: ['40', '2000', 'a404', '404b'] },
  { t: 'Ficheros .log (y solo .log)', si: ['app.log', 'nginx.log', 'a.b.log'], no: ['app.logs', 'log', 'app.log.gz', 'applog'] },
  { t: 'gris o grey', si: ['gris', 'grey', 'color grey'], no: ['gray', 'gros', 'grs'] },
  { t: 'Códigos de estado 4xx', si: ['404', '401', '418', '499'], no: ['500', '200', '40', '4000', '304'] },
  { t: 'Fechas AAAA-MM-DD', si: ['2026-11-03', '1999-01-31', '2025-12-24'], no: ['03-11-2026', '2026/11/03', '2026-1-3', '20261103'] },
  { t: 'Métodos HTTP GET o POST al principio', si: ['GET /', 'POST /login', 'GET /api/stock'], no: ['PUT /x', 'get /', 'XGET /', 'DELETE /'] },
  { t: 'IPv4 de la 10.x.x.x', si: ['10.0.0.1', '10.20.30.40', '10.255.1.9'], no: ['110.0.0.1', '192.168.1.1', '10.0.0', '10.0.0.1.5'] },
  { t: 'BOSS · emails de @empresa.es', si: ['ana@empresa.es', 'luis.perez@empresa.es', 'x_9@empresa.es'], no: ['ana@empresa.com', 'empresa.es', '@empresa.es', 'ana@sub.empresa.es', 'ana@empresaxes'] },
];
function regexRush() {
  let nivel = 0, puntos = 0;
  let t0 = performance.now();
  const pintar = () => {
    const n = NIVELES_RE[nivel];
    main.innerHTML = `<div class="hud"><span class="big" id="pts">${puntos}</span><span class="pildora">nivel ${nivel + 1}/${NIVELES_RE.length}</span><span class="espacio" style="flex:1"></span><span class="pildora" id="crono">0 s</span></div>
      <div class="panel reto"><div class="s">${nivel === NIVELES_RE.length - 1 ? '«ic:skull» ' : ''}${n.t}</div>
      <div style="margin:14px 0"><span style="font:700 26px var(--mono);color:var(--suave)">/</span><input class="entrada" id="in" style="max-width:460px" placeholder="tu regex" autocomplete="off" spellcheck="false" /><span style="font:700 26px var(--mono);color:var(--suave)">/</span></div>
      <div class="cadenas"><div><h3>«ic:circle-check» Debe encajar</h3>${n.si.map((x, k) => `<div class="cad" id="si-${k}">${esc(x)}</div>`).join('')}</div>
      <div><h3>«ic:ban» No debe encajar</h3>${n.no.map((x, k) => `<div class="cad" id="no-${k}">${esc(x)}</div>`).join('')}</div></div>
      <div class="ultimo" id="ult">Se comprueba mientras escribes. Más corta y más rápida = más puntos. Esc para saltar.</div></div>`;
    t0 = performance.now();
    const inp = $('in') as HTMLInputElement;
    inp.focus();
    inp.oninput = () => probar(inp.value);
    inp.onkeydown = (e) => { if (e.key === 'Escape') { nivel++; nivel < NIVELES_RE.length ? pintar() : terminar('regex', puntos, 'Regex Rush'); } };
  };
  const crono = setInterval(() => { const c = document.getElementById('crono'); if (c) c.textContent = `${Math.floor((performance.now() - t0) / 1000)} s`; else clearInterval(crono); }, 250);
  const probar = (txt: string) => {
    const n = NIVELES_RE[nivel];
    let re: RegExp | null = null;
    try { re = txt ? new RegExp(txt) : null; $('ult').textContent = ' '; } catch { $('ult').innerHTML = '<span style="color:var(--aviso)">Regex incompleta…</span>'; }
    let todo = !!re;
    n.si.forEach((x, k) => { const b = !!re?.test(x); $(`si-${k}`).className = `cad ${re ? (b ? 'bien' : 'mal') : ''}`; todo &&= b; });
    n.no.forEach((x, k) => { const b = !re?.test(x); $(`no-${k}`).className = `cad ${re ? (b ? 'bien' : 'mal') : ''}`; todo &&= b; });
    if (todo) {
      const s = (performance.now() - t0) / 1000;
      const ganados = Math.max(10, Math.round(100 - s * 2 - txt.length * 2)) * (nivel === NIVELES_RE.length - 1 ? 2 : 1);
      puntos += ganados;
      celebrar($('in'), ganados);
      nivel++;
      if (nivel >= NIVELES_RE.length) { clearInterval(crono); setTimeout(() => terminar('regex', puntos, '10 niveles superados'), 500); }
      else setTimeout(pintar, 600);
    }
  };
  pintar();
}

function jugar(j: string) {
  const def = JUEGOS.find((x) => x.id === j);
  if (!def) return menu();
  document.title = `${def.titulo} · Arcade`;
  $('titulo').innerHTML = `«ic:${def.icono}» ${def.titulo} <span class="pildora">${def.modulo}</span>`;
  if (j === 'regex') return regexRush();
  contrarreloj(j, { octal: OCTAL, subred: SUBRED, capas: CAPAS }[j as 'octal' | 'subred' | 'capas']);
}

jugar(id ?? '');
