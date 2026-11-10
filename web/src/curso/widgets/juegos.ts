// Juegos cortos y comprobaciones. Solo preguntan cosas que la lección ya ha enseñado.
// Todos obligan a terminarlos antes de seguir, salvo que la lección diga { opcional: true }.
import { ic } from '../../iconos';
import { ding } from '../../recompensa';
import { barajar, esc, h, md, sacudir, type Widget } from '../nucleo/tipos';

/** Una pregunta con opciones. { q, ops, ok, porque } */
export const quiz: Widget = (el, p, ctx) => {
  const liberar = p.opcional ? null : ctx.espera();
  const caja = h('div', 'w-quiz', `<div class="w-q">${md(p.q)}</div>`);
  const ops = h('div', 'w-ops');
  const porque = h('div', 'w-porque');
  porque.hidden = true;
  let fallos = 0;
  p.ops.forEach((o: string, i: number) => {
    const b = h('button', 'btn w-op', md(o));
    b.onclick = () => {
      if (i === p.ok) {
        b.classList.add('bien');
        ops.querySelectorAll('button').forEach((x) => x.setAttribute('disabled', ''));
        porque.hidden = false;
        porque.innerHTML = `${ic('circle-check')} ${md(p.porque)}`;
        ctx.xp(fallos ? 2 : 5, b);
        liberar?.();
      } else { fallos++; b.classList.add('mal'); b.setAttribute('disabled', ''); sacudir(b); }
    };
    ops.append(b);
  });
  caja.append(ops, porque);
  el.append(caja);
};

/** Verdadero o falso, una tras otra. { items: [[frase, bool, porque]] } */
export const verdad: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  let i = 0;
  const caja = h('div', 'w-verdad');
  el.append(caja);
  const pintar = () => {
    if (i >= p.items.length) { caja.innerHTML = `${ic('circle-check')} Todas bien.`; liberar(); return; }
    const [f, v, pq] = p.items[i];
    caja.innerHTML = `<div class="w-cuenta">${i + 1} / ${p.items.length}</div><div class="w-q">${md(f)}</div>`;
    const fila = h('div', 'w-ops fila');
    const res = h('div', 'w-porque');
    for (const [t, val] of [['Verdad', true], ['Mentira', false]] as const) {
      const b = h('button', 'btn w-op', t);
      b.onclick = () => {
        if (val === v) { ctx.xp(2, b); res.innerHTML = `${ic('circle-check')} ${md(pq)}`; fila.querySelectorAll('button').forEach((x) => x.setAttribute('disabled', '')); setTimeout(() => { i++; pintar(); }, 1400); }
        else { sacudir(b); res.innerHTML = `${ic('circle-x')} No. ${md(pq)}`; }
      };
      fila.append(b);
    }
    caja.append(fila, res);
  };
  pintar();
};

/** Ordenar pasos: tocas en el orden correcto. { items: [en orden], md } */
export const ordena: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  const elegidos: string[] = [];
  const caja = h('div', 'w-ordena', `<div class="w-q">${md(p.md ?? 'Tócalos en orden.')}</div>`);
  const hechos = h('div', 'w-ordena-hechos');
  const pool = h('div', 'w-ops fila');
  for (const t of barajar(p.items as string[])) {
    const b = h('button', 'btn w-op', md(t));
    b.onclick = () => {
      if (t === p.items[elegidos.length]) {
        elegidos.push(t);
        b.remove();
        hechos.append(h('div', 'w-ord', `<b>${elegidos.length}</b> ${md(t)}`));
        ding();
        if (elegidos.length === p.items.length) { ctx.xp(6, hechos); liberar(); }
      } else sacudir(b);
    };
    pool.append(b);
  }
  caja.append(hechos, pool);
  el.append(caja);
};

/** Emparejar dos columnas. { pares: [[a, b]] } */
export const empareja: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  const caja = h('div', 'w-empareja');
  const izq = h('div', 'w-col');
  const der = h('div', 'w-col');
  let sel: HTMLElement | null = null;
  let hechos = 0;
  (p.pares as [string, string][]).forEach(([a], i) => { const b = h('button', 'btn w-op', md(a)); b.dataset.i = String(i); izq.append(b); });
  barajar((p.pares as [string, string][]).map(([, b], i) => [b, i] as [string, number])).forEach(([t, i]) => { const b = h('button', 'btn w-op', md(t)); b.dataset.i = String(i); der.append(b); });
  izq.onclick = (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLElement | null;
    if (!b || b.hasAttribute('disabled')) return;
    izq.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    sel = b;
  };
  der.onclick = (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLElement | null;
    if (!b || !sel || b.hasAttribute('disabled')) return;
    if (b.dataset.i === sel.dataset.i) {
      for (const x of [b, sel]) { x.classList.remove('sel'); x.classList.add('bien'); x.setAttribute('disabled', ''); }
      sel = null;
      ding();
      if (++hechos === p.pares.length) { ctx.xp(6, caja); liberar(); }
    } else sacudir(b);
  };
  caja.append(izq, der);
  el.append(h('div', 'w-q', md(p.md ?? 'Une cada cosa con su pareja.')), caja);
};

/** Completar el hueco de un comando. { plantilla: 'chmod ___ f', respuestas: [], pista? } */
export const huecos: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  const [antes, despues] = String(p.plantilla).split('___');
  const inp = document.createElement('input');
  inp.className = 'w-hueco';
  inp.spellcheck = false;
  inp.autocomplete = 'off';
  inp.size = Math.max(4, Math.max(...p.respuestas.map((r: string) => r.length)) + 1);
  const caja = h('div', 'w-huecos', `<div class="w-q">${md(p.md ?? '')}</div>`);
  const linea = h('code', 'w-linea-hueco', esc(antes));
  linea.append(inp);
  linea.insertAdjacentHTML('beforeend', esc(despues ?? ''));
  const res = h('div', 'w-porque');
  inp.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    if (p.respuestas.includes(inp.value.trim())) { inp.classList.add('bien'); inp.disabled = true; res.innerHTML = `${ic('circle-check')} ${md(p.porque ?? 'Eso es.')}`; ctx.xp(4, inp); liberar(); }
    else { sacudir(inp); res.innerHTML = p.pista ? `${ic('lightbulb')} ${md(p.pista)}` : 'Prueba otra vez.'; }
  };
  caja.append(linea, h('div', 'w-suave', 'Escribe y pulsa Enter.'), res);
  el.append(caja);
};

/** Clasificar cosas en cubos. { cubos: [nombres], items: [[texto, nCubo]] } */
export const clasifica: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  const items = barajar(p.items as [string, number][]);
  let i = 0;
  const caja = h('div', 'w-clasifica');
  const cubos = h('div', 'w-cubos');
  const actual = h('div', 'w-ficha');
  const montones: HTMLElement[] = [];
  (p.cubos as string[]).forEach((c, k) => {
    const b = h('button', 'w-cubo', `<b>${md(c)}</b><div class="w-monton"></div>`);
    montones.push(b.querySelector('.w-monton') as HTMLElement);
    b.onclick = () => {
      if (i >= items.length) return;
      if (items[i][1] === k) { montones[k].append(h('span', 'w-chip', md(items[i][0]))); ding(); i++; pintar(); }
      else sacudir(actual);
    };
    cubos.append(b);
  });
  const pintar = () => {
    if (i >= items.length) { actual.innerHTML = `${ic('circle-check')} Todo en su sitio.`; ctx.xp(6, actual); liberar(); return; }
    actual.innerHTML = `<span class="w-cuenta">${i + 1}/${items.length}</span> ${md(items[i][0])}`;
  };
  caja.append(h('div', 'w-q', md(p.md ?? '¿Dónde va cada una?')), actual, cubos);
  el.append(caja);
  pintar();
};

/** Contrarreloj: escribe el comando que hace lo que se pide. { preguntas: [[pide, [respuestas]]], segundos } */
export const rapido: Widget = (el, p, ctx) => {
  const liberar = p.opcional ? null : ctx.espera();
  const caja = h('div', 'w-rapido');
  const empezar = h('button', 'btn primario', `${ic('timer')} Empezar (${p.segundos ?? 45} s)`);
  caja.append(h('div', 'w-q', md(p.md ?? 'Escribe el comando. Rápido.')), empezar);
  el.append(caja);
  empezar.onclick = () => {
    const ps = barajar(p.preguntas as [string, string[]][]);
    let i = 0, aciertos = 0;
    const fin = Date.now() + (p.segundos ?? 45) * 1000;
    const pide = h('div', 'w-pide');
    const inp = document.createElement('input');
    inp.className = 'w-hueco ancho';
    inp.spellcheck = false;
    const t = h('div', 'w-suave');
    caja.replaceChildren(pide, inp, t);
    inp.focus();
    const pintar = () => { pide.innerHTML = md(ps[i % ps.length][0]); };
    const timer = setInterval(() => {
      const q = Math.ceil((fin - Date.now()) / 1000);
      t.textContent = `${q} s · ${aciertos} aciertos`;
      if (q <= 0) {
        clearInterval(timer);
        caja.innerHTML = `${ic('trophy')} <b>${aciertos}</b> aciertos.`;
        if (aciertos >= Math.min(3, ps.length)) { ctx.xp(aciertos * 2, caja); liberar?.(); }
        else { const otra = h('button', 'btn', 'Otra vez'); otra.onclick = () => empezar.click(); caja.append(' Necesitas 3. ', otra); }
      }
    }, 200);
    ctx.alSalir(() => clearInterval(timer));
    inp.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      const ok = ps[i % ps.length][1].map((x) => x.replace(/\s+/g, ' ')).includes(inp.value.trim().replace(/\s+/g, ' '));
      if (ok) { aciertos++; ding(); i++; inp.value = ''; pintar(); } else { sacudir(inp); }
      if (e.key === 'Enter' && !ok && inp.value === '') { i++; pintar(); }
    };
    pintar();
  };
};

/** Elegir el atajo correcto. { items: [[accion, combo]] } Los combos salen como teclas. */
export const atajo: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  const items = barajar(p.items as [string, string][]);
  const todos = [...new Set((p.items as [string, string][]).map(([, c]) => c))];
  let i = 0;
  const caja = h('div', 'w-atajo');
  el.append(caja);
  const kbd = (c: string) => c.split('+').map((k) => `<kbd>${esc(k)}</kbd>`).join('<i>+</i>');
  const pintar = () => {
    if (i >= items.length) { caja.innerHTML = `${ic('circle-check')} Los tienes.`; ctx.xp(6, caja); liberar(); return; }
    const [acc, ok] = items[i];
    const ops = barajar([ok, ...barajar(todos.filter((c) => c !== ok)).slice(0, 3)]);
    caja.innerHTML = `<div class="w-cuenta">${i + 1}/${items.length}</div><div class="w-q">${md(acc)}</div>`;
    const fila = h('div', 'w-ops fila');
    for (const c of ops) {
      const b = h('button', 'btn w-op w-kbd', kbd(c));
      b.onclick = () => { if (c === ok) { ding(); i++; pintar(); } else sacudir(b); };
      fila.append(b);
    }
    caja.append(fila);
  };
  pintar();
};

/** Llegar a un fichero tocando carpetas y escribir su ruta. { arbol: ['/etc/hosts', …], objetivo, desde?, relativa? } */
export const ruta: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  const rutas: string[] = p.arbol;
  let dir = p.desde ?? '/';
  const caja = h('div', 'w-ruta');
  const nav = h('div', 'w-ruta-nav');
  const inp = document.createElement('input');
  inp.className = 'w-hueco ancho';
  inp.placeholder = p.relativa ? `ruta relativa desde ${p.desde}` : 'ruta absoluta, empieza por /';
  const res = h('div', 'w-porque');
  const hijos = (d: string) => [...new Set(rutas.filter((r) => r.startsWith(d === '/' ? '/' : d + '/') && r !== d).map((r) => (d === '/' ? '/' : d + '/') + r.slice(d === '/' ? 1 : d.length + 1).split('/')[0]))];
  const pintar = () => {
    nav.innerHTML = `<div class="w-ruta-donde">${ic('map-pin')} <code>${esc(dir)}</code></div>`;
    const fila = h('div', 'w-ops fila');
    if (dir !== '/') { const up = h('button', 'btn', `${ic('chevron-left')} ..`); up.onclick = () => { dir = dir.split('/').slice(0, -1).join('/') || '/'; pintar(); }; fila.append(up); }
    for (const c of hijos(dir)) {
      const esDir = rutas.some((r) => r.startsWith(c + '/'));
      const b = h('button', `btn ${c === p.objetivo ? 'objetivo' : ''}`, `${ic(esDir ? 'folder' : 'file')} ${esc(c.split('/').pop()!)}`);
      b.onclick = () => { if (esDir) { dir = c; pintar(); } else res.innerHTML = c === p.objetivo ? `${ic('circle-check')} Ese es. Ahora escribe su ruta.` : 'Ese no es.'; };
      fila.append(b);
    }
    nav.append(fila);
  };
  inp.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    const v = inp.value.trim();
    const ok = p.relativa ? p.respuestas.includes(v) : v === p.objetivo;
    if (ok) { inp.classList.add('bien'); inp.disabled = true; res.innerHTML = `${ic('circle-check')} ${md(p.porque ?? 'Correcto.')}`; ctx.xp(5, inp); liberar(); } else sacudir(inp);
  };
  caja.append(h('div', 'w-q', md(p.md)), nav, inp, res);
  el.append(caja);
  pintar();
};

/** Parejas boca abajo. { pares: [[a, b]] } */
export const memoria: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  const cartas = barajar((p.pares as [string, string][]).flatMap(([a, b], i) => [[a, i], [b, i]] as [string, number][]));
  const caja = h('div', 'w-memoria');
  let abiertas: HTMLElement[] = [];
  let hechas = 0;
  for (const [t, i] of cartas) {
    const c = h('button', 'w-carta', `<span class="dorso">${ic('circle-help')}</span><span class="cara">${md(t)}</span>`);
    c.dataset.i = String(i);
    c.onclick = () => {
      if (c.classList.contains('abierta') || abiertas.length === 2) return;
      c.classList.add('abierta');
      abiertas.push(c);
      if (abiertas.length === 2) {
        const [a, b] = abiertas;
        if (a.dataset.i === b.dataset.i) { a.classList.add('bien'); b.classList.add('bien'); abiertas = []; ding(); if (++hechas === p.pares.length) { ctx.xp(8, caja); liberar(); } }
        else setTimeout(() => { a.classList.remove('abierta'); b.classList.remove('abierta'); abiertas = []; }, 900);
      }
    };
    caja.append(c);
  }
  el.append(h('div', 'w-q', md(p.md ?? 'Encuentra las parejas.')), caja);
};

/** Probador de regex: escribes y se marcan las líneas que encajan. { lineas: [[texto, debeEncajar]], md, inicial? } */
export const regex: Widget = (el, p, ctx) => {
  const liberar = p.libre ? null : ctx.espera();
  const inp = document.createElement('input');
  inp.className = 'w-hueco ancho mono';
  inp.value = p.inicial ?? '';
  inp.placeholder = 'tu regex';
  const lista = h('div', 'w-regex');
  const estado = h('div', 'w-suave');
  const probar = () => {
    let re: RegExp | null = null;
    try { re = inp.value ? new RegExp(inp.value, 'g') : null; estado.textContent = ''; } catch { estado.textContent = 'Regex a medias…'; }
    let todo = !!re;
    lista.innerHTML = (p.lineas as [string, boolean?][]).map(([t, debe]) => {
      re && (re.lastIndex = 0);
      const encaja = !!re && re.test(t);
      re && (re.lastIndex = 0);
      let marcado = esc(t);
      // Se marca lo que encaja con caracteres de control y luego se escapa el resto.
      try { if (re && inp.value) marcado = t.replace(new RegExp(re.source, 'g'), (m) => `\u0001${m}\u0002`).split('').map((ch) => (ch === '\u0001' ? '<mark>' : ch === '\u0002' ? '</mark>' : esc(ch))).join(''); } catch {}
      if (debe !== undefined && encaja !== debe) todo = false;
      const cl = debe === undefined ? (encaja ? 'si' : '') : encaja === debe ? 'bien' : 'mal';
      return `<div class="w-re ${cl}">${debe === undefined ? '' : `<span class="w-re-ic">${ic(debe ? 'circle-check' : 'ban')}</span>`}<code>${marcado}</code></div>`;
    }).join('');
    if (todo && liberar) { liberar(); ctx.xp(6, lista); estado.innerHTML = `${ic('circle-check')} Encaja justo con lo que tiene que encajar.`; }
  };
  inp.oninput = probar;
  el.append(h('div', 'w-q', md(p.md ?? '')), h('div', 'w-re-entrada', '<span>/</span>'), lista, estado);
  el.querySelector('.w-re-entrada')!.append(inp, h('span', '', '/'));
  probar();
};

/** Mini vim para practicar sin miedo. { texto, objetivo, md } Admite h j k l w b 0 $ x dd i a A o u Esc y :w :q :wq :q! */
export const vim: Widget = (el, p, ctx) => {
  const liberar = ctx.espera();
  let lineas: string[] = String(p.texto).split('\n');
  let f = 0, c = 0, modo: 'NORMAL' | 'INSERCIÓN' | 'COMANDO' = 'NORMAL', cmd = '', pend = '', guardado = false;
  const deshacer: string[][] = [];
  const caja = h('div', 'w-vim', '');
  caja.tabIndex = 0;
  const info = h('div', 'w-suave', 'Haz clic en el editor para escribir.');
  const pintar = () => {
    caja.innerHTML = lineas.map((l, i) => `<div class="w-vim-l"><span class="n">${i + 1}</span>${i === f ? esc(l.slice(0, c)) + `<span class="w-cursor ${modo === 'INSERCIÓN' ? 'ins' : ''}">${esc(l[c] ?? ' ')}</span>` + esc(l.slice(c + 1)) : esc(l) || ' '}</div>`).join('')
      + `<div class="w-vim-barra"><b>${modo === 'COMANDO' ? ':' + esc(cmd) : `-- ${modo} --`}</b><span>${f + 1},${c + 1}</span></div>`;
  };
  const ajustar = () => { f = Math.max(0, Math.min(lineas.length - 1, f)); c = Math.max(0, Math.min(Math.max(0, lineas[f].length - (modo === 'INSERCIÓN' ? 0 : 1)), c)); };
  const guardaUndo = () => deshacer.push([...lineas]);
  caja.onkeydown = (e) => {
    e.preventDefault();
    const k = e.key;
    if (modo === 'INSERCIÓN') {
      if (k === 'Escape') { modo = 'NORMAL'; c = Math.max(0, c - 1); }
      else if (k === 'Backspace') { if (c > 0) { lineas[f] = lineas[f].slice(0, c - 1) + lineas[f].slice(c); c--; } }
      else if (k === 'Enter') { lineas.splice(f + 1, 0, lineas[f].slice(c)); lineas[f] = lineas[f].slice(0, c); f++; c = 0; }
      else if (k.length === 1) { lineas[f] = lineas[f].slice(0, c) + k + lineas[f].slice(c); c++; }
    } else if (modo === 'COMANDO') {
      if (k === 'Escape') { modo = 'NORMAL'; cmd = ''; }
      else if (k === 'Backspace') { cmd = cmd.slice(0, -1); if (!cmd) modo = 'NORMAL'; }
      else if (k === 'Enter') {
        if (cmd === 'w' || cmd === 'wq') guardado = true;
        if (cmd === 'wq' || cmd === 'x') {
          const ok = lineas.join('\n') === p.objetivo;
          info.innerHTML = ok ? `${ic('circle-check')} Guardado y fuera. Justo lo que había que hacer.` : 'Has guardado, pero el texto no está como se pide. Sigue editando.';
          if (ok) { ctx.xp(8, caja); liberar(); }
        } else if (cmd === 'q!') info.textContent = 'Saliste sin guardar. Los cambios se pierden.';
        else if (cmd === 'q') info.textContent = guardado ? 'Fuera.' : 'vim no te deja salir con cambios sin guardar. Usa :wq o :q!';
        modo = 'NORMAL'; cmd = '';
      } else if (k.length === 1) cmd += k;
    } else {
      const op = pend + k;
      pend = '';
      if (k === 'h' || k === 'ArrowLeft') c--;
      else if (k === 'l' || k === 'ArrowRight') c++;
      else if (k === 'j' || k === 'ArrowDown') f++;
      else if (k === 'k' || k === 'ArrowUp') f--;
      else if (k === '0') c = 0;
      else if (k === '$') c = lineas[f].length - 1;
      else if (k === 'w') { const m = lineas[f].slice(c).match(/^\S*\s+/); c += m ? m[0].length : lineas[f].length; }
      else if (k === 'b') { const ant = lineas[f].slice(0, c).replace(/\s+$/, ''); c = ant.lastIndexOf(' ') + 1; }
      else if (k === 'x') { guardaUndo(); lineas[f] = lineas[f].slice(0, c) + lineas[f].slice(c + 1); }
      else if (op === 'dd') { guardaUndo(); lineas.splice(f, 1); if (!lineas.length) lineas = ['']; }
      else if (k === 'd') pend = 'd';
      else if (k === 'i') { guardaUndo(); modo = 'INSERCIÓN'; }
      else if (k === 'a') { guardaUndo(); modo = 'INSERCIÓN'; c++; }
      else if (k === 'A') { guardaUndo(); modo = 'INSERCIÓN'; c = lineas[f].length; }
      else if (k === 'o') { guardaUndo(); lineas.splice(f + 1, 0, ''); f++; c = 0; modo = 'INSERCIÓN'; }
      else if (k === 'u') { const u = deshacer.pop(); if (u) lineas = u; }
      else if (k === ':') { modo = 'COMANDO'; cmd = ''; }
      else if (k === 'G') f = lineas.length - 1;
    }
    ajustar();
    pintar();
  };
  caja.onfocus = () => (info.textContent = 'Estás dentro. Pulsa teclas como en vim.');
  el.append(h('div', 'w-q', md(p.md)), caja, info, h('pre', 'w-pre w-objetivo', `Objetivo\n${esc(p.objetivo)}`));
  pintar();
};
