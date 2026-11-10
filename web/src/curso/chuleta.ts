// La chuleta. Sale sola de las lecciones: cada widget `comando` y cada tecla de un widget `teclas`
// es una entrada. El alumno ve las que ya le han enseñado (el paso al que llegó en cada lección) y
// puede apuntar una nota en cada una. Las notas van en el progreso, así que viajan con la cuenta.
import './chuleta.css';
import { LECCIONES, ORDEN } from './lecciones/index';
import { esc, h, md } from './nucleo/tipos';
import { leer, nota, ponerNota } from './progreso';

export interface Opcion { op: string; que: string; lec: string; paso: number }
export interface Entrada {
  clave: string; // el comando ('ls', 'git commit') o la tecla ('Ctrl+C')
  hace: string;
  uso?: string;
  tipo: 'comando' | 'tecla';
  lec: string;
  paso: number;
  ops: Opcion[];
}

let memo: Entrada[] | undefined;

/** Todas las entradas, en el orden en que se enseñan. */
export function catalogo(): Entrada[] {
  if (memo) return memo;
  const porClave = new Map<string, Entrada>();
  for (const lec of ORDEN) {
    LECCIONES[lec].pasos.forEach((p, paso) => {
      for (const w of p.w) {
        if (w.t === 'comando') {
          let e = porClave.get(w.cmd);
          if (!e) porClave.set(w.cmd, (e = { clave: w.cmd, hace: w.hace ?? '', uso: w.uso, tipo: 'comando', lec, paso, ops: [] }));
          for (const [op, que] of (w.ops ?? []) as [string, string][]) {
            if (!e.ops.some((o) => o.op === op)) e.ops.push({ op, que, lec, paso });
          }
        }
        if (w.t === 'teclas') {
          for (const c of w.combos as { k: string[]; que: string }[]) {
            const clave = c.k.join('+');
            if (!porClave.has(clave)) porClave.set(clave, { clave, hace: c.que, tipo: 'tecla', lec, paso, ops: [] });
          }
        }
      }
    });
  }
  return (memo = [...porClave.values()]);
}

/** ¿El alumno ya ha llegado a ese paso de esa lección? */
export function visto(lec: string, paso: number): boolean {
  const e = leer();
  if (e.modulos[lec]?.teoria) return true;
  const p = e.pasos?.[lec];
  return p !== undefined && p >= paso;
}

export const cuantasVistas = () => catalogo().filter((e) => visto(e.lec, e.paso)).length;

/** ¿Es la primera vez que la lección enseña este comando en este paso? */
export function esNuevo(cmd: string, lec: string, paso: number): boolean {
  const e = catalogo().find((x) => x.clave === cmd);
  return !e || (e.lec === lec && e.paso === paso);
}

function fila(e: Entrada): HTMLElement {
  const ops = e.ops.filter((o) => visto(o.lec, o.paso));
  const f = h('div', 'ch-fila', `<div class="ch-cab"><code class="ch-cmd">${esc(e.clave)}</code><span class="ch-hace">${md(e.hace)}</span></div>
    ${e.uso ? `<div class="ch-uso">Ejemplo <code>${esc(e.uso)}</code></div>` : ''}
    ${ops.length ? `<div class="ch-ops">${ops.map((o) => `<span><code>${esc(o.op)}</code> ${md(o.que)}</span>`).join('')}</div>` : ''}`);
  const caja = h('div', 'ch-nota');
  const pintar = () => {
    const t = nota(e.clave);
    caja.innerHTML = t ? `<button class="ch-nota-txt" title="Cambiar la nota"><b>Mi nota</b> ${esc(t)}</button>` : '<button class="ch-nota-mas">+ Añadir nota</button>';
    (caja.firstElementChild as HTMLElement).onclick = editar;
  };
  const editar = () => {
    caja.innerHTML = '<textarea rows="2" maxlength="500" placeholder="Apunta aquí lo que te ayude a recordarlo"></textarea><div class="ch-nota-pie"><button class="btn peque primario">Guardar</button><button class="btn peque">Cancelar</button></div>';
    const ta = caja.querySelector('textarea')!;
    ta.value = nota(e.clave);
    ta.focus();
    const [si, no] = caja.querySelectorAll('button');
    si.onclick = () => { ponerNota(e.clave, ta.value); pintar(); };
    no.onclick = pintar;
    ta.onkeydown = (ev) => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) si.click(); if (ev.key === 'Escape') no.click(); };
  };
  pintar();
  f.append(caja);
  return f;
}

/** Pinta la chuleta entera en `raiz`. `actual` es la lección que el alumno tiene abierta, si hay una. */
export function pintarChuleta(raiz: HTMLElement, actual?: string) {
  const todas = catalogo();
  raiz.classList.add('ch');
  raiz.innerHTML = `<div class="ch-arriba"><input class="ch-buscar" type="search" placeholder="Buscar un comando o lo que hace" aria-label="Buscar en la chuleta" /><span class="ch-cuenta"></span></div><div class="ch-lista"></div>`;
  const lista = raiz.querySelector('.ch-lista') as HTMLElement;
  const buscar = raiz.querySelector('.ch-buscar') as HTMLInputElement;
  const cuenta = raiz.querySelector('.ch-cuenta') as HTMLElement;
  const pintar = () => {
    const q = buscar.value.trim().toLowerCase();
    lista.innerHTML = '';
    let total = 0;
    // La lección abierta va la primera. El resto, en su orden.
    const orden = actual ? [actual, ...ORDEN.filter((l) => l !== actual)] : ORDEN;
    for (const lec of orden) {
      const suyas = todas.filter((e) => e.lec === lec);
      if (!suyas.length) continue;
      const vistas = suyas.filter((e) => visto(e.lec, e.paso));
      total += vistas.length;
      const encajan = vistas.filter((e) => !q || `${e.clave} ${e.hace} ${e.ops.map((o) => `${o.op} ${o.que}`).join(' ')} ${nota(e.clave)}`.toLowerCase().includes(q));
      const quedan = suyas.length - vistas.length;
      if (q && !encajan.length) continue;
      if (!vistas.length && lec !== actual) continue;
      const g = h('section', 'ch-grupo', `<h3>${esc(lec)} · ${esc(LECCIONES[lec].titulo)}</h3>`);
      encajan.forEach((e) => g.append(fila(e)));
      if (quedan && !q) g.append(h('p', 'ch-quedan', `Te ${quedan === 1 ? 'queda 1' : `quedan ${quedan}`} por descubrir en esta lección.`));
      lista.append(g);
    }
    cuenta.textContent = `${total} de ${todas.length}`;
    if (!lista.children.length) {
      lista.append(h('p', 'ch-vacia', q ? 'No hay nada con eso en lo que llevas aprendido.' : 'Tu chuleta se llena sola. Cada comando que aprendes en una lección aparece aquí.'));
    }
    if (!q) {
      const libre = h('section', 'ch-grupo', '<h3>Mis apuntes</h3><textarea class="ch-libre" rows="4" maxlength="500" placeholder="Lo que quieras apuntar, sin atarlo a un comando"></textarea>');
      const ta = libre.querySelector('textarea')!;
      ta.value = nota('_apuntes');
      ta.onblur = () => ponerNota('_apuntes', ta.value);
      lista.append(libre);
    }
  };
  buscar.oninput = pintar;
  pintar();
  return pintar;
}
