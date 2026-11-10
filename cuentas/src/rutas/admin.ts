// /api/admin/… Solo para admins. Métricas de usuarios y de labs, gestión de cuentas y ajustes.
import { hashClave } from '../cripto';
import { hayCorreo } from '../correo';
import { ajustes, apuntar, exigir } from '../sesion';
import { ahora, csv, cuerpo, dia, DIA, Fallo, origenValido, texto, type Ctx } from '../util';
import { limpiarProgreso } from './cuenta';
import { nodosVivos, ordenar, sesionesVivas, type SesionViva } from './nodos';

const admin = (c: Ctx) => exigir(c, 'admin');
function desdeLaWeb(c: Ctx) {
  if (!origenValido(c)) throw new Fallo(403, 'Esta petición no viene de relavops.');
}
const diasRango = (c: Ctx) => Math.min(365, Math.max(7, Number(c.url.searchParams.get('dias')) || 30));

// Lista de días AAAA-MM-DD de los últimos n días, el último hoy.
function listaDias(n: number): string[] {
  const hoy = Date.now();
  return Array.from({ length: n }, (_, i) => dia(hoy - (n - 1 - i) * DIA));
}

// --- Resumen

export async function resumen(c: Ctx) {
  await admin(c);
  const n = diasRango(c);
  const t = ahora();
  const desde = t - n * DIA;
  const dias = listaDias(n);
  const db = c.env.DB;
  const [u, cl, altas, activos, usos, top, medias, hoyLab, consumo, nodos, a] = await Promise.all([
    db.prepare(
      `SELECT count(*) AS total,
         sum(rol = 'alumno') AS alumnos, sum(rol = 'profe') AS profes, sum(rol = 'admin') AS admins,
         sum(estado = 'bloqueado') AS bloqueados, sum(pide_profe = 1) AS pendientes_profe,
         sum(correo IS NOT NULL) AS con_correo, sum(correo_ok = 1) AS verificados,
         sum(rol = 'alumno' AND origen NOT IN ('clase', 'creado')) AS libres, sum(rol = 'alumno' AND origen IN ('clase', 'creado')) AS de_clase,
         sum(creado > ?1) AS nuevos_hoy, sum(creado > ?2) AS nuevos_7, sum(creado > ?3) AS nuevos_30,
         sum(ultimo_acceso > ?1) AS activos_hoy, sum(ultimo_acceso > ?2) AS activos_7, sum(ultimo_acceso > ?3) AS activos_30
       FROM usuarios`,
    ).bind(t - DIA, t - 7 * DIA, t - 30 * DIA).first<Record<string, number>>(),
    db.prepare('SELECT count(*) AS clases, (SELECT count(DISTINCT usuario) FROM miembros) AS alumnos_en_clase FROM clases').first<Record<string, number>>(),
    db.prepare("SELECT date(creado / 1000, 'unixepoch') AS d, count(*) AS n FROM usuarios WHERE creado > ? GROUP BY d").bind(desde).all<{ d: string; n: number }>(),
    db.prepare('SELECT dia AS d, count(*) AS n FROM dias_activos WHERE dia >= ? GROUP BY dia').bind(dias[0]).all<{ d: string; n: number }>(),
    db.prepare(
      "SELECT date(inicio / 1000, 'unixepoch') AS d, count(*) AS n, sum(segundos) / 60.0 AS min, count(DISTINCT usuario) AS gente FROM usos_lab WHERE inicio > ? GROUP BY d",
    ).bind(desde).all<{ d: string; n: number; min: number; gente: number }>(),
    db.prepare(
      `SELECT lab, count(*) AS sesiones, sum(segundos) / 60.0 AS minutos, avg(segundos) / 60.0 AS media_min,
         avg(cpu_s / max(segundos, 1)) * 100 AS cpu_pct, avg(ram_max_mb) AS ram_mb, avg(pasos) AS pasos
       FROM usos_lab WHERE inicio > ? GROUP BY lab ORDER BY sesiones DESC LIMIT 12`,
    ).bind(desde).all(),
    db.prepare(
      `SELECT count(*) AS sesiones, avg(segundos) / 60.0 AS media_min, sum(cpu_s) / max(sum(segundos), 1) * 100 AS cpu_pct,
         avg(ram_max_mb) AS ram_mb, sum(segundos) / 3600.0 AS horas
       FROM usos_lab WHERE inicio > ?`,
    ).bind(desde).first<Record<string, number>>(),
    db.prepare('SELECT count(*) AS sesiones, sum(segundos) / 60.0 AS minutos, count(DISTINCT usuario) AS gente FROM usos_lab WHERE inicio > ?')
      .bind(t - DIA).first<Record<string, number>>(),
    // Consumo de las últimas 24 h en tramos de 10 minutos, sumando todos los servidores.
    db.prepare(
      `SELECT b, avg(cpu) AS cpu, sum(ram) AS ram, sum(ram_total) AS ram_total, sum(ses) AS sesiones, sum(lcpu) AS labs_cpu, sum(lram) AS labs_ram FROM (
         SELECT (minuto / 10) * 10 AS b, nodo, avg(cpu_pct) AS cpu, avg(ram_mb) AS ram, max(ram_total) AS ram_total, avg(sesiones) AS ses,
           avg(labs_cpu) AS lcpu, avg(labs_ram_mb) AS lram
         FROM metricas WHERE minuto > ? GROUP BY b, nodo) GROUP BY b ORDER BY b`,
    ).bind(Math.floor((t - DIA) / 60_000)).all<Record<string, number>>(),
    nodosVivos(c),
    ajustes(c),
  ]);
  const porDia = <T extends { d: string }>(filas: T[], campo: keyof T) => {
    const m = new Map(filas.map((f) => [f.d, Number(f[campo]) || 0]));
    return dias.map((d) => Math.round((m.get(d) ?? 0) * 10) / 10);
  };
  const vivas = await sesionesVivas(c);
  const porLab = new Map<string, number>();
  for (const s of vivas) porLab.set(s.lab, (porLab.get(s.lab) ?? 0) + 1);
  const vivos = nodos.filter((x) => x.vivo);
  const ramLibre = vivos.reduce((s, x) => s + (x.host.ram_total_mb - x.host.ram_usada_mb), 0);
  const ramSesion = vivas.length ? vivas.reduce((s, x) => s + x.ram_mb, 0) / vivas.length : medias?.ram_mb || 0;
  return {
    dias,
    usuarios: u,
    clases: cl,
    series: {
      altas: porDia(altas.results, 'n'), activos: porDia(activos.results, 'n'),
      sesiones_lab: porDia(usos.results, 'n'), minutos_lab: porDia(usos.results, 'min'), gente_lab: porDia(usos.results, 'gente'),
    },
    labs: {
      vivas: vivas.length, conectadas: vivas.filter((s) => s.conectada).length,
      por_lab: [...porLab].map(([lab, n]) => ({ lab, n })).sort((x, y) => y.n - x.n),
      hoy: hoyLab, medias, top: top.results,
      cpu_ahora: vivas.reduce((s, x) => s + x.cpu_pct, 0), ram_ahora: vivas.reduce((s, x) => s + x.ram_mb, 0),
    },
    capacidad: {
      ram_libre_mb: ramLibre, ram_por_sesion_mb: Math.round(ramSesion),
      caben: ramSesion > 0 ? Math.max(0, Math.floor((ramLibre - 256 * vivos.length) / ramSesion)) : null, // deja 256 MB por servidor de margen
      limite: vivos.reduce((s, x) => s + (x.limites?.total || 0), 0) || null,
    },
    consumo: consumo.results.map((r) => ({
      t: r.b * 60_000, cpu: Math.round(r.cpu * 10) / 10, ram_pct: r.ram_total ? Math.round((r.ram / r.ram_total) * 1000) / 10 : 0,
      sesiones: Math.round(r.sesiones * 10) / 10, labs_cpu: Math.round(r.labs_cpu * 100) / 100, labs_ram: Math.round(r.labs_ram),
    })),
    nodos: nodos.map(({ sesiones, ...x }) => ({ ...x, sesiones: (sesiones as SesionViva[]).length })),
    ajustes: a,
  };
}

// --- Usuarios

const ORDENES: Record<string, string> = {
  creado: 'u.creado', acceso: 'coalesce(u.ultimo_acceso, 0)', nombre: 'u.nombre_min', xp: 'coalesce(p.xp, 0)', entradas: 'u.entradas', lab: 'lab_seg',
};

export async function usuarios(c: Ctx) {
  await admin(c);
  const q = texto(c.url.searchParams.get('q'), 80).toLowerCase();
  const rol = c.url.searchParams.get('rol') ?? '';
  const estado = c.url.searchParams.get('estado') ?? '';
  const orden = ORDENES[c.url.searchParams.get('orden') ?? ''] ?? ORDENES.creado;
  const dir = c.url.searchParams.get('dir') === 'asc' ? 'ASC' : 'DESC';
  const por = Math.min(100, Math.max(5, Number(c.url.searchParams.get('por')) || 25));
  const pagina = Math.max(1, Number(c.url.searchParams.get('pagina')) || 1);
  const donde: string[] = [];
  const args: unknown[] = [];
  if (q) { donde.push('(u.nombre_min LIKE ? OR u.correo LIKE ? OR u.id = ?)'); args.push(`%${q}%`, `%${q}%`, q); }
  if (['alumno', 'profe', 'admin'].includes(rol)) { donde.push('u.rol = ?'); args.push(rol); }
  if (estado === 'bloqueado' || estado === 'activo') { donde.push('u.estado = ?'); args.push(estado); }
  if (estado === 'pide_profe') donde.push('u.pide_profe = 1');
  if (estado === 'sin_verificar') donde.push('u.correo IS NOT NULL AND u.correo_ok = 0');
  const w = donde.length ? `WHERE ${donde.join(' AND ')}` : '';
  const [total, filas] = await Promise.all([
    c.env.DB.prepare(`SELECT count(*) AS n FROM usuarios u ${w}`).bind(...args).first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT u.id, u.nombre, u.correo, u.rol, u.estado, u.correo_ok, u.pide_profe, u.origen, u.creado, u.ultimo_acceso, u.entradas, u.pais,
         coalesce(p.xp, 0) AS xp, coalesce(p.modulos, 0) AS bosses,
         (SELECT count(*) FROM miembros m WHERE m.usuario = u.id) AS clases,
         (SELECT coalesce(sum(segundos), 0) FROM usos_lab l WHERE l.usuario = u.id) AS lab_seg
       FROM usuarios u LEFT JOIN progreso p ON p.usuario = u.id ${w}
       ORDER BY ${orden} ${dir} LIMIT ? OFFSET ?`,
    ).bind(...args, por, (pagina - 1) * por).all(),
  ]);
  const vivas = await sesionesVivas(c);
  const enLab = new Set(vivas.map((s) => s.usuario));
  return { total: total?.n ?? 0, pagina, por, filas: filas.results.map((f) => ({ ...f, en_lab: enLab.has(f.id as string) })) };
}

export async function usuario(c: Ctx) {
  await admin(c);
  const id = c.params.id;
  const db = c.env.DB;
  const u = await db.prepare(
    'SELECT id, nombre, correo, rol, estado, correo_ok, pide_profe, origen, creado, ultimo_acceso, entradas, pais FROM usuarios WHERE id = ?',
  ).bind(id).first();
  if (!u) throw new Fallo(404, 'Ese usuario no existe.');
  const [sesiones, clases, propias, prog, usos, act, resumenLab] = await Promise.all([
    db.prepare('SELECT substr(id, 1, 10) AS id, creada, vista, caduca, ip, agente, pais FROM sesiones WHERE usuario = ? AND caduca > ? ORDER BY vista DESC LIMIT 20')
      .bind(id, ahora()).all(),
    db.prepare('SELECT c.id, c.nombre, p.nombre AS profe, m.unido FROM miembros m JOIN clases c ON c.id = m.clase JOIN usuarios p ON p.id = c.profe WHERE m.usuario = ?').bind(id).all(),
    db.prepare('SELECT id, nombre, codigo, abierta, creada, (SELECT count(*) FROM miembros m WHERE m.clase = c.id) AS alumnos FROM clases c WHERE profe = ?').bind(id).all(),
    db.prepare('SELECT datos, xp, modulos, actualizado FROM progreso WHERE usuario = ?').bind(id).first<{ datos: string; xp: number; modulos: number; actualizado: number }>(),
    db.prepare('SELECT lab, nodo, inicio, segundos, cpu_s, ram_max_mb, pasos, motivo FROM usos_lab WHERE usuario = ? ORDER BY inicio DESC LIMIT 40').bind(id).all(),
    db.prepare('SELECT cuando, tipo, detalle, ip, pais FROM actividad WHERE usuario = ? ORDER BY id DESC LIMIT 40').bind(id).all(),
    db.prepare('SELECT count(*) AS sesiones, coalesce(sum(segundos), 0) / 60.0 AS minutos, coalesce(sum(cpu_s), 0) AS cpu_s FROM usos_lab WHERE usuario = ?').bind(id).first(),
  ]);
  const vivas = (await sesionesVivas(c)).filter((s) => s.usuario === id);
  return {
    usuario: u, sesiones: sesiones.results, clases: clases.results, clases_profe: propias.results,
    progreso: prog ? { ...limpiarProgreso(JSON.parse(prog.datos)), actualizado: prog.actualizado } : null,
    usos: usos.results, actividad: act.results, lab: resumenLab, vivas,
  };
}

export async function cambiarUsuario(c: Ctx) {
  desdeLaWeb(c);
  const yo = await admin(c);
  const id = c.params.id;
  const b = await cuerpo(c);
  const u = await c.env.DB.prepare('SELECT id, nombre, rol, estado FROM usuarios WHERE id = ?').bind(id).first<{ id: string; nombre: string; rol: string; estado: string }>();
  if (!u) throw new Fallo(404, 'Ese usuario no existe.');
  const sets: string[] = [];
  const args: unknown[] = [];
  const cambios: string[] = [];
  if (b.rol !== undefined) {
    const rol = texto(b.rol, 10);
    if (!['alumno', 'profe', 'admin'].includes(rol)) throw new Fallo(400, 'Rol no válido.');
    if (id === yo.id && rol !== 'admin') throw new Fallo(400, 'No te quites el admin a ti mismo. Que lo haga otro admin.');
    sets.push('rol = ?', 'pide_profe = 0');
    args.push(rol);
    cambios.push(`rol ${u.rol} → ${rol}`);
  }
  if (b.estado !== undefined) {
    const estado = texto(b.estado, 10);
    if (!['activo', 'bloqueado'].includes(estado)) throw new Fallo(400, 'Estado no válido.');
    if (id === yo.id && estado !== 'activo') throw new Fallo(400, 'No puedes bloquearte a ti mismo.');
    sets.push('estado = ?');
    args.push(estado);
    cambios.push(estado);
  }
  if (b.correo_ok !== undefined) { sets.push('correo_ok = ?'); args.push(b.correo_ok ? 1 : 0); cambios.push(b.correo_ok ? 'correo confirmado' : 'correo sin confirmar'); }
  if (b.pide_profe === false) { sets.push('pide_profe = 0'); cambios.push('petición de profe rechazada'); }
  if (!sets.length) throw new Fallo(400, 'No hay nada que cambiar.');
  const pasos = [c.env.DB.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id)];
  if (b.estado === 'bloqueado') pasos.push(c.env.DB.prepare('DELETE FROM sesiones WHERE usuario = ?').bind(id));
  await c.env.DB.batch(pasos);
  if (b.estado === 'bloqueado') await ordenar(c, '*', 'expulsar', { usuario: id });
  // Con otro rol, labd deja de creerse los pases de antes de este momento. El navegador pide uno
  // nuevo con su sesión (rv_s) y ya lleva el rol de ahora. Sin esto, un admin degradado seguía
  // siéndolo en los servidores hasta que caducaba su pase, una hora.
  else if (b.rol !== undefined && b.rol !== u.rol) await ordenar(c, '*', 'renovar', { usuario: id, desde: Math.floor(Date.now() / 1000) });
  c.exec.waitUntil(apuntar(c, 'admin_cambio', yo.id, `${u.nombre}: ${cambios.join(', ')}`));
  return { ok: true };
}

export async function echarUsuario(c: Ctx) {
  desdeLaWeb(c);
  const yo = await admin(c);
  const id = c.params.id;
  await c.env.DB.prepare('DELETE FROM sesiones WHERE usuario = ?').bind(id).run();
  const n = await ordenar(c, '*', 'expulsar', { usuario: id });
  c.exec.waitUntil(apuntar(c, 'admin_echar', yo.id, id));
  return { ok: true, servidores: n };
}

export async function claveTemporal(c: Ctx) {
  desdeLaWeb(c);
  const yo = await admin(c);
  const id = c.params.id;
  const u = await c.env.DB.prepare('SELECT nombre FROM usuarios WHERE id = ?').bind(id).first<{ nombre: string }>();
  if (!u) throw new Fallo(404, 'Ese usuario no existe.');
  const clave = `rv-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}-${Date.now().toString(36).slice(-4)}`;
  const vueltas = Math.min(100_000, Math.max(10_000, Number(c.env.VUELTAS) || 100_000));
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE usuarios SET clave = ? WHERE id = ?').bind(await hashClave(clave, vueltas), id),
    c.env.DB.prepare('DELETE FROM sesiones WHERE usuario = ?').bind(id),
  ]);
  c.exec.waitUntil(apuntar(c, 'admin_clave', yo.id, u.nombre));
  return { nombre: u.nombre, clave };
}

export async function borrarUsuario(c: Ctx) {
  desdeLaWeb(c);
  const yo = await admin(c);
  const id = c.params.id;
  if (id === yo.id) throw new Fallo(400, 'Tu propia cuenta se borra desde Mi cuenta.');
  const u = await c.env.DB.prepare('SELECT nombre FROM usuarios WHERE id = ?').bind(id).first<{ nombre: string }>();
  if (!u) throw new Fallo(404, 'Ese usuario no existe.');
  await c.env.DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id).run();
  await ordenar(c, '*', 'expulsar', { usuario: id });
  c.exec.waitUntil(apuntar(c, 'admin_borrar', yo.id, u.nombre));
  return { ok: true };
}

export async function exportar(c: Ctx) {
  await admin(c);
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.nombre, u.correo, u.rol, u.estado, u.correo_ok, u.origen, u.creado, u.ultimo_acceso, u.entradas, u.pais,
       coalesce(p.xp, 0) AS xp, coalesce(p.modulos, 0) AS bosses
     FROM usuarios u LEFT JOIN progreso p ON p.usuario = u.id ORDER BY u.creado`,
  ).all<Record<string, string | number | null>>();
  const f = (ms: unknown) => (typeof ms === 'number' ? new Date(ms).toISOString() : '');
  const filas = [['id', 'nombre', 'correo', 'rol', 'estado', 'correo_confirmado', 'origen', 'alta', 'ultimo_acceso', 'entradas', 'pais', 'xp', 'bosses'],
    ...results.map((r) => [r.id, r.nombre, r.correo, r.rol, r.estado, r.correo_ok, r.origen, f(r.creado), f(r.ultimo_acceso), r.entradas, r.pais, r.xp, r.bosses])];
  return new Response(`﻿${csv(filas)}`, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="relavops-usuarios-${dia()}.csv"`, 'cache-control': 'no-store' },
  });
}

// --- Clases

export async function clases(c: Ctx) {
  await admin(c);
  const q = texto(c.url.searchParams.get('q'), 80).toLowerCase();
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.nombre, c.codigo, c.abierta, c.creada, p.nombre AS profe, p.id AS profe_id,
       (SELECT count(*) FROM miembros m WHERE m.clase = c.id) AS alumnos,
       (SELECT max(u.ultimo_acceso) FROM miembros m JOIN usuarios u ON u.id = m.usuario WHERE m.clase = c.id) AS ultimo,
       (SELECT coalesce(avg(pr.xp), 0) FROM miembros m JOIN progreso pr ON pr.usuario = m.usuario WHERE m.clase = c.id) AS xp_media
     FROM clases c JOIN usuarios p ON p.id = c.profe
     ${q ? 'WHERE lower(c.nombre) LIKE ?1 OR p.nombre_min LIKE ?1 OR c.codigo LIKE ?1' : ''}
     ORDER BY c.creada DESC LIMIT 500`,
  ).bind(...(q ? [`%${q}%`] : [])).all();
  return { clases: results };
}

// --- Labs y servidores

export async function labs(c: Ctx) {
  await admin(c);
  const n = diasRango(c);
  const [vivas, recientes, porLab, nodos] = await Promise.all([
    sesionesVivas(c),
    c.env.DB.prepare(
      `SELECT l.id, l.lab, l.nodo, l.inicio, l.fin, l.segundos, l.cpu_s, l.ram_max_mb, l.pasos, l.motivo, u.nombre AS usuario
       FROM usos_lab l LEFT JOIN usuarios u ON u.id = l.usuario ORDER BY l.fin DESC LIMIT 60`,
    ).all(),
    c.env.DB.prepare(
      `SELECT lab, count(*) AS sesiones, count(DISTINCT usuario) AS gente, sum(segundos) / 60.0 AS minutos, avg(segundos) / 60.0 AS media_min,
         sum(cpu_s) / max(sum(segundos), 1) * 100 AS cpu_pct, avg(ram_max_mb) AS ram_mb, max(ram_max_mb) AS ram_pico, avg(pasos) AS pasos,
         sum(motivo = 'abandono') AS abandonos
       FROM usos_lab WHERE inicio > ? GROUP BY lab ORDER BY sesiones DESC`,
    ).bind(ahora() - n * DIA).all(),
    nodosVivos(c),
  ]);
  return {
    vivas: vivas.sort((a, b) => b.cpu_pct - a.cpu_pct), recientes: recientes.results, por_lab: porLab.results,
    pools: nodos.filter((x) => x.vivo).map((x) => ({ nodo: x.nodo, pools: x.pools })),
  };
}

export async function cerrarLab(c: Ctx) {
  desdeLaWeb(c);
  const yo = await admin(c);
  const b = await cuerpo(c);
  const nodo = texto(b.nodo, 40), sesion = texto(b.sesion, 40);
  if (!nodo || !sesion) throw new Fallo(400, 'Falta el servidor o la sesión.');
  await ordenar(c, nodo, 'cerrar', { sesion });
  c.exec.waitUntil(apuntar(c, 'admin_cerrar_lab', yo.id, `${nodo} · ${sesion}`));
  return { ok: true };
}

export async function nodos(c: Ctx) {
  await admin(c);
  const horas = Math.min(24 * 30, Math.max(1, Number(c.url.searchParams.get('horas')) || 24));
  const tramo = horas <= 6 ? 1 : horas <= 24 ? 5 : horas <= 168 ? 30 : 120; // minutos por punto
  const [lista, serie] = await Promise.all([
    nodosVivos(c),
    c.env.DB.prepare(
      `SELECT nodo, (minuto / ?1) * ?1 AS b, avg(cpu_pct) AS cpu, avg(ram_mb) AS ram, max(ram_total) AS ram_total, avg(disco_pct) AS disco,
         avg(carga) AS carga, avg(sesiones) AS sesiones, max(sesiones) AS sesiones_max, avg(labs_cpu) AS labs_cpu, avg(labs_ram_mb) AS labs_ram
       FROM metricas WHERE minuto > ?2 GROUP BY nodo, b ORDER BY b`,
    ).bind(tramo, Math.floor((ahora() - horas * 3_600_000) / 60_000)).all<Record<string, number | string>>(),
  ]);
  const series: Record<string, unknown[]> = {};
  for (const r of serie.results) {
    (series[r.nodo as string] ??= []).push({
      t: (r.b as number) * 60_000, cpu: r.cpu, ram_pct: r.ram_total ? ((r.ram as number) / (r.ram_total as number)) * 100 : 0, ram: r.ram,
      disco: r.disco, carga: r.carga, sesiones: r.sesiones, sesiones_max: r.sesiones_max, labs_cpu: r.labs_cpu, labs_ram: r.labs_ram,
    });
  }
  return { nodos: lista.map(({ sesiones, ...x }) => ({ ...x, n_sesiones: (sesiones as SesionViva[]).length })), series, tramo };
}

// --- Actividad y ajustes

export async function actividad(c: Ctx) {
  await admin(c);
  const tipo = texto(c.url.searchParams.get('tipo'), 30);
  const quien = texto(c.url.searchParams.get('usuario'), 40);
  const pagina = Math.max(1, Number(c.url.searchParams.get('pagina')) || 1);
  const donde: string[] = [];
  const args: unknown[] = [];
  if (tipo) { donde.push('a.tipo = ?'); args.push(tipo); }
  if (quien) { donde.push('a.usuario = ?'); args.push(quien); }
  const w = donde.length ? `WHERE ${donde.join(' AND ')}` : '';
  const [filas, tipos] = await Promise.all([
    c.env.DB.prepare(
      `SELECT a.id, a.cuando, a.tipo, a.detalle, a.ip, a.pais, a.usuario, u.nombre FROM actividad a LEFT JOIN usuarios u ON u.id = a.usuario ${w}
       ORDER BY a.id DESC LIMIT 50 OFFSET ?`,
    ).bind(...args, (pagina - 1) * 50).all(),
    c.env.DB.prepare('SELECT tipo, count(*) AS n FROM actividad WHERE cuando > ? GROUP BY tipo ORDER BY n DESC').bind(ahora() - 30 * DIA).all(),
  ]);
  return { filas: filas.results, tipos: tipos.results, pagina };
}

export async function verAjustes(c: Ctx) {
  await admin(c);
  return { ajustes: await ajustes(c), correo: hayCorreo(c.env) };
}

export async function guardarAjustes(c: Ctx) {
  desdeLaWeb(c);
  const yo = await admin(c);
  const b = await cuerpo(c);
  const validos: Record<string, (v: string) => boolean> = {
    registro: (v) => ['abierto', 'solo_clase', 'cerrado'].includes(v),
    profes: (v) => ['abierto', 'aprobacion'].includes(v),
    verificar_correo: (v) => v === '0' || v === '1',
    aviso: (v) => v.length <= 200,
  };
  const pasos: D1PreparedStatement[] = [];
  for (const [k, ok] of Object.entries(validos)) {
    if (b[k] === undefined) continue;
    const v = texto(b[k], 200);
    if (!ok(v)) throw new Fallo(400, `Valor no válido para ${k}.`);
    pasos.push(c.env.DB.prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor').bind(k, v));
  }
  if (pasos.length) await c.env.DB.batch(pasos);
  c.exec.waitUntil(apuntar(c, 'admin_ajustes', yo.id, JSON.stringify(b).slice(0, 400)));
  c.cache.delete('ajustes');
  return { ajustes: await ajustes(c) };
}
