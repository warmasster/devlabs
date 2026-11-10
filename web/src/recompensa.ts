// Recompensa inmediata: sonido corto, "+XP" flotante y destello. Todo desactivable.
import './isla.css';
import { chipCuenta } from './cuenta/sesion';

const pref = (k: string, def = '1') => { try { return localStorage.getItem(`relavops.${k}`) ?? def; } catch { return def; } };
export const ajustes = {
  get sonido() { return pref('sonido') === '1'; },
  get movimiento() { return pref('movimiento') === '1' && !matchMedia('(prefers-reduced-motion: reduce)').matches; },
  set(k: 'sonido' | 'movimiento' | 'dislexia', v: boolean) {
    try { localStorage.setItem(`relavops.${k}`, v ? '1' : '0'); } catch {}
    aplicar();
  },
};

// Dos modos de interfaz con la misma lógica debajo. "isla" es el de dibujos con el mapa de islas
// (estilos en isla.css). "clasico" es el sobrio de siempre, con sus temas de /disenos.
export type Modo = 'isla' | 'clasico';
export const modo = (): Modo => (pref('modo', 'isla') === 'clasico' ? 'clasico' : 'isla');
export function cambiarModo(m: Modo) {
  try { localStorage.setItem('relavops.modo', m); } catch {}
  location.reload();
}

export function aplicar() {
  const r = document.documentElement;
  r.dataset.movimiento = pref('movimiento');
  r.dataset.dislexia = pref('dislexia', '0');
  r.dataset.modo = modo();
  // Sistema de diseño elegido en /disenos: tema + colores y radio a medida. Solo en el clásico.
  r.dataset.tema = pref('tema', 'pizarra');
  let propios: Record<string, string> = {};
  try { propios = JSON.parse(localStorage.getItem('relavops.colores') ?? '{}'); } catch {}
  for (const v of ['acento', 'ok', 'aviso', 'mal', 'xp', 'radio', 'radio-s']) r.style.removeProperty(`--${v}`);
  if (modo() === 'clasico') for (const [k, v] of Object.entries(propios)) r.style.setProperty(`--${k}`, v);
  if (modo() === 'isla') ponerTemblor();
}

// Filtro SVG que mueve un poco los bordes, como un dibujo animado a mano. Cambia de semilla
// tres veces por segundo (en CSS, con steps) y así las líneas "hierven" sin tocar el texto.
function ponerTemblor() {
  const montar = () => {
    if (document.getElementById('dl-temblor')) return;
    const d = document.createElement('div');
    d.id = 'dl-temblor';
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = `<svg width="0" height="0"><defs>${[1, 2, 3].map((s) => `
      <filter id="dl-tiembla-${s}"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${s * 7}"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>`).join('')}
    </defs></svg>`;
    document.body.prepend(d);
  };
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar, { once: true });
}
aplicar();

let ctx: AudioContext | undefined;
function tono(freq: number, inicio: number, dur: number, vol = 0.12, tipo: OscillatorType = 'sine') {
  ctx ??= new AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  const t = ctx.currentTime + inicio;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function ding() {
  if (!ajustes.sonido) return;
  tono(880, 0, 0.18);
  tono(1320, 0.07, 0.25);
}

export function fanfarria() {
  if (!ajustes.sonido) return;
  [523, 659, 784, 1047].forEach((f, i) => tono(f, i * 0.09, 0.3, 0.1, 'triangle'));
}

export function xpFlotante(cerca: Element, xp: number) {
  if (!ajustes.movimiento) return;
  const r = cerca.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'xp-flotante';
  el.textContent = `+${xp} XP`;
  el.style.left = `${r.left + r.width / 2 - 30}px`;
  el.style.top = `${r.top - 4}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1200);
}

export function destello(el: Element) {
  el.classList.remove('destello');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('destello');
}

export function celebrar(el: Element, xp: number) {
  ding();
  xpFlotante(el, xp);
  destello(el);
}

export function confeti() {
  if (!ajustes.movimiento) return;
  const c = document.createElement('canvas');
  c.width = innerWidth; c.height = innerHeight;
  Object.assign(c.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '60' });
  document.body.append(c);
  const g = c.getContext('2d')!;
  const colores = ['#7cc4ff', '#c084fc', '#4ade80', '#fbbf24', '#f87171'];
  const ps = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - 0.5) * 14, vy: Math.random() * -12 - 3,
    r: Math.random() * 6 + 3, c: colores[(Math.random() * colores.length) | 0], a: Math.random() * 6,
  }));
  let n = 0;
  const paso = () => {
    g.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
    }
    if (++n < 110) requestAnimationFrame(paso); else c.remove();
  };
  paso();
}

type Pref = 'sonido' | 'movimiento' | 'dislexia';

function botonPref(label: string, k: Pref, def: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = label;
  const sync = () => b.setAttribute('aria-pressed', String(pref(k, def) === '1'));
  sync();
  b.onclick = () => { ajustes.set(k, pref(k, def) !== '1'); sync(); };
  return b;
}

// Lo que va arriba en todas las páginas: sonido, animación y tu cuenta. El resto de ajustes
// (dislexia y el modo de la interfaz) está en Mi cuenta, en Preferencias (opcionesCuenta).
export function panelAjustes(): HTMLElement {
  const d = document.createElement('div');
  d.style.display = 'flex'; d.style.gap = '6px'; d.style.alignItems = 'center';
  d.append(botonPref('«ic:volume-2» Sonido', 'sonido', '1'), botonPref('«ic:sparkles» Animación', 'movimiento', '1'));
  d.append(chipCuenta()); // tu cuenta, a la derecha del todo (no sale si labd va sin cuentas)
  return d;
}

// Las preferencias que viven en Mi cuenta. Se guardan en este navegador, como las de arriba.
export function opcionesCuenta(): HTMLElement {
  const d = document.createElement('div');
  d.className = 'cp-fila';
  d.append(botonPref('Aa Letra para dislexia', 'dislexia', '0'));
  const m = document.createElement('button');
  m.className = 'btn btn-modo';
  m.textContent = modo() === 'isla' ? 'Pasar al modo clásico' : 'Pasar al modo islas';
  m.title = 'Cambia el aspecto. Las lecciones y los labs son los mismos.';
  m.onclick = () => cambiarModo(modo() === 'isla' ? 'clasico' : 'isla');
  d.append(m);
  return d;
}
