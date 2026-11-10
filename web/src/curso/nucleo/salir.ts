// Aviso propio al salir de una lección con un lab abierto, en vez del cuadro del navegador.
// Salta con los enlaces de la página (← Mapa…) y con el botón de atrás del navegador.
// Cerrar la pestaña o recargar no avisa: la máquina sigue encendida un rato y al volver está igual.
import { h } from './tipos';

export function avisoAlSalir(activo: () => boolean) {
  let saliendo = false;
  // Una entrada de más en el historial: al pulsar atrás se queda en esta página y salta el aviso.
  history.pushState({ dlGuarda: true }, '');
  addEventListener('popstate', () => {
    if (saliendo) return;
    if (!activo()) { saliendo = true; history.back(); return; }
    preguntar().then((si) => {
      if (si) { saliendo = true; history.back(); }
      else history.pushState({ dlGuarda: true }, '');
    });
  });
  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || saliendo || !activo() || a.target === '_blank' || a.hasAttribute('data-libre') || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    ev.preventDefault();
    preguntar().then((si) => { if (si) { saliendo = true; location.href = a.href; } });
  }, true);
}

const preguntar = () => dialogo({ titulo: '¿Sales de la lección?', texto: 'Tu máquina sigue encendida un rato. Si vuelves pronto, la encuentras tal como la dejas, y la lección sigue en este paso.', si: 'Salir', no: 'Me quedo' });

let abierto: Promise<boolean> | undefined;

// Diálogo propio de sí o no, en lugar de confirm(). Escape o tocar fuera es que no.
export function dialogo(o: { titulo: string; texto: string; si: string; no: string }): Promise<boolean> {
  if (abierto) return abierto;
  abierto = new Promise<boolean>((fin) => {
    const capa = h('div', 'dl-dialogo-capa', `<div class="dl-dialogo panel tiembla" role="dialog" aria-modal="true" aria-labelledby="dl-dialogo-t">
      <h2 id="dl-dialogo-t"></h2><p></p>
      <div class="dl-dialogo-botones"><button class="btn" data-r="no"></button><button class="btn primario" data-r="si"></button></div>
    </div>`);
    capa.querySelector('h2')!.textContent = o.titulo;
    capa.querySelector('p')!.textContent = o.texto;
    capa.querySelector('[data-r="no"]')!.textContent = o.no;
    capa.querySelector('[data-r="si"]')!.textContent = o.si;
    const cerrar = (si: boolean) => { removeEventListener('keydown', tecla, true); capa.remove(); abierto = undefined; fin(si); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(false); } };
    capa.addEventListener('click', (e) => {
      const r = (e.target as HTMLElement).closest('[data-r]') as HTMLElement | null;
      if (r) cerrar(r.dataset.r === 'si');
      else if (e.target === capa) cerrar(false);
    });
    addEventListener('keydown', tecla, true);
    document.body.append(capa);
    (capa.querySelector('[data-r="no"]') as HTMLElement).focus();
  });
  return abierto;
}
