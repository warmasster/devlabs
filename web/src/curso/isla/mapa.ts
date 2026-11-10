// Mapa de islas del cinturón blanco. Una isla por lección, unidas por un cable.
// El personaje está en la lección por la que vas. Al entrar salta hasta la isla, se cierra un
// telón y, mientras, se precarga la página de la lección y se pide su lab a labd.
// Hay dos repartos de las mismas islas. En pantalla ancha van en dos filas, de ida y vuelta, y
// caben enteras sin bajar. En el móvil van en un camino vertical en zigzag.
import { abrirSesion } from '../../api';
import { ajustes } from '../../recompensa';
import { cuantasVistas } from '../chuleta';
import { LECCIONES, ORDEN } from '../lecciones/index';
import { leer, racha } from '../progreso';
import { ADORNOS, COLORES, FONDOS, ISLAS, LINEA, PERSONAJES, azar, elegido, elegir, type Opcion } from './temas';
import { precargarPagina } from './precarga';

const CORTOS: Record<string, string> = {
  '0.0': 'Cómo va esto', '0.1': 'La shell', '0.2': 'Ficheros', '0.3': 'La máquina', '0.4': 'La red', '0.5': 'Permisos',
  '0.6': 'Tuberías', '0.7': 'Regex', '0.8': 'Editores', '0.9': 'Scripts', '0.10': 'Git',
};

type Punto = { x: number; y: number };
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const estrecho = () => matchMedia('(max-width: 700px)').matches;

// Dónde va cada isla. n incluye la isla con niebla del final.
function reparto(n: number, movil: boolean): { ancho: number; alto: number; pos: Punto[] } {
  if (movil) {
    // Zigzag en dos columnas. Como las islas vecinas van en columnas distintas, caben más juntas.
    const pos = Array.from({ length: n }, (_, i) => ({ x: i % 2 ? 372 : 148, y: 112 + i * 150 }));
    return { ancho: 520, alto: pos[n - 1].y + 190, pos };
  }
  // Dos filas. La de arriba va de izquierda a derecha y la de abajo vuelve.
  const cols = Math.ceil(n / 2);
  const paso = 196;
  const pos = Array.from({ length: n }, (_, i) => {
    const fila = i < cols ? 0 : 1;
    const c = fila ? cols - 1 - (i - cols) : i;
    return { x: 124 + c * paso, y: 138 + fila * 272 + (c % 2 ? 16 : -10) };
  });
  return { ancho: 124 * 2 + (cols - 1) * paso, alto: 600, pos };
}

// El cable: una curva suave que pasa por todas las islas, vaya el tramo de lado o hacia abajo.
function curva(ps: Punto[]) {
  return ps.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y + 40}`;
    const a = ps[i - 1];
    if (Math.abs(p.x - a.x) > Math.abs(p.y - a.y) * 1.4) {
      const mx = (a.x + p.x) / 2;
      return `${d} C ${mx} ${a.y + 40}, ${mx} ${p.y + 40}, ${p.x} ${p.y + 40}`;
    }
    const my = (a.y + p.y) / 2 + 40;
    return `${d} C ${a.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y + 40}`;
  }, '');
}

/** Pinta el mapa en `raiz` y la ficha de la lección elegida en `lado`. */
export function pintarMapaIsla(raiz: HTMLElement, lado: HTMLElement) {
  const e = leer();
  const ids = ORDEN.filter((id) => id.startsWith('0.'));
  const movil = estrecho();
  const { ancho, alto, pos: todas } = reparto(ids.length + 1, movil);
  const pos = todas.slice(0, ids.length);
  const niebla = todas[ids.length];
  const completo = (id: string) => { const m = e.modulos[id]; return !!(m?.teoria && m?.lab && m?.boss); };
  const tocada = (id: string) => { const m = e.modulos[id]; return !!(m?.teoria || m?.lab || m?.boss) || (e.pasos?.[id] ?? 0) > 0; };
  // Dónde está el personaje: la última lección que tocaste o, si no, la primera sin acabar.
  let aqui = ids.indexOf(e.ultimo?.mod ?? '');
  if (aqui < 0) aqui = Math.max(0, ids.findIndex((id) => !completo(id)));

  const fondo = elegido(FONDOS, 'fondo');
  const forma = elegido(ISLAS, 'isla');
  const bicho = elegido(PERSONAJES, 'personaje');
  const r = azar(7);
  const yEti = forma.id === 'flotante' ? 128 : 74;
  const hechas = ids.filter(completo).length;

  let islas = '';
  ids.forEach((id, i) => {
    const { x, y } = pos[i];
    const lec = LECCIONES[id];
    const estado = completo(id) ? 'hecha' : i === aqui ? 'actual' : tocada(id) ? 'tocada' : i > aqui ? 'futura' : '';
    const sub = completo(id) ? 'hecha' : i === aqui ? 'estás aquí' : tocada(id) ? 'empezada' : `${lec.minutos} min`;
    islas += `<g class="mi-isla ${estado}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(`${id} ${lec.titulo}`)}" transform="translate(${x} ${y})">
      <g class="mi-flota" style="animation-delay:-${(i * 0.7).toFixed(1)}s"><g class="mi-cuerpo"><g class="mi-hierve">${forma.pintar(COLORES[i % COLORES.length], r)}${ADORNOS[id] ?? ''}</g></g></g>
      <text class="mi-etiqueta" y="${yEti}" text-anchor="middle">${id} ${esc(CORTOS[id] ?? lec.titulo)}</text>
      <text class="mi-sub ${completo(id) ? 'hecho' : ''}" y="${yEti + 22}" text-anchor="middle">${sub}</text>
    </g>`;
  });
  islas += `<g class="mi-isla niebla" transform="translate(${niebla.x} ${niebla.y})"><g class="mi-cuerpo">${forma.pintar('#8b84c9', r)}</g>
    <text class="mi-etiqueta" y="${yEti}" text-anchor="middle">Cinturón amarillo</text><text class="mi-sub" y="${yEti + 22}" text-anchor="middle">muy pronto</text></g>`;

  const enIsla = (i: number) => ({ x: pos[i].x - 52, y: pos[i].y + 2 });
  const b0 = enIsla(aqui);
  const puntos = [...pos, niebla];
  raiz.classList.toggle('mi-movil', movil);
  raiz.innerHTML = `
    <div class="mi-lienzo">
      <svg class="mi-svg" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Mapa del cinturón blanco">
        <g>${fondo.pintar(ancho, alto, azar(3))}</g>
        <path class="mi-hierve" d="${curva(puntos)}" fill="none" stroke="${LINEA}" stroke-width="13" stroke-linecap="round"/>
        <path d="${curva(puntos)}" fill="none" stroke="#8b84c9" stroke-width="5" stroke-dasharray="2 13" stroke-linecap="round"/>
        ${hechas ? `<path d="${curva(puntos.slice(0, hechas + 1))}" fill="none" stroke="#5ff2a8" stroke-width="7" stroke-linecap="round"/>` : ''}
        ${islas}
        <g class="mi-bicho" transform="translate(${b0.x} ${b0.y})"><g class="mi-giro"><g class="mi-salto">${bicho.svg}</g></g>
          <g class="mi-bocadillo"><path d="M -38 -112 h 76 a 10 10 0 0 1 10 10 v 18 a 10 10 0 0 1 -10 10 h -30 l -8 10 l -8 -10 h -30 a 10 10 0 0 1 -10 -10 v -18 a 10 10 0 0 1 10 -10 z" fill="#fffbe8" stroke="${LINEA}" stroke-width="3.5"/>
          <text x="0" y="-88" text-anchor="middle" font-size="15" font-weight="700" fill="${LINEA}">sigue aquí</text></g>
        </g>
      </svg>
    </div>
    <div class="mi-seguir"><button class="btn primario grande" id="mi-seguir">${tocada(ids[aqui]) ? 'Seguir en' : 'Empezar'} la ${ids[aqui]}</button></div>
    <details class="mi-mundo panel">
      <summary>Cambia el aspecto del mapa</summary>
      ${fila('Fondo', 'fondo', FONDOS, fondo.id)}${fila('Islas', 'isla', ISLAS, forma.id)}${fila('Personaje', 'personaje', PERSONAJES, bicho.id)}
    </details>`;

  const gBicho = raiz.querySelector('.mi-bicho') as SVGGElement;
  let donde = aqui;
  let yendo = false;
  let elegida = aqui;

  raiz.querySelectorAll<HTMLElement>('.mi-mundo [data-clave]').forEach((b) => (b.onclick = () => {
    elegir(b.dataset.clave!, b.dataset.id!);
    pintarMapaIsla(raiz, lado);
    (raiz.querySelector('.mi-mundo') as HTMLDetailsElement).open = true;
  }));

  // La ficha de la lección elegida. En pantalla ancha vive al lado del mapa y siempre hay una.
  // En el móvil sube desde abajo al tocar una isla y se puede cerrar.
  const rch = racha();
  const pintarFicha = (i: number, abierta: boolean) => {
    elegida = i;
    const id = ids[i];
    const lec = LECCIONES[id];
    const m = e.modulos[id] ?? {};
    const paso = e.pasos?.[id];
    const eti = completo(id) ? 'Repasar' : i === aqui ? (tocada(id) ? 'Continuar' : 'Empieza aquí') : tocada(id) ? 'A medias' : 'Lección';
    const donde = !m.teoria && paso !== undefined && paso > 0 ? `<span>paso ${Math.min(paso + 1, lec.pasos.length)} de ${lec.pasos.length}</span>` : '';
    raiz.querySelectorAll('.mi-isla').forEach((g) => g.classList.toggle('elegida', (g as HTMLElement).dataset.i === String(i)));
    lado.classList.toggle('abierta', abierta);
    lado.innerHTML = `
      <div class="mp-ficha panel">
        <button class="cerrar" aria-label="Cerrar">×</button>
        <span class="mp-eti">${eti}</span>
        <h2>${id} · ${esc(lec.titulo)}</h2>
        <p>${esc(lec.resumen)}</p>
        <div class="mi-tpb"><span class="${m.teoria ? 'si' : ''}">lección</span><span class="${m.lab ? 'si' : ''}">práctica</span><span class="${m.boss ? 'si' : ''}">boss</span><span>${lec.minutos} min</span>${donde}</div>
        <button class="btn primario grande mp-entrar">${completo(id) ? 'Repasar' : tocada(id) ? 'Seguir' : 'Entrar'}</button>
      </div>
      <a class="panel mp-chuleta" href="/chuleta"><b>Tu chuleta</b><span>${cuantasVistas()} comandos apuntados, con tus notas</span></a>
      <div class="mp-cifras">
        <div><b style="color:var(--xp)">${e.xp}</b><span>XP</span></div>
        <div><b>${rch.dias}</b><span>${rch.dias === 1 ? 'día de racha' : 'días de racha'}</span></div>
        <div><b>${hechas}/${ids.length}</b><span>islas</span></div>
      </div>`;
    (lado.querySelector('.cerrar') as HTMLElement).onclick = () => lado.classList.remove('abierta');
    (lado.querySelector('.mp-entrar') as HTMLElement).onclick = () => entrar(i);
  };
  pintarFicha(aqui, false);

  raiz.querySelectorAll<SVGGElement>('.mi-isla[data-i]').forEach((g) => {
    const i = Number(g.dataset.i);
    g.addEventListener('click', () => pintarFicha(i, true));
    g.addEventListener('dblclick', () => entrar(i));
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); if (elegida === i) entrar(i); else pintarFicha(i, true); } });
  });
  (raiz.querySelector('#mi-seguir') as HTMLElement).onclick = () => entrar(aqui);

  // Salta de isla en isla hasta la elegida.
  async function saltar(hasta: number) {
    const salto = gBicho.querySelector('.mi-salto') as SVGGElement;
    const giro = gBicho.querySelector('.mi-giro') as SVGGElement;
    (gBicho.querySelector('.mi-bocadillo') as SVGGElement).style.display = 'none';
    while (donde !== hasta) {
      const sig = donde + Math.sign(hasta - donde);
      const a = enIsla(donde);
      const b = enIsla(sig);
      giro.setAttribute('transform', b.x < a.x ? 'scale(-1 1)' : '');
      if (ajustes.movimiento) {
        const dur = Math.abs(hasta - donde) > 4 ? 170 : 300;
        const t0 = performance.now();
        await new Promise<void>((fin) => {
          const paso = (ahora: number) => {
            const k = Math.min(1, (ahora - t0) / dur);
            const x = a.x + (b.x - a.x) * k;
            const y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 70;
            gBicho.setAttribute('transform', `translate(${x} ${y})`);
            salto.setAttribute('transform', k < 1 ? `scale(${1 - 0.08 * Math.sin(k * Math.PI)} ${1 + 0.1 * Math.sin(k * Math.PI)})` : 'scale(1.15 0.85)');
            if (k < 1) requestAnimationFrame(paso); else fin();
          };
          requestAnimationFrame(paso);
        });
        await espera(50);
        salto.removeAttribute('transform');
      } else gBicho.setAttribute('transform', `translate(${b.x} ${b.y})`);
      donde = sig;
    }
  }

  async function entrar(i: number) {
    if (yendo) return; // un clic de más no pide otro lab
    yendo = true;
    lado.classList.remove('abierta');
    const id = ids[i];
    const lienzo = raiz.querySelector('.mi-lienzo') as HTMLElement;
    // El lab del primer paso se pide ya. Si el alumno ya tenía uno de ese lab, se reutiliza
    // (abrirSesion lo guarda en el navegador), así entrar y salir no crea máquinas nuevas.
    // Si no queda ninguna libre, no pasa nada: la lección abre igual y allí sale la sala de espera.
    const lab = LECCIONES[id].pasos.find((p) => p.lab)?.lab;
    const lista = lab ? abrirSesion(lab).catch(() => undefined) : Promise.resolve(undefined);
    const t0 = performance.now();
    await saltar(i);
    const caja = lienzo.getBoundingClientRect();
    const telon = document.createElement('div');
    telon.className = 'mi-telon';
    telon.style.setProperty('--x', `${caja.left + (pos[i].x / ancho) * caja.width}px`);
    telon.style.setProperty('--y', `${caja.top + (pos[i].y / alto) * caja.height}px`);
    telon.innerHTML = `<p>${id} · ${esc(CORTOS[id] ?? '')}</p>`;
    document.body.append(telon);
    requestAnimationFrame(() => requestAnimationFrame(() => telon.classList.add('cierra')));
    await Promise.all([espera(ajustes.movimiento ? 750 : 0), Promise.race([lista, espera(3000)])]);
    if (performance.now() - t0 < 300) await espera(300 - (performance.now() - t0));
    location.href = `/leccion?m=${id}`;
  }

  // En el móvil, el mapa es largo. Se baja solo hasta la isla por la que vas.
  if (movil && aqui > 1) {
    const lienzo = raiz.querySelector('.mi-lienzo') as HTMLElement;
    requestAnimationFrame(() => scrollTo({ top: lienzo.offsetTop + (pos[aqui].y / alto) * lienzo.clientHeight - innerHeight / 2 }));
  }

  // Al volver con el botón de atrás, el navegador puede enseñar la página congelada con el telón puesto.
  addEventListener('pageshow', (ev) => { if (ev.persisted) { document.querySelectorAll('.mi-telon').forEach((t) => t.remove()); yendo = false; } }, { once: true });
  precargarPagina('/leccion');
}

function fila(titulo: string, clave: string, lista: Opcion[], activo: string) {
  return `<div class="mi-mundo-fila"><span>${titulo}</span>${lista.map((o) => `<button class="btn peque" data-clave="${clave}" data-id="${o.id}" aria-pressed="${o.id === activo}">${esc(o.nombre)}</button>`).join('')}</div>`;
}
