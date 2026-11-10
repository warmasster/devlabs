// /api/cuenta/… Lo de cada persona: alta, entrada, salida, su perfil, sus clases y su progreso.
import { clavePublica, comprobarClave, hashClave, sha256 } from '../cripto';
import { enviar, hayCorreo } from '../correo';
import {
  ajustes, apuntar, borrarGalletas, cerrarSesion, crearSesion, darPase, exigir, publico, usuarioActual, type Usuario,
} from '../sesion';
import { aleatorio, ahora, cuerpo, DIA, Fallo, frenar, ipDe, irA, nuevoId, origenValido, texto, vueltaSegura, type Ctx } from '../util';

// --- Reglas de los datos

const RESERVADOS = new Set(['admin', 'administrador', 'root', 'relavops', 'soporte', 'ayuda', 'profe', 'profesor', 'sistema',
  'api', 'www', 'correo', 'mail', 'null', 'undefined', 'anonimo', 'invitado', 'labd', 'moderador', 'staff']);
const CLAVES_TONTAS = new Set(['12345678', '123456789', '1234567890', 'password', 'contraseña', 'contrasena', 'qwertyui',
  'qwerty123', '11111111', '00000000', 'abcd1234', 'iloveyou', 'password1', '87654321', 'relavops', 'asdfghjk']);

export function revisarNombre(n: string): string | null {
  if (n.length < 3) return 'El nombre de usuario tiene que tener 3 letras o más.';
  if (n.length > 24) return 'El nombre de usuario puede tener 24 letras como mucho.';
  if (!/^[a-zA-Z]/.test(n)) return 'El nombre de usuario empieza por una letra.';
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(n)) return 'Solo letras sin tilde, números, punto, guion y guion bajo.';
  if (/[_.-]{2}/.test(n) || /[_.-]$/.test(n)) return 'No acabes en símbolo ni pongas dos seguidos.';
  if (RESERVADOS.has(n.toLowerCase())) return 'Ese nombre está reservado.';
  return null;
}

export function revisarCorreo(c: string): string | null {
  if (c.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)) return 'Ese correo no parece válido.';
  return null;
}

export function revisarClave(clave: string, nombre = ''): string | null {
  if (clave.length < 8) return 'La contraseña tiene que tener 8 caracteres o más.';
  if (clave.length > 200) return 'La contraseña es demasiado larga.';
  if (CLAVES_TONTAS.has(clave.toLowerCase()) || /^(.)\1+$/.test(clave)) return 'Esa contraseña es de las primeras que se prueban. Elige otra.';
  if (nombre && clave.toLowerCase() === nombre.toLowerCase()) return 'La contraseña no puede ser tu nombre de usuario.';
  return null;
}

// ABCD-EFGH, sin mirar mayúsculas, espacios ni guiones.
export const normalizarCodigo = (c: string) => {
  const s = c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
};

const vueltas = (c: Ctx) => Math.min(100_000, Math.max(10_000, Number(c.env.VUELTAS) || 100_000));

async function claseDeCodigo(c: Ctx, codigo: string) {
  return c.env.DB.prepare(
    `SELECT c.id, c.nombre, c.abierta, u.nombre AS profe FROM clases c JOIN usuarios u ON u.id = c.profe WHERE c.codigo = ?`,
  ).bind(normalizarCodigo(codigo)).first<{ id: string; nombre: string; abierta: number; profe: string }>();
}

async function mandarVerificacion(c: Ctx, u: { id: string; nombre: string; correo: string }) {
  const t = aleatorio(24);
  await c.env.DB.prepare('INSERT INTO tokens (id, usuario, tipo, caduca) VALUES (?, ?, ?, ?)')
    .bind(await sha256(t), u.id, 'verificar', ahora() + 2 * DIA).run();
  await enviar(c.env, u.correo, 'Confirma tu correo en relavops', `Hola, ${u.nombre}`,
    'Pulsa el botón para confirmar que este correo es tuyo. El enlace vale dos días.',
    { texto: 'Confirmar mi correo', url: `${c.env.URL_BASE}/api/cuenta/verificar?t=${t}` });
}

function soloDesdeLaWeb(c: Ctx) {
  if (!origenValido(c)) throw new Fallo(403, 'Esta petición no viene de relavops.');
}

// --- Rutas

export async function config(c: Ctx) {
  const a = await ajustes(c);
  const correo = hayCorreo(c.env);
  return { registro: a.registro, profes: a.profes, verificar_correo: correo && a.verificar_correo === '1', recuperar: correo, aviso: a.aviso || '' };
}

export async function libre(c: Ctx) {
  await frenar(c.env.FRENO_MIRAR, `mirar:${ipDe(c)}`);
  const nombre = c.url.searchParams.get('nombre');
  const correo = c.url.searchParams.get('correo');
  if (nombre !== null) {
    const n = nombre.trim();
    const mal = revisarNombre(n);
    if (mal) return { libre: false, motivo: mal };
    const ya = await c.env.DB.prepare('SELECT 1 FROM usuarios WHERE nombre_min = ?').bind(n.toLowerCase()).first();
    return ya ? { libre: false, motivo: 'Ese nombre ya lo tiene otra persona.' } : { libre: true };
  }
  if (correo !== null) {
    const e = correo.trim().toLowerCase();
    const mal = revisarCorreo(e);
    if (mal) return { libre: false, motivo: mal };
    const ya = await c.env.DB.prepare('SELECT 1 FROM usuarios WHERE correo = ?').bind(e).first();
    return ya ? { libre: false, motivo: 'Ya hay una cuenta con ese correo. Entra con ella.' } : { libre: true };
  }
  throw new Fallo(400, 'Falta qué mirar.');
}

export async function verClase(c: Ctx) {
  await frenar(c.env.FRENO_MIRAR, `mirar:${ipDe(c)}`);
  const cl = await claseDeCodigo(c, c.url.searchParams.get('codigo') ?? '');
  if (!cl) throw new Fallo(404, 'No hay ninguna clase con ese código.');
  return { nombre: cl.nombre, profe: cl.profe, abierta: !!cl.abierta };
}

export async function registro(c: Ctx) {
  soloDesdeLaWeb(c);
  await frenar(c.env.FRENO_ALTA, `alta:${ipDe(c)}`, 'Se han creado muchas cuentas desde aquí. Espera un minuto.');
  const b = await cuerpo(c);
  if (texto(b.web)) throw new Fallo(400, 'La petición no es válida.'); // campo trampa: solo lo rellenan los robots
  const a = await ajustes(c);
  const tipo = texto(b.tipo) as 'libre' | 'clase' | 'profe';
  if (!['libre', 'clase', 'profe'].includes(tipo)) throw new Fallo(400, 'Elige cómo vas a usar relavops.');
  if (a.registro === 'cerrado') throw new Fallo(403, 'Ahora mismo no se pueden crear cuentas nuevas.');
  if (a.registro === 'solo_clase' && tipo !== 'clase') throw new Fallo(403, 'Ahora mismo solo se pueden crear cuentas con el código de una clase.');

  const nombre = texto(b.nombre, 40);
  const correo = texto(b.correo, 260).toLowerCase();
  const clave = typeof b.clave === 'string' ? b.clave : '';
  const malNombre = revisarNombre(nombre);
  if (malNombre) throw new Fallo(400, malNombre, { campo: 'nombre' });
  if (tipo !== 'clase' || correo) {
    if (!correo) throw new Fallo(400, 'Pon tu correo.', { campo: 'correo' });
    const malCorreo = revisarCorreo(correo);
    if (malCorreo) throw new Fallo(400, malCorreo, { campo: 'correo' });
  }
  const malClave = revisarClave(clave, nombre);
  if (malClave) throw new Fallo(400, malClave, { campo: 'clave' });

  let clase: Awaited<ReturnType<typeof claseDeCodigo>> = null;
  if (tipo === 'clase') {
    clase = await claseDeCodigo(c, texto(b.codigo, 20));
    if (!clase) throw new Fallo(400, 'No hay ninguna clase con ese código.', { campo: 'codigo' });
    if (!clase.abierta) throw new Fallo(400, 'Esa clase ya no admite alumnos nuevos. Pide otro código a tu profe.', { campo: 'codigo' });
  }

  const ya = await c.env.DB.prepare('SELECT nombre_min, correo FROM usuarios WHERE nombre_min = ? OR (correo IS NOT NULL AND correo = ?)')
    .bind(nombre.toLowerCase(), correo || null).all<{ nombre_min: string; correo: string | null }>();
  for (const f of ya.results) {
    if (f.nombre_min === nombre.toLowerCase()) throw new Fallo(409, 'Ese nombre ya lo tiene otra persona.', { campo: 'nombre' });
    if (correo && f.correo === correo) throw new Fallo(409, 'Ya hay una cuenta con ese correo. Entra con ella.', { campo: 'correo' });
  }

  const conAprobacion = tipo === 'profe' && a.profes === 'aprobacion';
  const u: Usuario = {
    id: nuevoId('u'), nombre, correo: correo || null, rol: tipo === 'profe' && !conAprobacion ? 'profe' : 'alumno', estado: 'activo',
    correo_ok: 0, pide_profe: conAprobacion ? 1 : 0, origen: tipo, creado: ahora(), ultimo_acceso: null,
  };
  const hash = await hashClave(clave, vueltas(c));
  const pasos = [
    c.env.DB.prepare('INSERT INTO usuarios (id, nombre, nombre_min, correo, clave, rol, pide_profe, origen, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(u.id, u.nombre, u.nombre.toLowerCase(), u.correo, hash, u.rol, u.pide_profe, u.origen, u.creado),
  ];
  if (clase) pasos.push(c.env.DB.prepare('INSERT INTO miembros (clase, usuario, unido) VALUES (?, ?, ?)').bind(clase.id, u.id, u.creado));
  try {
    await c.env.DB.batch(pasos);
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new Fallo(409, 'Ese nombre o ese correo acaban de cogerse. Prueba otro.', { campo: 'nombre' });
    throw e;
  }
  await crearSesion(c, u, b.recordar !== false);
  c.exec.waitUntil(apuntar(c, 'alta', u.id, `${tipo}${clase ? ` · ${clase.nombre}` : ''}`));
  if (u.correo && a.verificar_correo === '1' && hayCorreo(c.env)) c.exec.waitUntil(mandarVerificacion(c, { id: u.id, nombre: u.nombre, correo: u.correo }));
  return { usuario: publico(u), clase: clase ? { nombre: clase.nombre, profe: clase.profe } : null };
}

export async function entrar(c: Ctx) {
  soloDesdeLaWeb(c);
  const b = await cuerpo(c);
  const quien = texto(b.usuario, 260).toLowerCase();
  const clave = typeof b.clave === 'string' ? b.clave.slice(0, 200) : '';
  if (!quien || !clave) throw new Fallo(400, 'Escribe tu usuario y tu contraseña.');
  await frenar(c.env.FRENO_ENTRAR, `entrar:${ipDe(c)}`, 'Demasiados intentos seguidos. Espera un minuto.');
  await frenar(c.env.FRENO_ENTRAR, `cuenta:${quien}`, 'Demasiados intentos con esta cuenta. Espera un minuto.');
  const f = await c.env.DB.prepare('SELECT * FROM usuarios WHERE nombre_min = ? OR correo = ? LIMIT 1')
    .bind(quien, quien).first<Usuario & { clave: string }>();
  const r = f ? await comprobarClave(clave, f.clave, vueltas(c)) : { ok: false, rehacer: false };
  if (!f || !r.ok) {
    c.exec.waitUntil(apuntar(c, 'fallo_entrar', f?.id ?? null, quien));
    throw new Fallo(401, 'Usuario o contraseña incorrectos.');
  }
  if (f.estado !== 'activo') throw new Fallo(403, 'Esta cuenta está bloqueada. Habla con quien lleva relavops.');
  if (r.rehacer) c.exec.waitUntil(hashClave(clave, vueltas(c)).then((h) => c.env.DB.prepare('UPDATE usuarios SET clave = ? WHERE id = ?').bind(h, f.id).run()));
  await crearSesion(c, f, b.recordar !== false);
  c.exec.waitUntil(apuntar(c, 'entrar', f.id));
  const { clave: _, ...u } = f;
  return { usuario: publico(u) };
}

export async function salir(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await usuarioActual(c);
  await cerrarSesion(c);
  if (yo) c.exec.waitUntil(apuntar(c, 'salir', yo.id));
  return { ok: true };
}

export async function salirTodo(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  await c.env.DB.prepare('DELETE FROM sesiones WHERE usuario = ?').bind(yo.id).run();
  borrarGalletas(c);
  c.exec.waitUntil(apuntar(c, 'salir_todo', yo.id));
  return { ok: true };
}

export async function yo(c: Ctx) {
  const u = await usuarioActual(c);
  if (!u) {
    borrarGalletas(c);
    throw new Fallo(401, 'No has entrado.', { motivo: 'entrar' });
  }
  const [clases, a, n] = await Promise.all([
    c.env.DB.prepare(
      `SELECT c.id, c.nombre, c.codigo, p.nombre AS profe FROM miembros m JOIN clases c ON c.id = m.clase JOIN usuarios p ON p.id = c.profe
       WHERE m.usuario = ? ORDER BY m.unido`,
    ).bind(u.id).all<{ id: string; nombre: string; codigo: string; profe: string }>(),
    ajustes(c),
    u.rol !== 'alumno' ? c.env.DB.prepare('SELECT count(*) AS n FROM clases WHERE profe = ?').bind(u.id).first<{ n: number }>() : null,
  ]);
  await darPase(c, u); // el pase de labd siempre fresco al cargar una página
  return {
    usuario: publico(u),
    clases: clases.results.map(({ codigo, ...r }) => r),
    mis_clases: n?.n ?? 0,
    aviso: a.aviso || '',
    correo: hayCorreo(c.env),
    verificar_correo: hayCorreo(c.env) && a.verificar_correo === '1',
  };
}

// labd manda aquí cuando el pase ha caducado al abrir una página. Si la sesión sigue viva, vuelve sin que se note.
export async function renovar(c: Ctx) {
  const u = await usuarioActual(c);
  const vuelta = vueltaSegura(c.url.searchParams.get('vuelta'));
  if (u) {
    await darPase(c, u);
    return irA(vuelta);
  }
  borrarGalletas(c);
  return irA(`/entrar?vuelta=${encodeURIComponent(vuelta)}`);
}

export async function cambiarClave(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  await frenar(c.env.FRENO_ENTRAR, `cuenta:${yo.nombre.toLowerCase()}`);
  const b = await cuerpo(c);
  const f = await c.env.DB.prepare('SELECT clave FROM usuarios WHERE id = ?').bind(yo.id).first<{ clave: string }>();
  if (!f || !(await comprobarClave(String(b.actual ?? ''), f.clave, vueltas(c))).ok) throw new Fallo(400, 'La contraseña actual no es esa.', { campo: 'actual' });
  const nueva = typeof b.nueva === 'string' ? b.nueva : '';
  const mal = revisarClave(nueva, yo.nombre);
  if (mal) throw new Fallo(400, mal, { campo: 'nueva' });
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE usuarios SET clave = ? WHERE id = ?').bind(await hashClave(nueva, vueltas(c)), yo.id),
    c.env.DB.prepare('DELETE FROM sesiones WHERE usuario = ? AND id != ?').bind(yo.id, yo.sid), // los demás dispositivos tienen que volver a entrar
  ]);
  c.exec.waitUntil(apuntar(c, 'clave', yo.id));
  return { ok: true };
}

export async function cambiarCorreo(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  const b = await cuerpo(c);
  const correo = texto(b.correo, 260).toLowerCase();
  const mal = revisarCorreo(correo);
  if (mal) throw new Fallo(400, mal, { campo: 'correo' });
  if (correo === yo.correo) return { ok: true };
  const ya = await c.env.DB.prepare('SELECT 1 FROM usuarios WHERE correo = ? AND id != ?').bind(correo, yo.id).first();
  if (ya) throw new Fallo(409, 'Ya hay otra cuenta con ese correo.', { campo: 'correo' });
  await c.env.DB.prepare('UPDATE usuarios SET correo = ?, correo_ok = 0 WHERE id = ?').bind(correo, yo.id).run();
  c.exec.waitUntil(apuntar(c, 'correo', yo.id, correo));
  const a = await ajustes(c);
  if (a.verificar_correo === '1' && hayCorreo(c.env)) c.exec.waitUntil(mandarVerificacion(c, { id: yo.id, nombre: yo.nombre, correo }));
  return { ok: true };
}

export async function unirse(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  await frenar(c.env.FRENO_MIRAR, `mirar:${ipDe(c)}`);
  const b = await cuerpo(c);
  const cl = await claseDeCodigo(c, texto(b.codigo, 20));
  if (!cl) throw new Fallo(404, 'No hay ninguna clase con ese código.', { campo: 'codigo' });
  if (!cl.abierta) throw new Fallo(400, 'Esa clase ya no admite alumnos nuevos.', { campo: 'codigo' });
  await c.env.DB.prepare('INSERT OR IGNORE INTO miembros (clase, usuario, unido) VALUES (?, ?, ?)').bind(cl.id, yo.id, ahora()).run();
  c.exec.waitUntil(apuntar(c, 'unirse', yo.id, cl.nombre));
  return { clase: { id: cl.id, nombre: cl.nombre, profe: cl.profe } };
}

export async function dejar(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  const b = await cuerpo(c);
  await c.env.DB.prepare('DELETE FROM miembros WHERE clase = ? AND usuario = ?').bind(texto(b.clase, 40), yo.id).run();
  c.exec.waitUntil(apuntar(c, 'dejar', yo.id, texto(b.clase, 40)));
  return { ok: true };
}

export async function borrarCuenta(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  const b = await cuerpo(c);
  const f = await c.env.DB.prepare('SELECT clave FROM usuarios WHERE id = ?').bind(yo.id).first<{ clave: string }>();
  if (!f || !(await comprobarClave(String(b.clave ?? ''), f.clave, vueltas(c))).ok) throw new Fallo(400, 'La contraseña no es esa.', { campo: 'clave' });
  if (yo.rol === 'admin') {
    const otros = await c.env.DB.prepare("SELECT count(*) AS n FROM usuarios WHERE rol = 'admin' AND id != ?").bind(yo.id).first<{ n: number }>();
    if (!otros?.n) throw new Fallo(400, 'Eres el único admin. Nombra a otro antes de borrar tu cuenta.');
  }
  await c.env.DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(yo.id).run();
  borrarGalletas(c);
  c.exec.waitUntil(apuntar(c, 'baja', null, yo.nombre));
  return { ok: true };
}

// --- Correo: confirmar y recuperar

export async function enviarVerificacion(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  if (!hayCorreo(c.env)) throw new Fallo(503, 'El envío de correo todavía no está activo.');
  if (!yo.correo) throw new Fallo(400, 'Tu cuenta no tiene correo.');
  if (yo.correo_ok) return { ok: true };
  await frenar(c.env.FRENO_CORREO, `correo:${yo.id}`, 'Ya te lo hemos mandado. Mira tu correo y espera un minuto.');
  await mandarVerificacion(c, { id: yo.id, nombre: yo.nombre, correo: yo.correo });
  return { ok: true };
}

export async function verificar(c: Ctx) {
  const t = c.url.searchParams.get('t') ?? '';
  const id = await sha256(t);
  const f = await c.env.DB.prepare("SELECT usuario FROM tokens WHERE id = ? AND tipo = 'verificar' AND caduca > ?").bind(id, ahora()).first<{ usuario: string }>();
  if (!f) return irA('/cuenta?verificado=0');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE usuarios SET correo_ok = 1 WHERE id = ?').bind(f.usuario),
    c.env.DB.prepare("DELETE FROM tokens WHERE usuario = ? AND tipo = 'verificar'").bind(f.usuario),
  ]);
  c.exec.waitUntil(apuntar(c, 'correo_ok', f.usuario));
  return irA('/cuenta?verificado=1');
}

export async function recuperar(c: Ctx) {
  soloDesdeLaWeb(c);
  if (!hayCorreo(c.env)) throw new Fallo(503, 'El envío de correo todavía no está activo. Pide a tu profe o al admin que te cambie la contraseña.');
  const b = await cuerpo(c);
  const correo = texto(b.correo, 260).toLowerCase();
  await frenar(c.env.FRENO_CORREO, `recuperar:${ipDe(c)}`, 'Espera un minuto antes de pedir otro enlace.');
  const u = await c.env.DB.prepare("SELECT id, nombre, correo FROM usuarios WHERE correo = ? AND estado = 'activo'").bind(correo).first<{ id: string; nombre: string; correo: string }>();
  // La respuesta es la misma haya cuenta o no, para no decir qué correos están dados de alta.
  if (u) {
    const t = aleatorio(24);
    await c.env.DB.prepare('INSERT INTO tokens (id, usuario, tipo, caduca) VALUES (?, ?, ?, ?)').bind(await sha256(t), u.id, 'recuperar', ahora() + 3_600_000).run();
    c.exec.waitUntil(enviar(c.env, u.correo, 'Cambia tu contraseña de relavops', `Hola, ${u.nombre}`,
      'Alguien ha pedido cambiar la contraseña de tu cuenta. Si has sido tú, pulsa el botón. El enlace vale una hora.',
      { texto: 'Poner una contraseña nueva', url: `${c.env.URL_BASE}/entrar?recuperar=${t}` }));
    c.exec.waitUntil(apuntar(c, 'recuperar', u.id));
  }
  return { ok: true };
}

export async function recuperarNueva(c: Ctx) {
  soloDesdeLaWeb(c);
  const b = await cuerpo(c);
  const id = await sha256(texto(b.t, 100));
  const f = await c.env.DB.prepare(
    "SELECT u.* FROM tokens t JOIN usuarios u ON u.id = t.usuario WHERE t.id = ? AND t.tipo = 'recuperar' AND t.caduca > ?",
  ).bind(id, ahora()).first<Usuario & { clave: string }>();
  if (!f) throw new Fallo(400, 'El enlace ha caducado o ya se usó. Pide otro.');
  const nueva = typeof b.clave === 'string' ? b.clave : '';
  const mal = revisarClave(nueva, f.nombre);
  if (mal) throw new Fallo(400, mal, { campo: 'clave' });
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE usuarios SET clave = ?, correo_ok = 1 WHERE id = ?').bind(await hashClave(nueva, vueltas(c)), f.id),
    c.env.DB.prepare('DELETE FROM sesiones WHERE usuario = ?').bind(f.id),
    c.env.DB.prepare("DELETE FROM tokens WHERE usuario = ? AND tipo = 'recuperar'").bind(f.id),
  ]);
  await crearSesion(c, f, true);
  c.exec.waitUntil(apuntar(c, 'clave_recuperada', f.id));
  return { ok: true };
}

export async function publica(c: Ctx) {
  const r = Response.json(await clavePublica(c.env));
  r.headers.set('cache-control', 'public, max-age=300');
  return r;
}

// --- Progreso del curso. El navegador manda el suyo, aquí se mezcla con el guardado y vuelve el resultado.

interface Progreso {
  modulos: Record<string, Record<string, number>>;
  xp: number;
  dias: string[];
  ultimo?: { mod: string; fase: string; resumen: string; cuando: number };
  records: Record<string, number>;
  pasos?: Record<string, number>; // lección -> último paso al que llegó
  notas?: Record<string, { t: string; c: number }>; // clave de la chuleta -> nota y cuándo se escribió
  v?: number; // versión de la numeración de las lecciones (ver migrar)
}
const PIEZAS = new Set(['teoria', 'lab', 'boss', 'juego']);
const V = 2;
const vacio = (): Progreso => ({ modulos: {}, xp: 0, dias: [], records: {}, v: V });

// La versión 2 cambió el orden del cinturón blanco: la shell y los ficheros van antes que la máquina,
// y la lección de la máquina se partió en dos (máquina y red). Lo guardado con los números de antes
// se pasa a los nuevos antes de mezclar. Es la misma tabla que web/src/curso/progreso.ts.
const MAPA: Record<string, string[]> = {
  '0.1': ['0.3', '0.4'], '0.2': ['0.1'], '0.3': ['0.2'], '0.4': ['0.5'], '0.5': ['0.6'],
  '0.6': ['0.7'], '0.7': ['0.8'], '0.8': ['0.9'], '0.9': ['0.10'],
};
const RED_DESDE = 16; // en la 0.1 de antes, el primer paso de la parte de red

export function migrar(p: Progreso): Progreso {
  if ((p.v ?? 1) >= V) return { ...p, v: V };
  const modulos: Progreso['modulos'] = {};
  for (const [k, piezas] of Object.entries(p.modulos)) {
    for (const n of MAPA[k] ?? [k]) modulos[n] = { ...modulos[n], ...piezas };
  }
  let pasos: Record<string, number> | undefined;
  for (const [k, n] of Object.entries(p.pasos ?? {})) {
    pasos ??= {};
    if (k === '0.1') {
      pasos['0.3'] = n > RED_DESDE + 8 ? n : Math.min(n, RED_DESDE - 1);
      if (n >= RED_DESDE) pasos['0.4'] = n - RED_DESDE;
    } else pasos[(MAPA[k] ?? [k])[0]] = n;
  }
  let ultimo = p.ultimo;
  if (ultimo && MAPA[ultimo.mod]) {
    const mod = ultimo.mod === '0.1' && Number(ultimo.fase) >= RED_DESDE ? '0.4' : MAPA[ultimo.mod][0];
    ultimo = { ...ultimo, mod, resumen: ultimo.resumen.replace(/^\S+/, mod) };
  }
  const m: Progreso = { ...p, modulos, v: V };
  if (pasos) m.pasos = pasos;
  if (ultimo) m.ultimo = ultimo;
  return m;
}

export function limpiarProgreso(v: unknown): Progreso {
  const p = vacio();
  if (!v || typeof v !== 'object') return p;
  const o = v as Record<string, unknown>;
  if (o.modulos && typeof o.modulos === 'object') {
    for (const [mod, piezas] of Object.entries(o.modulos as Record<string, unknown>).slice(0, 400)) {
      if (!/^[0-9a-z.\-]{1,12}$/i.test(mod) || !piezas || typeof piezas !== 'object') continue;
      for (const [pz, t] of Object.entries(piezas as Record<string, unknown>)) {
        if (PIEZAS.has(pz) && typeof t === 'number' && t > 0) (p.modulos[mod] ??= {})[pz] = Math.floor(t);
      }
    }
  }
  if (typeof o.xp === 'number' && o.xp >= 0) p.xp = Math.min(10_000_000, Math.floor(o.xp));
  if (Array.isArray(o.dias)) p.dias = [...new Set(o.dias.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-1500);
  if (o.records && typeof o.records === 'object') {
    for (const [k, n] of Object.entries(o.records as Record<string, unknown>).slice(0, 200)) if (/^[a-z0-9-]{1,40}$/.test(k) && typeof n === 'number') p.records[k] = n;
  }
  if (o.pasos && typeof o.pasos === 'object') {
    for (const [k, n] of Object.entries(o.pasos as Record<string, unknown>).slice(0, 400)) {
      if (/^[0-9a-z.\-]{1,12}$/i.test(k) && typeof n === 'number' && n >= 0) (p.pasos ??= {})[k] = Math.min(500, Math.floor(n));
    }
  }
  const u = o.ultimo as Progreso['ultimo'] | undefined;
  if (u && typeof u.mod === 'string' && typeof u.cuando === 'number') {
    p.ultimo = { mod: u.mod.slice(0, 12), fase: String(u.fase ?? '').slice(0, 40), resumen: String(u.resumen ?? '').slice(0, 200), cuando: u.cuando };
  }
  if (o.notas && typeof o.notas === 'object') {
    for (const [k, n] of Object.entries(o.notas as Record<string, unknown>).slice(0, 400)) {
      const x = n as { t?: unknown; c?: unknown } | null;
      if (k.length <= 40 && x && typeof x.t === 'string' && typeof x.c === 'number' && x.c > 0) (p.notas ??= {})[k] = { t: x.t.slice(0, 500), c: Math.floor(x.c) };
    }
  }
  // Lo que llega sin versión es de antes del cambio de numeración.
  p.v = o.v === V ? V : 1;
  return p;
}

// Nunca se pierde nada. De cada pieza se queda la fecha más antigua, del XP el mayor y los días se juntan.
export function mezclar(a: Progreso, b: Progreso): Progreso {
  a = migrar(a);
  b = migrar(b);
  const m: Progreso = { modulos: {}, xp: Math.max(a.xp, b.xp), dias: [...new Set([...a.dias, ...b.dias])].sort(), records: { ...a.records }, v: V };
  for (const src of [a, b]) {
    for (const [mod, piezas] of Object.entries(src.modulos)) {
      for (const [pz, t] of Object.entries(piezas)) {
        const dst = (m.modulos[mod] ??= {});
        dst[pz] = dst[pz] ? Math.min(dst[pz], t) : t;
      }
    }
  }
  for (const [k, n] of Object.entries(b.records)) m.records[k] = Math.max(m.records[k] ?? 0, n);
  for (const src of [a, b]) for (const [k, n] of Object.entries(src.pasos ?? {})) (m.pasos ??= {})[k] = Math.max(m.pasos[k] ?? 0, n);
  m.ultimo = (a.ultimo?.cuando ?? 0) >= (b.ultimo?.cuando ?? 0) ? a.ultimo : b.ultimo;
  if (!m.ultimo) delete m.ultimo;
  // De cada nota se queda la más reciente. Una nota vacía también cuenta: es que se borró.
  for (const src of [a, b]) {
    for (const [k, n] of Object.entries(src.notas ?? {})) {
      const ya = m.notas?.[k];
      if (!ya || n.c > ya.c) (m.notas ??= {})[k] = n;
    }
  }
  return m;
}

export async function verProgreso(c: Ctx) {
  const yo = await exigir(c);
  const f = await c.env.DB.prepare('SELECT datos FROM progreso WHERE usuario = ?').bind(yo.id).first<{ datos: string }>();
  return { datos: f ? migrar(limpiarProgreso(JSON.parse(f.datos))) : vacio() };
}

export async function guardarProgreso(c: Ctx) {
  soloDesdeLaWeb(c);
  const yo = await exigir(c);
  const b = await cuerpo<{ datos?: unknown }>(c, 256_000);
  const f = await c.env.DB.prepare('SELECT datos FROM progreso WHERE usuario = ?').bind(yo.id).first<{ datos: string }>();
  const m = mezclar(f ? limpiarProgreso(JSON.parse(f.datos)) : vacio(), limpiarProgreso(b.datos));
  const bosses = Object.values(m.modulos).filter((p) => p.boss).length;
  await c.env.DB.prepare(
    `INSERT INTO progreso (usuario, datos, xp, modulos, actualizado) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (usuario) DO UPDATE SET datos = excluded.datos, xp = excluded.xp, modulos = excluded.modulos, actualizado = excluded.actualizado`,
  ).bind(yo.id, JSON.stringify(m), m.xp, bosses, ahora()).run();
  return { datos: m };
}
