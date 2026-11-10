// Motor común de los juegos (exámenes finales). Cada juego define su mapa y su "director":
// iniciar() prepara los contenedores y tick() mira el estado REAL del lab cada segundo y actúa.
// Prueba de concepto: el director corre en el navegador; en producción vivirá en labd.
import rough from 'roughjs';
import { abrirSesion, type Info } from '../api';
import { LabTerminal } from '../terminal';
import { celebrar, confeti, ding, fanfarria } from '../recompensa';
import { icSvg, nombreIcono, sinIconos, TOKEN } from '../iconos';

export type Dificultad = 'facil' | 'normal' | 'pesadilla';
export interface Res { out: string; code: number; ms?: number }

export interface Api {
  dificultad: Dificultad;
  t: number; // segundos de partida
  ex(nodo: string, sh: string): Promise<Res>;
  exs(ordenes: [string, string][]): Promise<Res[]>;
  log(html: string, tipo?: 'info' | 'bien' | 'mal' | 'boss'): void;
  vida: number;
  danio(n: number): void;
  curar(n: number): void;
  puntos(n: number): void;
  chip(id: string, texto: string, tipo: 'buff' | 'debuff' | 'comando', segundos?: number): void;
  quitar(id: string): void;
  claseNodo(nodo: string, clase: string, si: boolean): void;
  etiquetaNodo(nodo: string, texto: string): void;
  icono(id: string, emoji: string, nodo: string | null): void;
  enlace(a: string, b: string, clase: string, si: boolean): void;
  medidor(id: string, etiqueta: string, valor: number, color: string, texto?: string): void;
  terminal(nodo: string): void;
  fin(gana: boolean, html: string): void;
}

export interface Juego {
  id: string;
  lab: string;
  titulo: string;
  nivel: string;
  resumen: string;
  reglas: string;
  mapa: { nodos: Record<string, { x: number; y: number; sub?: string }>; enlaces: [string, string][]; alto?: number };
  terminales: string[];
  tickMs?: number;
  iniciar(api: Api): Promise<void>;
  tick(api: Api): Promise<void>;
}

const $ = (id: string) => document.getElementById(id)!;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, a: Record<string, string | number> = {}, txt?: string) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
  if (txt !== undefined) e.textContent = txt;
  return e;
};

export async function arrancar(j: Juego) {
  document.title = `${j.titulo} · examen final`;
  $('titulo').textContent = j.titulo;
  $('nivel').textContent = j.nivel;
  $('intro-titulo').textContent = j.titulo;
  $('intro-nivel').textContent = j.nivel;
  $('intro-reglas').innerHTML = j.reglas;
  pintarMapa(j);
  let dificultad: Dificultad = 'normal';
  document.querySelectorAll<HTMLButtonElement>('[data-dif]').forEach((b) => b.addEventListener('click', () => {
    dificultad = b.dataset.dif as Dificultad;
    document.querySelectorAll('[data-dif]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('empezar').addEventListener('click', () => partida(j, dificultad));
  $('otra').addEventListener('click', () => location.reload());
}

function pintarMapa(j: Juego) {
  const svg = $('mapa') as unknown as SVGSVGElement;
  const alto = j.mapa.alto ?? 360;
  svg.setAttribute('viewBox', `0 0 900 ${alto}`);
  svg.innerHTML = '';
  const rc = rough.svg(svg);
  const css = getComputedStyle(document.documentElement);
  const c = (v: string) => css.getPropertyValue(v).trim();
  const capaEnl = svgEl('g');
  svg.append(capaEnl);
  j.mapa.enlaces.forEach(([a, b], i) => {
    const A = j.mapa.nodos[a], B = j.mapa.nodos[b];
    const g = svgEl('g', { class: 'enl', 'data-e': `${a}|${b}` });
    g.append(rc.line(A.x, A.y, B.x, B.y, { stroke: c('--suave'), strokeWidth: 2, roughness: 1.1, seed: 40 + i }));
    capaEnl.append(g);
  });
  Object.entries(j.mapa.nodos).forEach(([id, n], i) => {
    const g = svgEl('g', { class: 'nodo', 'data-n': id, transform: `translate(${n.x},${n.y})` });
    g.append(rc.rectangle(-52, -26, 104, 52, { stroke: c('--acento'), strokeWidth: 2, fill: c('--panel-2'), fillStyle: 'solid', roughness: 1.3, seed: 10 + i }));
    g.append(svgEl('text', { y: -3, 'text-anchor': 'middle', fill: c('--texto'), 'font-size': 15, 'font-weight': 700, 'font-family': 'var(--mono)' }, id));
    g.append(svgEl('text', { y: 15, 'text-anchor': 'middle', fill: c('--suave'), 'font-size': 11, class: 'sub', 'font-family': 'var(--mono)' }, sinIconos(n.sub ?? '')));
    const icSub = nombreIcono(n.sub ?? '');
    if (icSub) { const e = svgEl('g'); e.innerHTML = icSvg(icSub, 0, 12, 14, c('--ok')); g.append(e); }
    g.append(svgEl('g', { class: 'etiqueta', transform: 'translate(0,-38)' }));
    g.addEventListener('click', () => (window as any).__verTerminal?.(id));
    svg.append(g);
  });
  svg.append(svgEl('g', { id: 'iconos' }));
}

async function partida(j: Juego, dificultad: Dificultad) {
  $('intro').hidden = true;
  $('cargando').hidden = false;
  $('cargando-txt').textContent = 'Levantando los contenedores reales del examen…';
  let info: Info;
  try {
    info = await abrirSesion(j.lab, true);
  } catch (e: any) {
    $('cargando-txt').textContent = `No se pudo crear el lab: ${e.message}`;
    return;
  }
  const t0lab = info.ms_total;
  const terms = new Map<string, { caja: HTMLElement; term?: LabTerminal }>();
  const verTerminal = async (n: string) => {
    if (!terms.has(n)) return;
    document.querySelectorAll('#pestanas button').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.n === n)));
    for (const [k, t] of terms) t.caja.classList.toggle('activa', k === n);
    const t = terms.get(n)!;
    t.term ??= await LabTerminal.crear(t.caja.querySelector('.term') as HTMLElement, 'xterm', info.sesion, n);
    t.term.focus();
  };
  (window as any).__verTerminal = verTerminal;
  for (const n of j.terminales) {
    const b = document.createElement('button');
    b.className = 'btn peque';
    b.dataset.n = n;
    b.textContent = n;
    b.onclick = () => verTerminal(n);
    $('pestanas').append(b);
    const caja = document.createElement('div');
    caja.className = 'terminal-caja';
    caja.innerHTML = '<div class="term"></div>';
    $('terminales').append(caja);
    terms.set(n, { caja });
  }

  let vida = 100, puntos = 0, terminado = false, inicio = 0;
  const chips = new Map<string, number>();
  const api: Api = {
    dificultad,
    t: 0,
    async ex(nodo, sh) { return (await api.exs([[nodo, sh]]))[0]; },
    async exs(ordenes) {
      const r = await fetch(`/api/sesion/${info.sesion}/exec`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordenes: ordenes.map(([nodo, sh]) => ({ nodo, sh })) }) });
      if (!r.ok) throw new Error(`exec ${r.status}`);
      return r.json();
    },
    log(html, tipo = 'info') {
      const li = document.createElement('li');
      li.className = tipo;
      li.innerHTML = `<span class="t">${String(Math.floor(api.t / 60)).padStart(2, '0')}:${String(Math.floor(api.t % 60)).padStart(2, '0')}</span> ${html}`;
      $('log').prepend(li);
      if (tipo === 'boss') { li.animate([{ background: 'color-mix(in srgb, var(--mal) 35%, transparent)' }, { background: 'transparent' }], { duration: 1200 }); }
      if (tipo === 'bien') ding();
    },
    get vida() { return vida; },
    set vida(v) { vida = v; },
    danio(n) { vida = Math.max(0, vida - n); pintarHud(); $('hud').animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 200 }); },
    curar(n) { vida = Math.min(100, vida + n); pintarHud(); },
    puntos(n) { puntos += n; pintarHud(); if (n > 0) celebrar($('puntos'), n); },
    chip(id, texto, tipo, segundos) {
      let el = document.getElementById(`chip-${id}`);
      if (!el) { el = document.createElement('span'); el.id = `chip-${id}`; $('chips').append(el); }
      el.className = `chip ${tipo}`;
      el.textContent = texto;
      if (segundos) chips.set(id, api.t + segundos); else chips.delete(id);
    },
    quitar(id) { document.getElementById(`chip-${id}`)?.remove(); chips.delete(id); },
    claseNodo(nodo, clase, si) { document.querySelector(`[data-n="${nodo}"]`)?.classList.toggle(clase, si); },
    // Etiqueta sobre el nodo: iconos Lucide (de los «ic:…») + texto, centrados.
    etiquetaNodo(nodo, texto) {
      const g = document.querySelector(`[data-n="${nodo}"] .etiqueta`);
      if (!g) return;
      const iconos = [...texto.matchAll(TOKEN)].map((m) => m[1]);
      const resto = sinIconos(texto);
      const ancho = iconos.length * 17 + resto.length * 7.8 + (iconos.length && resto ? 4 : 0);
      let x = -ancho / 2;
      let html = '';
      for (const n of iconos) { html += icSvg(n, x + 8, 0, 15, 'var(--aviso)'); x += 17; }
      if (resto) html += `<text x="${x + (iconos.length ? 4 : 0)}" y="5" fill="var(--aviso)" font-size="13" font-family="var(--mono)">${resto.replace(/[<&]/g, '')}</text>`;
      g.innerHTML = html;
    },
    // Fichas del mapa (jugador, boss, corona…): un icono Lucide que se desliza de nodo en nodo.
    icono(id, token, nodo) {
      let e = document.getElementById(`ico-${id}`) as unknown as SVGGElement | null;
      if (!e) { e = svgEl('g', { id: `ico-${id}`, class: 'ico' }) as SVGGElement; $('iconos').append(e); }
      const nombre = nombreIcono(token) ?? token;
      const color = id === 'boss' ? 'var(--mal)' : id === 'corona' ? 'var(--aviso)' : 'var(--ok)';
      if (e.dataset.n !== nombre) {
        e.dataset.n = nombre;
        e.innerHTML = `<circle r="19" fill="var(--panel)" stroke="${color}" stroke-width="2"/>${icSvg(nombre, 0, 0, 22, color)}`;
      }
      if (!nodo) { e.style.opacity = '0'; return; }
      const n = j.mapa.nodos[nodo];
      const desp = id === 'boss' ? 50 : id === 'corona' ? 0 : -50;
      e.style.opacity = '1';
      e.style.transform = `translate(${n.x + desp}px, ${n.y + (id === 'corona' ? -50 : 0)}px)`;
    },
    enlace(a, b, clase, si) {
      (document.querySelector(`[data-e="${a}|${b}"]`) ?? document.querySelector(`[data-e="${b}|${a}"]`))?.classList.toggle(clase, si);
    },
    medidor(id, etiqueta, valor, color, texto) {
      let el = document.getElementById(`med-${id}`);
      if (!el) { el = document.createElement('div'); el.id = `med-${id}`; el.className = 'linea'; $('medidores').append(el); }
      el.innerHTML = `<span>${etiqueta}</span><div class="barra-hud"><div style="width:${Math.max(0, Math.min(100, valor))}%;background:${color}"></div></div><b>${texto ?? Math.round(valor)}</b>`;
    },
    terminal(n) { verTerminal(n); },
    fin(gana, html) {
      if (terminado) return;
      terminado = true;
      $('fin').hidden = false;
      $('fin-titulo').textContent = gana ? '«ic:trophy» ¡Examen superado!' : '«ic:skull» Has caído';
      $('fin-texto').innerHTML = `${html}<p>Puntos: <b>${puntos}</b> · Vida: <b>${vida}</b> · Tiempo: <b>${Math.floor(api.t / 60)} min ${Math.floor(api.t % 60)} s</b></p>`;
      if (gana) { fanfarria(); confeti(); }
    },
  };
  const pintarHud = () => {
    $('vida-barra').style.width = `${vida}%`;
    $('vida-barra').style.background = vida > 50 ? 'var(--ok)' : vida > 25 ? 'var(--aviso)' : 'var(--mal)';
    $('vida').textContent = String(vida);
    $('puntos').textContent = `${puntos} pts`;
  };
  pintarHud();
  try {
    $('cargando-txt').textContent = `Lab listo en ${t0lab} ms. Preparando el examen…`;
    await j.iniciar(api);
  } catch (e: any) {
    $('cargando-txt').textContent = `Falló la preparación: ${e.message}`;
    return;
  }
  await verTerminal(j.terminales[0]);
  for (const n of ['3', '2', '1']) { $('cargando-txt').textContent = n; await new Promise((r) => setTimeout(r, 600)); }
  $('cargando').hidden = true;
  inicio = performance.now();
  api.log(`Empieza «${j.titulo}» en dificultad <b>${dificultad}</b>.`);
  const reloj = setInterval(() => {
    api.t = (performance.now() - inicio) / 1000;
    $('reloj').textContent = `${String(Math.floor(api.t / 60)).padStart(2, '0')}:${String(Math.floor(api.t % 60)).padStart(2, '0')}`;
    for (const [id, hasta] of chips) if (api.t > hasta) api.quitar(id);
  }, 250);
  // Bucle del director: nunca se solapan dos ticks.
  while (!terminado) {
    const t = performance.now();
    try { await j.tick(api); } catch (e: any) { console.warn('tick', e); }
    pintarHud();
    if (vida <= 0) api.fin(false, '<p>Te has quedado sin vida.</p>');
    await new Promise((r) => setTimeout(r, Math.max(50, (j.tickMs ?? 1000) - (performance.now() - t))));
  }
  clearInterval(reloj);
}

// Utilidades para los directores de juego
export const azar = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
export const bfs = (enlaces: [string, string][], desde: string, hasta: string): string[] => {
  const ady = new Map<string, string[]>();
  for (const [a, b] of enlaces) { (ady.get(a) ?? ady.set(a, []).get(a)!).push(b); (ady.get(b) ?? ady.set(b, []).get(b)!).push(a); }
  const prev = new Map<string, string>([[desde, '']]);
  const cola = [desde];
  while (cola.length) {
    const n = cola.shift()!;
    if (n === hasta) break;
    for (const v of ady.get(n) ?? []) if (!prev.has(v)) { prev.set(v, n); cola.push(v); }
  }
  if (!prev.has(hasta)) return [];
  const camino = [hasta];
  while (camino[0] !== desde) camino.unshift(prev.get(camino[0])!);
  return camino;
};
