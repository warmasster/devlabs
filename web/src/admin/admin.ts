// Panel de admin. Todo sale del Worker de cuentas (/api/admin/…), también lo de los servidores de
// labs, que llega con sus latidos. Cada sección se pinta una vez y luego solo refresca sus datos.
import './admin.css';
import { ic } from '../iconos';
import { esc, hace } from '../cuenta/cuenta-util';
import { colorDe, cuenta, pedir } from '../cuenta/sesion';
import { barrasH, chispa, grafica, medidor, partida } from './graficas';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const contenido = $('#contenido');

// ---------- Formatos
const num = (n: number | null | undefined, dec = 0) => (n ?? 0).toLocaleString('es-ES', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
const minutos = (m: number | null | undefined) => (!m ? '0 min' : m < 90 ? `${num(m)} min` : `${num(m / 60, 1)} h`);
const duracion = (s: number) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')} min`);
const diaCorto = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const fechaHora = (ms: number) => new Date(ms).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const pl = (n: number | null | undefined, uno: string, varios: string) => `${num(n)} ${(n ?? 0) === 1 ? uno : varios}`;
const av = (n: string) => `<span class="a-av" style="--c:${colorDe(n)}">${esc(n.slice(0, 1).toUpperCase())}</span>`;
const ROLES: Record<string, string> = { alumno: 'Alumno', profe: 'Profe', admin: 'Admin' };
const ORIGEN: Record<string, string> = { libre: 'Por libre', clase: 'Con código', profe: 'Profe', creado: 'Creado por su profe' };
const etRol = (r: string) => `<span class="et sin ${r === 'admin' ? 'acento' : ''}">${ROLES[r] ?? r}</span>`;
const MOTIVOS: Record<string, string> = { cerrada: 'la cerró', abandono: 'abandonada', tiempo: 'tiempo agotado', otra: 'abrió otra', admin: 'cerrada por admin', expulsado: 'expulsado' };
const ACTIVIDAD: Record<string, [string, string]> = {
  alta: ['Alta', 'bien'], entrar: ['Entrada', ''], fallo_entrar: ['Fallo al entrar', 'aviso'], salir: ['Salida', ''], salir_todo: ['Salida de todo', ''],
  clave: ['Cambia contraseña', ''], correo: ['Cambia correo', ''], correo_ok: ['Confirma correo', 'bien'], unirse: ['Se une a clase', 'bien'], dejar: ['Deja clase', ''],
  baja: ['Borra su cuenta', 'critico'], recuperar: ['Pide recuperar', ''], clave_recuperada: ['Recupera la cuenta', 'bien'],
  clase_creada: ['Crea clase', 'bien'], clase_codigo: ['Cambia código', ''], clase_borrada: ['Borra clase', 'aviso'], alumno_quitado: ['Quita alumno', 'aviso'],
  alumnos_creados: ['Crea alumnos', 'bien'], clave_por_profe: ['Profe cambia contraseña', 'aviso'],
  admin_cambio: ['Admin cambia cuenta', 'acento'], admin_echar: ['Admin echa', 'critico'], admin_clave: ['Admin da contraseña', 'acento'],
  admin_borrar: ['Admin borra cuenta', 'critico'], admin_cerrar_lab: ['Admin cierra lab', 'acento'], admin_ajustes: ['Admin cambia ajustes', 'acento'],
};

function toast(texto: string) {
  const t = document.createElement('div');
  t.className = 'a-toast';
  t.textContent = texto;
  document.body.append(t);
  setTimeout(() => t.remove(), 4200);
}

function confirmar(titulo: string, texto: string, si = 'Sí', peligro = false): Promise<boolean> {
  return new Promise((fin) => {
    const capa = document.createElement('div');
    capa.className = 'a-cajon-capa';
    capa.style.cssText = 'display:grid;place-items:center;padding:16px';
    capa.innerHTML = `<div class="a-tarjeta" role="dialog" aria-modal="true" style="width:min(420px,100%);display:grid;gap:12px">
      <h2 style="margin:0;font-size:16px"></h2><p style="margin:0;color:var(--a-texto-2)"></p>
      <div class="a-acciones" style="justify-content:flex-end"><button class="a-btn" data-r="0">Cancelar</button><button class="a-btn ${peligro ? 'peligro' : 'primario'}" data-r="1"></button></div></div>`;
    $('h2', capa).textContent = titulo;
    $('p', capa).textContent = texto;
    $('[data-r="1"]', capa).textContent = si;
    const cerrar = (v: boolean) => { capa.remove(); removeEventListener('keydown', tecla); fin(v); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(false); };
    capa.onclick = (e) => { const b = (e.target as HTMLElement).closest('[data-r]') as HTMLElement | null; if (b) cerrar(b.dataset.r === '1'); else if (e.target === capa) cerrar(false); };
    addEventListener('keydown', tecla);
    document.body.append(capa);
    ($('[data-r="0"]', capa) as HTMLElement).focus();
  });
}

// ---------- Secciones

interface Seccion { titulo: string; sub: string; icono: string; montar: () => void; actualizar: () => Promise<void>; cada?: number }
let rango = 30;
let refresco = 0;

function segmentado(opciones: [string, string][], actual: string, cambiar: (v: string) => void): HTMLElement {
  const s = document.createElement('span');
  s.className = 'a-seg';
  for (const [v, t] of opciones) {
    const b = document.createElement('button');
    b.textContent = t;
    b.setAttribute('aria-pressed', String(v === actual));
    b.onclick = () => { s.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); cambiar(v); };
    s.append(b);
  }
  return s;
}
const selectorRango = () => segmentado([['7', '7 días'], ['30', '30 días'], ['90', '90 días']], String(rango), (v) => { rango = Number(v); actual().actualizar(); });

// ===== Resumen

const resumen: Seccion = {
  titulo: 'Resumen', sub: 'Usuarios, labs y servidores de un vistazo', icono: 'gauge', cada: 15_000,
  montar() {
    $('#controles').append(selectorRango());
    contenido.innerHTML = `
      <div class="a-kpis" id="kpis"></div>
      <div class="a-rejilla a-r21">
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Personas por día</h2><p>Altas nuevas y gente que ha entrado cada día.</p></div></div><div id="g-personas"></div></section>
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Tipos de cuenta</h2><p>Cómo usa relavops cada uno.</p></div></div><div id="tipos"></div></section>
      </div>
      <div class="a-rejilla a-r21">
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Consumo de los servidores, últimas 24 h</h2><p>Media de CPU y RAM ocupada, en tramos de 10 minutos.</p></div></div><div id="g-consumo"></div></section>
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Labs encendidos ahora</h2><p>Por tipo de lab.</p></div><a class="a-btn" href="#labs">Ver todos</a></div><div id="vivas"></div></section>
      </div>
      <div class="a-rejilla a-r2">
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Sesiones de lab por día</h2><p>Cada vez que alguien abre una máquina.</p></div></div><div id="g-sesiones"></div></section>
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Labs más usados</h2><p id="top-sub"></p></div></div><div id="top"></div></section>
      </div>
      <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Servidores de labs</h2><p>Lo que contó cada uno en su último latido.</p></div><a class="a-btn" href="#servidores">Detalle</a></div><div id="nodos"></div></section>`;
  },
  async actualizar() {
    const r = await pedir<any>(`/api/admin/resumen?dias=${rango}`);
    const u = r.usuarios, L = r.labs, cap = r.capacidad, med = r.labs.medias ?? {};
    const pend = u.pendientes_profe || 0;
    const nav = document.querySelector('[data-cuenta="usuarios"]');
    if (nav) { nav.textContent = pend ? `${pend} pendientes` : num(u.total); nav.classList.toggle('aviso', !!pend); }
    $('#kpis').innerHTML = [
      ['users', 'Usuarios', num(u.total), `<span class="${u.nuevos_7 ? 'sube' : ''}">+${num(u.nuevos_7)}</span> en 7 días · +${num(u.nuevos_hoy)} hoy`, chispa(r.series.altas, 'var(--s3)')],
      ['activity', 'Activos hoy', num(u.activos_hoy), `${num(u.activos_7)} en 7 días · ${num(u.activos_30)} en 30`, chispa(r.series.activos, 'var(--s1)')],
      ['container', 'Labs encendidos', num(L.vivas), `${num(L.conectadas)} con alguien conectado`, ''],
      ['clock', 'Tiempo de lab hoy', minutos(L.hoy?.minutos), `${pl(L.hoy?.sesiones, 'sesión', 'sesiones')} · ${pl(L.hoy?.gente, 'persona', 'personas')}`, chispa(r.series.minutos_lab, 'var(--s1)')],
      ['timer', 'Sesión media', minutos(med.media_min), `en los últimos ${rango} días`, ''],
      ['cpu', 'Consumo medio por lab', `${num(med.cpu_pct, 1)} %`, `de un núcleo · ${num(med.ram_mb)} MB de RAM de pico`, ''],
      ['gauge', 'Caben más labs', cap.caben === null ? 'sin datos' : num(cap.caben), cap.ram_por_sesion_mb ? `${num(cap.ram_libre_mb)} MB libres · ${num(cap.ram_por_sesion_mb)} MB por lab` : 'Falta algún latido de servidor', ''],
      ['graduation-cap', 'Clases', num(r.clases.clases), `${num(r.clases.alumnos_en_clase)} alumnos en alguna clase`, ''],
    ].map(([i, t, v, s, c]) => `<div class="a-kpi"><span>${ic(i)} ${t}</span><b>${v}</b><small>${s}</small>${c}</div>`).join('');

    grafica($('#g-personas'), {
      etiquetas: r.dias.map(diaCorto),
      series: [
        { nombre: 'Han entrado', valores: r.series.activos, color: 'var(--s1)', tipo: 'linea' },
        { nombre: 'Altas', valores: r.series.altas, color: 'var(--s3)', tipo: 'barras' },
      ],
    });
    $('#tipos').innerHTML = partida([
      { nombre: 'Alumnos por libre', valor: u.libres, color: 'var(--s1)' },
      { nombre: 'Alumnos de clase', valor: u.de_clase, color: 'var(--s2)' },
      { nombre: 'Profes', valor: u.profes, color: 'var(--s3)' },
      { nombre: 'Admins', valor: u.admins, color: 'var(--s4)' },
    ]) + `<dl class="a-datos" style="margin-top:16px"><dt>Con correo</dt><dd>${num(u.con_correo)} · ${num(u.verificados)} confirmados</dd><dt>Bloqueadas</dt><dd>${num(u.bloqueados)}</dd></dl>`
      + (pend ? `<div class="a-aviso-caja" style="margin-top:14px">${ic('triangle-alert')}<div><b>${pend} ${pend === 1 ? 'persona pide' : 'personas piden'} ser profe.</b> <a href="#usuarios" data-filtro="pide_profe">Revisar</a></div></div>` : '');
    document.querySelector<HTMLElement>('[data-filtro="pide_profe"]')?.addEventListener('click', () => { filtroUsuarios.estado = 'pide_profe'; });

    grafica($('#g-consumo'), {
      etiquetas: r.consumo.map((p: any) => hora(p.t)),
      series: [
        { nombre: 'CPU', valores: r.consumo.map((p: any) => p.cpu), color: 'var(--s1)', tipo: 'linea' },
        { nombre: 'RAM', valores: r.consumo.map((p: any) => p.ram_pct), color: 'var(--s2)', tipo: 'linea' },
      ],
      max: 100, y: (v) => `${Math.round(v)} %`, vacio: 'Ningún servidor ha mandado latidos todavía',
    });
    $('#vivas').innerHTML = barrasH(L.por_lab.map((x: any) => ({ etiqueta: x.lab, valor: x.n })), (v) => `${v}`)
      + `<p class="a-vacio" style="margin-top:12px">Ahora gastan ${num(L.cpu_ahora / 100, 2)} núcleos y ${num(L.ram_ahora)} MB de RAM.</p>`;
    grafica($('#g-sesiones'), { etiquetas: r.dias.map(diaCorto), series: [{ nombre: 'Sesiones', valores: r.series.sesiones_lab, color: 'var(--s1)', tipo: 'barras' }] });
    $('#top-sub').textContent = `Últimos ${rango} días.`;
    $('#top').innerHTML = r.labs.top.length ? `<div class="a-tabla-caja"><table class="a-tabla"><thead><tr><th>Lab</th><th class="n">Sesiones</th><th class="n">Tiempo</th><th class="n">Media</th><th class="n">CPU</th><th class="n">RAM</th></tr></thead>
      <tbody>${r.labs.top.map((t: any) => `<tr><td class="m">${esc(t.lab)}</td><td class="n">${num(t.sesiones)}</td><td class="n">${minutos(t.minutos)}</td><td class="n">${minutos(t.media_min)}</td><td class="n">${num(t.cpu_pct, 1)} %</td><td class="n">${num(t.ram_mb)} MB</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="a-vacio">Todavía no se ha cerrado ninguna sesión de lab.</p>';
    $('#nodos').innerHTML = r.nodos.length ? `<div class="a-tabla-caja"><table class="a-tabla"><thead><tr><th>Servidor</th><th>Estado</th><th>CPU</th><th>RAM</th><th>Disco</th><th class="n">Carga</th><th class="n">Labs</th><th>Último latido</th></tr></thead>
      <tbody>${r.nodos.map((n: any) => {
        const ram = n.host.ram_total_mb ? (n.host.ram_usada_mb / n.host.ram_total_mb) * 100 : 0;
        const disco = n.host.disco_total_gb ? (n.host.disco_usado_gb / n.host.disco_total_gb) * 100 : 0;
        return `<tr><td class="m">${esc(n.nodo)}</td><td>${n.vivo ? '<span class="et bien">En marcha</span>' : '<span class="et critico">Sin latido</span>'}</td>
          <td style="min-width:120px">${medidor(n.host.cpu_pct, 'CPU')}<small class="t">${num(n.host.cpu_pct)} % de ${n.host.cpus} núcleos</small></td>
          <td style="min-width:120px">${medidor(ram, 'RAM')}<small class="t">${num(n.host.ram_usada_mb / 1024, 1)} de ${num(n.host.ram_total_mb / 1024, 1)} GB</small></td>
          <td style="min-width:120px">${medidor(disco, 'Disco')}<small class="t">${num(n.host.disco_usado_gb)} de ${num(n.host.disco_total_gb)} GB</small></td>
          <td class="n">${num(n.host.carga?.[0], 2)}</td><td class="n">${num(n.sesiones)}${n.limites?.total ? ` / ${n.limites.total}` : ''}</td><td class="t">${hace(n.visto)}</td></tr>`;
      }).join('')}</tbody></table></div>` : sinServidores();
  },
};

function sinServidores() {
  return `<div class="a-aviso-caja">${ic('server')}<div><b>Ningún servidor de labs ha mandado latidos.</b><br>
    Arranca labd con <code>-cuentas</code> apuntando al Worker y la variable <code>RELAVOPS_NODO_SECRETO</code>. El instalador del VPS (instalador/vps.sh) lo deja hecho.</div></div>`;
}

// ===== Usuarios

const filtroUsuarios = { q: '', rol: '', estado: '', orden: 'creado', dir: 'desc', pagina: 1 };

const usuarios: Seccion = {
  titulo: 'Usuarios', sub: 'Busca, filtra y gestiona cuentas', icono: 'users',
  montar() {
    contenido.innerHTML = `
      <div class="a-filtros">
        <label class="a-buscar">${ic('search')}<input class="a-in" id="u-q" placeholder="Nombre, correo o id" value="${esc(filtroUsuarios.q)}" /></label>
        <select class="a-in" id="u-rol"><option value="">Todos los roles</option><option value="alumno">Alumnos</option><option value="profe">Profes</option><option value="admin">Admins</option></select>
        <select class="a-in" id="u-estado"><option value="">Cualquier estado</option><option value="activo">Activas</option><option value="bloqueado">Bloqueadas</option>
          <option value="pide_profe">Piden ser profe</option><option value="sin_verificar">Correo sin confirmar</option></select>
        <span class="espacio" style="flex:1"></span>
        <a class="a-btn" href="/api/admin/usuarios.csv" download>${ic('download')} Exportar CSV</a>
      </div>
      <div id="u-tabla"></div>`;
    ($('#u-rol') as HTMLSelectElement).value = filtroUsuarios.rol;
    ($('#u-estado') as HTMLSelectElement).value = filtroUsuarios.estado;
    let t = 0;
    $('#u-q').oninput = (e) => { clearTimeout(t); t = window.setTimeout(() => { filtroUsuarios.q = (e.target as HTMLInputElement).value; filtroUsuarios.pagina = 1; usuarios.actualizar(); }, 250); };
    $('#u-rol').onchange = (e) => { filtroUsuarios.rol = (e.target as HTMLSelectElement).value; filtroUsuarios.pagina = 1; usuarios.actualizar(); };
    $('#u-estado').onchange = (e) => { filtroUsuarios.estado = (e.target as HTMLSelectElement).value; filtroUsuarios.pagina = 1; usuarios.actualizar(); };
  },
  async actualizar() {
    const f = filtroUsuarios;
    const r = await pedir<any>(`/api/admin/usuarios?${new URLSearchParams({ q: f.q, rol: f.rol, estado: f.estado, orden: f.orden, dir: f.dir, pagina: String(f.pagina), por: '25' })}`);
    const col = (k: string, t: string, n = false) => `<th data-orden="${k}" class="${n ? 'n ' : ''}${f.orden === k ? `activo ${f.dir === 'asc' ? 'asc' : ''}` : ''}">${t}</th>`;
    const paginas = Math.max(1, Math.ceil(r.total / r.por));
    $('#u-tabla').innerHTML = `<div class="a-tabla-caja"><table class="a-tabla"><thead><tr>
        ${col('nombre', 'Usuario')}<th>Rol</th><th>Origen</th>${col('creado', 'Alta')}${col('acceso', 'Último acceso')}${col('entradas', 'Entradas', true)}${col('xp', 'XP', true)}${col('lab', 'Labs', true)}<th>Estado</th></tr></thead>
      <tbody>${r.filas.map((x: any) => `<tr class="clic" data-id="${esc(x.id)}">
        <td><div class="a-u">${av(x.nombre)}<div><b>${esc(x.nombre)}${x.en_lab ? ' <span class="et bien">en un lab</span>' : ''}</b><small>${esc(x.correo ?? 'sin correo')}</small></div></div></td>
        <td>${etRol(x.rol)}${x.pide_profe ? ' <span class="et aviso">pide profe</span>' : ''}</td><td class="t">${ORIGEN[x.origen] ?? x.origen}</td>
        <td class="t">${new Date(x.creado).toLocaleDateString('es-ES')}</td><td class="t">${hace(x.ultimo_acceso)}</td>
        <td class="n">${num(x.entradas)}</td><td class="n">${num(x.xp)}</td><td class="n">${minutos(x.lab_seg / 60)}</td>
        <td>${x.estado === 'activo' ? '<span class="et bien">Activa</span>' : '<span class="et critico">Bloqueada</span>'}</td></tr>`).join('') || '<tr><td colspan="9" class="t">Nadie con esos filtros.</td></tr>'}</tbody></table></div>
      <div class="a-paginas"><span>${num(r.total)} cuentas · página ${r.pagina} de ${paginas}</span>
        <button class="a-btn" id="u-ant" ${r.pagina <= 1 ? 'disabled' : ''}>Anterior</button><button class="a-btn" id="u-sig" ${r.pagina >= paginas ? 'disabled' : ''}>Siguiente</button></div>`;
    document.querySelectorAll<HTMLElement>('#u-tabla th[data-orden]').forEach((th) => (th.onclick = () => {
      const k = th.dataset.orden!;
      f.dir = f.orden === k && f.dir === 'desc' ? 'asc' : 'desc';
      f.orden = k;
      usuarios.actualizar();
    }));
    document.querySelectorAll<HTMLElement>('#u-tabla tr[data-id]').forEach((tr) => (tr.onclick = () => abrirUsuario(tr.dataset.id!)));
    $('#u-ant').onclick = () => { f.pagina--; usuarios.actualizar(); };
    $('#u-sig').onclick = () => { f.pagina++; usuarios.actualizar(); };
  },
};

let yoId = '';

async function abrirUsuario(id: string) {
  document.querySelectorAll('.a-cajon, .a-cajon-capa').forEach((e) => e.remove());
  const capa = document.createElement('div');
  capa.className = 'a-cajon-capa';
  const cajon = document.createElement('aside');
  cajon.className = 'a-cajon';
  cajon.innerHTML = '<div class="a-cajon-cuerpo"><p class="a-vacio">Cargando…</p></div>';
  const cerrar = () => { capa.remove(); cajon.remove(); removeEventListener('keydown', tecla); };
  const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
  capa.onclick = cerrar;
  addEventListener('keydown', tecla);
  document.body.append(capa, cajon);

  const pintar = async () => {
    const d = await pedir<any>(`/api/admin/usuarios/${id}`);
    const u = d.usuario, p = d.progreso;
    const mods = p ? Object.entries(p.modulos as Record<string, Record<string, number>>).sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true })) : [];
    cajon.innerHTML = `
      <div class="a-cajon-cab">${av(u.nombre)}<div style="flex:1;min-width:0"><h2>${esc(u.nombre)}</h2><p>${esc(u.correo ?? 'sin correo')} · <span class="m">${esc(u.id)}</span></p></div>
        <button class="a-btn icono" id="c-cerrar" title="Cerrar">${ic('x')}</button></div>
      <div class="a-cajon-cuerpo">
        <div class="a-chips">${etRol(u.rol)}${u.estado === 'activo' ? '<span class="et bien">Activa</span>' : '<span class="et critico">Bloqueada</span>'}
          <span class="et sin">${ORIGEN[u.origen] ?? u.origen}</span>${u.correo ? (u.correo_ok ? '<span class="et bien">Correo confirmado</span>' : '<span class="et aviso">Correo sin confirmar</span>') : ''}
          ${u.pide_profe ? '<span class="et aviso">Pide ser profe</span>' : ''}${d.vivas.length ? `<span class="et bien">En ${d.vivas.length} lab${d.vivas.length > 1 ? 's' : ''} ahora</span>` : ''}</div>

        ${u.pide_profe ? `<div class="a-aviso-caja">${ic('graduation-cap')}<div style="flex:1"><b>Quiere una cuenta de profe.</b><div class="a-acciones" style="margin-top:8px"><button class="a-btn primario" id="c-aprobar">Hacer profe</button><button class="a-btn" id="c-rechazar">Rechazar</button></div></div></div>` : ''}

        <section class="a-tarjeta"><h2>Acciones</h2><p class="a-sub">Lo que cambies aquí se aplica al momento. Echar o bloquear cierra también sus labs en el siguiente latido.</p>
          <div class="a-acciones">
            <select class="a-in" id="c-rol">${['alumno', 'profe', 'admin'].map((r) => `<option value="${r}" ${u.rol === r ? 'selected' : ''}>${ROLES[r]}</option>`).join('')}</select>
            <button class="a-btn" id="c-guardar-rol">Cambiar rol</button>
            ${u.estado === 'activo' ? `<button class="a-btn peligro" id="c-bloquear">${ic('lock')} Bloquear</button>` : `<button class="a-btn" id="c-desbloquear">${ic('lock-open')} Desbloquear</button>`}
            <button class="a-btn" id="c-echar">${ic('door-open')} Echar de todas partes</button>
            <button class="a-btn" id="c-clave">${ic('key-round')} Contraseña temporal</button>
            ${u.correo && !u.correo_ok ? `<button class="a-btn" id="c-correo">${ic('mail')} Marcar correo confirmado</button>` : ''}
            ${u.id !== yoId ? `<button class="a-btn peligro" id="c-borrar">${ic('trash')} Borrar cuenta</button>` : ''}
          </div><div id="c-resultado"></div></section>

        <section class="a-tarjeta"><h2>Datos</h2>
          <dl class="a-datos" style="margin-top:10px">
            <dt>Alta</dt><dd>${fechaHora(u.creado)}</dd><dt>Último acceso</dt><dd>${u.ultimo_acceso ? `${fechaHora(u.ultimo_acceso)} (${hace(u.ultimo_acceso)})` : 'nunca'}</dd>
            <dt>Entradas</dt><dd>${num(u.entradas)}</dd><dt>País</dt><dd>${esc(u.pais ?? 'sin dato')}</dd>
            <dt>Labs</dt><dd>${pl(d.lab.sesiones, 'sesión', 'sesiones')} · ${minutos(d.lab.minutos)} · ${num(d.lab.cpu_s / 60, 1)} min de CPU</dd>
            <dt>Clases</dt><dd>${d.clases.map((c: any) => `${esc(c.nombre)} <span class="t">con ${esc(c.profe)}</span>`).join(', ') || 'ninguna'}</dd>
            ${d.clases_profe.length ? `<dt>Sus clases</dt><dd>${d.clases_profe.map((c: any) => `${esc(c.nombre)} <span class="t">${c.alumnos} alumnos · ${esc(c.codigo)}</span>`).join('<br>')}</dd>` : ''}
          </dl></section>

        ${d.vivas.length ? `<section class="a-tarjeta"><h2>Labs encendidos ahora</h2><div class="a-tabla-caja" style="margin-top:10px"><table class="a-tabla"><tbody>${d.vivas.map((s: any) => `<tr><td class="m">${esc(s.lab)}</td><td class="t">${esc(s.nodo)}</td><td>${duracion((Date.now() - s.creada) / 1000)}</td><td class="n">${num(s.cpu_pct, 1)} %</td><td class="n">${num(s.ram_mb)} MB</td><td><button class="a-btn" data-cerrar="${esc(s.id)}" data-nodo="${esc(s.nodo)}">Cerrar</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}

        <section class="a-tarjeta"><h2>Progreso</h2>
          ${p ? `<p class="a-sub">${num(p.xp)} XP · ${mods.filter(([, m]) => m.boss).length} bosses · ${p.dias.length} días con actividad${p.ultimo ? ` · lo último ${esc(p.ultimo.resumen)}` : ''}</p>
            <div class="a-chips">${mods.map(([m, x]) => `<span class="et sin" title="${['teoria', 'lab', 'boss'].filter((k) => x[k]).join(', ')}">${esc(m)} ${x.teoria ? 'T' : '·'}${x.lab ? 'P' : '·'}${x.boss ? 'B' : '·'}</span>`).join('') || '<span class="a-vacio">Sin módulos empezados.</span>'}</div>`
            : '<p class="a-vacio">Todavía no ha guardado progreso.</p>'}</section>

        <section class="a-tarjeta"><h2>Historial de labs</h2>
          ${d.usos.length ? `<div class="a-tabla-caja" style="margin-top:10px"><table class="a-tabla"><thead><tr><th>Lab</th><th>Cuándo</th><th class="n">Duró</th><th class="n">CPU</th><th class="n">RAM</th><th class="n">Pasos</th><th>Fin</th></tr></thead>
            <tbody>${d.usos.map((x: any) => `<tr><td class="m">${esc(x.lab)}</td><td class="t">${fechaHora(x.inicio)}</td><td class="n">${duracion(x.segundos)}</td><td class="n">${num(x.cpu_s, 0)} s</td><td class="n">${num(x.ram_max_mb)} MB</td><td class="n">${x.pasos}</td><td class="t">${MOTIVOS[x.motivo] ?? esc(x.motivo)}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="a-vacio">Ninguna sesión de lab cerrada todavía.</p>'}</section>

        <section class="a-tarjeta"><h2>Dispositivos con la sesión abierta</h2>
          ${d.sesiones.length ? `<div class="a-tabla-caja" style="margin-top:10px"><table class="a-tabla"><tbody>${d.sesiones.map((s: any) => `<tr><td>${esc(navegador(s.agente))}</td><td class="t m">${esc(s.ip ?? '')}</td><td class="t">${esc(s.pais ?? '')}</td><td class="t">visto ${hace(s.vista)}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="a-vacio">Ninguno.</p>'}</section>

        <section class="a-tarjeta"><h2>Actividad</h2>
          ${d.actividad.length ? `<div class="a-tabla-caja" style="margin-top:10px"><table class="a-tabla"><tbody>${d.actividad.map((a: any) => `<tr><td class="t">${fechaHora(a.cuando)}</td><td>${etActividad(a.tipo)}</td><td class="t">${esc(a.detalle)}</td><td class="t m">${esc(a.ip ?? '')}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="a-vacio">Nada todavía.</p>'}</section>
      </div>`;
    $('#c-cerrar', cajon).onclick = cerrar;
    const cambiar = async (datos: Record<string, unknown>, ok: string) => {
      try { await pedir(`/api/admin/usuarios/${id}`, 'PATCH', datos); toast(ok); await pintar(); refrescarSeccion(); } catch (e: any) { toast(e.message); }
    };
    const en = (sel: string, f: () => void) => { const b = cajon.querySelector<HTMLElement>(sel); if (b) b.onclick = f; };
    en('#c-aprobar', () => cambiar({ rol: 'profe' }, `${u.nombre} ya es profe.`));
    en('#c-rechazar', () => cambiar({ pide_profe: false }, 'Petición rechazada. Sigue como alumno.'));
    en('#c-guardar-rol', () => cambiar({ rol: ($('#c-rol', cajon) as HTMLSelectElement).value }, 'Rol cambiado.'));
    en('#c-bloquear', async () => { if (await confirmar(`¿Bloquear a ${u.nombre}?`, 'No podrá entrar y sus labs se cierran. Puedes desbloquearlo luego.', 'Bloquear', true)) cambiar({ estado: 'bloqueado' }, 'Cuenta bloqueada.'); });
    en('#c-desbloquear', () => cambiar({ estado: 'activo' }, 'Cuenta desbloqueada.'));
    en('#c-correo', () => cambiar({ correo_ok: true }, 'Correo marcado como confirmado.'));
    en('#c-echar', async () => {
      if (!(await confirmar(`¿Echar a ${u.nombre}?`, 'Se cierran sus sesiones y sus labs. Puede volver a entrar con su contraseña.', 'Echar'))) return;
      try { await pedir(`/api/admin/usuarios/${id}/echar`, 'POST'); toast('Fuera de todas partes.'); await pintar(); } catch (e: any) { toast(e.message); }
    });
    en('#c-clave', async () => {
      if (!(await confirmar(`¿Contraseña temporal para ${u.nombre}?`, 'La de ahora deja de valer y se cierran sus sesiones.', 'Crear contraseña'))) return;
      try {
        const r = await pedir<any>(`/api/admin/usuarios/${id}/clave`, 'POST');
        $('#c-resultado', cajon).innerHTML = `<div class="a-aviso-caja" style="margin-top:12px">${ic('key-round')}<div>Contraseña nueva de <b>${esc(r.nombre)}</b> <code class="m" style="font-size:14px">${esc(r.clave)}</code><br><small class="t">Se ve solo ahora. Que la cambie al entrar.</small></div></div>`;
      } catch (e: any) { toast(e.message); }
    });
    en('#c-borrar', async () => {
      if (!(await confirmar(`¿Borrar la cuenta de ${u.nombre}?`, 'Se borra con su progreso y sus clases. No se puede deshacer.', 'Borrar para siempre', true))) return;
      try { await pedir(`/api/admin/usuarios/${id}`, 'DELETE'); toast('Cuenta borrada.'); cerrar(); refrescarSeccion(); } catch (e: any) { toast(e.message); }
    });
    cajon.querySelectorAll<HTMLElement>('[data-cerrar]').forEach((b) => (b.onclick = () => cerrarLab(b.dataset.nodo!, b.dataset.cerrar!)));
  };
  pintar().catch((e) => (cajon.innerHTML = `<div class="a-cajon-cuerpo"><p class="a-vacio">${esc(e.message)}</p></div>`));
}

function navegador(ua: string | null) {
  if (!ua) return 'Desconocido';
  const n = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const s = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  return s ? `${n} en ${s}` : n;
}
const etActividad = (t: string) => { const [txt, cl] = ACTIVIDAD[t] ?? [t, '']; return `<span class="et ${cl}">${esc(txt)}</span>`; };

async function cerrarLab(nodo: string, sesion: string) {
  if (!(await confirmar('¿Cerrar este lab?', 'La persona ve que se ha cerrado y puede abrir otro. Lo que tuviera dentro se pierde.', 'Cerrar el lab', true))) return;
  try { await pedir('/api/admin/labs/cerrar', 'POST', { nodo, sesion }); toast('Orden enviada. Se cierra en el siguiente latido, en menos de 10 segundos.'); } catch (e: any) { toast(e.message); }
}

// ===== Clases

let filtroClases = '';
const clases: Seccion = {
  titulo: 'Clases', sub: 'Todas las clases de todos los profes', icono: 'graduation-cap',
  montar() {
    contenido.innerHTML = `<div class="a-filtros"><label class="a-buscar">${ic('search')}<input class="a-in" id="cl-q" placeholder="Clase, profe o código" value="${esc(filtroClases)}" /></label></div><div id="cl-tabla"></div>`;
    let t = 0;
    $('#cl-q').oninput = (e) => { clearTimeout(t); t = window.setTimeout(() => { filtroClases = (e.target as HTMLInputElement).value; clases.actualizar(); }, 250); };
  },
  async actualizar() {
    const r = await pedir<any>(`/api/admin/clases?q=${encodeURIComponent(filtroClases)}`);
    $('#cl-tabla').innerHTML = `<div class="a-tabla-caja"><table class="a-tabla"><thead><tr><th>Clase</th><th>Profe</th><th>Código</th><th class="n">Alumnos</th><th>Admite nuevos</th><th>Última actividad</th><th class="n">XP media</th><th>Creada</th></tr></thead>
      <tbody>${r.clases.map((c: any) => `<tr><td><b>${esc(c.nombre)}</b></td><td><a href="#usuarios" data-u="${esc(c.profe_id)}">${esc(c.profe)}</a></td><td class="m">${esc(c.codigo)}</td><td class="n">${num(c.alumnos)}</td>
        <td>${c.abierta ? '<span class="et bien">Sí</span>' : '<span class="et sin">No</span>'}</td><td class="t">${hace(c.ultimo)}</td><td class="n">${num(c.xp_media)}</td><td class="t">${new Date(c.creada).toLocaleDateString('es-ES')}</td></tr>`).join('') || '<tr><td colspan="8" class="t">No hay clases.</td></tr>'}</tbody></table></div>`;
    document.querySelectorAll<HTMLElement>('[data-u]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); abrirUsuario(a.dataset.u!); }));
  },
};

// ===== Labs

const labs: Seccion = {
  titulo: 'Labs', sub: 'Máquinas encendidas ahora y uso de cada lab', icono: 'container', cada: 10_000,
  montar() {
    $('#controles').append(selectorRango());
    contenido.innerHTML = `<div class="a-kpis" id="l-kpis"></div>
      <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Encendidos ahora</h2><p>Ordenados por lo que gastan. Se actualiza cada 10 segundos.</p></div></div><div id="l-vivas"></div></section>
      <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Uso por lab</h2><p id="l-uso-sub"></p></div></div><div id="l-uso"></div></section>
      <div class="a-rejilla a-r2">
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Labs en caliente</h2><p>Listos para darse al momento, por servidor.</p></div></div><div id="l-pools"></div></section>
        <section class="a-tarjeta"><div class="a-tarjeta-cab"><div><h2>Cerrados hace poco</h2><p>Las últimas 60 sesiones.</p></div></div><div id="l-recientes"></div></section>
      </div>`;
  },
  async actualizar() {
    const r = await pedir<any>(`/api/admin/labs?dias=${rango}`);
    const cpu = r.vivas.reduce((s: number, x: any) => s + x.cpu_pct, 0), ram = r.vivas.reduce((s: number, x: any) => s + x.ram_mb, 0);
    $('#l-kpis').innerHTML = [
      ['container', 'Encendidos', num(r.vivas.length), `${r.vivas.filter((x: any) => x.conectada).length} con alguien conectado`],
      ['cpu', 'CPU de los labs', `${num(cpu / 100, 2)} núcleos`, 'sumando todos ahora mismo'],
      ['memory-stick', 'RAM de los labs', `${num(ram)} MB`, r.vivas.length ? `${num(ram / r.vivas.length)} MB de media` : 'ninguno encendido'],
      ['users', 'Personas en un lab', num(new Set(r.vivas.map((x: any) => x.usuario)).size), 'distintas'],
    ].map(([i, t, v, s]) => `<div class="a-kpi"><span>${ic(i)} ${t}</span><b>${v}</b><small>${s}</small></div>`).join('');
    $('#l-vivas').innerHTML = r.vivas.length ? `<div class="a-tabla-caja"><table class="a-tabla"><thead><tr><th>Usuario</th><th>Lab</th><th>Servidor</th><th>Lleva</th><th>CPU</th><th class="n">RAM</th><th>Pasos</th><th>Conexión</th><th></th></tr></thead>
      <tbody>${r.vivas.map((s: any) => `<tr><td><div class="a-u">${av(s.nombre || '?')}<b>${esc(s.nombre || 'sin cuenta')}</b></div></td><td class="m">${esc(s.lab)}</td><td class="m t">${esc(s.nodo)}</td>
        <td>${duracion((Date.now() - s.creada) / 1000)}</td><td style="min-width:130px">${medidor(Math.min(100, s.cpu_pct), 'CPU')}<small class="t">${num(s.cpu_pct, 1)} % de un núcleo</small></td>
        <td class="n">${num(s.ram_mb)} MB</td><td>${s.total_pasos ? `${s.pasos} de ${s.total_pasos}` : '<span class="t">sin misión</span>'}</td>
        <td>${s.conectada ? '<span class="et bien">Conectado</span>' : '<span class="et sin">Sin nadie</span>'}</td>
        <td><button class="a-btn" data-cerrar="${esc(s.id)}" data-nodo="${esc(s.nodo)}">Cerrar</button></td></tr>`).join('')}</tbody></table></div>`
      : '<p class="a-vacio">No hay ningún lab encendido ahora mismo.</p>';
    document.querySelectorAll<HTMLElement>('#l-vivas [data-cerrar]').forEach((b) => (b.onclick = () => cerrarLab(b.dataset.nodo!, b.dataset.cerrar!)));
    $('#l-uso-sub').textContent = `Últimos ${rango} días. La CPU es la media mientras estaba encendido, en % de un núcleo.`;
    $('#l-uso').innerHTML = r.por_lab.length ? `<div class="a-tabla-caja"><table class="a-tabla"><thead><tr><th>Lab</th><th class="n">Sesiones</th><th class="n">Personas</th><th class="n">Tiempo total</th><th class="n">Media</th><th class="n">CPU media</th><th class="n">RAM media</th><th class="n">RAM pico</th><th class="n">Pasos de media</th><th class="n">Abandonadas</th></tr></thead>
      <tbody>${r.por_lab.map((l: any) => `<tr><td class="m">${esc(l.lab)}</td><td class="n">${num(l.sesiones)}</td><td class="n">${num(l.gente)}</td><td class="n">${minutos(l.minutos)}</td><td class="n">${minutos(l.media_min)}</td>
        <td class="n">${num(l.cpu_pct, 1)} %</td><td class="n">${num(l.ram_mb)} MB</td><td class="n">${num(l.ram_pico)} MB</td><td class="n">${num(l.pasos, 1)}</td><td class="n">${num(l.abandonos)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="a-vacio">Todavía no se ha cerrado ninguna sesión en este rango.</p>';
    $('#l-pools').innerHTML = r.pools.length ? r.pools.map((p: any) => `<p style="margin:0 0 6px" class="m">${esc(p.nodo)}</p>${barrasH(Object.entries(p.pools).map(([k, v]) => ({ etiqueta: k, valor: v as number })).sort((a, b) => b.valor - a.valor), (v) => `${v}`, 'var(--s3)')}`).join('<hr style="border:0;border-top:1px solid var(--a-borde);margin:14px 0">') : sinServidores();
    $('#l-recientes').innerHTML = r.recientes.length ? `<div class="a-tabla-caja" style="max-height:420px"><table class="a-tabla"><thead><tr><th>Quién</th><th>Lab</th><th>Fin</th><th class="n">Duró</th><th>Por qué</th></tr></thead>
      <tbody>${r.recientes.map((x: any) => `<tr><td>${esc(x.usuario ?? 'sin cuenta')}</td><td class="m">${esc(x.lab)}</td><td class="t">${hace(x.fin)}</td><td class="n">${duracion(x.segundos)}</td><td class="t">${MOTIVOS[x.motivo] ?? esc(x.motivo)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="a-vacio">Nada todavía.</p>';
  },
};

// ===== Servidores

let horas = 24;
const servidores: Seccion = {
  titulo: 'Servidores', sub: 'Cada servidor de labs y su consumo', icono: 'server', cada: 15_000,
  montar() {
    $('#controles').append(segmentado([['6', '6 h'], ['24', '24 h'], ['168', '7 días'], ['720', '30 días']], String(horas), (v) => { horas = Number(v); servidores.actualizar(); }));
    contenido.innerHTML = '<div id="srv" class="a-rejilla"></div>';
  },
  async actualizar() {
    const r = await pedir<any>(`/api/admin/nodos?horas=${horas}`);
    if (!r.nodos.length) { $('#srv').innerHTML = sinServidores(); return; }
    $('#srv').innerHTML = r.nodos.map((n: any, i: number) => {
      const h = n.host;
      const ram = h.ram_total_mb ? (h.ram_usada_mb / h.ram_total_mb) * 100 : 0;
      const disco = h.disco_total_gb ? (h.disco_usado_gb / h.disco_total_gb) * 100 : 0;
      const calientes = Object.values(n.pools ?? {}).reduce((s: number, v) => s + (v as number), 0);
      return `<section class="a-tarjeta a-nodo">
        <div class="a-nodo-cab"><h2>${esc(n.nodo)}</h2>${n.vivo ? '<span class="et bien">En marcha</span>' : '<span class="et critico">Sin latido</span>'}
          <span class="et sin">versión ${esc(n.version)}</span><span class="et sin">encendido ${hace(n.arranque).replace('hace ', 'hace ')}</span><span class="t">último latido ${hace(n.visto)}</span></div>
        <div class="a-nodo-cifras">
          <div class="a-nodo-cifra"><span>${ic('cpu')} CPU</span><b>${num(h.cpu_pct)} %</b>${medidor(h.cpu_pct, 'CPU')}<small>${h.cpus} núcleos</small></div>
          <div class="a-nodo-cifra"><span>${ic('memory-stick')} RAM</span><b>${num(ram)} %</b>${medidor(ram, 'RAM')}<small>${num(h.ram_usada_mb / 1024, 2)} de ${num(h.ram_total_mb / 1024, 2)} GB</small></div>
          <div class="a-nodo-cifra"><span>${ic('hard-drive')} Disco</span><b>${num(disco)} %</b>${medidor(disco, 'Disco')}<small>${num(h.disco_usado_gb, 1)} de ${num(h.disco_total_gb)} GB</small></div>
          <div class="a-nodo-cifra"><span>${ic('activity')} Carga</span><b>${num(h.carga?.[0], 2)}</b><small>5 min ${num(h.carga?.[1], 2)} · 15 min ${num(h.carga?.[2], 2)}</small></div>
          <div class="a-nodo-cifra"><span>${ic('container')} Labs abiertos</span><b>${num(n.n_sesiones)}${n.limites?.total ? ` / ${n.limites.total}` : ''}</b><small>${calientes} en caliente · ${n.limites?.por_persona ? `${n.limites.por_persona} por persona` : 'sin límite por persona'}</small></div>
          <div class="a-nodo-cifra"><span>${ic('server')} labd</span><b>${num(h.labd_mb)} MB</b><small>${n.limites?.dura_min ? `cada lab dura ${n.limites.dura_min} min como mucho` : 'sin límite de duración'}</small></div>
        </div>
        <div class="a-rejilla a-r2">
          <div><h2 style="font-size:13px;margin:0 0 8px">CPU y RAM</h2><div id="g-uso-${i}"></div></div>
          <div><h2 style="font-size:13px;margin:0 0 8px">Labs abiertos</h2><div id="g-ses-${i}"></div></div>
        </div></section>`;
    }).join('');
    const fmtX = horas <= 24 ? hora : (ms: number) => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    r.nodos.forEach((n: any, i: number) => {
      const s = r.series[n.nodo] ?? [];
      const et = s.map((p: any) => (horas <= 24 ? hora(p.t) : fechaHora(p.t)));
      grafica($(`#g-uso-${i}`), {
        etiquetas: et, x: (_, j) => fmtX(s[j].t), max: 100, y: (v) => `${Math.round(v)} %`, alto: 190,
        series: [{ nombre: 'CPU', valores: s.map((p: any) => p.cpu), color: 'var(--s1)' }, { nombre: 'RAM', valores: s.map((p: any) => p.ram_pct), color: 'var(--s2)' }],
      });
      grafica($(`#g-ses-${i}`), {
        etiquetas: et, x: (_, j) => fmtX(s[j].t), alto: 190,
        series: [{ nombre: 'Labs abiertos', valores: s.map((p: any) => Math.round(p.sesiones * 10) / 10), color: 'var(--s1)', tipo: 'area' }],
      });
    });
  },
};

// ===== Actividad

const filtroAct = { tipo: '', pagina: 1 };
const actividad: Seccion = {
  titulo: 'Actividad', sub: 'Lo que pasa en las cuentas, lo más nuevo arriba', icono: 'history', cada: 20_000,
  montar() {
    contenido.innerHTML = `<div class="a-filtros"><select class="a-in" id="ac-tipo"><option value="">Todo</option></select></div><div id="ac-tabla"></div>`;
    $('#ac-tipo').onchange = (e) => { filtroAct.tipo = (e.target as HTMLSelectElement).value; filtroAct.pagina = 1; actividad.actualizar(); };
  },
  async actualizar() {
    const r = await pedir<any>(`/api/admin/actividad?tipo=${filtroAct.tipo}&pagina=${filtroAct.pagina}`);
    const sel = $('#ac-tipo') as HTMLSelectElement;
    if (sel.options.length <= 1) {
      for (const t of r.tipos) sel.append(new Option(`${(ACTIVIDAD[t.tipo] ?? [t.tipo])[0]} · ${t.n}`, t.tipo));
      sel.value = filtroAct.tipo;
    }
    $('#ac-tabla').innerHTML = `<div class="a-tabla-caja"><table class="a-tabla"><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Detalle</th><th>IP</th><th>País</th></tr></thead>
      <tbody>${r.filas.map((a: any) => `<tr><td class="t">${fechaHora(a.cuando)}</td><td>${a.nombre ? `<a href="#" data-u="${esc(a.usuario)}">${esc(a.nombre)}</a>` : '<span class="t">nadie</span>'}</td>
        <td>${etActividad(a.tipo)}</td><td class="t" style="white-space:normal;max-width:380px">${esc(a.detalle)}</td><td class="m t">${esc(a.ip ?? '')}</td><td class="t">${esc(a.pais ?? '')}</td></tr>`).join('') || '<tr><td colspan="6" class="t">Nada.</td></tr>'}</tbody></table></div>
      <div class="a-paginas"><span>Página ${r.pagina}</span><button class="a-btn" id="ac-ant" ${r.pagina <= 1 ? 'disabled' : ''}>Más nuevas</button><button class="a-btn" id="ac-sig" ${r.filas.length < 50 ? 'disabled' : ''}>Más viejas</button></div>`;
    document.querySelectorAll<HTMLElement>('#ac-tabla [data-u]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); abrirUsuario(a.dataset.u!); }));
    $('#ac-ant').onclick = () => { filtroAct.pagina--; actividad.actualizar(); };
    $('#ac-sig').onclick = () => { filtroAct.pagina++; actividad.actualizar(); };
  },
};

// ===== Ajustes

const ajustes: Seccion = {
  titulo: 'Ajustes', sub: 'Quién puede crear cuenta y qué ve todo el mundo', icono: 'cog',
  montar() { contenido.innerHTML = '<div id="aj"></div>'; },
  async actualizar() {
    const { ajustes: a, correo } = await pedir<any>('/api/admin/ajustes');
    const radio = (n: string, v: string, t: string, s: string) => `<label style="display:flex;gap:10px;align-items:flex-start;font-weight:400"><input type="radio" name="${n}" value="${v}" ${a[n] === v ? 'checked' : ''} style="margin-top:3px"/><span><b>${t}</b><br><small>${s}</small></span></label>`;
    $('#aj').innerHTML = `<div class="a-rejilla a-r21">
      <form class="a-tarjeta a-form" id="f-aj">
        <h2 style="margin:0">Altas</h2>
        <fieldset style="border:0;padding:0;margin:0;display:grid;gap:10px"><legend class="t" style="margin-bottom:8px">Quién puede crear una cuenta</legend>
          ${radio('registro', 'abierto', 'Cualquiera', 'Por libre, con código de clase o como profe.')}
          ${radio('registro', 'solo_clase', 'Solo con código de clase', 'Útil para un piloto con un colegio. Las cuentas que ya hay siguen igual.')}
          ${radio('registro', 'cerrado', 'Nadie', 'No se crean cuentas nuevas. Los profes pueden seguir creando las de sus alumnos.')}</fieldset>
        <fieldset style="border:0;padding:0;margin:0;display:grid;gap:10px"><legend class="t" style="margin-bottom:8px">Cuentas de profe</legend>
          ${radio('profes', 'abierto', 'Al momento', 'Quien elige profe al darse de alta puede crear clases ya.')}
          ${radio('profes', 'aprobacion', 'Con aprobación', 'Entra como alumno y te sale en Usuarios para que lo hagas profe.')}</fieldset>
        <label style="display:flex;gap:10px;align-items:flex-start;font-weight:400"><input type="checkbox" name="verificar_correo" ${a.verificar_correo === '1' ? 'checked' : ''} ${correo ? '' : 'disabled'} style="margin-top:3px"/>
          <span><b>Mandar el correo de confirmación al darse de alta</b><br><small>${correo ? 'Cada cuenta nueva con correo recibe un enlace para confirmarlo.' : 'Necesita el envío de correo de Cloudflare. Mira la caja de la derecha.'}</small></span></label>
        <label>Aviso para todos <small>Una línea arriba de cada página, por ejemplo una parada por mantenimiento. Vacío no enseña nada.</small>
          <input class="a-in" name="aviso" maxlength="200" value="${esc(a.aviso ?? '')}" /></label>
        <div class="a-acciones"><button class="a-btn primario">Guardar</button></div>
      </form>
      <div class="a-rejilla" style="align-content:start">
        <section class="a-tarjeta"><h2>Correo</h2>${correo ? '<p><span class="et bien">Activo</span></p><p class="a-sub">Se mandan los correos de confirmar y de recuperar la contraseña.</p>'
          : `<p><span class="et aviso">Apagado</span></p><p class="a-sub" style="margin-bottom:8px">Para encenderlo, una vez.</p><ol style="margin:0;padding-left:18px;display:grid;gap:6px;color:var(--a-texto-2)">
            <li>Pasa la cuenta de Cloudflare a Workers Paid (5 $ al mes).</li><li>En el panel, Email Service, Email Sending, da de alta relavops.org.</li>
            <li>Descomenta <code>send_email</code> en <code>cuentas/wrangler.jsonc</code> y despliega.</li></ol>`}</section>
        <section class="a-tarjeta"><h2>Admins</h2><p class="a-sub">Para hacer admin a alguien, búscalo en Usuarios y cámbiale el rol. El primer admin se nombra desde la terminal, lo explica cuentas/LEEME.md.</p></section>
      </div></div>`;
    const f = $('#f-aj') as HTMLFormElement;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = new FormData(f);
      try {
        await pedir('/api/admin/ajustes', 'PUT', { registro: d.get('registro'), profes: d.get('profes'), verificar_correo: d.get('verificar_correo') ? '1' : '0', aviso: d.get('aviso') });
        toast('Ajustes guardados.');
      } catch (x: any) { toast(x.message); }
    };
  },
};

// ---------- Navegación

const SECCIONES: Record<string, Seccion> = { resumen, usuarios, clases, labs, servidores, actividad, ajustes };
const actual = () => SECCIONES[location.hash.slice(1)] ?? resumen;

function refrescarSeccion() {
  const s = actual();
  const vivo = $('#vivo');
  vivo.classList.remove('parado');
  s.actualizar().catch((e) => {
    vivo.classList.add('parado');
    if (e.estado === 401) location.href = '/entrar?vuelta=/admin';
    else if (e.estado === 403) contenido.innerHTML = '<div class="a-tarjeta">Tu cuenta no es de admin.</div>';
    else toast(e.message);
  });
}

function irA() {
  const s = actual();
  document.querySelectorAll('.a-nav a').forEach((a) => a.setAttribute('aria-current', (a as HTMLAnchorElement).hash === `#${Object.keys(SECCIONES).find((k) => SECCIONES[k] === s)}` ? 'page' : 'false'));
  $('#titulo').textContent = s.titulo;
  $('#subtitulo').textContent = s.sub;
  $('#controles').innerHTML = '';
  document.title = `${s.titulo} · Admin · relavops`;
  s.montar();
  refrescarSeccion();
  clearInterval(refresco);
  $('#vivo').hidden = !s.cada;
  if (s.cada) refresco = window.setInterval(() => { if (!document.hidden && !document.querySelector('.a-cajon')) refrescarSeccion(); }, s.cada);
}

function pintarTema() {
  const t = document.documentElement.dataset.tema;
  const oscuro = t ? t === 'oscuro' : !matchMedia('(prefers-color-scheme: light)').matches;
  $('#tema').innerHTML = ic(oscuro ? 'sun' : 'moon');
  $('#tema').title = oscuro ? 'Pasar a claro' : 'Pasar a oscuro';
  return oscuro;
}

(async () => {
  const e = await cuenta();
  if (e.tipo === 'fuera') { location.href = '/entrar?vuelta=/admin'; return; }
  if (e.tipo !== 'dentro' || e.yo.usuario.rol !== 'admin') { contenido.innerHTML = '<div class="a-tarjeta">Esta página es solo para admins.</div>'; return; }
  yoId = e.yo.usuario.id;
  $('#nav').innerHTML = Object.entries(SECCIONES).map(([k, s]) => `<a href="#${k}">${ic(s.icono)} ${s.titulo}${k === 'usuarios' ? '<span class="cuenta" data-cuenta="usuarios"></span>' : ''}</a>`).join('');
  $('#al-curso').innerHTML = `${ic('chevron-left')} Volver al curso`;
  $('#yo').innerHTML = `${av(e.yo.usuario.nombre)}<div><b>${esc(e.yo.usuario.nombre)}</b><small>Admin</small></div>`;
  $('#refrescar').innerHTML = ic('rotate-cw');
  $('#refrescar').onclick = refrescarSeccion;
  pintarTema();
  $('#tema').onclick = () => {
    const nuevo = pintarTema() ? 'claro' : 'oscuro';
    document.documentElement.dataset.tema = nuevo;
    try { localStorage.setItem('relavops.admin.tema', nuevo); } catch {}
    pintarTema();
    if (actual() === resumen || actual() === servidores) refrescarSeccion();
  };
  addEventListener('hashchange', irA);
  irA();
  setInterval(() => fetch('/api/cuenta/yo').catch(() => {}), 20 * 60_000); // el pase de labd, siempre fresco
})();
