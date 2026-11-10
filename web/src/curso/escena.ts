// Teoría animada: un diagrama dibujado a mano (rough.js) que avanza por pasos.
// Cada paso dice qué se ve, qué se ilumina y qué viaja de un nodo a otro. Tocar un nodo explica qué es.
import rough from 'roughjs';
import { ajustes } from '../recompensa';

export type Forma = 'caja' | 'circulo' | 'cilindro' | 'nube' | 'doc';
export interface Nodo { id: string; x: number; y: number; w?: number; h?: number; txt: string; sub?: string; color?: string; forma?: Forma; info?: string }
export interface Flecha { id: string; de: string; a: string; txt?: string; color?: string; curva?: number }
export interface Paso {
  texto: string;
  ver?: string[];
  ocultar?: string[];
  luz?: string[];
  viaja?: { de: string; a: string; txt?: string; color?: string }[];
  cambia?: Record<string, { txt?: string; sub?: string }>;
}
export interface Predice { antes: number; pregunta: string; opciones: string[]; ok: number; porque: string }
export interface Escena { alto?: number; nodos: Nodo[]; flechas?: Flecha[]; pasos: Paso[]; predice?: Predice[] }

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, a: Record<string, string | number> = {}, txt?: string) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
  if (txt !== undefined) e.textContent = txt;
  return e;
};
const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(`--${v}`).trim() || '#9aa3b5';
const color = (c?: string) => (c?.startsWith('#') ? c : css(c ?? 'acento'));

export class Reproductor {
  paso = 0;
  onPaso?: (i: number, p: Paso) => void;
  private svg: SVGSVGElement;
  private grupos = new Map<string, SVGGElement>();
  private textos = new Map<string, { t: SVGTextElement; s?: SVGTextElement }>();
  private viajeros: SVGGElement;

  constructor(caja: HTMLElement, private esc: Escena, private alTocar: (n: Nodo) => void) {
    const alto = esc.alto ?? 380;
    this.svg = el('svg', { viewBox: `0 0 900 ${alto}`, class: 'escena-svg', role: 'img' }) as SVGSVGElement;
    caja.replaceChildren(this.svg);
    this.dibujar();
    this.viajeros = el('g') as SVGGElement;
    this.svg.append(this.viajeros);
  }

  private centro(id: string) {
    const n = this.esc.nodos.find((x) => x.id === id)!;
    return { x: n.x, y: n.y, w: n.w ?? 130, h: n.h ?? 64 };
  }

  private dibujar() {
    const rc = rough.svg(this.svg);
    const tx = css('texto'), su = css('suave'), fondo = css('panel-2');
    let seed = 7;
    for (const f of this.esc.flechas ?? []) {
      const a = this.centro(f.de), b = this.centro(f.a);
      const g = el('g', { class: 'esc-el', 'data-id': f.id }) as SVGGElement;
      // Recorta la línea en el borde de cada caja para que la punta se vea.
      const borde = (p: typeof a, q: typeof a) => {
        const dx = q.x - p.x, dy = q.y - p.y;
        const k = Math.min(Math.abs((p.w / 2 + 6) / (dx || 1e-6)), Math.abs((p.h / 2 + 6) / (dy || 1e-6)));
        return { x: p.x + dx * k, y: p.y + dy * k };
      };
      const p1 = borde(a, b), p2 = borde(b, a);
      const c = color(f.color ?? 'suave');
      g.append(rc.line(p1.x, p1.y, p2.x, p2.y, { stroke: c, strokeWidth: 1.6, seed: seed++, roughness: 1.2 }));
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const punta = (d: number) => [p2.x - 12 * Math.cos(ang + d), p2.y - 12 * Math.sin(ang + d)] as [number, number];
      g.append(rc.linearPath([punta(0.45), [p2.x, p2.y], punta(-0.45)], { stroke: c, strokeWidth: 1.6, seed: seed++ }));
      if (f.txt) g.append(el('text', { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 8, fill: su, 'font-size': 13, 'text-anchor': 'middle', class: 'esc-mono' }, f.txt));
      this.grupos.set(f.id, g);
      this.svg.append(g);
    }
    for (const n of this.esc.nodos) {
      const w = n.w ?? 130, h = n.h ?? 64, x = n.x - w / 2, y = n.y - h / 2;
      const c = color(n.color);
      const g = el('g', { class: 'esc-el esc-nodo', 'data-id': n.id, tabindex: 0, style: `--c: ${c}` }) as SVGGElement;
      const o = { stroke: c, strokeWidth: 2, fill: fondo, fillStyle: 'solid', seed: seed++, roughness: 1.1 };
      // El halo solo se ve en el nodo del paso (luz) o en el que has tocado. Lo pinta widgets.css.
      const halo = el('rect', { x: x - 9, y: y - 9, width: w + 18, height: h + 18, rx: 16, class: 'esc-halo', fill: c, stroke: c });
      g.append(halo);
      switch (n.forma) {
        case 'circulo': g.append(rc.ellipse(n.x, n.y, w, h, o)); break;
        case 'cilindro':
          g.append(rc.rectangle(x, y + 8, w, h - 16, o), rc.ellipse(n.x, y + h - 8, w, 16, o), rc.ellipse(n.x, y + 8, w, 16, o));
          break;
        case 'nube': g.append(rc.ellipse(n.x, n.y, w, h, { ...o, roughness: 2.4 })); break;
        case 'doc': g.append(rc.polygon([[x, y], [x + w - 16, y], [x + w, y + 16], [x + w, y + h], [x, y + h]], o)); break;
        default: g.append(rc.rectangle(x, y, w, h, o));
      }
      const t = el('text', { x: n.x, y: n.sub ? n.y - 3 : n.y + 5, fill: tx, 'font-size': 16, 'text-anchor': 'middle', 'font-weight': 700 }, n.txt) as SVGTextElement;
      g.append(t);
      let s: SVGTextElement | undefined;
      if (n.sub !== undefined) {
        s = el('text', { x: n.x, y: n.y + 16, fill: su, 'font-size': 12, 'text-anchor': 'middle', class: 'esc-mono' }, n.sub) as SVGTextElement;
        g.append(s);
      }
      if (n.info) {
        g.classList.add('tocable');
        const tocar = () => {
          for (const o of this.grupos.values()) o.classList.remove('tocado');
          g.classList.add('tocado');
          this.alTocar(n);
        };
        g.addEventListener('click', tocar);
        g.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') tocar(); });
      }
      this.textos.set(n.id, { t, s });
      this.grupos.set(n.id, g);
      this.svg.append(g);
    }
  }

  ir(i: number) {
    const pasos = this.esc.pasos;
    this.paso = Math.max(0, Math.min(pasos.length - 1, i));
    const vis = new Set<string>();
    const txt = new Map<string, { txt?: string; sub?: string }>();
    for (let k = 0; k <= this.paso; k++) {
      pasos[k].ver?.forEach((id) => vis.add(id));
      pasos[k].ocultar?.forEach((id) => vis.delete(id));
      for (const [id, c] of Object.entries(pasos[k].cambia ?? {})) txt.set(id, { ...txt.get(id), ...c });
    }
    const p = pasos[this.paso];
    const luz = new Set(p.luz ?? []);
    for (const [id, g] of this.grupos) {
      g.classList.toggle('visible', vis.has(id));
      g.classList.toggle('luz', luz.has(id));
    }
    for (const n of this.esc.nodos) {
      const t = this.textos.get(n.id)!;
      const c = txt.get(n.id);
      t.t.textContent = c?.txt ?? n.txt;
      if (t.s) t.s.textContent = c?.sub ?? n.sub ?? '';
    }
    this.viajar(p.viaja ?? []);
    this.onPaso?.(this.paso, p);
  }

  private viajar(vs: NonNullable<Paso['viaja']>) {
    this.viajeros.replaceChildren();
    vs.forEach((v, k) => {
      const a = this.centro(v.de), b = this.centro(v.a);
      const g = el('g', { class: 'esc-viajero' }) as SVGGElement;
      const c = color(v.color ?? 'xp');
      const ancho = Math.max(34, (v.txt?.length ?? 2) * 8.2 + 18);
      g.append(el('rect', { x: -ancho / 2, y: -13, width: ancho, height: 26, rx: 13, fill: c }), el('text', { x: 0, y: 5, 'font-size': 13, 'text-anchor': 'middle', fill: css('sobre-acento'), 'font-weight': 700, class: 'esc-mono' }, v.txt ?? '●'));
      this.viajeros.append(g);
      if (!ajustes.movimiento) { g.setAttribute('transform', `translate(${(a.x + b.x) / 2},${(a.y + b.y) / 2})`); return; }
      const dur = 1100, t0 = performance.now() + k * 450;
      const paso = (t: number) => {
        if (!g.isConnected) return;
        const f = Math.max(0, Math.min(1, (t - t0) / dur));
        const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
        g.setAttribute('transform', `translate(${a.x + (b.x - a.x) * e},${a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * 18})`);
        g.style.opacity = t < t0 ? '0' : '1';
        if (f < 1) requestAnimationFrame(paso);
        else setTimeout(() => { g.style.transition = 'opacity 0.5s'; g.style.opacity = '0'; }, 900);
      };
      requestAnimationFrame(paso);
    });
  }
}
