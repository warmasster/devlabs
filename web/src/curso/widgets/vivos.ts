// Widgets conectados al lab: enseñan lo que pasa dentro de las máquinas mientras el alumno teclea.
// Las sondas las define cada lab en su YAML (ver labs/LEEME.md).
import { ic } from '../../iconos';
import { confeti, fanfarria } from '../../recompensa';
import { esc, h, md, vivo, type Ctx, type Widget } from '../nucleo/tipos';
import type { ConexionLab, NodoLab } from '../nucleo/conexion';

const parsePuertos = (v: string) => v.split(/\s+/).map(Number).filter((n) => n > 0);

/** Tarjeta de una máquina: nombre, IP, puertos abiertos como puntos verdes y memoria. Se usa también en el panel. */
export function tarjetaMaquina(lab: ConexionLab, n: NodoLab, alSalir: (f: () => void) => void, alTocar?: () => void): HTMLElement {
  const c = h('div', 'w-maquina', `<div class="w-maq-t">${ic('server')} <b>${esc(n.nombre)}</b></div>
    <div class="w-maq-ip">${n.ip ? `<code>${esc(n.ip)}</code>` : '<span class="w-suave">sin red</span>'}</div>
    ${n.rol ? `<div class="w-maq-rol">${esc(n.rol)}</div>` : ''}<div class="w-maq-puertos"></div><div class="w-maq-ram"></div>`);
  c.dataset.nodo = n.nombre;
  if (alTocar) { c.onclick = alTocar; c.classList.add('tocable'); }
  const pts = c.querySelector('.w-maq-puertos') as HTMLElement;
  let antes = new Set<number>();
  alSalir(lab.sonda(`puertos@${n.nombre}`, (v) => {
    const ps = parsePuertos(v);
    pts.innerHTML = ps.length ? ps.map((x) => `<span class="w-puerto ${antes.has(x) ? '' : 'nuevo'}" title="puerto ${x} abierto"><i></i>${x}</span>`).join('') : '<span class="w-suave">ningún puerto abierto</span>';
    antes = new Set(ps);
  }));
  const ram = c.querySelector('.w-maq-ram') as HTMLElement;
  alSalir(lab.sonda(`ram@${n.nombre}`, (v) => {
    const [usada, total] = v.trim().split(/\s+/).map(Number);
    if (!total) return;
    ram.innerHTML = `<div class="w-mini-barra"><i style="width:${(100 * usada) / total}%"></i></div><small>RAM ${usada} de ${total} MB</small>`;
  }));
  return c;
}

/** La tarjeta de una máquina dentro de la lección. { nodo } */
export const maquina: Widget = (el, p, ctx) => {
  const lab = ctx.lab();
  if (!lab) return;
  const nodos = p.nodo ? lab.nodos().filter((n) => n.nombre === p.nodo) : lab.nodos();
  const fila = h('div', 'w-maquinas');
  for (const n of nodos) fila.append(tarjetaMaquina(lab, n, ctx.alSalir, () => ctx.terminal(n.nombre)));
  el.append(fila);
};

/** Puertas de una máquina en grande: cerradas o abiertas. { nodo, puertos: [[n, nombre]] } */
export const puertos: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-puertas');
  el.append(caja);
  let abiertos = new Set<number>();
  const pintar = () => {
    const lista: [number, string][] = p.puertos ?? [];
    const extra = [...abiertos].filter((x) => !lista.some(([n]) => n === x)).map((x) => [x, ''] as [number, string]);
    caja.innerHTML = [...lista, ...extra].map(([n, t]) => `<div class="w-puerta ${abiertos.has(n) ? 'abierta' : ''}">${ic(abiertos.has(n) ? 'door-open' : 'door-closed')}<b>${n}</b><small>${esc(t || (abiertos.has(n) ? 'abierta' : ''))}</small></div>`).join('');
  };
  pintar();
  vivo(ctx, `puertos@${p.nodo}`, (v) => { abiertos = new Set(parsePuertos(v)); pintar(); });
};

/** Lo que hay en un fichero del lab, en vivo. { sonda, titulo, vacio? } */
export const fichero: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-fichero', `<div class="w-fichero-t">${ic('file-text')} ${md(p.titulo ?? '')}</div><pre class="w-pre"></pre>`);
  const pre = caja.querySelector('pre')!;
  pre.textContent = p.vacio ?? '…';
  el.append(caja);
  vivo(ctx, p.sonda, (v) => {
    if (!v.trim() && p.mantener) return; // { mantener: true } deja a la vista lo último que hubo
    pre.textContent = v.trim() ? v.replace(/\n$/, '') : p.vacio ?? '(vacío)';
    caja.classList.add('w-pulso');
    setTimeout(() => caja.classList.remove('w-pulso'), 700);
  });
};

/** Separa un comando en programa, opciones y argumentos. */
function partir(cmd: string): string {
  const toks = cmd.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  let primero = true;
  return toks.map((t) => {
    if (/^[|;&]+$|^&&$|^\|\|$/.test(t)) { primero = true; return `<span class="w-tok op">${esc(t)}<small>enlace</small></span>`; }
    if (/^[0-9]*>>?$|^<$|^2>&1$/.test(t)) return `<span class="w-tok red">${esc(t)}<small>redirige</small></span>`;
    if (primero) { primero = false; return `<span class="w-tok prog">${esc(t)}<small>programa</small></span>`; }
    if (t.startsWith('-')) return `<span class="w-tok opc">${esc(t)}<small>opción</small></span>`;
    return `<span class="w-tok arg">${esc(t)}<small>argumento</small></span>`;
  }).join('');
}

/** El último comando que has escrito en una máquina, partido en piezas. { nodo } */
export const ultimo: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-ultimo', '<span class="w-suave">Escribe algo en la terminal y pulsa Enter.</span>');
  el.append(h('div', 'w-suave', `${ic('terminal')} Tu último comando`), caja);
  let primero = true;
  vivo(ctx, `ultimo@${p.nodo}`, (v) => {
    const c = v.trim();
    if (primero) { primero = false; if (p.soloNuevos) return; }
    if (!c) return;
    caja.innerHTML = partir(c);
    caja.classList.add('w-pulso');
    setTimeout(() => caja.classList.remove('w-pulso'), 600);
  });
};

/** Tabla de procesos en vivo. { sonda, resalta?: [nombres] } La sonda da "pid stat comando" por línea. */
export const procesos: Widget = (el, p, ctx) => {
  const estados: Record<string, [string, string]> = { R: ['corriendo', 'ok'], S: ['esperando', 'suave'], T: ['parado', 'aviso'], Z: ['zombi', 'mal'], D: ['en disco', 'aviso'], I: ['inactivo', 'suave'] };
  const caja = h('div', 'w-procesos');
  el.append(caja);
  vivo(ctx, p.sonda, (v) => {
    const filas = v.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(\d+)\s+(\S+)\s+(.*)$/); return m ? { pid: m[1], st: m[2], cmd: m[3] } : null; }).filter(Boolean) as any[];
    caja.innerHTML = `<div class="w-proc cab"><span>PID</span><span>estado</span><span>programa</span></div>` + filas.map((f) => {
      const [t, c] = estados[f.st[0]] ?? [f.st, 'suave'];
      const res = (p.resalta ?? []).some((r: string) => f.cmd.includes(r));
      return `<div class="w-proc ${res ? 'resalta' : ''}"><code>${esc(f.pid)}</code><span class="w-est ${c}">${t}</span><code>${esc(f.cmd.slice(0, 60))}</code></div>`;
    }).join('');
  });
};

/** Medidor en vivo. { sonda, titulo, fn(v)=>[valor, maximo, texto] } */
export const medidor: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-medidor', `<div class="w-med-t">${md(p.titulo)}</div><div class="w-med-barra"><i></i></div><div class="w-med-txt w-suave">esperando datos del lab…</div>`);
  el.append(caja);
  const barra = caja.querySelector('i') as HTMLElement;
  vivo(ctx, p.sonda, (v) => {
    const [val, max, txt] = p.fn(v);
    const pct = Math.max(0, Math.min(100, (100 * val) / (max || 1)));
    barra.style.width = `${pct}%`;
    barra.className = pct > 85 ? 'mal' : pct > 60 ? 'aviso' : '';
    caja.querySelector('.w-med-txt')!.innerHTML = md(txt);
  });
};

/** Número en vivo con su etiqueta. { sonda, txt, fn? } */
export const contador: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-contador', `<b>…</b><span>${md(p.txt)}</span>`);
  el.append(caja);
  vivo(ctx, p.sonda, (v) => {
    const n = p.fn ? p.fn(v) : v.trim();
    const b = caja.querySelector('b')!;
    if (b.textContent !== String(n)) { b.textContent = String(n); caja.classList.add('w-pulso'); setTimeout(() => caja.classList.remove('w-pulso'), 600); }
  });
};

/** Luz de estado en vivo. { sonda, titulo, mapa: {valor: [texto, 'ok'|'mal'|'aviso']} } */
export const estado: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-estadoluz', `<span class="w-luz"></span><span class="w-estado-t">${md(p.titulo)}</span><b>…</b>`);
  el.append(caja);
  vivo(ctx, p.sonda, (v) => {
    const [t, c] = p.mapa[v.trim()] ?? [v.trim(), 'suave'];
    caja.className = `w-estadoluz ${c}`;
    caja.querySelector('b')!.innerHTML = md(t);
  });
};

/** El código de salida del último comando: verde si fue bien, rojo si no. { nodo } */
export const codigoSalida: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-rc', '<span class="w-rc-luz"></span><div><b>…</b><small>código de salida del último comando</small></div>');
  el.append(caja);
  vivo(ctx, `rc@${p.nodo}`, (v) => {
    const n = v.trim();
    if (!n) return;
    caja.className = `w-rc ${n === '0' ? 'ok' : 'mal'}`;
    caja.querySelector('b')!.textContent = n === '0' ? '0 · fue bien' : `${n} · algo falló`;
  });
};

/** Tarea en la terminal. La lección no sigue hasta que el lab la comprueba. { paso, md, pista?, nodo? } */
export const haz: Widget = (el, p, ctx) => {
  const lab = ctx.lab();
  const caja = h('div', 'w-haz', `<span class="w-haz-ic">${ic('terminal')}</span><div class="w-haz-txt">${md(p.md)}${p.nodo ? ` <span class="pildora">en ${esc(p.nodo)}</span>` : ''}</div><span class="w-haz-estado">${ic('square')}</span>`);
  el.append(caja);
  if (!lab) { caja.classList.add('sin-lab'); return; }
  const liberar = ctx.espera();
  if (p.pista) {
    const b = h('button', 'btn w-pista-btn', `${ic('lightbulb')} Pista`);
    const t = h('div', 'w-pista', `<code>${esc(p.pista)}</code>`);
    t.hidden = true;
    b.onclick = () => { t.hidden = false; b.remove(); };
    el.append(b, t);
  }
  if (p.nodo) ctx.terminal(p.nodo);
  ctx.alSalir(lab.paso(p.paso, () => {
    caja.classList.add('hecho');
    caja.querySelector('.w-haz-estado')!.innerHTML = ic('circle-check');
    ctx.xp(p.xp ?? 10, caja);
    liberar();
  }));
};

/** Lista de la misión del lab de práctica. Obliga a completarla. { opcional? } */
export const mision: Widget = (el, p, ctx) => {
  const lab = ctx.lab();
  if (!lab) return;
  const liberar = p.opcional ? null : ctx.espera();
  const caja = h('div', 'w-mision');
  const barra = h('div', 'barra', '<div style="width:0%"></div>');
  el.append(barra, caja);
  const pintar = () => {
    const ps = lab.mision;
    const n = ps.filter((x) => lab.hecho(x.id)).length;
    (barra.firstElementChild as HTMLElement).style.width = `${(100 * n) / ps.length}%`;
    caja.innerHTML = ps.map((x) => `<div class="w-mis ${lab.hecho(x.id) ? 'hecho' : ''}"><span>${ic(lab.hecho(x.id) ? 'circle-check' : 'square')}</span><div><b>${md(x.titulo)}</b><div class="w-suave">${md(x.texto)}</div>${x.pista && !lab.hecho(x.id) ? `<details><summary>pista</summary><code>${esc(x.pista)}</code></details>` : ''}</div><small>+${x.xp}</small></div>`).join('');
    if (n === ps.length) liberar?.();
  };
  pintar();
  for (const x of lab.mision) ctx.alSalir(lab.paso(x.id, () => { pintar(); ctx.xp(x.xp, caja); }));
};

/** El boss del lab de práctica: lo rompe al azar, cronometra, da pistas y celebra. */
export const boss: Widget = (el, p, ctx) => {
  const lab = ctx.lab();
  const b = lab?.info.lab.boss;
  if (!lab || !b) return;
  const caja = h('div', 'w-boss', `<div class="w-boss-t">${ic('skull')} ${md(b.titulo)}</div><p>${md(b.texto)}</p>
    <div class="w-boss-acc"><button class="btn primario">${ic('swords')} Que venga</button></div><div class="w-reloj" hidden>00:00</div><div class="w-boss-pistas"></div><div class="w-boss-fin" hidden></div>`);
  el.append(caja);
  const liberar = p.obliga ? ctx.espera() : null;
  const reloj = caja.querySelector('.w-reloj') as HTMLElement;
  const acc = caja.querySelector('.w-boss-acc') as HTMLElement;
  let timer = 0;
  ctx.alSalir(() => clearInterval(timer));
  const empezar = (t0: number) => {
    reloj.hidden = false;
    acc.innerHTML = '';
    const pb = h('button', 'btn', `${ic('lightbulb')} Pista`);
    pb.onclick = async () => {
      try {
        const r = await lab.pista();
        caja.querySelector('.w-boss-pistas')!.append(h('div', 'w-pista', `${md(r.pista.texto)} <span class="w-suave">(−${r.pista.coste} XP)</span>`));
      } catch { pb.setAttribute('disabled', ''); }
    };
    acc.append(pb);
    timer = window.setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); reloj.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 250);
    ctx.terminal();
  };
  (acc.querySelector('button') as HTMLElement).onclick = async () => { await lab.boss(); empezar(Date.now()); };
  const estadoBoss = lab.info.progreso.boss;
  if (estadoBoss?.activo) empezar(Date.now() - estadoBoss.segundos * 1000);
  ctx.alSalir(lab.evento((ev) => {
    if (ev.t !== 'boss' || !ev.hecho) return;
    clearInterval(timer);
    fanfarria(); confeti();
    caja.classList.add('vencido');
    acc.innerHTML = '';
    const fin = caja.querySelector('.w-boss-fin') as HTMLElement;
    fin.hidden = false;
    fin.innerHTML = `<b>Boss vencido</b> en ${Math.round(ev.segundos)} s. +${ev.xp} XP<p>${md(ev.solucion ?? '')}</p>`;
    ctx.xp(ev.xp);
    liberar?.();
    (ctx as Ctx & { bossVencido?: () => void }).bossVencido?.();
  }));
};

/** Botón que lanza una acción del lab (definida en su YAML). { accion, md, hecho? } */
export const botonLab: Widget = (el, p, ctx) => {
  const b = h('button', 'btn primario', `${ic(p.icono ?? 'zap')} ${md(p.md)}`);
  const r = h('span', 'w-suave');
  b.onclick = async () => {
    b.setAttribute('disabled', '');
    try { await ctx.lab()?.accion(p.accion); r.innerHTML = md(p.hecho ?? 'Hecho.'); } catch (e: any) { r.textContent = e.message; b.removeAttribute('disabled'); }
  };
  el.append(h('div', 'w-boton-lab', ''), b, r);
};

/** Terminal de mentira que teclea sola, para ver un comando antes de hacerlo. { lineas: [[comando, salida]] } */
export const terminalDemo: Widget = (el, p, ctx) => {
  const pre = h('pre', 'w-demo');
  el.append(pre);
  let vivoAun = true;
  ctx.alSalir(() => (vivoAun = false));
  const correr = async () => {
    for (const [cmd, sal] of p.lineas as [string, string][]) {
      pre.insertAdjacentHTML('beforeend', '<span class="w-prompt">$ </span>');
      for (const ch of cmd) { if (!vivoAun) return; pre.insertAdjacentText('beforeend', ch); await new Promise((r) => setTimeout(r, 45)); }
      await new Promise((r) => setTimeout(r, 350));
      pre.insertAdjacentText('beforeend', `\n${sal ? sal + '\n' : ''}`);
      await new Promise((r) => setTimeout(r, 700));
    }
  };
  correr();
};
