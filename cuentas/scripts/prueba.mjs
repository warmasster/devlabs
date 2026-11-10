// Prueba de punta a punta de las cuentas contra `npm run dev` (http://localhost:8787 por defecto).
//   node scripts/prueba.mjs [url]
// Crea usuarios con nombres al azar, así se puede lanzar las veces que haga falta.
// Con una URL que no es local (el Worker desplegado) usa la base remota, y al acabar borra lo que ha creado.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:8787';
const REMOTO = !/localhost|127\.0\.0\.1/.test(BASE);
// El secreto de nodo: en local es "local"; en remoto, el que dejó scripts/claves.mjs para el VPS.
const SECRETO = REMOTO ? readFileSync(new URL('../../instalador/secretos/nodo.env', import.meta.url), 'utf8').match(/RELAVOPS_NODO_SECRETO=(\S+)/)[1] : 'local';
const sql = (q) => execSync(`npx wrangler d1 execute relavops ${REMOTO ? '--remote' : '--local'} --command "${q}"`, { stdio: 'ignore' });
const sufijo = Math.random().toString(36).slice(2, 7);
let fallos = 0;

function navegador() {
  const tarro = new Map();
  return async (ruta, { metodo = 'GET', datos, cabeceras = {} } = {}) => {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      redirect: 'manual',
      headers: {
        ...(datos ? { 'content-type': 'application/json' } : {}),
        origin: REMOTO ? 'https://relavops.org' : 'http://localhost:8080', // en producción solo vale la web de verdad
        cookie: [...tarro].map(([k, v]) => `${k}=${v}`).join('; '),
        ...cabeceras,
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    for (const g of r.headers.getSetCookie()) {
      const [kv] = g.split(';');
      const [k, ...v] = kv.split('=');
      if (/Max-Age=0/.test(g)) tarro.delete(k); else tarro.set(k, v.join('='));
    }
    const tipo = r.headers.get('content-type') ?? '';
    return { estado: r.status, j: tipo.includes('json') ? await r.json() : await r.text(), tarro, r };
  };
}

function ver(nombre, ok, extra = '') {
  console.log(`${ok ? '  ok ' : 'FALLO'} ${nombre}${extra ? `  ${extra}` : ''}`);
  if (!ok) fallos++;
}

const profe = navegador();
const alumno = navegador();
const otro = navegador();

let r = await profe('/api/cuenta/libre?nombre=profe_' + sufijo);
ver('nombre libre', r.j.libre === true);
r = await profe('/api/cuenta/libre?nombre=ad');
ver('nombre corto no vale', r.j.libre === false, r.j.motivo);
r = await profe('/api/cuenta/libre?nombre=admin');
ver('nombre reservado', r.j.libre === false, r.j.motivo);

r = await profe('/api/cuenta/registro', { metodo: 'POST', datos: { tipo: 'profe', nombre: `Profe_${sufijo}`, correo: `profe${sufijo}@ejemplo.com`, clave: 'una clave larga 123' } });
// Con el ajuste de por defecto (profes con aprobación), entra como alumno y pide ser profe.
ver('alta de profe: espera a que la aprueben', r.estado === 200 && r.j.usuario.rol === 'alumno' && r.j.usuario.pide_profe === true, JSON.stringify(r.j).slice(0, 120));
ver('galletas de sesión y pase', r.tarro.has('rv_s') && r.tarro.has('rv_t'));
const pase = JSON.parse(Buffer.from(r.tarro.get('rv_t').split('.')[1], 'base64url').toString());
ver('el pase dice cuándo se dio (iat)', pase.iat > 0 && pase.exp - pase.iat === 3600, JSON.stringify(pase));
r = await profe('/api/clases', { metodo: 'POST', datos: { nombre: 'Antes de aprobar' } });
ver('sin aprobar no crea clases', r.estado === 403);
sql(`UPDATE usuarios SET rol = 'profe', pide_profe = 0 WHERE nombre_min = 'profe_${sufijo}'`);

r = await profe('/api/cuenta/libre?nombre=PROFE_' + sufijo);
ver('nombre ocupado sin mirar mayúsculas', r.j.libre === false);

r = await profe('/api/clases', { metodo: 'POST', datos: { nombre: 'Redes 1º B' } });
ver('crear clase', r.estado === 200 && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(r.j.clase.codigo), r.j.clase?.codigo);
const clase = r.j.clase;

r = await alumno('/api/cuenta/clase?codigo=' + clase.codigo.toLowerCase().replace('-', ' '));
ver('ver clase por código', r.j.nombre === 'Redes 1º B' && r.j.profe === `Profe_${sufijo}`);

r = await alumno('/api/cuenta/registro', { metodo: 'POST', datos: { tipo: 'clase', codigo: clase.codigo, nombre: `ana_${sufijo}`, clave: 'clave-de-ana-9' } });
ver('alta de alumna con código y sin correo', r.estado === 200 && r.j.clase?.nombre === 'Redes 1º B', JSON.stringify(r.j).slice(0, 140));

r = await alumno('/api/cuenta/salir', { metodo: 'POST' });
r = await alumno('/api/cuenta/yo');
ver('tras salir, yo da 401', r.estado === 401);

r = await alumno('/api/cuenta/entrar', { metodo: 'POST', datos: { usuario: `ANA_${sufijo}`, clave: 'mal' } });
ver('contraseña mala', r.estado === 401);
r = await alumno('/api/cuenta/entrar', { metodo: 'POST', datos: { usuario: `ANA_${sufijo}`, clave: 'clave-de-ana-9' } });
ver('entrar con usuario y contraseña', r.estado === 200);
r = await alumno('/api/cuenta/yo');
ver('yo con su clase', r.estado === 200 && r.j.clases[0]?.nombre === 'Redes 1º B');

r = await alumno('/api/cuenta/progreso', { metodo: 'PUT', datos: { datos: { modulos: { '0.1': { teoria: 5, lab: 9 } }, xp: 120, dias: ['2026-11-04'], records: { tubo: 3 } } } });
r = await alumno('/api/cuenta/progreso', { metodo: 'PUT', datos: { datos: { modulos: { '0.1': { teoria: 3, boss: 12 }, '0.2': { teoria: 7 } }, xp: 90, dias: ['2026-11-05'], records: { tubo: 5 } } } });
const p = r.j.datos;
ver('progreso mezclado', p.xp === 120 && p.modulos['0.1'].teoria === 3 && p.modulos['0.1'].lab === 9 && p.modulos['0.1'].boss === 12 && p.dias.length === 2 && p.records.tubo === 5, JSON.stringify(p));

r = await alumno('/api/clases');
ver('un alumno no ve /api/clases', r.estado === 403);
r = await alumno('/api/admin/resumen');
ver('un alumno no ve el admin', r.estado === 403);

r = await profe(`/api/clases/${clase.id}`);
ver('el profe ve a su alumna y su progreso', r.j.alumnos?.[0]?.nombre === `ana_${sufijo}` && r.j.alumnos[0].xp === 120, JSON.stringify(r.j.alumnos?.[0] ?? r.j).slice(0, 160));

r = await profe(`/api/clases/${clase.id}/alumnos`, { metodo: 'POST', datos: { nombres: Array.from({ length: 11 }, (_, i) => `muchos${i}_${sufijo}`) } });
ver('en bloque, como mucho 10 por petición', r.estado === 400, JSON.stringify(r.j).slice(0, 120));
r = await profe(`/api/clases/${clase.id}/alumnos`, { metodo: 'POST', datos: { nombres: [`luis_${sufijo}`, `marta_${sufijo}`, 'x'] } });
ver('crear alumnos en bloque', r.j.hechos?.length === 2 && r.j.fallos?.length === 1, JSON.stringify(r.j).slice(0, 160));
const luis = r.j.hechos[0];
ver('contraseña de dos palabras y cuatro cifras', /^[a-z]+-[a-z]+-\d{4}$/.test(luis.clave), luis.clave);
r = await otro('/api/cuenta/entrar', { metodo: 'POST', datos: { usuario: luis.nombre, clave: luis.clave } });
ver('el alumno creado entra con su contraseña', r.estado === 200);

r = await otro('/api/cuenta/entrar', { metodo: 'POST', datos: { usuario: luis.nombre, clave: luis.clave }, cabeceras: { origin: 'https://otra-web.com' } });
ver('otra web no puede entrar por ti', r.estado === 403);

r = await profe(`/api/clases/${clase.id}`, { metodo: 'PATCH', datos: { abierta: false } });
r = await otro('/api/cuenta/registro', { metodo: 'POST', datos: { tipo: 'clase', codigo: clase.codigo, nombre: `tarde_${sufijo}`, clave: 'otra clave 456' } });
ver('clase cerrada no admite altas', r.estado === 400 && r.j.campo === 'codigo');

// Latido de un nodo y vista del admin.
r = await otro('/api/nodos/latido', { metodo: 'POST', datos: { nodo: 'prueba' }, cabeceras: { authorization: 'Bearer mal' } });
ver('latido con secreto malo', r.estado === 401);
const latido = {
  nodo: 'prueba', version: 'test', arranque: Date.now() - 60_000,
  host: { cpus: 2, cpu_pct: 37.5, carga: [0.8, 0.6, 0.4], ram_total_mb: 1990, ram_usada_mb: 1100, disco_total_gb: 40, disco_usado_gb: 14, labd_mb: 30 },
  pools: { 'n0-1-maquina': 2 }, limites: { total: 30, por_persona: 3 },
  sesiones: [{ id: 's1', usuario: 'u_x', nombre: 'ana', lab: 'n0-1-maquina', creada: Date.now() - 300_000, cpu_pct: 4.2, ram_mb: 38, pasos: 3, total_pasos: 9, conectada: true }],
  terminadas: [{ id: `t-${sufijo}`, usuario: 'u_x', lab: 'n0-2-shell', inicio: Date.now() - 1_800_000, fin: Date.now() - 60_000, cpu_s: 21, ram_max_mb: 60, pasos: 7, motivo: 'cerrada' }],
};
r = await otro('/api/nodos/latido', { metodo: 'POST', datos: latido, cabeceras: { authorization: `Bearer ${SECRETO}` } });
ver('latido aceptado', r.estado === 200 && Array.isArray(r.j.ordenes), JSON.stringify(r.j));

// Hace admin al profe de prueba en la base local para mirar el panel.
sql(`UPDATE usuarios SET rol = 'admin' WHERE nombre_min = 'profe_${sufijo}'`);
r = await profe('/api/cuenta/yo');
r = await profe('/api/admin/resumen');
ver('resumen del admin', r.estado === 200 && r.j.usuarios.total >= 4 && r.j.labs.vivas >= 1 && r.j.nodos.some((n) => n.nodo === 'prueba' && n.vivo), `usuarios=${r.j.usuarios?.total} vivas=${r.j.labs?.vivas} caben=${r.j.capacidad?.caben}`);
r = await profe('/api/admin/usuarios?q=' + sufijo);
ver('buscar usuarios', r.j.total === 4, `total=${r.j.total}`);
const ana = r.j.filas.find((f) => f.nombre === `ana_${sufijo}`);
r = await profe(`/api/admin/usuarios/${ana.id}`, { metodo: 'PATCH', datos: { estado: 'bloqueado' } });
ver('bloquear usuario', r.estado === 200);
r = await alumno('/api/cuenta/yo');
ver('la usuaria bloqueada queda fuera', r.estado === 401);
r = await otro('/api/nodos/latido', { metodo: 'POST', datos: latido, cabeceras: { authorization: `Bearer ${SECRETO}` } });
ver('el nodo recibe la orden de echarla', r.j.ordenes?.some((o) => o.tipo === 'expulsar' && o.usuario === ana.id), JSON.stringify(r.j.ordenes));
r = await profe('/api/admin/labs');
ver('labs del admin', r.estado === 200 && r.j.vivas.length >= 1 && r.j.por_lab.length >= 1);
r = await profe('/api/admin/nodos?horas=24');
ver('servidores del admin', r.estado === 200 && r.j.series.prueba?.length >= 1);
r = await profe('/api/admin/actividad');
ver('registro de actividad', r.estado === 200 && r.j.filas.length > 0);
r = await profe('/api/admin/usuarios.csv');
ver('exportar CSV', r.estado === 200 && String(r.j).includes('nombre,correo'));
r = await profe('/api/cuenta/renovar?vuelta=/curso');
ver('renovar el pase vuelve a la página', r.estado === 302 && r.r.headers.get('location').endsWith('/curso'));
r = await otro('/api/cuenta/renovar?vuelta=//malo.com');
ver('renovar no lleva fuera de la web', r.estado === 302 && !r.r.headers.get('location').includes('malo.com'));
for (const v of ['/%09/malo.com', '/%5Cmalo.com', '/%0a/malo.com', '/\\/malo.com', '/./%2F/malo.com']) {
  r = await profe('/api/cuenta/renovar?vuelta=' + v);
  const l = r.r.headers.get('location') ?? '';
  ver(`renovar con ${v} no lleva fuera`, r.estado === 302 && !/^\/\/|^\/\\|malo\.com/.test(l.replace(/^\/curso$/, '')) && !new URL(l, 'https://relavops.org').host.includes('malo'), l);
}
r = await profe('/api/cuenta/renovar?vuelta=' + encodeURIComponent('/leccion?m=0.1#paso'));
ver('renovar deja la vuelta buena tal cual', r.r.headers.get('location') === '/leccion?m=0.1#paso', r.r.headers.get('location'));

// Cambiar el rol deja la orden de pedir pase nuevo, para que labd no se crea el rol de antes.
r = await profe('/api/admin/usuarios?q=marta_' + sufijo);
const marta = r.j.filas?.[0];
r = await profe(`/api/admin/usuarios/${marta.id}`, { metodo: 'PATCH', datos: { rol: 'profe' } });
r = await otro('/api/nodos/latido', { metodo: 'POST', datos: latido, cabeceras: { authorization: `Bearer ${SECRETO}` } });
const orden = r.j.ordenes?.find((o) => o.tipo === 'renovar' && o.usuario === marta.id);
ver('cambiar el rol manda renovar el pase', !!orden && orden.desde > 0, JSON.stringify(r.j.ordenes));

// Quién puede cambiar contraseñas: el profe de la clase en la que nació la cuenta sin correo.
// No el de otra clase en la que el alumno entra después.
const profe2 = navegador();
r = await profe2('/api/cuenta/registro', { metodo: 'POST', datos: { tipo: 'profe', nombre: `Otro_${sufijo}`, correo: `otro${sufijo}@ejemplo.com`, clave: 'otra clave larga 789' } });
sql(`UPDATE usuarios SET rol = 'profe', pide_profe = 0 WHERE nombre_min = 'otro_${sufijo}'`);
r = await profe2('/api/clases', { metodo: 'POST', datos: { nombre: 'Clase del otro' } });
const clase2 = r.j.clase;
const eva = navegador();
r = await eva('/api/cuenta/registro', { metodo: 'POST', datos: { tipo: 'clase', codigo: clase2.codigo, nombre: `eva_${sufijo}`, clave: 'clave-de-eva-7' } });
const evaId = r.j.usuario?.id;
r = await profe2(`/api/clases/${clase2.id}/alumnos/${evaId}/clave`, { metodo: 'POST' });
ver('el profe cambia la contraseña de quien entró con el código de su clase', r.estado === 200 && /^[a-z]+-[a-z]+-\d{4}$/.test(r.j.clave ?? ''), JSON.stringify(r.j));
const luisId = (await profe('/api/admin/usuarios?q=luis_' + sufijo)).j.filas?.[0]?.id;
sql(`INSERT INTO miembros (clase, usuario, unido) VALUES ('${clase2.id}', '${ana.id}', ${Date.now()}), ('${clase2.id}', '${luisId}', ${Date.now()})`);
for (const [quien, id] of [['ana', ana.id], ['luis', luisId]]) {
  r = await profe2(`/api/clases/${clase2.id}/alumnos/${id}/clave`, { metodo: 'POST' });
  ver(`otro profe no cambia la contraseña de ${quien}, que nació en otra clase`, r.estado === 403, JSON.stringify(r.j));
}
r = await profe2(`/api/clases/${clase2.id}`);
const fila = (id) => r.j.alumnos?.find((a) => a.id === id);
ver('su panel solo se lo ofrece con eva', fila(evaId)?.puede_cambiar_clave === true && fila(ana.id)?.puede_cambiar_clave === false && fila(luisId)?.puede_cambiar_clave === false);

if (!REMOTO) {
  // Tope de cuentas al día: con 195 ya creadas hoy, 10 más no caben.
  const prof2 = (await profe2('/api/cuenta/yo')).j.usuario.id;
  sql(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 194) INSERT INTO usuarios (id, nombre, nombre_min, clave, rol, origen, creado, creado_por) SELECT 'u_tope' || i || '_${sufijo}', 'tope' || i || '_${sufijo}', 'tope' || i || '_${sufijo}', 'x', 'alumno', 'creado', ${Date.now()}, '${prof2}' FROM n`);
  r = await profe2(`/api/clases/${clase2.id}/alumnos`, { metodo: 'POST', datos: { nombres: Array.from({ length: 10 }, (_, i) => `mas${i}_${sufijo}`) } });
  ver('tope de 200 cuentas creadas al día', r.estado === 429, JSON.stringify(r.j).slice(0, 140));
}

if (REMOTO) {
  // Todos los usuarios de la prueba acaban en _sufijo. Las clases, el progreso y las sesiones se van con ellos.
  sql(`DELETE FROM usuarios WHERE nombre_min LIKE '%${sufijo}'; DELETE FROM nodos WHERE id = 'prueba'; DELETE FROM metricas WHERE nodo = 'prueba'; DELETE FROM usos_lab WHERE nodo = 'prueba'; DELETE FROM ordenes WHERE nodo = 'prueba'; DELETE FROM actividad WHERE detalle LIKE '%${sufijo}%'`);
  console.log('  (borrado lo de la prueba en la base remota)');
}
console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
