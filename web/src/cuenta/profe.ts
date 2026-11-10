// Panel del profe: sus clases, el código de cada una, el progreso de cada alumno por lección,
// quién está en un lab ahora mismo y cuentas de alumnos creadas en bloque.
import '../estilo.css';
import '../iconos';
import './paginas.css';
import { panelAjustes } from '../recompensa';
import { LECCIONES, ORDEN } from '../curso/lecciones/index';
import { dialogo } from '../curso/nucleo/salir';
import { colorDe, cuenta, irAEntrar, pedir } from './sesion';
import { esc, hace } from './cuenta-util';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
$('#ajustes').append(panelAjustes());

interface Clase { id: string; nombre: string; descripcion: string; codigo: string; abierta: number; creada: number; alumnos?: number; ultimo?: number | null }
interface Alumno {
  id: string; nombre: string; tiene_correo: boolean; origen: string; ultimo_acceso: number | null; estado: string; unido: number; xp: number; bosses: number;
  progreso: Record<string, Record<string, number>>; lab_minutos: number; lab_sesiones: number; en_lab: string | null; puede_cambiar_clave: boolean;
}

let clases: Clase[] = [];
let actual = new URLSearchParams(location.search).get('c') ?? '';
let orden: 'nombre' | 'xp' | 'acceso' | 'lab' = 'nombre';
let reloj = 0;

const enlace = (c: Clase) => `${location.origin}/entrar?clase=${c.codigo}`;

async function copiar(texto: string, boton: HTMLElement) {
  try { await navigator.clipboard.writeText(texto); } catch { prompt('Copia esto', texto); return; }
  const antes = boton.textContent;
  boton.textContent = 'Copiado';
  setTimeout(() => (boton.textContent = antes), 1400);
}

function pintarLista() {
  const raiz = $('#clases');
  raiz.querySelectorAll('.pf-clase').forEach((e) => e.remove());
  for (const c of clases) {
    const b = document.createElement('button');
    b.className = 'pf-clase';
    b.setAttribute('aria-current', String(c.id === actual));
    b.innerHTML = `<b>${esc(c.nombre)}</b><small>${c.alumnos ?? 0} alumnos · ${c.abierta ? 'abierta' : 'cerrada'}</small>`;
    b.onclick = () => abrir(c.id);
    raiz.append(b);
  }
}

async function cargarLista() {
  const r = await pedir<{ clases: Clase[] }>('/api/clases');
  clases = r.clases;
  pintarLista();
}

function vacio() {
  $('#detalle').innerHTML = `<div class="panel pf-vacio">
    <h2>Crea tu primera clase</h2>
    <p class="cp-suave">Cada clase tiene un código. Tus alumnos lo escriben al crear su cuenta, o lo usan para unirse si ya la tienen. Desde aquí ves su progreso.</p>
    <p><button class="btn primario grande" id="nueva-2">Nueva clase</button></p></div>`;
  $('#nueva-2').onclick = formNueva;
}

function formNueva() {
  clearInterval(reloj);
  actual = '';
  pintarLista();
  $('#detalle').innerHTML = `<form class="panel cp-form" id="f-nueva" style="max-width:520px">
    <h2>Nueva clase</h2>
    <label>Nombre<input name="nombre" maxlength="80" placeholder="Redes 1º B" required /></label>
    <label>Descripción (opcional)<input name="descripcion" maxlength="300" placeholder="Martes y jueves, aula 12" /></label>
    <div class="cp-fila"><button class="btn primario">Crear clase</button><button type="button" class="btn fantasma" id="cancelar">Cancelar</button></div>
    <p class="cp-msg"></p></form>`;
  const f = $('#f-nueva') as HTMLFormElement;
  (f.elements.namedItem('nombre') as HTMLInputElement).focus();
  $('#cancelar').onclick = () => (clases.length ? abrir(clases[0].id) : vacio());
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const r = await pedir<{ clase: Clase }>('/api/clases', 'POST', {
        nombre: (f.elements.namedItem('nombre') as HTMLInputElement).value,
        descripcion: (f.elements.namedItem('descripcion') as HTMLInputElement).value,
      });
      await cargarLista();
      abrir(r.clase.id);
    } catch (x: any) {
      const m = $('.cp-msg', f);
      m.textContent = x.message;
      m.className = 'cp-msg mal';
    }
  };
}

function celda(p: Record<string, number> | undefined) {
  const t = p?.teoria, l = p?.lab, b = p?.boss;
  const titulo = [t ? 'teoría' : '', l ? 'práctica' : '', b ? 'boss' : ''].filter(Boolean).join(', ') || 'sin empezar';
  return `<span class="pf-celda" title="${titulo}"><i class="${t ? 'si' : ''}"></i><i class="${l ? 'si' : ''}"></i><i class="${b ? 'si b' : ''}"></i></span>`;
}

function ordenar(a: Alumno[]) {
  const f: Record<typeof orden, (x: Alumno, y: Alumno) => number> = {
    nombre: (x, y) => x.nombre.localeCompare(y.nombre),
    xp: (x, y) => y.xp - x.xp,
    acceso: (x, y) => (y.ultimo_acceso ?? 0) - (x.ultimo_acceso ?? 0),
    lab: (x, y) => y.lab_minutos - x.lab_minutos,
  };
  return [...a].sort(f[orden]);
}

async function abrir(id: string, silencioso = false) {
  actual = id;
  history.replaceState(null, '', `?c=${id}`);
  pintarLista();
  let d: { clase: Clase; alumnos: Alumno[] };
  try {
    d = await pedir(`/api/clases/${id}`);
  } catch (x: any) {
    if (!silencioso) $('#detalle').innerHTML = `<div class="panel">${esc(x.message)}</div>`;
    return;
  }
  // No repintar si está escribiendo en algún campo de esta clase.
  if (silencioso && (document.activeElement as HTMLElement)?.closest?.('#detalle form')) return;
  const { clase: c, alumnos } = d;
  const mods = ORDEN.filter((m) => LECCIONES[m]);
  const enLab = alumnos.filter((a) => a.en_lab).length;
  const xpMedia = alumnos.length ? Math.round(alumnos.reduce((s, a) => s + a.xp, 0) / alumnos.length) : 0;
  const bosses = alumnos.reduce((s, a) => s + a.bosses, 0);
  const scroll = $('.pf-tabla-caja')?.scrollLeft ?? 0;
  $('#detalle').innerHTML = `
    <div style="display:grid;gap:16px">
      <section class="panel" style="display:grid;gap:14px">
        <div class="pf-cab">
          <div><h2>${esc(c.nombre)}</h2>${c.descripcion ? `<p class="cp-suave">${esc(c.descripcion)}</p>` : ''}</div>
          <div class="cp-fila pf-no-imprimir">
            <button class="btn peque" id="b-renombrar">Cambiar nombre</button>
            <button class="btn peque fantasma" id="b-borrar">Borrar clase</button>
          </div>
        </div>
        <div class="pf-codigo">
          <div><small>Código de la clase</small><span class="num">${esc(c.codigo)}</span></div>
          <div class="cp-fila pf-no-imprimir" style="flex:1">
            <button class="btn" id="b-copiar-codigo">Copiar código</button>
            <button class="btn" id="b-copiar-enlace">Copiar enlace de invitación</button>
            <button class="btn fantasma" id="b-otro-codigo">Cambiar código</button>
          </div>
          <label class="cp-fila pf-no-imprimir" style="font-size:14px;cursor:pointer"><input type="checkbox" id="c-abierta" ${c.abierta ? 'checked' : ''} /> Admite alumnos nuevos</label>
        </div>
        <div class="pf-cifras">
          <div><b>${alumnos.length}</b><span>alumnos</span></div>
          <div><b style="color:var(--ok)">${enLab}</b><span>en un lab ahora</span></div>
          <div><b style="color:var(--xp)">${xpMedia}</b><span>XP de media</span></div>
          <div><b>${bosses}</b><span>bosses vencidos</span></div>
        </div>
      </section>

      <section class="panel" style="display:grid;gap:12px">
        <div class="pf-cab">
          <h2>Progreso</h2>
          <div class="pf-leyenda"><span class="pf-celda"><i class="si"></i><i class="si"></i><i class="si b"></i></span> teoría, práctica y boss
            <span><span class="pf-vivo" style="display:inline-block;vertical-align:middle"></span> en un lab ahora</span>
            <label class="pf-no-imprimir">Ordenar por <select class="cp-in" id="orden" style="width:auto;padding:4px 8px">
              <option value="nombre">nombre</option><option value="xp">XP</option><option value="acceso">último acceso</option><option value="lab">tiempo en labs</option></select></label>
          </div>
        </div>
        ${alumnos.length ? `<div class="pf-tabla-caja"><table class="pf-tabla">
          <thead><tr><th>Alumno</th><th>Último acceso</th><th>XP</th><th>Labs</th>${mods.map((m) => `<th class="mod" title="${esc(LECCIONES[m].titulo)}">${m}</th>`).join('')}<th class="pf-no-imprimir"></th></tr></thead>
          <tbody>${ordenar(alumnos).map((a) => `<tr>
            <td><span class="nombre"><span class="rv-avatar" style="--c:${colorDe(a.nombre)}">${esc(a.nombre.slice(0, 1).toUpperCase())}</span>${esc(a.nombre)}${a.en_lab ? `<span class="pf-vivo" title="En el lab ${esc(a.en_lab)}"></span>` : ''}${a.estado !== 'activo' ? ' <span class="pildora mal">bloqueado</span>' : ''}</span></td>
            <td>${hace(a.ultimo_acceso)}</td>
            <td style="color:var(--xp);font-weight:700">${a.xp}</td>
            <td title="${a.lab_sesiones} sesiones">${a.lab_minutos} min</td>
            ${mods.map((m) => `<td class="mod">${celda(a.progreso[m])}</td>`).join('')}
            <td class="pf-no-imprimir"><span class="cp-fila" style="flex-wrap:nowrap">
              ${a.puede_cambiar_clave ? `<button class="btn peque" data-clave="${a.id}" data-n="${esc(a.nombre)}">Contraseña nueva</button>` : ''}
              <button class="btn peque fantasma" data-quitar="${a.id}" data-n="${esc(a.nombre)}">Quitar</button></span></td>
          </tr>`).join('')}</tbody></table></div>`
        : `<p class="cp-suave">Todavía no hay nadie. Reparte el código <b>${esc(c.codigo)}</b> o el enlace de invitación, o crea tú las cuentas aquí abajo.</p>`}
      </section>

      <section class="panel pf-no-imprimir">
        <h2>Crear cuentas para tus alumnos</h2>
        <p class="cp-suave">Para alumnos sin correo. Escribe un nombre de usuario por línea. Cada uno sale con una contraseña fácil de dictar, que puede cambiar luego en Mi cuenta.</p>
        <form class="cp-form" id="f-alumnos" style="margin-top:10px">
          <textarea name="nombres" placeholder="ana.garcia&#10;luis_m&#10;marta22"></textarea>
          <div class="cp-fila"><button class="btn primario">Crear cuentas</button></div>
          <p class="cp-msg"></p>
        </form>
        <div id="cuentas-hechas"></div>
      </section>
    </div>`;
  const caja = $('.pf-tabla-caja');
  if (caja) caja.scrollLeft = scroll;
  ($('#orden') as HTMLSelectElement).value = orden;
  ($('#orden') as HTMLSelectElement).onchange = (e) => { orden = (e.target as HTMLSelectElement).value as typeof orden; abrir(c.id); };

  $('#b-copiar-codigo').onclick = (e) => copiar(c.codigo, e.currentTarget as HTMLElement);
  $('#b-copiar-enlace').onclick = (e) => copiar(enlace(c), e.currentTarget as HTMLElement);
  $('#b-otro-codigo').onclick = async () => {
    if (!(await dialogo({ titulo: '¿Cambiar el código?', texto: 'El código de ahora deja de valer. Los alumnos que ya están siguen dentro.', si: 'Sí, cambiarlo', no: 'No' }))) return;
    await pedir(`/api/clases/${c.id}/codigo`, 'POST');
    abrir(c.id);
  };
  ($('#c-abierta') as HTMLInputElement).onchange = async (e) => {
    await pedir(`/api/clases/${c.id}`, 'PATCH', { abierta: (e.target as HTMLInputElement).checked });
    await cargarLista();
  };
  $('#b-renombrar').onclick = async () => {
    const n = prompt('Nombre nuevo de la clase', c.nombre);
    if (!n || n === c.nombre) return;
    await pedir(`/api/clases/${c.id}`, 'PATCH', { nombre: n }).catch((x) => alert(x.message));
    await cargarLista();
    abrir(c.id);
  };
  $('#b-borrar').onclick = async () => {
    if (!(await dialogo({ titulo: `¿Borrar ${c.nombre}?`, texto: 'Se borra la clase. Las cuentas de los alumnos siguen, con su progreso.', si: 'Sí, borrarla', no: 'No' }))) return;
    await pedir(`/api/clases/${c.id}`, 'DELETE');
    await cargarLista();
    clases.length ? abrir(clases[0].id) : vacio();
  };
  document.querySelectorAll<HTMLButtonElement>('[data-quitar]').forEach((b) => (b.onclick = async () => {
    if (!(await dialogo({ titulo: `¿Quitar a ${b.dataset.n}?`, texto: 'Sale de la clase. Su cuenta y su progreso siguen.', si: 'Sí, quitar', no: 'No' }))) return;
    await pedir(`/api/clases/${c.id}/alumnos/${b.dataset.quitar}`, 'DELETE');
    abrir(c.id);
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-clave]').forEach((b) => (b.onclick = async () => {
    if (!(await dialogo({ titulo: `¿Contraseña nueva para ${b.dataset.n}?`, texto: 'La de ahora deja de valer y se cierra su cuenta en sus dispositivos.', si: 'Sí, cambiarla', no: 'No' }))) return;
    try {
      const r = await pedir<{ nombre: string; clave: string }>(`/api/clases/${c.id}/alumnos/${b.dataset.clave}/clave`, 'POST');
      await dialogo({ titulo: `Contraseña de ${r.nombre}`, texto: `La nueva es ${r.clave}. Apúntala antes de cerrar esto.`, si: 'Hecho', no: 'Cerrar' });
    } catch (x: any) { alert(x.message); }
  }));

  const f = $('#f-alumnos') as HTMLFormElement;
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const nombres = (f.elements.namedItem('nombres') as HTMLTextAreaElement).value.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const m = $('.cp-msg', f);
    // El Worker crea 10 por petición (cada contraseña cuesta su tiempo de CPU). Se mandan de 10 en 10
    // y, si una tanda falla, lo que quede se queda en el cuadro para volver a intentarlo.
    const hechos: { nombre: string; clave: string }[] = [];
    const fallos: { nombre: string; motivo: string }[] = [];
    let error = '';
    for (let i = 0; i < nombres.length; i += 10) {
      const tanda = nombres.slice(i, i + 10);
      m.textContent = `Creando ${Math.min(i + 10, nombres.length)} de ${nombres.length}…`;
      m.className = 'cp-msg';
      try {
        const r = await pedir<{ hechos: { nombre: string; clave: string }[]; fallos: { nombre: string; motivo: string }[] }>(`/api/clases/${c.id}/alumnos`, 'POST', { nombres: tanda });
        hechos.push(...r.hechos);
        fallos.push(...r.fallos);
      } catch (x: any) {
        error = x.message;
        fallos.push(...nombres.slice(i).map((nombre) => ({ nombre, motivo: 'Sin crear. Vuelve a intentarlo.' })));
        break;
      }
    }
    // Se quedan a la vista aunque la clase se repinte con los alumnos nuevos.
    recien = { clase: c.id, hechos: [...(recien?.clase === c.id ? recien.hechos : []), ...hechos], fallos };
    await abrir(c.id);
    const f2 = $('#f-alumnos') as HTMLFormElement;
    (f2.elements.namedItem('nombres') as HTMLTextAreaElement).value = fallos.map((x) => x.nombre).join('\n');
    const m2 = $('.cp-msg', f2);
    m2.textContent = `${hechos.length} cuentas creadas.${fallos.length ? ` ${fallos.length} no se han podido crear.` : ''}${error ? ` ${error}` : ''}`;
    m2.className = `cp-msg ${fallos.length ? 'mal' : 'bien'}`;
  };
  pintarRecien(c);

  clearInterval(reloj);
  reloj = window.setInterval(() => { if (!document.hidden) abrir(c.id, true); }, 20_000);
}

// Las cuentas creadas en esta visita, con su contraseña. No se guardan en ningún sitio más.
let recien: { clase: string; hechos: { nombre: string; clave: string }[]; fallos: { nombre: string; motivo: string }[] } | null = null;

function pintarRecien(c: Clase) {
  if (!recien || recien.clase !== c.id) return;
  const r = recien;
  $('#cuentas-hechas').innerHTML = `
    ${r.hechos.length ? `<div class="pf-tabla-caja" style="margin-top:12px"><table class="pf-tabla pf-cuentas"><thead><tr><th>Usuario</th><th>Contraseña</th></tr></thead>
      <tbody>${r.hechos.map((h) => `<tr><td>${esc(h.nombre)}</td><td>${esc(h.clave)}</td></tr>`).join('')}</tbody></table></div>
      <p class="cp-suave" style="margin-top:8px">Se ven solo ahora. Cópialas o imprímelas antes de salir de la página. Entran en ${esc(location.host)} con su usuario y su contraseña.</p>
      <div class="cp-fila" style="margin-top:8px"><button class="btn" id="b-copiar-cuentas">Copiar todo</button><button class="btn" id="b-imprimir">Imprimir</button></div>` : ''}
    ${r.fallos.length ? `<ul class="cp-lista" style="margin-top:12px">${r.fallos.map((x) => `<li><div><b>${esc(x.nombre)}</b><small>${esc(x.motivo)}</small></div></li>`).join('')}</ul>` : ''}`;
  const bc = document.getElementById('b-copiar-cuentas');
  if (bc) bc.onclick = () => copiar(r.hechos.map((h) => `${h.nombre}\t${h.clave}`).join('\n'), bc);
  const bi = document.getElementById('b-imprimir');
  if (bi) bi.onclick = () => imprimir(c, r.hechos);
}

// Una hoja para recortar: una tarjeta por alumno con dónde entrar, su usuario y su contraseña.
function imprimir(c: Clase, cuentas: { nombre: string; clave: string }[]) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Cuentas · ${esc(c.nombre)}</title>
  <style>body{font:14px system-ui,sans-serif;margin:16px}h1{font-size:18px}.t{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .c{border:1px dashed #888;border-radius:8px;padding:10px;break-inside:avoid}.c b{font:700 15px ui-monospace,Consolas,monospace}.c small{color:#555}</style>
  <h1>${esc(c.nombre)} · cuentas de relavops</h1><div class="t">${cuentas.map((h) => `<div class="c"><small>Entra en ${esc(location.host)}</small><br>Usuario <b>${esc(h.nombre)}</b><br>Contraseña <b>${esc(h.clave)}</b></div>`).join('')}</div>
  <script>print()<\/script>`);
  w.document.close();
}

(async () => {
  const e = await cuenta();
  if (e.tipo === 'fuera') return irAEntrar();
  if (e.tipo !== 'dentro') { $('#detalle').innerHTML = '<div class="panel">Este servidor no usa cuentas.</div>'; return; }
  if (e.yo.usuario.rol === 'alumno') { location.href = '/cuenta'; return; }
  $('#nueva').onclick = formNueva;
  await cargarLista();
  if (actual && clases.some((c) => c.id === actual)) abrir(actual);
  else if (clases.length) abrir(clases[0].id);
  else vacio();
})();
