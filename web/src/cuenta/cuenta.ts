// Mi cuenta: perfil, clases, correo, contraseña, dispositivos y borrar la cuenta.
import '../estilo.css';
import '../iconos';
import './paginas.css';
import { opcionesCuenta, panelAjustes } from '../recompensa';
import { leer } from '../curso/progreso';
import { dialogo } from '../curso/nucleo/salir';
import { esc } from './cuenta-util';
import { colorDe, cuenta, irAEntrar, pedir, ROL, salir, type Yo } from './sesion';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const fecha = (ms: number) => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

$('#ajustes').append(panelAjustes());

function mensaje(caja: HTMLElement, texto: string, bien: boolean) {
  const m = $('.cp-msg', caja);
  m.textContent = texto;
  m.className = `cp-msg ${bien ? 'bien' : 'mal'}`;
}

async function pintar() {
  const e = await cuenta(true);
  if (e.tipo === 'fuera') return irAEntrar();
  if (e.tipo !== 'dentro') { $('#main').innerHTML = '<p class="cp-cargando">Este servidor no usa cuentas.</p>'; return; }
  const { usuario: u, clases }: Yo = e.yo;
  const p = leer();
  const bosses = Object.values(p.modulos).filter((m) => m.boss).length;
  const verif = new URLSearchParams(location.search).get('verificado');
  $('#main').innerHTML = `
    ${verif === '1' ? '<div class="panel" style="border-color:var(--ok)"><b>Correo confirmado.</b> Gracias.</div>' : ''}
    ${verif === '0' ? '<div class="panel" style="border-color:var(--mal)"><b>Ese enlace ha caducado o ya se usó.</b> Pide otro desde aquí abajo.</div>' : ''}
    <section class="panel cp-perfil">
      <span class="rv-avatar" style="--c:${colorDe(u.nombre)}">${esc(u.nombre.slice(0, 1).toUpperCase())}</span>
      <div style="flex:1;min-width:220px">
        <h2>${esc(u.nombre)}</h2>
        <p>En relavops desde el ${fecha(u.creado)}.</p>
        <div class="cp-etis">
          <span class="pildora ok">${ROL[u.rol]}</span>
          ${u.origen === 'libre' ? '<span class="pildora">Por libre</span>' : ''}
          ${u.pide_profe ? '<span class="pildora aviso">Cuenta de profe pendiente de revisar</span>' : ''}
          ${u.correo ? `<span class="pildora ${u.correo_ok ? 'ok' : ''}">${esc(u.correo)}${u.correo_ok ? ' · confirmado' : ''}</span>` : '<span class="pildora">Sin correo</span>'}
        </div>
      </div>
      <div class="pf-cifras" style="grid-template-columns:repeat(3,auto);gap:8px">
        <div><b style="color:var(--xp)">${p.xp}</b><span>XP</span></div>
        <div><b>${bosses}</b><span>bosses</span></div>
        <div><b>${p.dias.length}</b><span>días</span></div>
      </div>
    </section>

    <div class="cp-rejilla">
      <section class="panel" id="s-clases">
        <h2>Mis clases</h2>
        ${clases.length ? `<ul class="cp-lista">${clases.map((c) => `<li><div><b>${esc(c.nombre)}</b><small>con ${esc(c.profe)}</small></div><button class="btn peque fantasma" data-dejar="${esc(c.id)}">Dejar</button></li>`).join('')}</ul>` : '<p class="cp-suave">No estás en ninguna clase. Vas por libre.</p>'}
        <form class="cp-form" id="f-unirse" style="margin-top:12px">
          <label>Unirme a una clase con su código</label>
          <div class="cp-fila"><input class="cp-in" name="codigo" placeholder="ABCD-EFGH" maxlength="9" autocomplete="off" style="font-family:var(--mono);text-transform:uppercase" /><button class="btn primario">Unirme</button></div>
          <p class="cp-msg"></p>
        </form>
        ${u.rol !== 'alumno' ? '<p style="margin:12px 0 0"><a class="btn" href="/profe">Ir a mis clases de profe</a></p>' : ''}
      </section>

      <section class="panel">
        <h2>Correo</h2>
        <form class="cp-form" id="f-correo">
          <label>Tu correo<input name="correo" type="email" value="${esc(u.correo ?? '')}" autocomplete="email" /></label>
          <div class="cp-fila"><button class="btn primario">Guardar correo</button>
          ${e.yo.correo && u.correo && !u.correo_ok ? '<button type="button" class="btn" id="b-verificar">Mandar el correo de confirmación</button>' : ''}</div>
          <p class="cp-msg"></p>
        </form>
        ${!e.yo.correo ? '<p class="cp-suave" style="margin-top:10px">El envío de correo todavía no está activo en relavops. Tu correo queda guardado para cuando lo esté.</p>' : ''}
      </section>

      <section class="panel">
        <h2>Contraseña</h2>
        <form class="cp-form" id="f-clave">
          <label>Contraseña actual<input name="actual" type="password" autocomplete="current-password" required /></label>
          <label>Contraseña nueva<input name="nueva" type="password" autocomplete="new-password" minlength="8" required /></label>
          <button class="btn primario" style="justify-self:start">Cambiar contraseña</button>
          <p class="cp-msg"></p>
        </form>
        <p class="cp-suave" style="margin-top:8px">Al cambiarla se cierra tu cuenta en los demás dispositivos.</p>
      </section>

      <section class="panel" id="preferencias">
        <h2>Preferencias</h2>
        <p class="cp-suave">Se guardan en este navegador. El sonido y la animación están arriba, en todas las páginas.</p>
        <div id="opciones" style="margin-top:12px"></div>
      </section>

      <section class="panel">
        <h2>Dispositivos</h2>
        <p class="cp-suave">Si entraste en un ordenador que no es tuyo y no saliste, ciérralo desde aquí.</p>
        <div class="cp-fila" style="margin-top:12px">
          <button class="btn" id="b-salir">Salir de este</button>
          <button class="btn secundario" id="b-salir-todo">Salir de todos</button>
        </div>
      </section>

      <section class="panel cp-peligro">
        <h2>Borrar la cuenta</h2>
        <p class="cp-suave">Se borran tu cuenta, tu progreso guardado y tus clases${u.rol !== 'alumno' ? ' de profe con sus alumnos dentro (las cuentas de los alumnos siguen)' : ''}. No se puede deshacer.</p>
        <form class="cp-form" id="f-borrar" style="margin-top:10px">
          <label>Escribe tu contraseña para confirmar<input name="clave" type="password" autocomplete="current-password" required /></label>
          <button class="btn peligro" style="justify-self:start">Borrar mi cuenta</button>
          <p class="cp-msg"></p>
        </form>
      </section>
    </div>`;

  $('#opciones').append(opcionesCuenta());
  if (location.hash === '#preferencias') document.getElementById('preferencias')?.scrollIntoView({ block: 'center' });

  document.querySelectorAll<HTMLButtonElement>('[data-dejar]').forEach((b) => (b.onclick = async () => {
    if (!(await dialogo({ titulo: '¿Dejar esta clase?', texto: 'Tu profe dejará de ver tu progreso. Puedes volver con el código.', si: 'Sí, dejarla', no: 'No' }))) return;
    await pedir('/api/cuenta/dejar', 'POST', { clase: b.dataset.dejar }).catch((x) => alert(x.message));
    pintar();
  }));

  const fUnirse = $('#f-unirse') as HTMLFormElement;
  fUnirse.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const r = await pedir('/api/cuenta/unirse', 'POST', { codigo: (fUnirse.elements.namedItem('codigo') as HTMLInputElement).value });
      mensaje(fUnirse, `Ya estás en ${r.clase.nombre}.`, true);
      setTimeout(pintar, 900);
    } catch (x: any) { mensaje(fUnirse, x.message, false); }
  };

  const fCorreo = $('#f-correo') as HTMLFormElement;
  fCorreo.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      await pedir('/api/cuenta/correo', 'POST', { correo: (fCorreo.elements.namedItem('correo') as HTMLInputElement).value });
      mensaje(fCorreo, 'Correo guardado.', true);
      setTimeout(pintar, 900);
    } catch (x: any) { mensaje(fCorreo, x.message, false); }
  };
  const bVerif = document.getElementById('b-verificar');
  if (bVerif) bVerif.onclick = async () => {
    try { await pedir('/api/cuenta/verificar', 'POST'); mensaje(fCorreo, 'Te lo hemos mandado. Mira tu correo.', true); } catch (x: any) { mensaje(fCorreo, x.message, false); }
  };

  const fClave = $('#f-clave') as HTMLFormElement;
  fClave.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = (n: string) => (fClave.elements.namedItem(n) as HTMLInputElement).value;
    try {
      await pedir('/api/cuenta/clave', 'POST', { actual: v('actual'), nueva: v('nueva') });
      fClave.reset();
      mensaje(fClave, 'Contraseña cambiada.', true);
    } catch (x: any) { mensaje(fClave, x.message, false); }
  };

  $('#b-salir').onclick = () => salir();
  $('#b-salir-todo').onclick = async () => { if (await dialogo({ titulo: '¿Salir de todos?', texto: 'Tendrás que volver a entrar en cada dispositivo, también en este.', si: 'Sí, de todos', no: 'No' })) salir(true); };

  const fBorrar = $('#f-borrar') as HTMLFormElement;
  fBorrar.onsubmit = async (ev) => {
    ev.preventDefault();
    if (!(await dialogo({ titulo: '¿Borrar tu cuenta?', texto: 'Se borra para siempre. No se puede deshacer.', si: 'Sí, borrarla', no: 'No' }))) return;
    try {
      await pedir('/api/cuenta/borrar', 'POST', { clave: (fBorrar.elements.namedItem('clave') as HTMLInputElement).value });
      try { localStorage.removeItem('relavops.curso'); localStorage.removeItem('relavops.curso.dueno'); } catch {}
      location.href = '/entrar';
    } catch (x: any) { mensaje(fBorrar, x.message, false); }
  };
}

pintar();
