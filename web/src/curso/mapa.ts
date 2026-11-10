import '../estilo.css';
import '../iconos';
import { modo, panelAjustes } from '../recompensa';
import { pintarMapaIsla } from './isla/mapa';
import { NIVELES, MOTORES } from './temario';
import { LECCIONES } from './lecciones/index';
import { leer, racha } from './progreso';
import { esc } from './nucleo/tipos';
import { JUEGOS } from './juegos-lista';

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());
pintar();
// Con cuenta, al entrar llega el progreso guardado (quizá de otro dispositivo). Se vuelve a pintar.
addEventListener('relavops:progreso', pintar);

function pintar() {
if (modo() === 'isla') { $('mapa-isla').innerHTML = ''; pintarMapaIsla($('mapa-isla')); }

const e = leer();
const r = racha();
const bosses = Object.values(e.modulos).filter((m) => m.boss).length;
$('c-xp').textContent = String(e.xp);
$('c-racha').textContent = String(r.dias);
$('c-racha-t').textContent = r.comodines ? `días · ${r.comodines} comodín${r.comodines > 1 ? 'es' : ''}` : 'días de racha';
$('c-bosses').textContent = String(bosses);

// Continuar: exactamente donde lo dejaste, con un resumen de 2 líneas.
const cont = $('continuar') as HTMLAnchorElement;
if (e.ultimo) {
  const hace = Math.round((Date.now() - e.ultimo.cuando) / 60000);
  const cuando = hace < 60 ? `hace ${hace} min` : hace < 1440 ? `hace ${Math.round(hace / 60)} h` : `hace ${Math.round(hace / 1440)} días`;
  cont.href = `/leccion?m=${e.ultimo.mod}`;
  cont.innerHTML = `<span class="eti">«ic:play» CONTINUAR</span><h2>${esc(e.ultimo.resumen)}</h2><p>Lo dejaste ${cuando}. Sigues en el paso donde ibas.</p><span class="btn primario" style="align-self:flex-start;margin-top:6px">Seguir «ic:arrow-right»</span>`;
} else {
  cont.href = '/leccion?m=0.0';
  cont.innerHTML = `<span class="eti">«ic:rocket» EMPIEZA AQUÍ</span><h2>0.0 · Cómo funciona esto</h2><p>Diez minutos para conocer la pantalla con tu primera máquina de verdad. No hay que instalar nada.</p><span class="btn primario" style="align-self:flex-start;margin-top:6px">Empezar «ic:arrow-right»</span>`;
}

// Cinturones: uno por nivel; se gana al vencer todos los bosses del nivel.
const jugables = (n: (typeof NIVELES)[number]) => n.modulos.filter((m) => LECCIONES[m.id] && !m.side);
$('cinturones').innerHTML = NIVELES.map((n) => {
  const js = jugables(n);
  const hechos = js.filter((m) => e.modulos[m.id]?.boss).length;
  const ganado = js.length > 0 && hechos === js.length;
  return `<a class="cint ${ganado ? 'ganado' : ''}" href="#nivel-${n.n}" style="color:${n.color}"><div class="tira" style="background:${n.color}"></div><b style="color:var(--texto)">${n.cinturon}</b><div class="p">${js.length ? `${hechos}/${js.length} bosses` : 'en la forja'}</div></a>`;
}).join('');

let html = '';
let faseActual = '';
for (const n of NIVELES) {
  if (n.fase !== faseActual) {
    faseActual = n.fase;
    html += `<div class="fase-t">${{ Base: 'Fase 1 · La base: Linux y redes', Construir: 'Fase 2 · Construir y desplegar', Operar: 'Fase 3 · Operar a lo grande' }[n.fase]}</div>`;
  }
  const oscuro = ['#e7e9ee', '#fde047', '#fb923c', '#4ade80', '#60a5fa', '#c084fc'].includes(n.color);
  html += `<section class="nivel" id="nivel-${n.n}">
    <div class="nivel-cab"><span class="cinta" style="background:${n.color};color:${oscuro ? '#111' : '#fff'}">${n.n}</span>
      <div><h2>Cinturón ${n.cinturon.toLowerCase()} · ${n.titulo}</h2><p>${n.objetivo}</p></div>
      <div class="tags">${n.motor.map((m) => `<span class="pildora">«ic:container» ${MOTORES[m]}</span>`).join('')}</div></div>
    <div class="mods">${n.modulos.map((m) => {
      const jugable = !!LECCIONES[m.id];
      const est = e.modulos[m.id] ?? {};
      const completo = est.teoria && est.lab && est.boss;
      const tag = jugable ? 'a' : 'div';
      const href = jugable ? ` href="/leccion?m=${m.id}"` : '';
      return `<${tag} class="panel mod ${jugable ? '' : 'forja'} ${completo ? 'completo' : ''}"${href}>
        ${m.side ? '<span class="side">side-quest</span>' : ''}
        <span class="id">${completo ? '«ic:circle-check»' : jugable ? '«ic:play»' : '«ic:lock»'} ${m.id}${m.juego ? ' · «ic:gamepad-2»' : ''}</span>
        <h3>${m.titulo}</h3>
        <span class="t">${m.teoria}</span>
        <span class="t" style="color:var(--texto);opacity:.8">${m.practica}</span>
        <div class="estado">${jugable ? `<span class="${est.teoria ? 'si' : ''}">T</span><span class="${est.lab ? 'si' : ''}">P</span><span class="${est.boss ? 'si' : ''}">B</span>` : '<span>en la forja</span>'}</div>
      </${tag}>`;
    }).join('')}</div></section>`;
}
$('niveles').innerHTML = html;

$('arcade').innerHTML = JUEGOS.map((j) => `<a class="panel juego" href="/arcade?j=${j.id}"><span class="ic">«ic:${j.icono}»</span><div><b>${j.titulo}</b><small>${j.modulo} · récord ${e.records[j.id] ?? 0}</small></div></a>`).join('');
}
