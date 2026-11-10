// Contraseñas y pases firmados.
import { b64url, deB64url } from './util';

const enc = new TextEncoder();

export async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

// --- Contraseñas: PBKDF2 con SHA-256. Workers no deja pasar de 100 000 vueltas. Cada hash guarda
// sus vueltas, así que se pueden subir o bajar sin romper las contraseñas que ya hay.

async function derivar(clave: string, sal: Uint8Array, vueltas: number): Promise<Uint8Array> {
  const base = await crypto.subtle.importKey('raw', enc.encode(clave.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: vueltas }, base, 256);
  return new Uint8Array(bits);
}

export async function hashClave(clave: string, vueltas: number): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const h = await derivar(clave, sal, vueltas);
  return `pbkdf2-sha256$${vueltas}$${b64url(sal)}$${b64url(h)}`;
}

function iguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  const s = crypto.subtle as SubtleCrypto & { timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean };
  if (s.timingSafeEqual) return s.timingSafeEqual(a, b);
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

// ok dice si la contraseña vale. rehacer dice si conviene guardarla de nuevo con más vueltas.
export async function comprobarClave(clave: string, guardado: string, vueltasAhora: number): Promise<{ ok: boolean; rehacer: boolean }> {
  const [tipo, v, sal, hash] = guardado.split('$');
  if (tipo !== 'pbkdf2-sha256' || !sal || !hash) return { ok: false, rehacer: false };
  const vueltas = Number(v);
  const h = await derivar(clave, deB64url(sal), vueltas);
  const ok = iguales(h, deB64url(hash));
  return { ok, rehacer: ok && vueltas < vueltasAhora };
}

// --- Pases: lo que lee labd para saber quién es quién sin preguntar a la base.
// Formato: v1.<datos en base64url>.<firma Ed25519 en base64url>. La firma cubre "v1.<datos>".

export interface Pase {
  u: string; // id del usuario
  n: string; // nombre
  r: string; // rol
  iat: number; // cuándo se dio, en segundos desde 1970. labd rechaza los de antes de un cambio de rol
  exp: number; // segundos desde 1970
  kid: string; // qué clave lo firmó
}

let claveCache: { texto: string; privada: CryptoKey; kid: string; x: string } | null = null;

async function clave(env: Env) {
  if (claveCache && claveCache.texto === env.CLAVE_FIRMA) return claveCache;
  if (!env.CLAVE_FIRMA) throw new Error('Falta el secreto CLAVE_FIRMA (ver cuentas/LEEME.md)');
  const jwk = JSON.parse(env.CLAVE_FIRMA) as JsonWebKey & { x: string };
  const privada = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign']);
  const kid = (await sha256(jwk.x)).slice(0, 12);
  claveCache = { texto: env.CLAVE_FIRMA, privada, kid, x: jwk.x };
  return claveCache;
}

export async function clavePublica(env: Env) {
  const k = await clave(env);
  return { alg: 'EdDSA', crv: 'Ed25519', kid: k.kid, x: k.x };
}

export async function firmarPase(env: Env, datos: Omit<Pase, 'kid'>): Promise<string> {
  const k = await clave(env);
  const cuerpo = `v1.${b64url(enc.encode(JSON.stringify({ ...datos, kid: k.kid })))}`;
  const firma = await crypto.subtle.sign({ name: 'Ed25519' }, k.privada, enc.encode(cuerpo));
  return `${cuerpo}.${b64url(firma)}`;
}
