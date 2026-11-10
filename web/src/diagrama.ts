// Diagrama dibujado a mano (rough.js) de h1 — r1 — h2, animable paquete a paquete.
import rough from 'roughjs';

const NS = 'http://www.w3.org/2000/svg';
export type NodoId = 'h1' | 'r1' | 'h2';
export const POS: Record<NodoId, { x: number; y: number }> = { h1: { x: 130, y: 150 }, r1: { x: 450, y: 150 }, h2: { x: 770, y: 150 } };
const W = 170, H = 96;

const tinta = '#e7e9ee', suave = '#9aa3b5', acento = '#7cc4ff', xp = '#c084fc', ok = '#4ade80', aviso = '#fbbf24';

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, txt?: string) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function texto(x: number, y: number, t: string, o: { size?: number; color?: string; anchor?: string; weight?: number; mono?: boolean } = {}) {
  return el('text', {
    x, y, fill: o.color ?? tinta, 'font-size': o.size ?? 15, 'text-anchor': o.anchor ?? 'middle',
    'font-weight': o.weight ?? 400, 'font-family': o.mono ? 'Cascadia Mono, Consolas, monospace' : 'Segoe UI, system-ui, sans-serif',
  }, t);
}

export interface NodoInfo { nombre: NodoId; ips: string[]; macs: Record<string, string> }

export class Diagrama {
  private rc;
  private capaPaquete: SVGGElement;
  private tablas: Record<NodoId, SVGGElement> = {} as any;
  private rutas?: SVGGElement;
  arp: Record<NodoId, Map<string, string>> = { h1: new Map(), r1: new Map(), h2: new Map() };

  constructor(private svg: SVGSVGElement, private nodos: Record<NodoId, NodoInfo>) {
    this.rc = rough.svg(svg);
    svg.innerHTML = '';
    this.fondo();
    this.capaPaquete = el('g');
    svg.append(this.capaPaquete);
  }

  private fondo() {
    const s = this.svg, rc = this.rc;
    // enlaces
    const enlace = (a: NodoId, b: NodoId, red: string, ifa: string, ifb: string) => {
      const y = POS[a].y;
      s.append(rc.line(POS[a].x + W / 2, y, POS[b].x - W / 2, y, { stroke: suave, strokeWidth: 2, roughness: 1.2, seed: 7 }));
      s.append(texto((POS[a].x + POS[b].x) / 2, y - 12, red, { size: 13, color: suave, mono: true }));
      s.append(texto(POS[a].x + W / 2 + 26, y + 20, ifa, { size: 12, color: suave, mono: true }));
      s.append(texto(POS[b].x - W / 2 - 26, y + 20, ifb, { size: 12, color: suave, mono: true }));
    };
    enlace('h1', 'r1', '10.0.1.0/24', 'eth1', 'eth1');
    enlace('r1', 'h2', '10.0.2.0/24', 'eth2', 'eth1');
    // nodos
    (Object.keys(POS) as NodoId[]).forEach((id, i) => {
      const { x, y } = POS[id];
      const g = el('g', { id: `nodo-${id}` });
      g.append(this.rc.rectangle(x - W / 2, y - H / 2, W, H, {
        stroke: id === 'r1' ? xp : acento, strokeWidth: 2, fill: '#1b1f2b', fillStyle: 'solid', roughness: 1.4, seed: 11 + i,
      }));
      g.append(texto(x, y - 18, id === 'r1' ? 'r1 · router' : id, { size: 18, weight: 700 }));
      const n = this.nodos[id];
      n.ips.forEach((ip, k) => g.append(texto(x, y + 6 + k * 18, ip, { size: 13, mono: true, color: suave })));
      s.append(g);
      // tabla ARP
      const t = el('g', { id: `arp-${id}` });
      s.append(t);
      this.tablas[id] = t;
    });
    this.pintarTablas();
    // tabla de rutas de r1
    this.rutas = el('g');
    s.append(this.rutas);
    this.pintarRutas(-1);
  }

  pintarTablas(nuevo?: { nodo: NodoId; ip: string }) {
    for (const id of Object.keys(POS) as NodoId[]) {
      const g = this.tablas[id];
      g.innerHTML = '';
      const { x } = POS[id];
      const y0 = id === 'r1' ? 330 : 250;
      g.append(texto(x, y0, 'tabla ARP', { size: 12, color: suave }));
      const filas = [...this.arp[id].entries()];
      if (!filas.length) g.append(texto(x, y0 + 20, '(vacía)', { size: 12, color: '#5b6478', mono: true }));
      filas.forEach(([ip, mac], k) => {
        const esNuevo = nuevo?.nodo === id && nuevo.ip === ip;
        g.append(texto(x, y0 + 20 + k * 18, `${ip} → ${mac.slice(-5)}`, { size: 12, mono: true, color: esNuevo ? aviso : tinta }));
      });
    }
  }

  pintarRutas(activa: number) {
    const g = this.rutas!;
    g.innerHTML = '';
    const { x } = POS.r1;
    g.append(texto(x, 236, 'tabla de rutas', { size: 12, color: suave }));
    ['10.0.1.0/24 → eth1', '10.0.2.0/24 → eth2'].forEach((r, k) => {
      if (k === activa) g.append(this.rc.rectangle(x - 80, 246 + k * 20, 160, 19, { stroke: ok, roughness: 0.8, seed: 3 }));
      g.append(texto(x, 260 + k * 20, r, { size: 12, mono: true, color: k === activa ? ok : tinta }));
    });
  }

  limpiar() { this.capaPaquete.innerHTML = ''; }

  // Anima un paquete de "de" a "a". broadcast = dibuja también la onda expansiva.
  async paquete(de: NodoId, a: NodoId, etiqueta: string, color: string, broadcast = false, ms = 900) {
    this.limpiar();
    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === '0';
    const x0 = POS[de].x + (POS[a].x > POS[de].x ? W / 2 : -W / 2), x1 = POS[a].x + (POS[a].x > POS[de].x ? -W / 2 : W / 2);
    const y = POS[de].y - 4;
    const g = el('g');
    g.append(this.rc.rectangle(-34, -14, 68, 28, { stroke: color, fill: '#0f1117', fillStyle: 'solid', roughness: 1.3, seed: 5, strokeWidth: 2 }));
    g.append(this.rc.line(-34, -14, 0, 2, { stroke: color, roughness: 1, seed: 6 }));
    g.append(this.rc.line(34, -14, 0, 2, { stroke: color, roughness: 1, seed: 8 }));
    const lbl = texto(0, 34, etiqueta, { size: 13, color, weight: 600 });
    g.append(lbl);
    this.capaPaquete.append(g);
    if (broadcast && !reducir) {
      const c = el('circle', { cx: x0, cy: y, r: 10, fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.8 });
      this.capaPaquete.prepend(c);
      c.animate([{ r: 10, opacity: 0.8 }, { r: 120, opacity: 0 }] as any, { duration: ms * 1.2, easing: 'ease-out' });
    }
    if (reducir) {
      g.setAttribute('transform', `translate(${x1},${y})`);
      return;
    }
    const t0 = performance.now();
    await new Promise<void>((fin) => {
      const paso = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        g.setAttribute('transform', `translate(${x0 + (x1 - x0) * e},${y})`);
        if (k < 1) requestAnimationFrame(paso); else fin();
      };
      requestAnimationFrame(paso);
    });
  }

  resaltar(id: NodoId) {
    const n = this.svg.querySelector(`#nodo-${id}`) as SVGGElement | null;
    n?.animate([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], { duration: 500 });
  }
}
