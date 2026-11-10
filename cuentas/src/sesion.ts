// Sesiones con dos galletas.
//   rv_s  la sesión de verdad. Valor al azar, su sha256 está en la tabla sesiones. Solo la lee el Worker.
//   rv_t  el pase firmado que lee labd en el VPS. Dura una hora y se renueva solo desde rv_s.
// Así labd no tiene que preguntar a la base en cada petición, y cerrar una sesión o bloquear a
// alguien tarda como mucho lo que le quede a su pase (y labd echa sus labs en el siguiente latido).
import { firmarPase, sha256 } from './cripto';
import { ahora, aleatorio, dia, Fallo, galleta, ipDe, leerGalleta, paisDe, type Ctx } from './util';

export const G_SESION = 'rv_s';
export const G_PASE = 'rv_t';
export const DURA_PASE = 3600; // segundos
const DURA_RECORDAR = 30 * 86_400_000;
const DURA_CORTA = 12 * 3_600_000;

export type Rol = 'alumno' | 'profe' | 'admin';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string | null;
  rol: Rol;
  estado: string;
  correo_ok: number;
  pide_profe: number;
  origen: string;
  creado: number;
  ultimo_acceso: number | null;
}

interface FilaSesion extends Usuario {
  sid: string;
  vista: number;
  dura: number;
}

export async function apuntar(c: Ctx, tipo: string, usuario: string | null, detalle = '') {
  await c.env.DB.prepare('INSERT INTO actividad (cuando, usuario, tipo, detalle, ip, pais) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(ahora(), usuario, tipo, detalle.slice(0, 500), ipDe(c), paisDe(c))
    .run();
}

export async function ajustes(c: Ctx): Promise<Record<string, string>> {
  const hit = c.cache.get('ajustes') as Record<string, string> | undefined;
  if (hit) return hit;
  const { results } = await c.env.DB.prepare('SELECT clave, valor FROM ajustes').all<{ clave: string; valor: string }>();
  const a = Object.fromEntries(results.map((r) => [r.clave, r.valor]));
  c.cache.set('ajustes', a);
  return a;
}

export async function darPase(c: Ctx, u: Pick<Usuario, 'id' | 'nombre' | 'rol'>) {
  const t = Math.floor(ahora() / 1000);
  const pase = await firmarPase(c.env, { u: u.id, n: u.nombre, r: u.rol, iat: t, exp: t + DURA_PASE });
  galleta(c, G_PASE, pase, { maxAge: DURA_PASE });
}

export async function crearSesion(c: Ctx, u: Usuario, recordar: boolean) {
  const token = aleatorio(32);
  const dura = recordar ? DURA_RECORDAR : DURA_CORTA;
  const t = ahora();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO sesiones (id, usuario, creada, vista, caduca, dura, ip, agente, pais) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(await sha256(token), u.id, t, t, t + dura, dura, ipDe(c), (c.req.headers.get('user-agent') ?? '').slice(0, 200), paisDe(c)),
    c.env.DB.prepare('UPDATE usuarios SET ultimo_acceso = ?, entradas = entradas + 1, pais = coalesce(?, pais) WHERE id = ?').bind(t, paisDe(c), u.id),
    c.env.DB.prepare('INSERT OR IGNORE INTO dias_activos (dia, usuario) VALUES (?, ?)').bind(dia(t), u.id),
  ]);
  // Sin "recordarme", la galleta muere al cerrar el navegador.
  galleta(c, G_SESION, token, recordar ? { maxAge: dura / 1000 } : {});
  await darPase(c, u);
}

// El usuario de esta petición, o null. Alarga la sesión si hace rato que no se usa.
export async function usuarioActual(c: Ctx): Promise<(Usuario & { sid: string }) | null> {
  if (c.cache.has('yo')) return c.cache.get('yo') as (Usuario & { sid: string }) | null;
  let yo: (Usuario & { sid: string }) | null = null;
  const token = leerGalleta(c, G_SESION);
  if (token && token.length < 100) {
    const sid = await sha256(token);
    const t = ahora();
    const f = await c.env.DB.prepare(
      `SELECT s.id AS sid, s.vista, s.dura, u.id, u.nombre, u.correo, u.rol, u.estado, u.correo_ok, u.pide_profe, u.origen, u.creado, u.ultimo_acceso
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario WHERE s.id = ? AND s.caduca > ?`,
    ).bind(sid, t).first<FilaSesion>();
    if (f && f.estado === 'activo') {
      const { vista, dura, ...resto } = f;
      yo = resto;
      // Una vez cada 10 minutos como mucho: alarga la sesión y apunta el día como activo.
      if (t - vista > 600_000) {
        c.exec.waitUntil(c.env.DB.batch([
          c.env.DB.prepare('UPDATE sesiones SET vista = ?, caduca = ? WHERE id = ?').bind(t, t + dura, sid),
          c.env.DB.prepare('UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?').bind(t, f.id),
          c.env.DB.prepare('INSERT OR IGNORE INTO dias_activos (dia, usuario) VALUES (?, ?)').bind(dia(t), f.id),
        ]));
      }
    }
  }
  c.cache.set('yo', yo);
  return yo;
}

export async function exigir(c: Ctx, ...roles: Rol[]): Promise<Usuario & { sid: string }> {
  const yo = await usuarioActual(c);
  if (!yo) throw new Fallo(401, 'Tienes que entrar con tu cuenta.', { motivo: 'entrar' });
  if (roles.length && !roles.includes(yo.rol)) throw new Fallo(403, 'Tu cuenta no puede hacer esto.', { motivo: 'rol' });
  return yo;
}

export function borrarGalletas(c: Ctx) {
  galleta(c, G_SESION, '', { maxAge: 0 });
  galleta(c, G_PASE, '', { maxAge: 0 });
}

export async function cerrarSesion(c: Ctx) {
  const token = leerGalleta(c, G_SESION);
  if (token) await c.env.DB.prepare('DELETE FROM sesiones WHERE id = ?').bind(await sha256(token)).run();
  borrarGalletas(c);
}

// Lo que se enseña de un usuario (nunca el hash).
export const publico = (u: Usuario) => ({
  id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, correo_ok: !!u.correo_ok, pide_profe: !!u.pide_profe,
  origen: u.origen, creado: u.creado,
});
