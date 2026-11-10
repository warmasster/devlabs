// Worker de cuentas de relavops. Las rutas están en src/rutas, una por tema. Ver LEEME.md.
import * as admin from './rutas/admin';
import * as clases from './rutas/clases';
import * as cuenta from './rutas/cuenta';
import * as nodos from './rutas/nodos';
import { ahora, DIA, Fallo, json, type Ctx } from './util';

type Manejador = (c: Ctx) => Promise<unknown>;

// [método, patrón, manejador]. Un :nombre del patrón llega en c.params.
const RUTAS: [string, string, Manejador][] = [
  ['GET', '/api/cuenta/config', cuenta.config],
  ['GET', '/api/cuenta/libre', cuenta.libre],
  ['GET', '/api/cuenta/clase', cuenta.verClase],
  ['POST', '/api/cuenta/registro', cuenta.registro],
  ['POST', '/api/cuenta/entrar', cuenta.entrar],
  ['POST', '/api/cuenta/salir', cuenta.salir],
  ['POST', '/api/cuenta/salir-todo', cuenta.salirTodo],
  ['GET', '/api/cuenta/yo', cuenta.yo],
  ['GET', '/api/cuenta/renovar', cuenta.renovar],
  ['POST', '/api/cuenta/clave', cuenta.cambiarClave],
  ['POST', '/api/cuenta/correo', cuenta.cambiarCorreo],
  ['POST', '/api/cuenta/unirse', cuenta.unirse],
  ['POST', '/api/cuenta/dejar', cuenta.dejar],
  ['POST', '/api/cuenta/borrar', cuenta.borrarCuenta],
  ['GET', '/api/cuenta/progreso', cuenta.verProgreso],
  ['PUT', '/api/cuenta/progreso', cuenta.guardarProgreso],
  ['POST', '/api/cuenta/verificar', cuenta.enviarVerificacion],
  ['GET', '/api/cuenta/verificar', cuenta.verificar],
  ['POST', '/api/cuenta/recuperar', cuenta.recuperar],
  ['POST', '/api/cuenta/recuperar/nueva', cuenta.recuperarNueva],
  ['GET', '/api/cuenta/clave-publica', cuenta.publica],

  ['GET', '/api/clases', clases.listar],
  ['POST', '/api/clases', clases.crear],
  ['GET', '/api/clases/:id', clases.ver],
  ['PATCH', '/api/clases/:id', clases.cambiar],
  ['DELETE', '/api/clases/:id', clases.borrar],
  ['POST', '/api/clases/:id/codigo', clases.otroCodigo],
  ['POST', '/api/clases/:id/alumnos', clases.crearAlumnos],
  ['DELETE', '/api/clases/:id/alumnos/:uid', clases.quitarAlumno],
  ['POST', '/api/clases/:id/alumnos/:uid/clave', clases.nuevaClaveAlumno],

  ['GET', '/api/admin/resumen', admin.resumen],
  ['GET', '/api/admin/usuarios', admin.usuarios],
  ['GET', '/api/admin/usuarios.csv', admin.exportar],
  ['GET', '/api/admin/usuarios/:id', admin.usuario],
  ['PATCH', '/api/admin/usuarios/:id', admin.cambiarUsuario],
  ['DELETE', '/api/admin/usuarios/:id', admin.borrarUsuario],
  ['POST', '/api/admin/usuarios/:id/echar', admin.echarUsuario],
  ['POST', '/api/admin/usuarios/:id/clave', admin.claveTemporal],
  ['GET', '/api/admin/clases', admin.clases],
  ['GET', '/api/admin/labs', admin.labs],
  ['POST', '/api/admin/labs/cerrar', admin.cerrarLab],
  ['GET', '/api/admin/nodos', admin.nodos],
  ['GET', '/api/admin/actividad', admin.actividad],
  ['GET', '/api/admin/ajustes', admin.verAjustes],
  ['PUT', '/api/admin/ajustes', admin.guardarAjustes],

  ['POST', '/api/nodos/latido', nodos.latido],
];

const COMPILADAS = RUTAS.map(([m, p, h]) => {
  const nombres: string[] = [];
  const re = new RegExp(`^${p.replace(/[.]/g, '\\.').replace(/:([a-z]+)/g, (_, n) => { nombres.push(n); return '([^/]+)'; })}$`);
  return { m, re, nombres, h };
});

export default {
  async fetch(req, env, exec): Promise<Response> {
    const url = new URL(req.url);
    const c: Ctx = { req, env, url, params: {}, exec, galletas: [], cache: new Map() };
    let res: Response;
    try {
      const candidatas = COMPILADAS.filter((r) => r.re.test(url.pathname));
      const r = candidatas.find((x) => x.m === req.method);
      if (!r) throw new Fallo(candidatas.length ? 405 : 404, candidatas.length ? 'Método no permitido.' : 'No existe.');
      const m = r.re.exec(url.pathname)!;
      r.nombres.forEach((n, i) => (c.params[n] = decodeURIComponent(m[i + 1])));
      const out = await r.h(c);
      res = out instanceof Response ? new Response(out.body, out) : json(out);
    } catch (e) {
      if (e instanceof Fallo) {
        res = json({ error: e.message, ...e.extra }, e.estado);
      } else {
        console.error('fallo', req.method, url.pathname, e);
        res = json({ error: 'Algo ha fallado en el servidor. Prueba otra vez en un momento.' }, 500);
      }
    }
    for (const g of c.galletas) res.headers.append('set-cookie', g);
    res.headers.set('x-content-type-options', 'nosniff');
    return res;
  },

  // Limpieza diaria. Las métricas por minuto se quedan 30 días; el registro de actividad, 180.
  async scheduled(_ev, env) {
    const t = ahora();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sesiones WHERE caduca < ?').bind(t),
      env.DB.prepare('DELETE FROM tokens WHERE caduca < ?').bind(t),
      env.DB.prepare('DELETE FROM metricas WHERE minuto < ?').bind(Math.floor((t - 30 * DIA) / 60_000)),
      env.DB.prepare('DELETE FROM actividad WHERE cuando < ?').bind(t - 180 * DIA),
      env.DB.prepare('DELETE FROM ordenes WHERE creada < ?').bind(t - DIA),
      env.DB.prepare('DELETE FROM nodos WHERE visto < ?').bind(t - 7 * DIA),
    ]);
  },
} satisfies ExportedHandler<Env>;
