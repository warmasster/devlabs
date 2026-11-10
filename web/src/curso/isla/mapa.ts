// Mapa de islas de la primera parte (0.0 a 0.9). Una isla por lección, unidas por un cable.
// El personaje está en la lección por la que vas. Al entrar salta hasta la isla, se cierra un
// telón y, mientras, se precarga la página de la lección y se pide su lab a labd.
import { abrirSesion } from '../../api';
import { ajustes } from '../../recompensa';
import { LECCIONES, ORDEN } from '../lecciones/index';
import { leer, racha } from '../progreso';
import { ADORNOS, COLORES, FONDOS, ISLAS, LINEA, PERSONAJES, azar, elegido, elegir, type Opcion } from './temas';
import { precargarPagina } from './precarga';

const ANCHO = 760;
const PASO = 222;
const ARRIBA = 130;
// Por dónde va el camino, en x. Una isla por lección y la última, con niebla, para lo que viene.
const XS = [380, 560, 610, 430, 210, 150, 330, 540, 600, 400, 200];
const CORTOS: Record<string, string> = {
  '0.0': 'Cómo va esto', '0.1': 'El servidor', '0.2': 'La shell', '0.3': 'Ficheros', '0.4': 'Permisos',
  '0.5': 'Tuberías', '0.6': 'Regex', '0.7': 'Editores', '0.8': 'Scripts', '0.9': 'Git',
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function pintarMapaIsla(raiz: HTMLElement) {
  const e = leer();
  const ids = ORDEN.filter((id) => id.startsWith('0.'));
  const pos = ids.map((_, i) => ({ x: XS[i % XS.length], y: ARRIBA + i * PASO }));
  const niebla = { x: XS[ids.length % XS.length], y: ARRIBA + ids.length * PASO };
  const alto = niebla.y + 170;
  const completo = (id: string) => { const m = e.modulos[id]; return !!(m?.teoria && m?.lab && m?.boss); };
  const tocada = (id: string) => { const m = e.modulos[id]; return !!(m?.teoria || m?.lab || m?.boss); };
  // Dónde está el personaje: la última lección que tocaste o, si no, la primera sin acabar.
  let aqui = ids.indexOf(e.ultimo?.mod ?? '');
  if (aqui < 0) aqui = Math.max(0, ids.findIndex((id) => !completo(id)));

  const fondo = elegido(FONDOS, 'fondo');
  const forma = elegido(ISLAS, 'isla');
  const bicho = elegido(PERSONAJES, 'personaje');
  const r = azar(7);

  // El cable: una curva suave que pasa por todas las islas. La parte ya hecha va en verde.
  const puntos = [...pos, niebla];
  const curva = (ps: { x: number; y: number }[]) => ps.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y + 40}`;
    const a = ps[i - 1];
    const my = (a.y + p.y) / 2 + 40;
    return `${d} C ${a.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y + 40}`;
  }, '');
  const hechas = ids.filter(completo).length;

  let islas = '';
  ids.forEach((id, i) => {
    const { x, y } = pos[i];
    const lec = LECCIONES[id];
    const estado = completo(id) ? 'hecha' : i === aqui ? 'actual' : tocada(id) ? 'tocada' : i > aqui ? 'futura' : '';
    const sub = completo(id) ? 'hecha' : i === aqui ? 'estás aquí' : tocada(id) ? 'empezada' : `${lec.minutos} min`;
    islas += `<g class="mi-isla ${estado}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(`${id} ${lec.titulo}`)}" transform="translate(${x} ${y})">
      <g class="mi-flota" style="animation-delay:-${(i * 0.7).toFixed(1)}s"><g class="mi-cuerpo"><g class="mi-hierve">${forma.pintar(COLORES[i % COLORES.length], r)}${ADORNOS[id] ?? ''}</g></g></g>
      <text class="mi-etiqueta" y="${forma.id === 'flotante' ? 128 : 74}" text-anchor="middle">${id} ${esc(CORTOS[id] ?? lec.titulo)}</text>
      <text class="mi-sub ${completo(id) ? 'hecho' : ''}" y="${forma.id === 'flotante' ? 148 : 94}" text-anchor="middle">${sub}</text>
    </g>`;
  });
  islas += `<g class="mi-isla niebla" transform="translate(${niebla.x} ${niebla.y})"><g class="mi-cuerpo">${forma.pintar('#8b84c9', r)}</g>
    <text class="mi-etiqueta" y="${forma.id === 'flotante' ? 128 : 74}" text-anchor="middle">Nivel 1</text><text class="mi-sub" y="${forma.id === 'flotante' ? 148 : 94}" text-anchor="middle">muy pronto</text></g>`;

  const enIsla = (i: number) => ({ x: pos[i].x - 52, y: pos[i].y + 2 });
  const b0 = enIsla(aqui);
  const rch = racha();
  raiz.innerHTML = `
    <div class="mi-arriba">
      <span class="mi-cifra"><b>${e.xp}</b> XP</span>
      <span class="mi-cifra"><b>${rch.dias}</b> ${rch.dias === 1 ? 'día' : 'días'} de racha</span>
      <span class="mi-cifra"><b>${hechas}</b> de ${ids.length} islas</span>
    </div>
    <div class="mi-lienzo">
      <svg class="mi-svg" viewBox="0 0 ${ANCHO} ${alto}" role="img" aria-label="Mapa de la primera parte">
        <g>${fondo.pintar(ANCHO, alto, azar(3))}</g>
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
    <div class="mi-seguir"><button class="btn primario grande" id="mi-seguir">Seguir en la ${ids[aqui]}</button></div>
    <div class="mi-mundo panel">
      <b>Cambia el mundo</b>
      ${fila('Fondo', 'fondo', FONDOS, fondo.id)}${fila('Islas', 'isla', ISLAS, forma.id)}${fila('Personaje', 'personaje', PERSONAJES, bicho.id)}
    </div>
    <p class="mi-resto">El resto del temario está en el modo clásico, con el botón de arriba.</p>`;

  const lienzo = raiz.querySelector('.mi-lienzo') as HTMLElement;
  const gBicho = raiz.querySelector('.mi-bicho') as SVGGElement;
  let donde = aqui;
  let yendo = false;
  let ficha: HTMLElement | undefined;

  raiz.querySelectorAll<HTMLElement>('.mi-mundo [data-clave]').forEach((b) => (b.onclick = () => { elegir(b.dataset.clave!, b.dataset.id!); pintarMapaIsla(raiz); }));

  const cerrarFicha = () => { ficha?.remove(); ficha = undefined; raiz.classList.remove('con-ficha'); };
  const abrirFicha = (i: number) => {
    cerrarFicha();
    const id = ids[i];
    const lec = LECCIONES[id];
    const m = e.modulos[id] ?? {};
    ficha = document.createElement('div');
    ficha.className = 'mi-ficha';
    ficha.innerHTML = `<button class="cerrar" aria-label="Cerrar">×</button><h3>${id} · ${esc(lec.titulo)}</h3><p>${esc(lec.resumen)}</p>
      <div class="mi-tpb"><span class="${m.teoria ? 'si' : ''}">lección</span><span class="${m.lab ? 'si' : ''}">práctica</span><span class="${m.boss ? 'si' : ''}">boss</span><span>${lec.minutos} min</span></div>
      <div class="mi-botones"><button class="btn primario">${tocada(id) ? 'Seguir' : 'Entrar'}</button></div>`;
    lienzo.append(ficha);
    const izq = Math.min(Math.max((pos[i].x / ANCHO) * lienzo.clientWidth - ficha.offsetWidth / 2, 8), lienzo.clientWidth - ficha.offsetWidth - 8);
    ficha.style.left = `${izq}px`;
    ficha.style.top = `${((pos[i].y + 160) / alto) * lienzo.clientHeight}px`;
    raiz.classList.add('con-ficha');
    ficha.scrollIntoView({ block: 'nearest', behavior: ajustes.movimiento ? 'smooth' : 'auto' });
    (ficha.querySelector('.cerrar') as HTMLElement).onclick = cerrarFicha;
    (ficha.querySelector('.btn.primario') as HTMLElement).onclick = () => entrar(i);
  };

  raiz.querySelectorAll<SVGGElement>('.mi-isla[data-i]').forEach((g) => {
    const i = Number(g.dataset.i);
    g.addEventListener('click', () => abrirFicha(i));
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirFicha(i); } });
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
        const dur = 340;
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
        await espera(70);
        salto.removeAttribute('transform');
      } else gBicho.setAttribute('transform', `translate(${b.x} ${b.y})`);
      donde = sig;
    }
  }

  async function entrar(i: number) {
    if (yendo) return; // un clic de más no pide otro lab
    yendo = true;
    cerrarFicha();
    const id = ids[i];
    // El lab del primer paso se pide ya. Si el alumno ya tenía uno de ese lab, se reutiliza
    // (abrirSesion lo guarda en el navegador), así entrar y salir no crea máquinas nuevas.
    const lab = LECCIONES[id].pasos.find((p) => p.lab)?.lab;
    const lista = lab ? abrirSesion(lab).catch(() => undefined) : Promise.resolve(undefined);
    const t0 = performance.now();
    await saltar(i);
    const caja = lienzo.getBoundingClientRect();
    const telon = document.createElement('div');
    telon.className = 'mi-telon';
    telon.style.setProperty('--x', `${caja.left + (pos[i].x / ANCHO) * caja.width}px`);
    telon.style.setProperty('--y', `${caja.top + (pos[i].y / alto) * caja.height}px`);
    telon.innerHTML = `<p>${id} · ${esc(CORTOS[id] ?? '')}</p>`;
    document.body.append(telon);
    requestAnimationFrame(() => requestAnimationFrame(() => telon.classList.add('cierra')));
    await Promise.all([espera(ajustes.movimiento ? 750 : 0), Promise.race([lista, espera(3000)])]);
    if (performance.now() - t0 < 300) await espera(300 - (performance.now() - t0));
    location.href = `/leccion?m=${id}`;
  }

  // Al volver con el botón de atrás, el navegador puede enseñar la página congelada con el telón puesto.
  addEventListener('pageshow', (ev) => { if (ev.persisted) { document.querySelectorAll('.mi-telon').forEach((t) => t.remove()); yendo = false; } }, { once: true });
  precargarPagina('/leccion');
}

function fila(titulo: string, clave: string, lista: Opcion[], activo: string) {
  return `<div class="mi-mundo-fila"><span>${titulo}</span>${lista.map((o) => `<button class="btn peque" data-clave="${clave}" data-id="${o.id}" aria-pressed="${o.id === activo}">${esc(o.nombre)}</button>`).join('')}</div>`;
}
