// Contrato de los widgets de lección. Un widget es una función que pinta en un elemento.
// Recibe sus props (lo que pone la lección) y un contexto para hablar con el lab y con el reproductor.
import type { ConexionLab } from './conexion';

export interface Ctx {
  /** Lab de este paso de la lección (el que se ve a la derecha). */
  lab(): ConexionLab | undefined;
  /** El widget obliga a hacer algo antes de seguir. Devuelve la función que lo libera. */
  espera(): () => void;
  /** Suma XP y lo celebra junto a un elemento. */
  xp(n: number, el?: Element): void;
  /** Se llama al salir del paso (para darse de baja de sondas, timers…). */
  alSalir(f: () => void): void;
  /** Lo que el alumno teclea en cualquier terminal del lab. */
  alTeclear(f: (texto: string) => void): void;
  /** Resalta una zona del panel del lab: "maquinas", "terminal", "pestanas" o un nodo. */
  senalar(zona: string, si: boolean): void;
  /** Lleva el foco a la terminal de un nodo. */
  terminal(nodo?: string): void;
  /** La lección y el paso (desde 0) en los que está el widget. */
  leccion?: string;
  paso?: number;
}

export type Widget = (el: HTMLElement, p: any, ctx: Ctx) => void;

export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Markdown mínimo: **negrita**, `código`, *énfasis*. Dentro del código no se toca nada (ls *.log).
export const md = (s: string) =>
  String(s ?? '').split('`').map((trozo, i) => (i % 2
    ? `<code>${esc(trozo)}</code>`
    : esc(trozo).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>'))).join('');

export function h(tag: string, clase = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (html) e.innerHTML = html;
  return e;
}

export const barajar = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Suscribe a una sonda del lab del paso y se da de baja al salir. */
export function vivo(ctx: Ctx, id: string, f: (v: string) => void, sinLab?: () => void) {
  const lab = ctx.lab();
  if (!lab) { sinLab?.(); return; }
  ctx.alSalir(lab.sonda(id, f));
}

export function sacudir(el: Element) {
  el.classList.remove('w-sacude');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('w-sacude');
}
