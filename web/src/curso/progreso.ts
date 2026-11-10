// Progreso del curso en el navegador. Nunca se pierde nada; las rachas tienen comodines.
export type Pieza = 'teoria' | 'lab' | 'boss' | 'juego';
interface Estado {
  modulos: Record<string, Partial<Record<Pieza, number>>>; // fecha en ms
  xp: number;
  dias: string[]; // días con actividad (AAAA-MM-DD)
  ultimo?: { mod: string; fase: string; resumen: string; cuando: number };
  records: Record<string, number>;
  pasos?: Record<string, number>; // lección -> último paso al que llegó (desde 0)
}
const CLAVE = 'relavops.curso';
const hoy = (d = new Date()) => d.toISOString().slice(0, 10);

export function leer(): Estado {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE) ?? '');
    return { modulos: {}, xp: 0, dias: [], records: {}, ...e };
  } catch {
    return { modulos: {}, xp: 0, dias: [], records: {} };
  }
}
// Con cuenta, cuenta/sesion.ts se apunta aquí para subir cada cambio.
const oyentes: (() => void)[] = [];
export const alGuardar = (f: () => void) => { oyentes.push(f); };

function guardar(e: Estado, avisar = true) {
  try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch {}
  if (avisar) oyentes.forEach((f) => f());
}

// Cambia el progreso entero por otro (el ya mezclado con el de la cuenta).
export function reemplazar(e: Partial<Estado>, avisar = true) {
  guardar({ modulos: {}, xp: 0, dias: [], records: {}, ...e }, avisar);
}

export function marcar(mod: string, pieza: Pieza, xp = 0) {
  const e = leer();
  const m = (e.modulos[mod] ??= {});
  if (!m[pieza]) { m[pieza] = Date.now(); e.xp += xp; }
  if (!e.dias.includes(hoy())) e.dias.push(hoy());
  guardar(e);
}
export function sumarXP(xp: number) {
  const e = leer();
  e.xp += xp;
  if (!e.dias.includes(hoy())) e.dias.push(hoy());
  guardar(e);
}
export function record(id: string, puntos: number): boolean {
  const e = leer();
  const nuevo = puntos > (e.records[id] ?? 0);
  if (nuevo) { e.records[id] = puntos; guardar(e); }
  return nuevo;
}
export function apuntarUltimo(mod: string, fase: string, resumen: string) {
  const e = leer();
  e.ultimo = { mod, fase, resumen, cuando: Date.now() };
  guardar(e);
}

// El paso más lejano al que llegó en una lección. Va en el progreso de la cuenta, así que en otro
// dispositivo la lección sigue por ahí y no por el paso 1.
export function pasoDe(mod: string): number {
  return leer().pasos?.[mod] ?? 0;
}
export function apuntarPaso(mod: string, max: number) {
  const e = leer();
  const p = (e.pasos ??= {});
  if ((p[mod] ?? -1) >= max) return;
  p[mod] = max;
  guardar(e);
}

// Racha con comodines: cada 7 días seguidos se gana un comodín que tapa un día sin entrar.
export function racha(): { dias: number; comodines: number } {
  const e = leer();
  const set = new Set(e.dias);
  let dias = 0, comodines = 0, usados = 0;
  const d = new Date();
  if (!set.has(hoy(d))) d.setDate(d.getDate() - 1); // hoy aún cuenta
  const ganados = Math.floor(e.dias.length / 7);
  for (let i = 0; i < 400; i++) {
    if (set.has(hoy(d))) dias++;
    else if (usados < ganados) usados++;
    else break;
    d.setDate(d.getDate() - 1);
  }
  comodines = ganados - usados;
  return { dias, comodines };
}

export const estadoModulo = (id: string) => leer().modulos[id] ?? {};
