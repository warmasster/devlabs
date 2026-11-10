// Gráficas del panel de admin en SVG, sin librerías. Líneas de 2 px, barras finas con la punta
// redondeada y la base plana, rejilla tenue, un solo eje Y, leyenda cuando hay dos series o más, y
// al pasar el ratón una línea vertical con el valor de cada serie.
// Los colores salen de variables CSS (--s1…--s4), validadas para daltonismo en claro y en oscuro.

export interface Serie {
  nombre: string;
  valores: (number | null)[];
  color: string; // var(--s1) …
  tipo?: 'linea' | 'area' | 'barras';
}

export interface Opciones {
  etiquetas: string[]; // una por punto, para el eje X y la ventanita
  series: Serie[];
  alto?: number;
  max?: number; // tope fijo del eje Y (100 para porcentajes)
  y?: (n: number) => string; // formato de los números
  x?: (etiqueta: string, i: number) => string; // formato corto del eje X
  vacio?: string;
}

const NS = 'http://www.w3.org/2000/svg';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Eje Y con números redondos: un paso de 1, 2, 2,5 o 5 por una potencia de 10, y unas 4 rayas.
// Si los datos son enteros (personas, sesiones), el paso también.
function escala(maxDato: number, entero: boolean): { max: number; paso: number } {
  if (maxDato <= 0) return entero ? { max: 4, paso: 1 } : { max: 1, paso: 0.25 };
  const bruto = maxDato / 4;
  const p = 10 ** Math.floor(Math.log10(bruto));
  let paso = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= bruto) ?? 10 * p;
  if (entero) paso = Math.max(1, Math.ceil(paso));
  return { max: paso * Math.max(1, Math.ceil(maxDato / paso)), paso };
}

const vivas = new WeakMap<HTMLElement, ResizeObserver>();

export function grafica(raiz: HTMLElement, o: Opciones) {
  raiz.classList.add('g');
  const pintar = () => dibujar(raiz, o);
  pintar();
  vivas.get(raiz)?.disconnect();
  let ancho = raiz.clientWidth;
  const ro = new ResizeObserver(() => { if (Math.abs(raiz.clientWidth - ancho) > 4) { ancho = raiz.clientWidth; pintar(); } });
  ro.observe(raiz);
  vivas.set(raiz, ro);
}

function dibujar(raiz: HTMLElement, o: Opciones) {
  const n = o.etiquetas.length;
  const hayDatos = o.series.some((s) => s.valores.some((v) => v !== null && v > 0));
  const fy = o.y ?? ((v: number) => (Math.abs(v) >= 10_000 ? `${(v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mil` : v.toLocaleString('es-ES', { maximumFractionDigits: 1 })));
  const fx = o.x ?? ((e: string) => e);
  const alto = o.alto ?? 220;
  const W = Math.max(260, raiz.clientWidth || 600);
  const izq = 40, der = 10, arriba = 10, abajo = 26;
  const iw = W - izq - der, ih = alto - arriba - abajo;
  const maxDato = Math.max(0, ...o.series.flatMap((s) => s.valores.filter((v): v is number => v !== null)));
  const entero = o.series.every((s) => s.valores.every((v) => v === null || Number.isInteger(v)));
  const { max, paso: pasoY } = o.max ? { max: o.max, paso: o.max / 4 } : escala(maxDato, entero);
  const X = (i: number) => izq + (n <= 1 ? iw / 2 : (i + 0.5) * (iw / n));
  const Y = (v: number) => arriba + ih - (Math.min(v, max) / max) * ih;

  let svg = `<svg xmlns="${NS}" width="${W}" height="${alto}" viewBox="0 0 ${W} ${alto}" role="img" aria-label="${esc(o.series.map((s) => s.nombre).join(', '))}">`;
  // Rejilla: 4 líneas finas y los números a la izquierda.
  for (let k = 0; k * pasoY <= max + 1e-9; k++) {
    const v = pasoY * k, y = Y(v);
    svg += `<line x1="${izq}" x2="${W - der}" y1="${y}" y2="${y}" class="${k === 0 ? 'g-base' : 'g-rej'}"/>`;
    svg += `<text x="${izq - 8}" y="${y + 4}" class="g-num" text-anchor="end">${esc(fy(v))}</text>`;
  }
  // Eje X: unas 6 etiquetas repartidas.
  const paso = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 90))));
  for (let i = 0; i < n; i += paso) svg += `<text x="${X(i)}" y="${alto - 7}" class="g-num" text-anchor="middle">${esc(fx(o.etiquetas[i], i))}</text>`;

  const barras = o.series.filter((s) => s.tipo === 'barras');
  const banda = iw / Math.max(1, n);
  const anchoBarra = Math.max(2, Math.min(16, (banda - 2) / Math.max(1, barras.length) - 2));
  barras.forEach((s, bi) => {
    s.valores.forEach((v, i) => {
      if (!v) return;
      const x = X(i) - (barras.length * (anchoBarra + 2)) / 2 + bi * (anchoBarra + 2) + 1;
      const y = Y(v), h = arriba + ih - y;
      const r = Math.min(4, anchoBarra / 2, h);
      // Punta redondeada, base plana sobre el eje.
      svg += `<path d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + anchoBarra - r}Q${x + anchoBarra},${y} ${x + anchoBarra},${y + r}V${y + h}Z" fill="${s.color}"/>`;
    });
  });
  for (const s of o.series.filter((x) => x.tipo !== 'barras')) {
    let d = '';
    let empezado = false;
    s.valores.forEach((v, i) => {
      if (v === null) { empezado = false; return; }
      d += `${empezado ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
      empezado = true;
    });
    if (s.tipo === 'area' && d) {
      const primeros = s.valores.findIndex((v) => v !== null);
      const ultimo = s.valores.length - 1 - [...s.valores].reverse().findIndex((v) => v !== null);
      svg += `<path d="${d}L${X(ultimo)},${Y(0)}L${X(primeros)},${Y(0)}Z" fill="${s.color}" opacity="0.14"/>`;
    }
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  svg += `<line class="g-cruz" x1="0" x2="0" y1="${arriba}" y2="${arriba + ih}" visibility="hidden"/>`;
  svg += `<g class="g-puntos"></g>`;
  svg += `<rect class="g-zona" x="${izq}" y="${arriba}" width="${iw}" height="${ih}" fill="transparent"/></svg>`;

  const leyenda = o.series.length > 1
    ? `<div class="g-leyenda">${o.series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.nombre)}</span>`).join('')}</div>` : '';
  raiz.innerHTML = `${leyenda}<div class="g-lienzo">${svg}${!hayDatos ? `<div class="g-vacio">${esc(o.vacio ?? 'Sin datos todavía')}</div>` : ''}<div class="g-tip" hidden></div></div>`;

  const zona = raiz.querySelector('.g-zona') as SVGRectElement;
  const cruz = raiz.querySelector('.g-cruz') as SVGLineElement;
  const puntos = raiz.querySelector('.g-puntos') as SVGGElement;
  const tip = raiz.querySelector('.g-tip') as HTMLElement;
  const lienzo = raiz.querySelector('.g-lienzo') as HTMLElement;
  const fuera = () => { tip.hidden = true; cruz.setAttribute('visibility', 'hidden'); puntos.innerHTML = ''; };
  zona.addEventListener('pointerleave', fuera);
  zona.addEventListener('pointermove', (ev) => {
    if (!n) return;
    const r = zona.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.floor(((ev.clientX - r.left) / r.width) * n)));
    const x = X(i);
    cruz.setAttribute('x1', String(x));
    cruz.setAttribute('x2', String(x));
    cruz.setAttribute('visibility', 'visible');
    puntos.innerHTML = o.series.filter((s) => s.tipo !== 'barras' && s.valores[i] !== null)
      .map((s) => `<circle cx="${x}" cy="${Y(s.valores[i]!)}" r="4.5" fill="${s.color}" class="g-punto"/>`).join('');
    tip.innerHTML = `<b>${esc(o.etiquetas[i])}</b>${o.series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.nombre)}<em>${s.valores[i] === null ? 'sin dato' : esc(fy(s.valores[i]!))}</em></span>`).join('')}`;
    tip.hidden = false;
    const lado = x > W * 0.6 ? x - tip.offsetWidth - 14 : x + 14;
    tip.style.left = `${Math.max(0, lado)}px`;
    tip.style.top = `${Math.max(0, ev.clientY - lienzo.getBoundingClientRect().top - tip.offsetHeight / 2)}px`;
  });
}

// Línea pequeña para las tarjetas de cifras. Sin ejes: solo la forma.
export function chispa(valores: number[], color = 'var(--s1)', ancho = 120, alto = 34): string {
  if (valores.length < 2) return '';
  const max = Math.max(1, ...valores);
  const pts = valores.map((v, i) => `${((i / (valores.length - 1)) * (ancho - 4) + 2).toFixed(1)},${(alto - 3 - (v / max) * (alto - 6)).toFixed(1)}`);
  return `<svg class="chispa" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" aria-hidden="true"><path d="M${pts.join('L')}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// Barra partida en trozos (100 %), con hueco de 2 px entre trozos y la leyenda con los números.
export function partida(partes: { nombre: string; valor: number; color: string }[]): string {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  return `<div class="partida">${partes.filter((p) => p.valor > 0).map((p) => `<i style="flex:${p.valor};background:${p.color}" title="${esc(p.nombre)}: ${p.valor}"></i>`).join('')}</div>
    <div class="g-leyenda partida-ley">${partes.map((p) => `<span><i style="background:${p.color}"></i>${esc(p.nombre)}<b>${p.valor}</b><em>${Math.round((p.valor / total) * 100)} %</em></span>`).join('')}</div>`;
}

// Medidor de uso (CPU, RAM, disco): el color dice el estado y va siempre con su número.
export function medidor(pct: number, etiqueta = ''): string {
  const p = Math.max(0, Math.min(100, pct || 0));
  const estado = p >= 90 ? 'critico' : p >= 75 ? 'aviso' : 'bien';
  return `<div class="medidor ${estado}" title="${etiqueta ? `${esc(etiqueta)}: ` : ''}${p.toFixed(0)} %"><div style="width:${p}%"></div></div>`;
}

// Barras horizontales para listas cortas (labs más usados, sesiones por lab).
export function barrasH(filas: { etiqueta: string; valor: number; extra?: string }[], formato = (v: number) => String(v), color = 'var(--s1)'): string {
  if (!filas.length) return '<p class="a-vacio">Sin datos todavía.</p>';
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return `<div class="barrash">${filas.map((f) => `<div class="barrash-f"><span class="barrash-e" title="${esc(f.etiqueta)}">${esc(f.etiqueta)}</span>
    <span class="barrash-b"><i style="width:${(f.valor / max) * 100}%;background:${color}"></i></span><span class="barrash-v">${esc(formato(f.valor))}${f.extra ? `<small>${esc(f.extra)}</small>` : ''}</span></div>`).join('')}</div>`;
}
