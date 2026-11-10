// /api/nodos/latido. Cada labd manda aquí cada 10 s cómo está: CPU, RAM, disco, labs calientes y las
// sesiones abiertas con lo que gasta cada una. Con varios servidores, cada uno manda el suyo y el
// panel los junta. La respuesta lleva las órdenes pendientes del panel para ese servidor.
import { ahora, Fallo, type Ctx } from '../util';

export interface SesionViva {
  id: string;
  usuario: string;
  nombre: string;
  lab: string;
  creada: number;
  cpu_pct: number; // de un núcleo: 100 es un núcleo entero
  ram_mb: number;
  pasos: number;
  total_pasos: number;
  conectada: boolean;
  nodo?: string;
}

interface Terminada {
  id: string; usuario: string; lab: string; inicio: number; fin: number; cpu_s: number; ram_max_mb: number; pasos: number; motivo: string;
}

export interface Latido {
  nodo: string;
  version: string;
  arranque: number;
  host: { cpus: number; cpu_pct: number; carga: number[]; ram_total_mb: number; ram_usada_mb: number; disco_total_gb: number; disco_usado_gb: number; labd_mb: number };
  pools: Record<string, number>;
  limites: Record<string, number>;
  sesiones: SesionViva[];
  terminadas?: Terminada[];
}

export const VIVO_MS = 45_000; // un servidor sin latido en este tiempo se da por caído

const num = (v: unknown, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.slice(0, max) : '');

function iguales(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let d = 0;
  for (let i = 0; i < ea.length; i++) d |= ea[i] ^ eb[i];
  return d === 0;
}

export async function latido(c: Ctx) {
  const auth = c.req.headers.get('authorization') ?? '';
  if (!c.env.NODO_SECRETO || !iguales(auth, `Bearer ${c.env.NODO_SECRETO}`)) throw new Fallo(401, 'secreto de nodo incorrecto');
  const texto = await c.req.text();
  if (texto.length > 1_000_000) throw new Fallo(413, 'latido demasiado grande');
  const l = JSON.parse(texto) as Latido;
  const nodo = str(l.nodo, 40);
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(nodo)) throw new Fallo(400, 'nombre de nodo no válido');

  const h = l.host ?? ({} as Latido['host']);
  const sesiones = (Array.isArray(l.sesiones) ? l.sesiones : []).slice(0, 2000).map((s) => ({
    id: str(s.id, 40), usuario: str(s.usuario, 40), nombre: str(s.nombre, 40), lab: str(s.lab, 60), creada: num(s.creada, 1e14),
    cpu_pct: Math.round(num(s.cpu_pct, 100_000) * 10) / 10, ram_mb: Math.round(num(s.ram_mb, 1e7)), pasos: num(s.pasos, 1000),
    total_pasos: num(s.total_pasos, 1000), conectada: !!s.conectada,
  }));
  const estado = {
    nodo, version: str(l.version, 40), arranque: num(l.arranque, 1e14),
    host: {
      cpus: num(h.cpus, 1024), cpu_pct: num(h.cpu_pct, 100), carga: (Array.isArray(h.carga) ? h.carga : []).slice(0, 3).map((x) => num(x, 1e4)),
      ram_total_mb: num(h.ram_total_mb), ram_usada_mb: num(h.ram_usada_mb), disco_total_gb: num(h.disco_total_gb), disco_usado_gb: num(h.disco_usado_gb),
      labd_mb: num(h.labd_mb),
    },
    pools: Object.fromEntries(Object.entries(l.pools ?? {}).slice(0, 300).map(([k, v]) => [str(k, 60), num(v, 1000)])),
    limites: Object.fromEntries(Object.entries(l.limites ?? {}).slice(0, 20).map(([k, v]) => [str(k, 40), num(v, 1e9)])),
    sesiones,
  };
  const t = ahora();
  const labsCpu = sesiones.reduce((a, s) => a + s.cpu_pct, 0) / 100;
  const labsRam = sesiones.reduce((a, s) => a + s.ram_mb, 0);
  const disco = estado.host.disco_total_gb ? (estado.host.disco_usado_gb / estado.host.disco_total_gb) * 100 : 0;

  const pendientes = await c.env.DB.prepare('SELECT id, tipo, datos FROM ordenes WHERE nodo = ? ORDER BY id LIMIT 100')
    .bind(nodo).all<{ id: number; tipo: string; datos: string }>();
  const pasos: D1PreparedStatement[] = [
    c.env.DB.prepare('INSERT INTO nodos (id, visto, estado) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET visto = excluded.visto, estado = excluded.estado')
      .bind(nodo, t, JSON.stringify(estado)),
    c.env.DB.prepare(
      `INSERT OR REPLACE INTO metricas (nodo, minuto, sesiones, cpu_pct, ram_mb, ram_total, disco_pct, carga, labs_cpu, labs_ram_mb) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(nodo, Math.floor(t / 60_000), sesiones.length, estado.host.cpu_pct, estado.host.ram_usada_mb, estado.host.ram_total_mb, disco,
      estado.host.carga[0] ?? 0, labsCpu, labsRam),
  ];
  for (const s of (Array.isArray(l.terminadas) ? l.terminadas : []).slice(0, 500)) {
    const inicio = num(s.inicio, 1e14), fin = num(s.fin, 1e14);
    pasos.push(
      c.env.DB.prepare(
        'INSERT OR IGNORE INTO usos_lab (id, nodo, usuario, lab, inicio, fin, segundos, cpu_s, ram_max_mb, pasos, motivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(str(s.id, 40), nodo, str(s.usuario, 40) || null, str(s.lab, 60), inicio, fin, Math.round(Math.max(0, fin - inicio) / 1000),
        num(s.cpu_s, 1e9), Math.round(num(s.ram_max_mb, 1e7)), num(s.pasos, 1000), str(s.motivo, 20)),
    );
  }
  if (pendientes.results.length) {
    pasos.push(c.env.DB.prepare(`DELETE FROM ordenes WHERE id IN (${pendientes.results.map(() => '?').join(',')})`).bind(...pendientes.results.map((o) => o.id)));
  }
  await c.env.DB.batch(pasos);
  return { ordenes: pendientes.results.map((o) => ({ tipo: o.tipo, ...JSON.parse(o.datos) })), ahora: t };
}

export async function nodosVivos(c: Ctx): Promise<(ReturnType<typeof JSON.parse> & { visto: number; vivo: boolean })[]> {
  const hit = c.cache.get('nodos');
  if (hit) return hit as never;
  const { results } = await c.env.DB.prepare('SELECT id, visto, estado FROM nodos ORDER BY id').all<{ id: string; visto: number; estado: string }>();
  const t = ahora();
  const nodos = results.map((r) => ({ ...JSON.parse(r.estado), visto: r.visto, vivo: t - r.visto < VIVO_MS }));
  c.cache.set('nodos', nodos);
  return nodos;
}

export async function sesionesVivas(c: Ctx): Promise<SesionViva[]> {
  const nodos = await nodosVivos(c);
  return nodos.filter((n) => n.vivo).flatMap((n) => (n.sesiones as SesionViva[]).map((s) => ({ ...s, nodo: n.nodo as string })));
}

// Deja una orden para un servidor, o para todos los que estén vivos.
export async function ordenar(c: Ctx, nodo: string | '*', tipo: string, datos: Record<string, unknown>) {
  const destinos = nodo === '*' ? (await nodosVivos(c)).filter((n) => n.vivo).map((n) => n.nodo as string) : [nodo];
  if (!destinos.length) return 0;
  await c.env.DB.batch(destinos.map((d) => c.env.DB.prepare('INSERT INTO ordenes (nodo, tipo, datos, creada) VALUES (?, ?, ?, ?)').bind(d, tipo, JSON.stringify(datos), ahora())));
  return destinos.length;
}
