// Widgets de diagrama: se tocan, se mueven y algunos se alimentan del lab en vivo.
import { ic } from '../../iconos';
import { Reproductor, type Escena } from '../escena';
import { esc, h, md, vivo, type Widget } from '../nucleo/tipos';

/** Diagrama dibujado a mano que avanza por pasos. { escena: Escena } */
export const escena: Widget = (el, p) => {
  const caja = h('div', 'w-escena');
  const lienzo = h('div');
  const pie = h('div', 'w-escena-pie');
  const sub = h('p', 'w-escena-txt');
  const info = h('div', 'w-info');
  caja.append(lienzo);
  el.append(caja, sub, pie, info);
  const esc0: Escena = p.escena;
  const r = new Reproductor(lienzo, esc0, (n) => (info.innerHTML = `<b>${esc(n.txt)}</b> ${n.info}`));
  const atras = h('button', 'btn w-atras', ic('chevron-left'));
  const sig = h('button', 'btn primario', `Siguiente ${ic('arrow-right')}`);
  const cuenta = h('span', 'pildora');
  pie.append(atras, sig, cuenta);
  r.onPaso = (i, pa) => {
    sub.innerHTML = md(pa.texto);
    cuenta.textContent = `${i + 1} / ${esc0.pasos.length}`;
    sig.toggleAttribute('disabled', i >= esc0.pasos.length - 1);
  };
  atras.onclick = () => r.ir(r.paso - 1);
  sig.onclick = () => r.ir(r.paso + 1);
  r.ir(0);
};

/** Máquina de estados: pulsas una tecla o una flecha y cambias de estado. { estados: [{id, t, sub?}], trans: [[de, a, etiqueta]], inicio, objetivo?: [ids en orden] } */
export const estados: Widget = (el, p, ctx) => {
  let actual = p.inicio;
  const visitados: string[] = [actual];
  const liberar = p.objetivo ? ctx.espera() : null;
  const caja = h('div', 'w-estados');
  const botones = h('div', 'w-trans');
  const meta = p.objetivo ? h('div', 'w-suave', `Objetivo ${p.objetivo.map((x: string) => p.estados.find((e: any) => e.id === x)?.t).join(' → ')}`) : h('div');
  const pintar = () => {
    caja.innerHTML = p.estados.map((e: any) => `<div class="w-estado ${e.id === actual ? 'activo' : ''}"><b>${md(e.t)}</b>${e.sub ? `<small>${md(e.sub)}</small>` : ''}</div>`).join('');
    botones.innerHTML = '';
    for (const [de, a, etq] of p.trans) {
      if (de !== actual) continue;
      const b = h('button', 'btn', `${md(etq)} ${ic('arrow-right')} ${md(p.estados.find((e: any) => e.id === a).t)}`);
      b.onclick = () => { actual = a; visitados.push(a); pintar(); comprobar(); };
      botones.append(b);
    }
  };
  const comprobar = () => {
    if (!liberar) return;
    const o: string[] = p.objetivo;
    const cola = visitados.slice(-o.length);
    if (cola.join() === o.join()) { liberar(); ctx.xp(5, caja); meta.innerHTML = `${ic('circle-check')} Hecho`; }
  };
  el.append(caja, botones, meta);
  pintar();
};

/** Tubería de comandos: los datos pasan por cada etapa. { datos: string[], etapas: [{cmd, fn(lineas)=>lineas, que}] } */
export const tuberia: Widget = (el, p) => {
  const fila = h('div', 'w-tuberia');
  const salida = h('pre', 'w-pre');
  const que = h('div', 'w-suave');
  const ver = (i: number) => {
    let d: string[] = p.datos;
    for (let k = 0; k <= i; k++) d = p.etapas[k].fn(d);
    fila.querySelectorAll('.w-etapa').forEach((x, k) => x.classList.toggle('activa', k <= i));
    salida.textContent = d.slice(0, 14).join('\n') + (d.length > 14 ? `\n… (${d.length} líneas)` : '');
    que.innerHTML = md(p.etapas[i].que ?? '');
  };
  const ini = h('button', 'w-etapa datos', `${ic('file-text')} datos`);
  ini.onclick = () => { fila.querySelectorAll('.w-etapa').forEach((x) => x.classList.remove('activa')); salida.textContent = p.datos.slice(0, 14).join('\n') + (p.datos.length > 14 ? `\n… (${p.datos.length} líneas)` : ''); que.textContent = 'Los datos de partida.'; };
  fila.append(ini);
  p.etapas.forEach((e: any, i: number) => {
    fila.append(h('span', 'w-tubo', '|'));
    const b = h('button', 'w-etapa', `<code>${esc(e.cmd)}</code>`);
    b.onclick = () => ver(i);
    fila.append(b);
  });
  el.append(fila, que, salida);
  ini.click();
};

/** Canales de un proceso: eliges una redirección y ves adónde va cada línea. { cmd, out: [], err: [] } */
export const canales: Widget = (el, p) => {
  const opciones: [string, string][] = [['', 'nada'], [' > salida.txt', 'solo stdout al fichero'], [' 2> errores.txt', 'solo stderr al fichero'], [' > todo.txt 2>&1', 'los dos al fichero'], [' | wc -l', 'stdout a otro programa']];
  const sel = h('div', 'w-opciones');
  const cmd = h('div', 'w-cmd');
  const res = h('div', 'w-canales');
  const pintar = (r: string) => {
    cmd.innerHTML = `<code>$ ${esc(p.cmd)}${esc(r)}</code>`;
    const destOut = r.includes('>') && !r.includes('2>') || r.includes('2>&1') ? 'fichero' : r.includes('|') ? 'tubo' : 'pantalla';
    const destErr = r.includes('2>') ? 'fichero' : 'pantalla';
    const caja = (t: string, ico: string, lineas: string[]) => `<div class="w-dest"><div class="w-dest-t">${ic(ico)} ${t}</div>${lineas.join('') || '<span class="w-suave">vacío</span>'}</div>`;
    const lo = (d: string) => p.out.filter(() => destOut === d).map((l: string) => `<div class="w-l out">${esc(l)}</div>`);
    const le = (d: string) => p.err.filter(() => destErr === d).map((l: string) => `<div class="w-l err">${esc(l)}</div>`);
    const tubo = destOut === 'tubo' ? [`<div class="w-l out">${p.out.length}</div>`] : [];
    res.innerHTML = caja('Pantalla', 'monitor', [...lo('pantalla'), ...le('pantalla'), ...tubo]) + caja('Fichero', 'file-text', [...lo('fichero'), ...le('fichero')]);
  };
  opciones.forEach(([r, t], i) => {
    const b = h('button', 'btn', `<code>${esc(r || '(sin nada)')}</code> <small>${t}</small>`);
    b.onclick = () => { sel.querySelectorAll('.btn').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); pintar(r); };
    sel.append(b);
    if (!i) b.setAttribute('aria-pressed', 'true');
  });
  el.append(cmd, res, sel, h('div', 'w-leyenda', '<span class="w-l out">stdout (1)</span> <span class="w-l err">stderr (2)</span>'));
  pintar('');
};

/** Árbol de carpetas. Fijo { items: ['d /etc', 'f /etc/hosts'] } o vivo { sonda, aqui?: sonda, marca?: [rutas] } */
export const arbol: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-arbol');
  const donde = h('div', 'w-suave');
  let lineas: string[] = p.items ?? [];
  let aqui = '';
  const pintar = () => {
    if (p.aqui) donde.innerHTML = aqui ? `${ic('map-pin')} Tu shell está en <code>${esc(aqui)}</code>` : '';
    const items = lineas.map((l) => l.trim()).filter(Boolean).map((l) => ({ tipo: l[0], ruta: l.slice(2) })).sort((a, b) => a.ruta.localeCompare(b.ruta));
    const base = p.raiz ?? '';
    caja.innerHTML = items.map((x) => {
      const rel = base && x.ruta.startsWith(base) ? x.ruta.slice(base.length).replace(/^\//, '') : x.ruta;
      const prof = rel.split('/').length - 1;
      const nombre = rel.split('/').pop() || x.ruta;
      const marca = (p.marca ?? []).includes(x.ruta);
      const yo = aqui && aqui === x.ruta;
      const icono = x.tipo === 'd' ? 'folder' : x.tipo === 'l' ? 'link' : 'file';
      return `<div class="w-nodo ${marca ? 'marca' : ''} ${yo ? 'yo' : ''}" style="--p:${prof}">${ic(icono)} ${esc(nombre)}${yo ? ' <span class="pildora">estás aquí</span>' : ''}</div>`;
    }).join('') || '<span class="w-suave">(vacío)</span>';
  };
  el.append(donde, caja);
  pintar();
  if (p.sonda) vivo(ctx, p.sonda, (v) => { lineas = v.split('\n'); pintar(); });
  if (p.aqui) vivo(ctx, p.aqui, (v) => { aqui = v.trim(); pintar(); });
};

/** Nombres que apuntan a inodos (de `ls -li`). Vivo { sonda } */
export const inodos: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-inodos');
  el.append(caja);
  vivo(ctx, p.sonda, (v) => {
    const filas = v.split('\n').map((l) => l.trim().split(/\s+/)).filter((c) => c.length >= 10 && /^\d+$/.test(c[0]));
    const grupos = new Map<string, { nombres: string[]; enlaces: string; tipo: string; destino?: string }>();
    for (const c of filas) {
      const ino = c[0], tipo = c[1][0], enl = c[2];
      const nombre = c[9], destino = c[10] === '->' ? c[11] : undefined;
      const g = grupos.get(ino) ?? { nombres: [], enlaces: enl, tipo, destino };
      g.nombres.push(nombre);
      grupos.set(ino, g);
    }
    caja.innerHTML = [...grupos].map(([ino, g]) => `<div class="w-ino ${g.tipo === 'l' ? 'sim' : ''}">
      <div class="w-ino-nombres">${g.nombres.map((n) => `<span>${ic(g.tipo === 'l' ? 'link' : 'file')} ${esc(n)}</span>`).join('')}</div>
      <div class="w-ino-flecha">${ic('arrow-right')}</div>
      <div class="w-ino-caja"><b>inodo ${esc(ino)}</b><small>${g.tipo === 'l' ? `guarda la ruta ${esc(g.destino ?? '')}` : `${g.enlaces} nombre${g.enlaces === '1' ? '' : 's'}`}</small></div></div>`).join('') || '<span class="w-suave">Aún no hay nada aquí.</span>';
  });
};

/** Mapa de red en vivo: cada ping que llega a una máquina se ve viajar. { origen, sonda: prefijo "icmp@" } */
export const red: Widget = (el, p, ctx) => {
  const lab = ctx.lab();
  const nodos = lab?.nodos() ?? [];
  const W = 640, H = 220;
  const pos = new Map<string, { x: number; y: number }>();
  const orig = nodos.find((n) => n.nombre === p.origen) ?? nodos[0];
  const resto = nodos.filter((n) => n !== orig);
  pos.set(orig?.nombre ?? '', { x: 110, y: H / 2 });
  resto.forEach((n, i) => pos.set(n.nombre, { x: 470, y: resto.length === 1 ? H / 2 : 40 + (i * (H - 80)) / (resto.length - 1) }));
  pos.set('?', { x: 600, y: H - 20 });
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="w-red-svg">${resto.map((n) => { const a = pos.get(orig.nombre)!, b = pos.get(n.nombre)!; return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`; }).join('')}
    ${nodos.map((n) => { const q = pos.get(n.nombre)!; return `<g class="w-red-n" data-n="${esc(n.nombre)}" transform="translate(${q.x},${q.y})"><rect x="-70" y="-26" width="140" height="52" rx="8"/><text y="-4">${esc(n.nombre)}</text><text y="14" class="ip">${esc(n.ip ?? '')}</text></g>`; }).join('')}
    <g class="w-red-n nadie" transform="translate(${pos.get('?')!.x},${pos.get('?')!.y})"><text>¿nadie?</text></g><g class="viajes"></g></svg>`;
  const caja = h('div', 'w-red', svg);
  const log = h('div', 'w-red-log w-suave', 'Lanza un ping y mira el mapa.');
  el.append(caja, log);
  const viajes = caja.querySelector('.viajes')!;
  const viajar = (de: string, a: string, txt: string, clase: string, retraso: number) => {
    const A = pos.get(de), B = pos.get(a);
    if (!A || !B) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `w-viaje ${clase}`);
    g.innerHTML = `<rect x="-${txt.length * 4 + 10}" y="-11" width="${txt.length * 8 + 20}" height="22" rx="11"/><text y="4">${esc(txt)}</text>`;
    viajes.append(g);
    const t0 = performance.now() + retraso;
    const paso = (t: number) => {
      const f = Math.max(0, Math.min(1, (t - t0) / 900));
      g.setAttribute('transform', `translate(${A.x + (B.x - A.x) * f},${A.y + (B.y - A.y) * f})`);
      g.style.opacity = t < t0 ? '0' : f >= 1 ? '0' : '1';
      if (f < 1) requestAnimationFrame(paso); else setTimeout(() => g.remove(), 300);
    };
    requestAnimationFrame(paso);
  };
  const ant = new Map<string, number[]>();
  let llegadasPend = 0;
  for (const n of nodos) {
    vivo(ctx, `${p.sonda ?? 'icmp@'}${n.nombre}`, (v) => {
      const [inE, outE, tcp] = v.trim().split(/\s+/).map(Number);
      const a = ant.get(n.nombre);
      ant.set(n.nombre, [inE, outE, tcp]);
      if (!a) return;
      const dIn = inE - a[0], dOut = outE - a[1], dTcp = tcp - a[2];
      for (let k = 0; k < Math.min(dIn, 5); k++) viajar(orig.nombre, n.nombre, 'ping', '', k * 300);
      if (dIn > 0) {
        llegadasPend += dIn;
        caja.querySelector(`[data-n="${n.nombre}"]`)?.classList.add('llega');
        setTimeout(() => caja.querySelector(`[data-n="${n.nombre}"]`)?.classList.remove('llega'), 1200);
        log.innerHTML = `${ic('circle-check')} ${dIn} ping${dIn > 1 ? 's' : ''} llegaron a <b>${esc(n.nombre)}</b> (${esc(n.ip ?? '')}) y contestó.`;
      }
      for (let k = 0; k < Math.min(dTcp, 3); k++) viajar(orig.nombre, n.nombre, 'conexión', 'tcp', k * 300);
      if (dTcp > 0) log.innerHTML = `${ic('door-open')} Alguien abrió una conexión con <b>${esc(n.nombre)}</b>.`;
      if (n.nombre === orig.nombre && dOut > 0) {
        // Pings que salieron del origen. Los que no llegaron a nadie conocido se pierden.
        setTimeout(() => {
          const perdidos = dOut - llegadasPend;
          llegadasPend = Math.max(0, llegadasPend - dOut);
          for (let k = 0; k < Math.min(perdidos, 4); k++) viajar(orig.nombre, '?', 'ping', 'perdido', k * 300);
          if (perdidos > 0) log.innerHTML = `${ic('circle-x')} ${perdidos} ping${perdidos > 1 ? 's' : ''} salieron y nadie contestó. Esa IP no es de ninguna máquina de esta red.`;
        }, 1200);
      }
    });
  }
};

/** Una IP partida en sus 4 números; tocar uno enseña sus 8 bits. { ip, prefijo? } */
export const ip: Widget = (el, p) => {
  const octs = String(p.ip).split('.').map(Number);
  const caja = h('div', 'w-ip');
  const bits = h('div', 'w-bits-fila');
  octs.forEach((o, i) => {
    const red = p.prefijo !== undefined && (i + 1) * 8 <= p.prefijo;
    const b = h('button', `w-oct ${p.prefijo !== undefined ? (red ? 'red' : 'host') : ''}`, `<b>${o}</b><small>${i + 1}.º número</small>`);
    b.onclick = () => { caja.querySelectorAll('.w-oct').forEach((x) => x.classList.remove('activa')); b.classList.add('activa'); bits.innerHTML = `<code>${o.toString(2).padStart(8, '0').split('').join(' ')}</code> <span class="w-suave">son 8 bits. Por eso cada número va de 0 a 255.</span>`; };
    caja.append(b);
    if (i < 3) caja.append(h('span', 'w-punto-ip', '.'));
  });
  el.append(caja, bits);
  if (p.prefijo !== undefined) el.append(h('div', 'w-leyenda', '<span class="w-oct-l red">la red (la calle)</span> <span class="w-oct-l host">la máquina (el número de casa)</span>'));
};

/** 8 bits que se encienden. { objetivo? } */
export const binario: Widget = (el, p, ctx) => {
  const vals = [128, 64, 32, 16, 8, 4, 2, 1];
  const on = new Set<number>();
  const liberar = p.objetivo !== undefined ? ctx.espera() : null;
  const caja = h('div', 'w-binario');
  const total = h('div', 'w-bin-total');
  const pintar = () => {
    const s = [...on].reduce((a, b) => a + b, 0);
    total.innerHTML = `<b>${s}</b>${p.objetivo !== undefined ? ` <span class="w-suave">objetivo ${p.objetivo}</span>` : ''}`;
    if (liberar && s === p.objetivo) { liberar(); ctx.xp(5, total); total.classList.add('ok'); }
  };
  vals.forEach((v) => {
    const b = h('button', 'w-bit', `<b>0</b><small>${v}</small>`);
    b.onclick = () => { on.has(v) ? on.delete(v) : on.add(v); b.classList.toggle('on', on.has(v)); b.querySelector('b')!.textContent = on.has(v) ? '1' : '0'; pintar(); };
    caja.append(b);
  });
  el.append(caja, total);
  pintar();
};

/** Permisos rwx que se tocan, con su octal y su forma de ls. Con { sonda } enseña también el fichero real. { inicial?, sonda?, fichero? } */
export const rwx: Widget = (el, p, ctx) => {
  const ini = String(p.inicial ?? '644').split('').map(Number);
  const bits = ini.map((d) => [d & 4, d & 2, d & 1].map(Boolean));
  const quien = ['dueño', 'grupo', 'resto'];
  // Sin sonda es para tocar y aprender. Con sonda es un espejo del fichero real: no se toca,
  // cambia cuando el alumno hace chmod en la terminal.
  const espejo = !!p.sonda;
  const titulo = h('div', 'w-suave', espejo ? `${ic('file')} Así está <b>${esc(p.fichero ?? 'el fichero')}</b> ahora mismo. Cambia cuando haces chmod.` : 'Toca las letras.');
  const caja = h('div', `w-rwx ${espejo ? 'espejo' : ''}`);
  const res = h('div', 'w-rwx-res');
  const botones: HTMLElement[][] = [];
  let duenos = '';
  const pintar = () => {
    const oct = bits.map((b) => (b[0] ? 4 : 0) + (b[1] ? 2 : 0) + (b[2] ? 1 : 0)).join('');
    const str = bits.map((b) => `${b[0] ? 'r' : '-'}${b[1] ? 'w' : '-'}${b[2] ? 'x' : '-'}`).join('');
    botones.forEach((fila, i) => fila.forEach((bt, j) => bt.classList.toggle('on', bits[i][j])));
    res.innerHTML = `<code class="w-grande">-${str}</code> <span class="w-suave">=</span> <code class="w-grande">${oct}</code>${duenos}`;
  };
  bits.forEach((fila, i) => {
    const f = h('div', 'w-rwx-f', `<span>${quien[i]}</span>`);
    botones.push([]);
    fila.forEach((_, j) => {
      const b = h('button', 'w-rwx-b', `<b>${'rwx'[j]}</b><small>${[4, 2, 1][j]}</small>`);
      if (espejo) b.setAttribute('disabled', '');
      else b.onclick = () => { fila[j] = !fila[j]; pintar(); };
      botones[i].push(b);
      f.append(b);
    });
    caja.append(f);
  });
  el.append(titulo, caja, res);
  pintar();
  if (espejo) vivo(ctx, p.sonda, (v) => {
    const [, oct, u, g] = v.trim().split(/\s+/);
    if (!oct) { duenos = ' <span class="w-suave">El fichero no existe todavía.</span>'; pintar(); return; }
    oct.slice(-3).split('').map(Number).forEach((d, i) => { bits[i] = [!!(d & 4), !!(d & 2), !!(d & 1)]; });
    duenos = ` <span class="w-suave">· dueño</span> <b>${esc(u)}</b> <span class="w-suave">· grupo</span> <b>${esc(g)}</b>`;
    pintar();
    caja.classList.add('w-pulso'); setTimeout(() => caja.classList.remove('w-pulso'), 600);
  });
};

/** Las tres zonas de git, en vivo. { sonda } La sonda devuelve líneas "W fichero", "S fichero" y "C n". */
export const gitZonas: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-git-zonas');
  el.append(caja);
  const pintar = (v: string) => {
    const l = v.split('\n').map((x) => x.trim()).filter(Boolean);
    const w = l.filter((x) => x.startsWith('W ')).map((x) => x.slice(2));
    const s = l.filter((x) => x.startsWith('S ')).map((x) => x.slice(2));
    const c = l.find((x) => x.startsWith('C '))?.slice(2) ?? '0';
    const col = (t: string, ico: string, xs: string[], cl: string, vacio: string) => `<div class="w-zona ${cl}"><div class="w-zona-t">${ic(ico)} ${t}</div>${xs.map((x) => `<span class="w-chip">${esc(x)}</span>`).join('') || `<span class="w-suave">${vacio}</span>`}</div>`;
    caja.innerHTML = col('Tu carpeta', 'folder', w, 'w', 'sin cambios') + `<div class="w-zona-f">git add ${ic('arrow-right')}</div>` + col('Preparado', 'package', s, 's', 'nada preparado') + `<div class="w-zona-f">git commit ${ic('arrow-right')}</div>` + `<div class="w-zona r"><div class="w-zona-t">${ic('git-commit')} Historia</div><b class="w-grande">${esc(c)}</b><span class="w-suave">commits</span></div>`;
  };
  if (p.sonda) vivo(ctx, p.sonda, pintar, () => pintar(''));
};

/** Grafo de commits en vivo. { sonda } Líneas "hash|padres|mensaje|refs" (git log --all --format='%h|%p|%s|%D'). */
export const gitGrafo: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-git-grafo');
  el.append(caja);
  vivo(ctx, p.sonda, (v) => {
    const cs = v.split('\n').filter(Boolean).map((l) => { const [hash, padres, msg, refs] = l.split('|'); return { hash, padres: (padres ?? '').split(' ').filter(Boolean), msg, refs: (refs ?? '').split(',').map((x) => x.trim()).filter(Boolean) }; });
    if (!cs.length) { caja.innerHTML = '<span class="w-suave">Todavía no hay ningún commit.</span>'; return; }
    // Carriles: cada commit hereda el carril de su primer hijo; las ramas nuevas abren carril.
    const carril = new Map<string, number>();
    let libre = 0;
    for (const c of cs) {
      if (!carril.has(c.hash)) carril.set(c.hash, libre++);
      c.padres.forEach((pa, i) => { if (!carril.has(pa)) carril.set(pa, i === 0 ? carril.get(c.hash)! : libre++); });
    }
    const fila = 40, X = (n: number) => 24 + n * 26;
    const idx = new Map(cs.map((c, i) => [c.hash, i]));
    let lineas = '';
    cs.forEach((c, i) => c.padres.forEach((pa) => { const j = idx.get(pa); if (j !== undefined) lineas += `<line x1="${X(carril.get(c.hash)!)}" y1="${20 + i * fila}" x2="${X(carril.get(pa)!)}" y2="${20 + j * fila}"/>`; }));
    const ancho = X(libre) + 10;
    caja.innerHTML = `<svg viewBox="0 0 ${ancho} ${cs.length * fila}" width="${ancho}" height="${cs.length * fila}">${lineas}${cs.map((c, i) => `<circle cx="${X(carril.get(c.hash)!)}" cy="${20 + i * fila}" r="${c.padres.length > 1 ? 8 : 6}" class="${c.padres.length > 1 ? 'merge' : ''}"/>`).join('')}</svg>
      <div class="w-git-msgs">${cs.map((c) => `<div style="height:${fila}px">${c.refs.map((r) => `<span class="w-ref ${r.includes('HEAD') ? 'head' : r.startsWith('origin') ? 'remoto' : ''}">${esc(r.replace('HEAD -> ', '★ '))}</span>`).join('')} <code>${esc(c.hash)}</code> ${esc(c.msg)}</div>`).join('')}</div>`;
  });
};

/** Deslizador que explora un número. { min, max, valor, etiqueta, fn(v)=>html } */
export const deslizador: Widget = (el, p) => {
  const caja = h('div', 'w-desliza');
  const r = document.createElement('input');
  r.type = 'range'; r.min = String(p.min); r.max = String(p.max); r.value = String(p.valor);
  const val = h('b', 'w-grande');
  const res = h('div', 'w-desliza-res');
  const pintar = () => { val.textContent = `${p.prefijo ?? ''}${r.value}`; res.innerHTML = p.fn(Number(r.value)); };
  r.oninput = pintar;
  caja.append(h('span', 'w-suave', md(p.etiqueta ?? '')), r, val);
  el.append(caja, res);
  pintar();
};
