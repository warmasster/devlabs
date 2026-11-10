// Widgets básicos: explican con poco texto. No necesitan lab (salvo "teclas" y "senala", que lo usan si está).
import { ic } from '../../iconos';
import { catalogo, esNuevo } from '../chuleta';
import { esc, h, md, vivo, type Widget } from '../nucleo/tipos';

/** Párrafo corto. { md } */
export const texto: Widget = (el, p) => { el.append(h('p', 'w-texto', md(p.md))); };

/** Una idea en grande con su comparación cotidiana. { icono, de, es, nota? } */
export const analogia: Widget = (el, p) => {
  el.append(h('div', 'w-analogia', `<span class="w-ic">${ic(p.icono ?? 'lightbulb')}</span>
    <div><div class="w-de">${md(p.de)}</div><div class="w-es">${md(p.es)}</div>${p.nota ? `<div class="w-nota">${md(p.nota)}</div>` : ''}</div>`));
};

/** Un número grande. Fijo { v, txt } o vivo { sonda, fn, txt }. */
export const cifra: Widget = (el, p, ctx) => {
  const c = h('div', 'w-cifra', `<b>${esc(p.v ?? '…')}</b><span>${md(p.txt)}</span>`);
  el.append(c);
  if (p.sonda) vivo(ctx, p.sonda, (v) => { c.querySelector('b')!.textContent = p.fn ? p.fn(v) : v.trim(); c.classList.add('w-pulso'); setTimeout(() => c.classList.remove('w-pulso'), 600); });
};

/** Dos cosas lado a lado. { a: {titulo, icono, puntos[]}, b: {...} } */
export const comparar: Widget = (el, p) => {
  const lado = (x: any, cl: string) => `<div class="w-lado ${cl}"><div class="w-lado-t">${ic(x.icono ?? 'square')} ${md(x.titulo)}</div><ul>${x.puntos.map((t: string) => `<li>${md(t)}</li>`).join('')}</ul></div>`;
  el.append(h('div', 'w-comparar', lado(p.a, 'a') + `<div class="w-vs">${esc(p.vs ?? 'vs')}</div>` + lado(p.b, 'b')));
};

/** Pila de capas que se tocan. { capas: [{t, sub, info, icono?}] } (la primera va arriba) */
export const capas: Widget = (el, p) => {
  const caja = h('div', 'w-capas');
  const info = h('div', 'w-info', '<span class="w-suave">Toca una capa.</span>');
  p.capas.forEach((c: any, i: number) => {
    const b = h('button', 'w-capa', `${c.icono ? ic(c.icono) : ''}<b>${md(c.t)}</b><span>${md(c.sub ?? '')}</span>`);
    b.style.setProperty('--i', String(i));
    b.onclick = () => { caja.querySelectorAll('.w-capa').forEach((x) => x.classList.remove('activa')); b.classList.add('activa'); info.innerHTML = md(c.info); };
    caja.append(b);
  });
  el.append(caja, info);
};

/** Partes de una línea con su nombre debajo. { partes: [[texto, etiqueta, color?]], nota? } */
export const anatomia: Widget = (el, p) => {
  const colores = ['acento', 'ok', 'xp', 'aviso', 'mal', 'suave'];
  const fila = h('div', 'w-anatomia');
  p.partes.forEach(([t, etq, col]: [string, string, string?], i: number) => {
    const c = col ?? colores[i % colores.length];
    fila.append(h('span', 'w-parte', `<code style="--c:var(--${c})">${esc(t)}</code>${etq ? `<small style="--c:var(--${c})">${md(etq)}</small>` : ''}`));
  });
  el.append(fila);
  if (p.nota) el.append(h('p', 'w-nota', md(p.nota)));
};

/** Tabla sencilla. { cab: [], filas: [[]] } */
export const tabla: Widget = (el, p) => {
  el.append(h('table', 'w-tabla', `<thead><tr>${p.cab.map((c: string) => `<th>${md(c)}</th>`).join('')}</tr></thead>
    <tbody>${p.filas.map((f: string[]) => `<tr>${f.map((c) => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody>`));
};

/**
 * La ficha de un comando. Va siempre antes de pedirlo. Dice qué hace en una frase, enseña sus piezas
 * y sus opciones, y lo apunta en la chuleta del alumno.
 * { cmd, hace, uso?, partes?: [[texto, etiqueta]], ops?: [[opción, qué hace]], nota?, simbolo? }
 * Si el comando ya se enseñó antes, la ficha solo presenta las opciones nuevas.
 */
export const comando: Widget = (el, p, ctx) => {
  const nuevo = esNuevo(p.cmd, ctx.leccion ?? '', ctx.paso ?? 0);
  const eti = nuevo ? (p.simbolo ? 'Símbolo nuevo' : 'Comando nuevo') : 'Ya lo conoces. Esto es nuevo';
  const caja = h('div', `w-comando ${nuevo ? '' : 'mas'}`, `<div class="w-cmd-eti">${eti}</div>
    <div class="w-cmd-cab"><code>${esc(p.cmd)}</code><span>${md(p.hace ?? '')}</span></div>`);
  if (p.partes) {
    const colores = ['acento', 'ok', 'xp', 'aviso', 'mal', 'suave'];
    const fila = h('div', 'w-anatomia');
    p.partes.forEach(([t, etq, col]: [string, string, string?], i: number) => {
      const c = col ?? colores[i % colores.length];
      fila.append(h('span', 'w-parte', `<code style="--c:var(--${c})">${esc(t)}</code>${etq ? `<small style="--c:var(--${c})">${md(etq)}</small>` : ''}`));
    });
    caja.append(fila);
  } else if (p.uso) caja.append(h('div', 'w-cmd-uso', `Por ejemplo <code>${esc(p.uso)}</code>`));
  if (p.ops?.length) caja.append(h('div', 'w-cmd-ops', p.ops.map(([o, q]: string[]) => `<div><code>${esc(o)}</code><span>${md(q)}</span></div>`).join('')));
  if (p.nota) caja.append(h('p', 'w-nota', md(p.nota)));
  caja.append(h('div', 'w-cmd-pie', `${ic('check')} Apuntado en tu chuleta`));
  el.append(caja);
};

/** Resumen de lo aprendido. Sin `items` sale solo de las fichas de esta lección. { items?: [[comando, para qué]] } */
export const chuleta: Widget = (el, p, ctx) => {
  let items: string[][] = p.items ?? [];
  if (!p.items) {
    items = [];
    for (const e of catalogo()) {
      if (e.lec === ctx.leccion) items.push([e.clave, e.hace]);
      for (const o of e.ops) if (o.lec === ctx.leccion) items.push([`${e.clave} ${o.op}`, o.que]);
    }
  }
  const caja = h('div', 'w-chuleta', `<div class="w-chuleta-t">${ic('clipboard')} Lo que te llevas</div>` + items.map(([c, d]) => `<div><code>${esc(c)}</code><span>${md(d)}</span></div>`).join(''));
  const b = h('button', 'btn w-chuleta-abrir', 'Abrir mi chuleta');
  b.onclick = () => dispatchEvent(new CustomEvent('relavops:chuleta'));
  el.append(caja, b);
};

/** Código con números de línea; tocar una línea con nota la explica. { codigo, notas: {n: texto}, lenguaje? } */
export const codigo: Widget = (el, p) => {
  const notas: Record<number, string> = p.notas ?? {};
  const pre = h('div', 'w-codigo');
  const info = h('div', 'w-info', Object.keys(notas).length ? '<span class="w-suave">Toca una línea marcada.</span>' : '');
  String(p.codigo).split('\n').forEach((l, i) => {
    const n = i + 1;
    const fila = h('div', `w-linea ${notas[n] ? 'con-nota' : ''}`, `<span class="n">${n}</span><code>${esc(l) || ' '}</code>`);
    if (notas[n]) fila.onclick = () => { pre.querySelectorAll('.w-linea').forEach((x) => x.classList.remove('activa')); fila.classList.add('activa'); info.innerHTML = md(notas[n]); };
    pre.append(fila);
  });
  el.append(pre, info);
};

/** Pasos en el tiempo que se destapan uno a uno. { items: [{t, d, icono?}] } */
export const linea: Widget = (el, p) => {
  const caja = h('div', 'w-tiempo');
  let n = 0;
  const pintar = () => {
    caja.innerHTML = p.items.map((x: any, i: number) => `<div class="w-hito ${i < n ? 'si' : ''}"><span class="w-punto">${x.icono ? ic(x.icono) : i + 1}</span><b>${md(x.t)}</b><small>${md(x.d ?? '')}</small></div>`).join('');
    btn.hidden = n >= p.items.length;
  };
  const btn = h('button', 'btn', `${ic('arrow-right')} Siguiente`);
  btn.onclick = () => { n++; pintar(); };
  n = 1;
  el.append(caja, btn);
  pintar();
};

/** Barras para comparar tamaños o tiempos, en escala logarítmica. { items: [[etiqueta, valor, texto]], titulo? } */
export const escala: Widget = (el, p) => {
  const max = Math.max(...p.items.map((x: any[]) => Math.log10(x[1] + 1)));
  const caja = h('div', 'w-escala', p.titulo ? `<div class="w-suave">${md(p.titulo)}</div>` : '');
  p.items.forEach(([etq, v, txt]: [string, number, string], i: number) => {
    const fila = h('div', 'w-escala-f', `<span>${md(etq)}</span><div class="w-barra-l"><i></i></div><code>${esc(txt)}</code>`);
    caja.append(fila);
    setTimeout(() => ((fila.querySelector('i') as HTMLElement).style.width = `${Math.max(2, (100 * Math.log10(v + 1)) / max)}%`), 80 + i * 180);
  });
  el.append(caja);
};

/** Teclas en grande. Si el alumno las pulsa en la terminal, se encienden. { combos: [{k: [], que, seq?}], obliga? } */
export const teclas: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-teclas');
  const pulsadas = new Set<number>();
  const liberar = p.obliga ? ctx.espera() : null;
  p.combos.forEach((c: any, i: number) => {
    const f = h('div', 'w-combo', `<span class="w-kbd">${c.k.map((k: string) => `<kbd>${esc(k)}</kbd>`).join('<i>+</i>')}</span><span>${md(c.que)}</span>${c.seq ? '<span class="w-luz"></span>' : ''}`);
    f.dataset.i = String(i);
    caja.append(f);
  });
  el.append(caja);
  ctx.alTeclear((t) => {
    p.combos.forEach((c: any, i: number) => {
      if (!c.seq || !t.includes(c.seq) || pulsadas.has(i)) return;
      pulsadas.add(i);
      const f = caja.querySelector(`[data-i="${i}"]`)!;
      f.classList.add('si');
      ctx.xp(3, f);
      if (liberar && p.combos.every((x: any, j: number) => !x.seq || pulsadas.has(j))) liberar();
    });
  });
};

/** Señala una zona del panel del lab mientras dura el paso. { zona, md } */
export const senala: Widget = (el, p, ctx) => {
  el.append(h('div', 'w-senala', `${ic('arrow-right')} ${md(p.md)}`));
  ctx.senalar(p.zona, true);
  ctx.alSalir(() => ctx.senalar(p.zona, false));
};

/** Aviso destacado (algo que conviene no olvidar). { md, tipo?: 'ok'|'aviso'|'mal' } */
export const aviso: Widget = (el, p) => {
  el.append(h('div', `w-aviso ${p.tipo ?? 'aviso'}`, `${ic(p.tipo === 'mal' ? 'triangle-alert' : p.tipo === 'ok' ? 'circle-check' : 'lightbulb')} <span>${md(p.md)}</span>`));
};
