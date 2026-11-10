// /api/clases… Lo del profe. Cada profe ve y toca solo sus clases. El admin, todas.
import { hashClave } from '../cripto';
import { apuntar, exigir, type Usuario } from '../sesion';
import { ahora, cuerpo, Fallo, letras, nuevoId, origenValido, texto, type Ctx } from '../util';
import { limpiarProgreso, revisarNombre } from './cuenta';
import { sesionesVivas } from './nodos';

interface Clase { id: string; nombre: string; descripcion: string; codigo: string; profe: string; abierta: number; creada: number }

const nuevoCodigo = () => `${letras(4)}-${letras(4)}`;

async function miClase(c: Ctx, yo: Usuario): Promise<Clase> {
  const cl = await c.env.DB.prepare('SELECT * FROM clases WHERE id = ?').bind(c.params.id).first<Clase>();
  if (!cl || (cl.profe !== yo.id && yo.rol !== 'admin')) throw new Fallo(404, 'Esa clase no existe o no es tuya.');
  return cl;
}

function desdeLaWeb(c: Ctx) {
  if (!origenValido(c)) throw new Fallo(403, 'Esta petición no viene de relavops.');
}

export async function listar(c: Ctx) {
  const yo = await exigir(c, 'profe', 'admin');
  const { results } = await c.env.DB.prepare(
    `SELECT c.*, (SELECT count(*) FROM miembros m WHERE m.clase = c.id) AS alumnos,
       (SELECT max(u.ultimo_acceso) FROM miembros m JOIN usuarios u ON u.id = m.usuario WHERE m.clase = c.id) AS ultimo
     FROM clases c WHERE c.profe = ? ORDER BY c.creada DESC`,
  ).bind(yo.id).all();
  return { clases: results };
}

export async function crear(c: Ctx) {
  desdeLaWeb(c);
  const yo = await exigir(c, 'profe', 'admin');
  const b = await cuerpo(c);
  const nombre = texto(b.nombre, 80);
  if (nombre.length < 2) throw new Fallo(400, 'Ponle un nombre a la clase.', { campo: 'nombre' });
  const n = await c.env.DB.prepare('SELECT count(*) AS n FROM clases WHERE profe = ?').bind(yo.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= 50) throw new Fallo(400, 'Ya tienes 50 clases. Borra alguna antes de crear otra.');
  const cl: Clase = { id: nuevoId('c'), nombre, descripcion: texto(b.descripcion, 300), codigo: nuevoCodigo(), profe: yo.id, abierta: 1, creada: ahora() };
  await c.env.DB.prepare('INSERT INTO clases (id, nombre, descripcion, codigo, profe, abierta, creada) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(cl.id, cl.nombre, cl.descripcion, cl.codigo, cl.profe, cl.abierta, cl.creada).run();
  c.exec.waitUntil(apuntar(c, 'clase_creada', yo.id, cl.nombre));
  return { clase: { ...cl, alumnos: 0 } };
}

export async function ver(c: Ctx) {
  const yo = await exigir(c, 'profe', 'admin');
  const cl = await miClase(c, yo);
  const [alumnos, labs, vivas] = await Promise.all([
    c.env.DB.prepare(
      `SELECT u.id, u.nombre, u.correo, u.origen, EXISTS (SELECT 1 FROM miembros m2 JOIN clases c2 ON c2.id = m2.clase WHERE m2.usuario = u.id AND m2.unido = u.creado AND c2.profe = ?) AS alta_aqui, u.ultimo_acceso, u.estado, m.unido, p.datos, p.xp, p.modulos
       FROM miembros m JOIN usuarios u ON u.id = m.usuario LEFT JOIN progreso p ON p.usuario = u.id
       WHERE m.clase = ? ORDER BY lower(u.nombre)`,
    ).bind(cl.profe, cl.id).all<{ id: string; nombre: string; correo: string | null; origen: string; alta_aqui: number | null; ultimo_acceso: number | null; estado: string; unido: number; datos: string | null; xp: number | null; modulos: number | null }>(),
    c.env.DB.prepare(
      `SELECT usuario, sum(segundos) AS segundos, count(*) AS sesiones, max(fin) AS ultima
       FROM usos_lab WHERE usuario IN (SELECT usuario FROM miembros WHERE clase = ?) GROUP BY usuario`,
    ).bind(cl.id).all<{ usuario: string; segundos: number; sesiones: number; ultima: number }>(),
    sesionesVivas(c),
  ]);
  const porUsuario = new Map(labs.results.map((r) => [r.usuario, r]));
  const enLab = new Map<string, string>();
  for (const s of vivas) if (s.usuario) enLab.set(s.usuario, s.lab);
  return {
    clase: cl,
    alumnos: alumnos.results.map((a) => {
      const l = porUsuario.get(a.id);
      return {
        id: a.id, nombre: a.nombre, tiene_correo: !!a.correo, origen: a.origen, ultimo_acceso: a.ultimo_acceso, estado: a.estado, unido: a.unido,
        xp: a.xp ?? 0, bosses: a.modulos ?? 0, progreso: a.datos ? limpiarProgreso(JSON.parse(a.datos)).modulos : {},
        lab_minutos: Math.round((l?.segundos ?? 0) / 60), lab_sesiones: l?.sesiones ?? 0, en_lab: enLab.get(a.id) ?? null,
        puede_cambiar_clave: puedeCambiarClave(yo, a),
      };
    }),
  };
}

export async function cambiar(c: Ctx) {
  desdeLaWeb(c);
  const yo = await exigir(c, 'profe', 'admin');
  const cl = await miClase(c, yo);
  const b = await cuerpo(c);
  const nombre = b.nombre !== undefined ? texto(b.nombre, 80) : cl.nombre;
  if (nombre.length < 2) throw new Fallo(400, 'Ponle un nombre a la clase.', { campo: 'nombre' });
  const descripcion = b.descripcion !== undefined ? texto(b.descripcion, 300) : cl.descripcion;
  const abierta = b.abierta !== undefined ? (b.abierta ? 1 : 0) : cl.abierta;
  await c.env.DB.prepare('UPDATE clases SET nombre = ?, descripcion = ?, abierta = ? WHERE id = ?').bind(nombre, descripcion, abierta, cl.id).run();
  return { clase: { ...cl, nombre, descripcion, abierta } };
}

export async function otroCodigo(c: Ctx) {
  desdeLaWeb(c);
  const yo = await exigir(c, 'profe', 'admin');
  const cl = await miClase(c, yo);
  const codigo = nuevoCodigo();
  await c.env.DB.prepare('UPDATE clases SET codigo = ? WHERE id = ?').bind(codigo, cl.id).run();
  c.exec.waitUntil(apuntar(c, 'clase_codigo', yo.id, cl.nombre));
  return { codigo };
}

export async function borrar(c: Ctx) {
  desdeLaWeb(c);
  const yo = await exigir(c, 'profe', 'admin');
  const cl = await miClase(c, yo);
  await c.env.DB.prepare('DELETE FROM clases WHERE id = ?').bind(cl.id).run();
  c.exec.waitUntil(apuntar(c, 'clase_borrada', yo.id, cl.nombre));
  return { ok: true };
}

export async function quitarAlumno(c: Ctx) {
  desdeLaWeb(c);
  const yo = await exigir(c, 'profe', 'admin');
  const cl = await miClase(c, yo);
  await c.env.DB.prepare('DELETE FROM miembros WHERE clase = ? AND usuario = ?').bind(cl.id, c.params.uid).run();
  c.exec.waitUntil(apuntar(c, 'alumno_quitado', yo.id, `${cl.nombre} · ${c.params.uid}`));
  return { ok: true };
}

// --- Cuentas de alumnos creadas por el profe. Para clases donde los alumnos no tienen correo.

const PALABRAS_A = ['nube', 'gato', 'rayo', 'faro', 'tigre', 'roca', 'lobo', 'luna', 'cohete', 'pino', 'barco', 'buho', 'cable', 'disco', 'zorro',
  'puerto', 'nodo', 'tren', 'hoja', 'perla', 'llave', 'ola', 'robot', 'koala', 'panda', 'cubo', 'foca', 'rio', 'cometa', 'pulpo'];
const PALABRAS_B = ['azul', 'rojo', 'verde', 'veloz', 'feliz', 'listo', 'bravo', 'sabio', 'claro', 'fuerte', 'dorado', 'libre', 'sereno', 'audaz',
  'lila', 'negro', 'blanco', 'fino', 'loco', 'tenaz', 'raro', 'agil', 'firme', 'nuevo', 'grande', 'suave', 'alegre', 'vivo', 'puro', 'duro'];

// Dos palabras y cuatro cifras: unos 8 millones de claves posibles. Con dos cifras eran 81 000, y a
// 10 intentos por minuto se probaban todas en pocos días.
function claveFacil(): string {
  const r = crypto.getRandomValues(new Uint32Array(3));
  return `${PALABRAS_A[r[0] % PALABRAS_A.length]}-${PALABRAS_B[r[1] % PALABRAS_B.length]}-${1000 + (r[2] % 9000)}`;
}

// Las claves que se inventa relavops son al azar, así que no necesitan las 100 000 vueltas de una que
// elige una persona. Con 10 000, crear 10 cuentas cuesta lo mismo que un alta normal y cabe en el
// tiempo de CPU del plan gratis. Al entrar la primera vez se guarda otra vez con las vueltas de siempre.
const VUELTAS_AL_AZAR = 10_000;

// Cuentas que puede crear un profe al día. El admin no tiene tope.
const CREADAS_AL_DIA = 200;
const POR_PETICION = 10;

export async function crearAlumnos(c: Ctx) {
  desdeLaWeb(c);
  const yo = await exigir(c, 'profe', 'admin');
  const cl = await miClase(c, yo);
  const b = await cuerpo(c, 32_000);
  const nombres = Array.isArray(b.nombres) ? [...new Set((b.nombres as unknown[]).map((n) => texto(n, 40)).filter(Boolean))] : [];
  if (!nombres.length) throw new Fallo(400, 'Escribe al menos un nombre de usuario.');
  // La página manda los nombres de 10 en 10, así que el profe puede pegar muchos de una vez.
  if (nombres.length > POR_PETICION) throw new Fallo(400, `Como mucho ${POR_PETICION} por petición.`);
  if (yo.rol !== 'admin') {
    const hoy = await c.env.DB.prepare('SELECT count(*) AS n FROM usuarios WHERE creado_por = ? AND creado > ?')
      .bind(yo.id, ahora() - 86_400_000).first<{ n: number }>();
    if ((hoy?.n ?? 0) + nombres.length > CREADAS_AL_DIA) {
      throw new Fallo(429, `Hoy ya has creado ${hoy?.n ?? 0} cuentas, y se pueden crear ${CREADAS_AL_DIA} al día. Si necesitas más, escribe al admin.`, { motivo: 'deprisa' });
    }
  }
  const hechos: { nombre: string; clave: string }[] = [];
  const fallos: { nombre: string; motivo: string }[] = [];
  const ya = new Set(
    (await c.env.DB.prepare(`SELECT nombre_min FROM usuarios WHERE nombre_min IN (${nombres.map(() => '?').join(',')})`)
      .bind(...nombres.map((n) => n.toLowerCase())).all<{ nombre_min: string }>()).results.map((r) => r.nombre_min),
  );
  const pasos: D1PreparedStatement[] = [];
  const t = ahora();
  for (const nombre of nombres) {
    const mal = revisarNombre(nombre);
    if (mal) { fallos.push({ nombre, motivo: mal }); continue; }
    if (ya.has(nombre.toLowerCase())) { fallos.push({ nombre, motivo: 'Ya existe.' }); continue; }
    const clave = claveFacil();
    const id = nuevoId('u');
    pasos.push(
      c.env.DB.prepare("INSERT INTO usuarios (id, nombre, nombre_min, clave, rol, origen, creado, creado_por) VALUES (?, ?, ?, ?, 'alumno', 'creado', ?, ?)")
        .bind(id, nombre, nombre.toLowerCase(), await hashClave(clave, VUELTAS_AL_AZAR), t, yo.id),
      c.env.DB.prepare('INSERT INTO miembros (clase, usuario, unido) VALUES (?, ?, ?)').bind(cl.id, id, t),
    );
    hechos.push({ nombre, clave });
  }
  if (pasos.length) await c.env.DB.batch(pasos);
  c.exec.waitUntil(apuntar(c, 'alumnos_creados', yo.id, `${cl.nombre} · ${hechos.length}`));
  return { hechos, fallos };
}

// Solo para cuentas sin correo que nacieron en una clase de este profe: las que creó él en bloque y
// las de quien se dio de alta con el código de su clase. Así un profe no puede quedarse con la cuenta
// de un alumno que viene de la clase de otro y luego entra en la suya con el código.
// alta_aqui sale de la consulta: el alumno entró en una clase del profe en el mismo momento de su alta.
export function puedeCambiarClave(yo: Pick<Usuario, 'rol'>, a: { correo: string | null; alta_aqui: number | null }): boolean {
  if (yo.rol === 'admin') return true;
  return !a.correo && !!a.alta_aqui;
}

export async function nuevaClaveAlumno(c: Ctx) {
  desdeLaWeb(c);
  const yo = await exigir(c, 'profe', 'admin');
  const cl = await miClase(c, yo);
  const a = await c.env.DB.prepare(`SELECT u.id, u.nombre, u.correo, EXISTS (SELECT 1 FROM miembros m2 JOIN clases c2 ON c2.id = m2.clase WHERE m2.usuario = u.id AND m2.unido = u.creado AND c2.profe = ?) AS alta_aqui FROM miembros m JOIN usuarios u ON u.id = m.usuario WHERE m.clase = ? AND u.id = ?`)
    .bind(cl.profe, cl.id, c.params.uid).first<{ id: string; nombre: string; correo: string | null; alta_aqui: number | null }>();
  if (!a) throw new Fallo(404, 'Ese alumno no está en la clase.');
  if (!puedeCambiarClave(yo, a)) {
    throw new Fallo(403, a.correo ? 'Este alumno tiene correo. Que cambie la contraseña él mismo.' : 'Esta cuenta no se creó en tu clase. Que cambie la contraseña él mismo desde Mi cuenta.');
  }
  const clave = claveFacil();
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE usuarios SET clave = ? WHERE id = ?').bind(await hashClave(clave, VUELTAS_AL_AZAR), a.id),
    c.env.DB.prepare('DELETE FROM sesiones WHERE usuario = ?').bind(a.id),
  ]);
  c.exec.waitUntil(apuntar(c, 'clave_por_profe', yo.id, a.nombre));
  return { nombre: a.nombre, clave };
}
