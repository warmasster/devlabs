// Progreso del curso en el navegador. Nunca se pierde nada; las rachas tienen comodines.
export type Pieza = 'teoria' | 'lab' | 'boss' | 'juego';
interface Estado {
  modulos: Record<string, Partial<Record<Pieza, number>>>; // fecha en ms
  xp: number;
  dias: string[]; // días con actividad (AAAA-MM-DD)
  ultimo?: { mod: string; fase: string; resumen: string; cuando: number };
  records: Record<string, number>;
  pasos?: Record<string, number>; // lección -> último paso al que llegó (desde 0)
  notas?: Record<string, Nota>; // clave de la chuleta -> lo que apuntó el alumno
  v?: number; // versión de la numeración de las lecciones (ver migrar)
}
export interface Nota { t: string; c: number } // texto y cuándo se escribió, en ms
const CLAVE = 'relavops.curso';
const V = 2;
const hoy = (d = new Date()) => d.toISOString().slice(0, 10);
const vacio = (): Estado => ({ modulos: {}, xp: 0, dias: [], records: {}, v: V });

// La versión 2 cambió el orden del cinturón blanco: la shell y los ficheros van antes que la máquina,
// y la lección de la máquina se partió en dos (máquina y red). El progreso guardado con los números
// de antes se pasa a los nuevos una sola vez. El Worker de cuentas hace lo mismo (cuentas/src/rutas/cuenta.ts).
const MAPA: Record<string, string[]> = {
  '0.1': ['0.3', '0.4'], '0.2': ['0.1'], '0.3': ['0.2'], '0.4': ['0.5'], '0.5': ['0.6'],
  '0.6': ['0.7'], '0.7': ['0.8'], '0.8': ['0.9'], '0.9': ['0.10'],
};
const RED_DESDE = 16; // en la 0.1 de antes, el primer paso de la parte de red

export function migrar(e: Partial<Estado>): Estado {
  const base = { ...vacio(), ...e };
  if ((e.v ?? 1) >= V) return { ...base, v: V };
  const modulos: Estado['modulos'] = {};
  for (const [k, piezas] of Object.entries(e.modulos ?? {})) {
    for (const n of MAPA[k] ?? [k]) modulos[n] = { ...modulos[n], ...piezas };
  }
  let pasos: Record<string, number> | undefined;
  for (const [k, p] of Object.entries(e.pasos ?? {})) {
    pasos ??= {};
    if (k === '0.1') {
      pasos['0.3'] = p > RED_DESDE + 8 ? p : Math.min(p, RED_DESDE - 1);
      if (p >= RED_DESDE) pasos['0.4'] = p - RED_DESDE;
    } else pasos[(MAPA[k] ?? [k])[0]] = p;
  }
  let ultimo = e.ultimo;
  if (ultimo && MAPA[ultimo.mod]) {
    const mod = ultimo.mod === '0.1' && Number(ultimo.fase) >= RED_DESDE ? '0.4' : MAPA[ultimo.mod][0];
    ultimo = { ...ultimo, mod, resumen: ultimo.resumen.replace(/^\S+/, mod) };
  }
  return { ...base, modulos, pasos, ultimo, v: V };
}

export function leer(): Estado {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE) ?? '');
    if ((e.v ?? 1) >= V) return { ...vacio(), ...e };
    const m = migrar(e);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(m));
      // El paso de cada lección también se guardaba aparte con el número viejo. Ya va en "pasos".
      for (const k of Object.keys(localStorage)) if (k.startsWith('relavops.leccion.')) localStorage.removeItem(k);
    } catch {}
    return m;
  } catch {
    return vacio();
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
  guardar(migrar(e), avisar);
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

// Notas de la chuleta. Una nota vacía también se guarda, con su fecha, para que borrar una nota
// en un dispositivo la borre en los demás al mezclar.
export const nota = (clave: string) => leer().notas?.[clave]?.t ?? '';
export function ponerNota(clave: string, texto: string) {
  const e = leer();
  const t = texto.trim().slice(0, 500);
  if ((e.notas?.[clave]?.t ?? '') === t) return;
  (e.notas ??= {})[clave] = { t, c: Date.now() };
  guardar(e);
}
