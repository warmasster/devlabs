// La página del mapa (/curso). Un solo mapa para todos: las islas del cinturón blanco, la ficha de
// la lección elegida al lado y, debajo y plegado, lo que viene en los demás cinturones.
import '../estilo.css';
import '../iconos';
import { panelAjustes } from '../recompensa';
import { cuantasVistas } from './chuleta';
import { pintarMapaIsla } from './isla/mapa';
import { JUEGOS } from './juegos-lista';
import { LECCIONES } from './lecciones/index';
import { navMovil } from './nav';
import { esc } from './nucleo/tipos';
import { leer } from './progreso';
import { NIVELES } from './temario';

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());
navMovil('mapa');
pintar();
// Con cuenta, al entrar llega el progreso guardado (quizá de otro dispositivo). Se vuelve a pintar.
addEventListener('relavops:progreso', pintar);
// Al pasar de pantalla ancha a estrecha (o al girar el móvil) las islas se reparten de otra forma.
matchMedia('(max-width: 700px)').addEventListener('change', pintar);

// Si los labs están llenos, se avisa aquí, antes de entrar. Se puede entrar igual: la lección se
// lee y la máquina llega en cuanto se libera una.
fetch('/api/aforo').then((r) => (r.ok ? r.json() : null)).then((a) => {
  if (!a?.lleno) return;
  const d = document.createElement('div');
  d.className = 'mp-aforo';
  d.innerHTML = '<b>Ahora mismo hay mucha gente en los labs.</b> Puedes entrar y leer la lección. Tu máquina llega en cuanto se libere una, sin que hagas nada.';
  $('cinturones').after(d);
}).catch(() => {});

function pintar() {
  pintarMapaIsla($('mapa-isla'), $('lado'));
  const e = leer();
  $('chuleta-n').textContent = String(cuantasVistas());

  // Cinturones: uno por nivel. Se gana al vencer todos los bosses del nivel.
  const jugables = (n: (typeof NIVELES)[number]) => n.modulos.filter((m) => LECCIONES[m.id] && !m.side);
  $('cinturones').innerHTML = NIVELES.map((n) => {
    const js = jugables(n);
    const hechos = js.filter((m) => e.modulos[m.id]?.boss).length;
    const ganado = js.length > 0 && hechos === js.length;
    return `<a class="cint ${ganado ? 'ganado' : ''} ${js.length ? 'abierto' : ''}" href="${js.length ? '#mapa-isla' : `#nivel-${n.n}`}" data-n="${n.n}">
      <i style="background:${n.color}"></i><b>${n.cinturon}</b><span>${js.length ? `${hechos}/${js.length}` : 'pronto'}</span></a>`;
  }).join('');
  $('cinturones').querySelectorAll<HTMLAnchorElement>('a:not(.abierto)').forEach((a) => (a.onclick = () => {
    ($('temario') as HTMLDetailsElement).open = true;
    const d = document.getElementById(`nivel-${a.dataset.n}`) as HTMLDetailsElement | null;
    if (d) d.open = true;
  }));

  // Lo que viene: los demás cinturones, plegados. Sirve para ver adónde lleva el curso.
  $('niveles').innerHTML = NIVELES.filter((n) => !jugables(n).length).map((n) => `
    <details class="nivel" id="nivel-${n.n}">
      <summary><i style="background:${n.color}"></i><b>Cinturón ${n.cinturon.toLowerCase()}</b> ${esc(n.titulo)}</summary>
      <p>${esc(n.objetivo)}</p>
      <ul>${n.modulos.map((m) => `<li><b>${m.id} ${esc(m.titulo)}</b><span>${esc(m.teoria)}</span></li>`).join('')}</ul>
    </details>`).join('');

  $('arcade').innerHTML = JUEGOS.map((j) => `<a class="panel juego" href="/arcade?j=${j.id}"><span class="ic">«ic:${j.icono}»</span><div><b>${j.titulo}</b><small>${j.modulo} · récord ${e.records[j.id] ?? 0}</small></div></a>`).join('');
}
