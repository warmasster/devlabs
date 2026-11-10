// Piezas pequeñas que usan todas las rutas.

// Un error que se convierte en respuesta tal cual. El mensaje lo ve la persona, así que va en su idioma.
export class Fallo extends Error {
  constructor(public estado: number, mensaje: string, public extra: Record<string, unknown> = {}) {
    super(mensaje);
  }
}

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  params: Record<string, string>;
  exec: ExecutionContext;
  galletas: string[]; // Set-Cookie que salen con la respuesta
  cache: Map<string, unknown>; // lo ya calculado en esta petición (el usuario, por ejemplo)
}

export const ahora = () => Date.now();
export const dia = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
export const DIA = 86_400_000;

export function json(datos: unknown, estado = 200): Response {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64url(s: string): Uint8Array {
  const t = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}

export const aleatorio = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

// Letras fáciles de dictar y de copiar a mano: sin 0/O, 1/I/L.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function letras(n: number): string {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join('');
}

export const nuevoId = (prefijo: string) => `${prefijo}_${letras(14).toLowerCase()}`;

// Lee el cuerpo JSON con un tope de tamaño.
export async function cuerpo<T = Record<string, unknown>>(c: Ctx, max = 16_384): Promise<T> {
  const texto = await c.req.text();
  if (texto.length > max) throw new Fallo(413, 'La petición es demasiado grande.');
  try {
    const v = JSON.parse(texto || '{}');
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error();
    return v as T;
  } catch {
    throw new Fallo(400, 'La petición no es válida.');
  }
}

export const texto = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// La IP de quien hace la petición. Si llega por labd (que pasa aquí las rutas de cuentas), Cloudflare ve
// la IP del VPS. Entonces vale la que manda labd, pero solo si viene con el secreto del nodo.
export function ipDe(c: Ctx): string {
  const nodo = c.req.headers.get('x-relavops-nodo');
  const ip = c.req.headers.get('x-relavops-ip');
  if (ip && nodo && c.env.NODO_SECRETO && nodo.length === c.env.NODO_SECRETO.length && nodo === c.env.NODO_SECRETO) return ip.slice(0, 64);
  return c.req.headers.get('cf-connecting-ip') ?? c.req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
}

// Redirige dentro de la misma web. Con ruta relativa, para que valga igual por labd que directo.
export const irA = (ruta: string) => new Response(null, { status: 302, headers: { location: ruta } });
export const paisDe = (c: Ctx) => ((c.req as Request & { cf?: { country?: string } }).cf?.country as string | undefined) ?? null;

export function leerGalleta(c: Ctx, nombre: string): string | null {
  const h = c.req.headers.get('cookie');
  if (!h) return null;
  for (const parte of h.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

// En https la galleta va con Secure. En local (http://localhost) no, o el navegador la tira.
export function galleta(c: Ctx, nombre: string, valor: string, o: { maxAge?: number; ruta?: string } = {}) {
  const segura = c.url.protocol === 'https:' || c.req.headers.get('x-forwarded-proto') === 'https';
  const partes = [`${nombre}=${encodeURIComponent(valor)}`, `Path=${o.ruta ?? '/'}`, 'HttpOnly', 'SameSite=Lax'];
  if (o.maxAge !== undefined) partes.push(`Max-Age=${Math.max(0, Math.floor(o.maxAge))}`);
  if (segura) partes.push('Secure');
  c.galletas.push(partes.join('; '));
}

// Las peticiones que cambian algo tienen que venir de nuestra propia web.
export function origenValido(c: Ctx): boolean {
  const o = c.req.headers.get('origin');
  if (!o) return true; // sin Origin: no viene de un navegador en otra web
  try {
    const h = new URL(o).hostname;
    const nuestro = new URL(c.env.URL_BASE).hostname;
    const extra = (c.env.ORIGENES_EXTRA ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    // localhost solo en desarrollo (wrangler dev sirve por http). En producción, una página en el
    // localhost de quien visita no tiene por qué poder hablar con su cuenta.
    const local = (h === 'localhost' || h === '127.0.0.1') && c.url.protocol === 'http:';
    return h === nuestro || h.endsWith(`.${nuestro}`) || extra.includes(h) || local || h === c.url.hostname;
  } catch {
    return false;
  }
}

// Una ruta de vuelta segura, solo dentro de la web. No basta con mirar que empiece por / y no por //:
// el navegador quita tabuladores y saltos de línea y lee \ como /, así que "/<tab>/otra.web" y
// "/\otra.web" acababan en //otra.web. Se lee como la leería el navegador y solo vale si se queda aquí.
export function vueltaSegura(v: string | null, def = '/curso'): string {
  if (!v || v.length > 500 || !v.startsWith('/') || /[\u0000-\u001f\\]/.test(v)) return def;
  try {
    const base = 'https://relavops.invalid';
    const u = new URL(v, base);
    // "/.//otra.web" se queda aquí al leerla, pero su ruta normalizada es //otra.web, y devuelta tal
    // cual en Location vuelve a ser otra web. Así que la ruta final tampoco puede empezar por //.
    if (u.origin !== base || u.pathname.startsWith('//')) return def;
    return u.pathname + u.search + u.hash;
  } catch {
    return def;
  }
}

export async function frenar(freno: RateLimit | undefined, clave: string, mensaje = 'Demasiados intentos. Espera un minuto.') {
  if (!freno) return;
  const { success } = await freno.limit({ key: clave });
  if (!success) throw new Fallo(429, mensaje, { motivo: 'deprisa' });
}

export function csv(filas: (string | number | null)[][]): string {
  const celda = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s;
  };
  return filas.map((f) => f.map(celda).join(',')).join('\n');
}
