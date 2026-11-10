// Piezas intercambiables del mapa de islas. Cada una es una función que devuelve SVG.
// Para añadir un fondo, una forma de isla o un personaje, suma una entrada a su lista y ya sale
// en "Cambia el mundo". Para cambiar el adorno de una isla, toca ADORNOS (uno por lección).
// Todo se dibuja con formas simples, borde oscuro gordo y colores planos.

export const LINEA = '#0d0a26';

// Números al azar repetibles: el mismo mapa sale igual cada vez.
export function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Una mancha cerrada y suave alrededor de (0, 0). Sirve para islas, nubes y charcos.
export function mancha(rx: number, ry: number, puntos: number, temblor: number, r: () => number) {
  const ps = Array.from({ length: puntos }, (_, i) => {
    const a = (i / puntos) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * temblor;
    return [Math.cos(a) * rx * k, Math.sin(a) * ry * k];
  });
  const medio = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M ${medio(ps[puntos - 1], ps[0]).map((n) => n.toFixed(1)).join(' ')}`;
  for (let i = 0; i < puntos; i++) {
    const p = ps[i];
    const m = medio(p, ps[(i + 1) % puntos]);
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + ' Z';
}

export interface Opcion { id: string; nombre: string }

// ---------- Fondos ----------
export interface Fondo extends Opcion { pintar: (w: number, h: number, r: () => number) => string }

export const FONDOS: Fondo[] = [
  {
    id: 'mar', nombre: 'Mar de datos',
    pintar: (w, h, r) => {
      let s = `<defs><linearGradient id="mi-mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1757"/><stop offset="1" stop-color="#0f1d4a"/></linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#mi-mar)"/>`;
      for (let y = 40; y < h; y += 46) {
        let d = `M -60 ${y}`;
        for (let x = -60; x < w + 80; x += 40) d += ` q 10 ${-6 - r() * 4} 20 0 t 20 0`;
        s += `<path class="mi-ola" style="animation-delay:-${(r() * 7).toFixed(1)}s" d="${d}" fill="none" stroke="#3a35a0" stroke-width="2.5" stroke-linecap="round" opacity="${(0.25 + r() * 0.35).toFixed(2)}"/>`;
      }
      for (let i = 0; i < 26; i++) {
        s += `<text class="mi-sube" style="animation-delay:-${(r() * 14).toFixed(1)}s" x="${(r() * w).toFixed(0)}" y="${(r() * h + 200).toFixed(0)}" font-size="${(12 + r() * 10).toFixed(0)}" fill="#6a63d8" font-family="monospace" font-weight="700">${r() > 0.5 ? '1' : '0'}</text>`;
      }
      return s;
    },
  },
  {
    id: 'placa', nombre: 'Placa base',
    pintar: (w, h, r) => {
      let s = `<rect width="${w}" height="${h}" fill="#0f2b25"/>`;
      for (let i = 0; i < 34; i++) {
        let x = Math.round((r() * w) / 20) * 20;
        let y = Math.round((r() * h) / 20) * 20;
        let d = `M ${x} ${y}`;
        for (let k = 0; k < 4; k++) {
          if (k % 2 === 0) x += (r() > 0.5 ? 1 : -1) * (40 + Math.round(r() * 4) * 20);
          else y += (r() > 0.5 ? 1 : -1) * (40 + Math.round(r() * 4) * 20);
          d += ` L ${x} ${y}`;
        }
        s += `<path d="${d}" fill="none" stroke="#1d5546" stroke-width="4" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="6" fill="#0f2b25" stroke="#2c7a61" stroke-width="3"/>`;
      }
      for (let i = 0; i < 20; i++) {
        s += `<circle class="mi-titila" style="animation-delay:-${(r() * 3).toFixed(1)}s" cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="3" fill="${r() > 0.5 ? '#5ff2a8' : '#ffd166'}"/>`;
      }
      return s;
    },
  },
  {
    id: 'noche', nombre: 'Noche',
    pintar: (w, h, r) => {
      let s = `<defs><linearGradient id="mi-noche" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#110b33"/><stop offset="1" stop-color="#2b1756"/></linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#mi-noche)"/>
        <circle cx="${w - 90}" cy="90" r="42" fill="#fff3c4" stroke="${LINEA}" stroke-width="4"/><circle cx="${w - 104}" cy="80" r="8" fill="#ead79a"/><circle cx="${w - 78}" cy="104" r="5" fill="#ead79a"/>`;
      for (let i = 0; i < 90; i++) {
        s += `<circle class="mi-titila" style="animation-delay:-${(r() * 3).toFixed(1)}s" cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(1 + r() * 2).toFixed(1)}" fill="#fff"/>`;
      }
      return s;
    },
  },
];

// ---------- Formas de isla ----------
// Se dibujan centradas en (0, 0), que es donde se apoya el adorno y el personaje.
export interface FormaIsla extends Opcion { pintar: (color: string, r: () => number) => string }

const oscuro = (hex: string, k = 0.55) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
};

export const ISLAS: FormaIsla[] = [
  {
    id: 'flotante', nombre: 'Isla flotante',
    pintar: (color, r) => {
      const abajo = `M -84 2 Q -70 40 -38 58 L -20 92 L -2 70 L 14 104 L 30 66 Q 66 46 84 2 Z`;
      return `<path d="${abajo}" fill="#3b2f7a" stroke="${LINEA}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M -30 60 L -18 82 M 16 70 L 24 90" stroke="#2a2160" stroke-width="4" stroke-linecap="round"/>
        <path d="${mancha(88, 30, 9, 0.18, r)}" fill="${color}" stroke="${LINEA}" stroke-width="4"/>
        <path d="${mancha(58, 14, 7, 0.2, r)}" transform="translate(-10 -6)" fill="#ffffff" opacity="0.18"/>`;
    },
  },
  {
    id: 'chip', nombre: 'Chip',
    pintar: (color) => {
      let patas = '';
      for (let x = -64; x <= 64; x += 16) patas += `<rect x="${x - 4}" y="22" width="8" height="18" rx="2" fill="#e8c65a" stroke="${LINEA}" stroke-width="3"/><rect x="${x - 4}" y="-40" width="8" height="18" rx="2" fill="#e8c65a" stroke="${LINEA}" stroke-width="3"/>`;
      return `${patas}<rect x="-84" y="-22" width="168" height="58" rx="12" fill="${oscuro(color, 0.4)}" stroke="${LINEA}" stroke-width="4"/>
        <rect x="-84" y="-30" width="168" height="56" rx="12" fill="${oscuro(color, 0.7)}" stroke="${LINEA}" stroke-width="4"/>
        <path d="M -60 -12 h 30 v 14 h 24 M 26 -14 h 20 v 22 h 16" fill="none" stroke="${color}" stroke-width="3" opacity="0.7"/>
        <circle cx="-66" cy="12" r="5" fill="${LINEA}" opacity="0.5"/>`;
    },
  },
  {
    id: 'nube', nombre: 'Nube',
    pintar: (color) => {
      const bolas: [number, number, number][] = [[-52, 6, 30], [-18, -8, 38], [26, -4, 36], [58, 10, 26], [4, 16, 34]];
      const c = (fill: string, borde: number) => bolas.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${fill}" stroke="${LINEA}" stroke-width="${borde}"/>`).join('');
      return `${c('#f1eeff', 8)}${c('#f1eeff', 0)}<ellipse cx="0" cy="-6" rx="70" ry="16" fill="${color}" opacity="0.55"/>`;
    },
  },
];

// ---------- Personajes ----------
// De pie en (0, 0), mirando a la derecha. .mi-respira y .mi-ojo los anima isla.css.
export interface Personaje extends Opcion { svg: string }

export const PERSONAJES: Personaje[] = [
  {
    id: 'cursi', nombre: 'Cursi',
    svg: `<g class="mi-respira">
      <ellipse cx="-11" cy="-2" rx="8" ry="4.5" fill="${LINEA}"/><ellipse cx="11" cy="-2" rx="8" ry="4.5" fill="${LINEA}"/>
      <line x1="2" y1="-52" x2="6" y2="-64" stroke="${LINEA}" stroke-width="3.5" stroke-linecap="round"/><circle cx="6.5" cy="-66" r="4.5" fill="#ffd166" stroke="${LINEA}" stroke-width="3"/>
      <rect x="-24" y="-52" width="48" height="48" rx="14" fill="#5ff2a8" stroke="${LINEA}" stroke-width="3.5"/>
      <rect x="-16" y="-44" width="32" height="23" rx="7" fill="#0e0b26"/>
      <g class="mi-ojo"><rect x="-10" y="-39" width="6" height="9" rx="2" fill="#5ff2a8"/><rect x="5" y="-39" width="6" height="9" rx="2" fill="#5ff2a8"/></g>
      <rect class="mi-luz" x="-3" y="-27" width="8" height="2.6" fill="#5ff2a8"/>
      <circle cx="-17" cy="-12" r="3.5" fill="#ff6f91" opacity="0.8"/><circle cx="17" cy="-12" r="3.5" fill="#ff6f91" opacity="0.8"/>
    </g>`,
  },
  {
    id: 'pingu', nombre: 'Pingüino',
    svg: `<g class="mi-respira">
      <ellipse cx="-9" cy="-2" rx="9" ry="4.5" fill="#ffb347" stroke="${LINEA}" stroke-width="3"/><ellipse cx="9" cy="-2" rx="9" ry="4.5" fill="#ffb347" stroke="${LINEA}" stroke-width="3"/>
      <ellipse cx="0" cy="-30" rx="22" ry="27" fill="#24203f" stroke="${LINEA}" stroke-width="3.5"/>
      <ellipse cx="0" cy="-24" rx="14" ry="18" fill="#f6f3ff"/>
      <g class="mi-ojo"><circle cx="-6" cy="-42" r="5" fill="#fff"/><circle cx="7" cy="-42" r="5" fill="#fff"/><circle cx="-5" cy="-42" r="2.4" fill="${LINEA}"/><circle cx="8" cy="-42" r="2.4" fill="${LINEA}"/></g>
      <path d="M -5 -35 L 5 -35 L 0 -29 Z" fill="#ffb347" stroke="${LINEA}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M -21 -30 q -10 10 -4 20 M 21 -30 q 10 10 4 20" fill="none" stroke="${LINEA}" stroke-width="3.5" stroke-linecap="round"/>
    </g>`,
  },
  {
    id: 'bug', nombre: 'Bug',
    svg: `<g class="mi-respira">
      <path d="M -14 -14 l -12 10 M -16 -22 l -14 0 M -14 -30 l -12 -8 M 14 -14 l 12 10 M 16 -22 l 14 0 M 14 -30 l 12 -8" stroke="${LINEA}" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="0" cy="-20" rx="19" ry="17" fill="#ff6f91" stroke="${LINEA}" stroke-width="3.5"/>
      <line x1="0" y1="-36" x2="0" y2="-5" stroke="${LINEA}" stroke-width="2.5"/>
      <circle cx="0" cy="-42" r="12" fill="#c2456b" stroke="${LINEA}" stroke-width="3.5"/>
      <path d="M -5 -52 q -6 -10 -12 -10 M 5 -52 q 6 -10 12 -10" fill="none" stroke="${LINEA}" stroke-width="3" stroke-linecap="round"/>
      <g class="mi-ojo"><circle cx="-5" cy="-44" r="4.5" fill="#fff"/><circle cx="6" cy="-44" r="4.5" fill="#fff"/><circle cx="-4" cy="-44" r="2" fill="${LINEA}"/><circle cx="7" cy="-44" r="2" fill="${LINEA}"/></g>
      <circle cx="-8" cy="-22" r="3" fill="${LINEA}" opacity="0.5"/><circle cx="8" cy="-16" r="3" fill="${LINEA}" opacity="0.5"/>
    </g>`,
  },
];

// ---------- Adornos: lo que hay encima de cada isla, según de qué va la lección ----------
const t = (x: number, y: number, txt: string, size = 13, fill = '#5ff2a8') => `<text x="${x}" y="${y}" font-family="monospace" font-weight="700" font-size="${size}" fill="${fill}" text-anchor="middle">${txt}</text>`;

export const ADORNOS: Record<string, string> = {
  '0.0': `<rect x="-4" y="-34" width="8" height="32" fill="#a0784a" stroke="${LINEA}" stroke-width="3"/>
    <circle cx="0" cy="-50" r="24" fill="#ffd166" stroke="${LINEA}" stroke-width="4"/>
    <text x="0" y="-39" font-family="var(--sans), sans-serif" font-weight="800" font-size="32" fill="${LINEA}" text-anchor="middle">?</text>`,
  '0.3': `<rect x="-20" y="-70" width="40" height="68" rx="6" fill="#4a3f8f" stroke="${LINEA}" stroke-width="3.5"/>
    ${[-58, -38, -18].map((y, i) => `<rect x="-14" y="${y}" width="28" height="13" rx="3" fill="#2f2766" stroke="${LINEA}" stroke-width="2.5"/><circle class="mi-luz ${'abc'[i]}" cx="8" cy="${y + 6.5}" r="3" fill="${['#5ff2a8', '#ffd166', '#ff6f91'][i]}"/>`).join('')}`,
  '0.1': `<rect x="-42" y="-72" width="84" height="66" rx="9" fill="#0e0b26" stroke="${LINEA}" stroke-width="4"/>
    <path d="M -42 -57 L -42 -63 Q -42 -72 -33 -72 L 33 -72 Q 42 -72 42 -63 L 42 -57 Z" fill="#8b84c9"/><line x1="-42" y1="-57" x2="42" y2="-57" stroke="${LINEA}" stroke-width="3"/>
    <circle cx="-32" cy="-64.5" r="3" fill="#ff6f91"/><circle cx="-23" cy="-64.5" r="3" fill="#ffd166"/><circle cx="-14" cy="-64.5" r="3" fill="#5ff2a8"/>
    ${t(-24, -27, '$', 22)}<rect class="mi-luz" x="-12" y="-34" width="14" height="5" fill="#5ff2a8"/>`,
  '0.2': `<path d="M -36 -8 L -36 -46 L -18 -46 L -12 -40 L 18 -40 L 18 -8 Z" fill="#e0a83a" stroke="${LINEA}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M -22 -2 L -22 -36 L -4 -36 L 2 -30 L 34 -30 L 34 -2 Z" fill="#ffd166" stroke="${LINEA}" stroke-width="3.5" stroke-linejoin="round"/>${t(6, -12, '/', 14, LINEA)}`,
  '0.4': `<path d="M -30 -14 L 0 -54 L 30 -14 Z" fill="none" stroke="${LINEA}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="0" cy="-54" r="12" fill="#5ff2a8" stroke="${LINEA}" stroke-width="3.5"/><circle cx="-30" cy="-14" r="12" fill="#7cc4ff" stroke="${LINEA}" stroke-width="3.5"/><circle class="mi-luz" cx="30" cy="-14" r="12" fill="#ffd166" stroke="${LINEA}" stroke-width="3.5"/>`,
  '0.5': `<path d="M -14 -36 L -14 -50 Q -14 -66 0 -66 Q 14 -66 14 -50 L 14 -36" fill="none" stroke="${LINEA}" stroke-width="10" stroke-linecap="round"/>
    <path d="M -14 -36 L -14 -50 Q -14 -66 0 -66 Q 14 -66 14 -50 L 14 -36" fill="none" stroke="#b3abe6" stroke-width="5" stroke-linecap="round"/>
    <rect x="-24" y="-40" width="48" height="38" rx="8" fill="#ffd166" stroke="${LINEA}" stroke-width="3.5"/>${t(0, -15, 'rwx', 13, LINEA)}`,
  '0.6': `<path d="M -40 -50 L -40 -24 L 10 -24 L 10 -6 L 40 -6" fill="none" stroke="${LINEA}" stroke-width="16" stroke-linejoin="round"/>
    <path d="M -40 -50 L -40 -24 L 10 -24 L 10 -6 L 40 -6" fill="none" stroke="#7cc4ff" stroke-width="10" stroke-linejoin="round"/>
    <path class="mi-fluye" d="M -40 -50 L -40 -24 L 10 -24 L 10 -6 L 40 -6" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round"/>
    <rect x="-50" y="-60" width="20" height="12" rx="3" fill="#7cc4ff" stroke="${LINEA}" stroke-width="3"/>${t(30, -16, '|', 16, LINEA)}`,
  '0.7': `<line x1="12" y1="-18" x2="30" y2="-2" stroke="${LINEA}" stroke-width="10" stroke-linecap="round"/><line x1="12" y1="-18" x2="30" y2="-2" stroke="#c29bff" stroke-width="5" stroke-linecap="round"/>
    <circle cx="-4" cy="-36" r="22" fill="#e6e1ff" fill-opacity="0.9" stroke="${LINEA}" stroke-width="4.5"/>${t(-4, -31, '.*', 16, LINEA)}`,
  '0.8': `<rect x="-26" y="-58" width="46" height="56" rx="5" fill="#fffbe8" stroke="${LINEA}" stroke-width="3.5" transform="rotate(-6)"/>
    <path d="M -18 -44 h 30 M -18 -34 h 24 M -18 -24 h 28" stroke="#b3abe6" stroke-width="3" stroke-linecap="round" transform="rotate(-6)"/>${t(2, -8, ':wq', 13, '#c2456b')}`,
  // Un script es un guion: un pergamino que empieza por #!
  '0.9': `<rect x="-24" y="-58" width="48" height="48" fill="#fffbe8" stroke="${LINEA}" stroke-width="3.5"/>
    <path d="M -15 -30 h 30 M -15 -22 h 22" stroke="#b3abe6" stroke-width="3" stroke-linecap="round"/>${t(-6, -38, '#!', 14, '#c2456b')}
    <rect x="-31" y="-66" width="62" height="13" rx="6.5" fill="#e9dcb0" stroke="${LINEA}" stroke-width="3.5"/><rect x="-31" y="-15" width="62" height="13" rx="6.5" fill="#e9dcb0" stroke="${LINEA}" stroke-width="3.5"/>`,
  '0.10': `<path d="M 0 -2 L 0 -60 M 0 -30 Q 22 -34 22 -52 M 0 -18 Q -22 -22 -24 -40" fill="none" stroke="${LINEA}" stroke-width="9" stroke-linecap="round"/>
    <path d="M 0 -2 L 0 -60 M 0 -30 Q 22 -34 22 -52 M 0 -18 Q -22 -22 -24 -40" fill="none" stroke="#a0784a" stroke-width="4" stroke-linecap="round"/>
    ${[[0, -62, '#5ff2a8'], [22, -54, '#ff6f91'], [-24, -42, '#7cc4ff'], [0, -32, '#ffd166']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="${LINEA}" stroke-width="3"/>`).join('')}`,
};

// Colores de la parte de arriba de cada isla, en orden.
export const COLORES = ['#5ff2a8', '#7cc4ff', '#ffd166', '#ff9f6e', '#c29bff', '#ff6f91', '#5ff2a8', '#7cc4ff', '#ffd166', '#c29bff'];

// Lo que ha elegido el alumno en "Cambia el mundo".
export function elegido<T extends Opcion>(lista: T[], clave: string): T {
  let id = '';
  try { id = localStorage.getItem(`relavops.isla.${clave}`) ?? ''; } catch {}
  return lista.find((o) => o.id === id) ?? lista[0];
}
export function elegir(clave: string, id: string) {
  try { localStorage.setItem(`relavops.isla.${clave}`, id); } catch {}
}
