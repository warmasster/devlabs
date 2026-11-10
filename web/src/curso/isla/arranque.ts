// Animación mientras se levanta un lab (solo en el modo islas): caen tres piezas, se monta un
// ordenador, se enciende la pantalla y el personaje brinca al lado. Se va sola cuando el lab está.
// Dura un mínimo para que no sea un parpadeo, y nunca retrasa más de eso.
import { ajustes } from '../../recompensa';
import { LINEA, PERSONAJES, elegido } from './temas';

const FRASES = ['Enchufando cables', 'Arrancando Linux', 'Abriendo tu terminal', 'Casi está'];

export function arranque(dentro: HTMLElement) {
  const t0 = performance.now();
  const capa = document.createElement('div');
  capa.className = 'pl-arranque';
  const bicho = elegido(PERSONAJES, 'personaje');
  capa.innerHTML = `<svg viewBox="-115 -150 230 170" aria-hidden="true">
      <ellipse cx="0" cy="8" rx="110" ry="10" fill="${LINEA}" opacity="0.35"/>
      <g class="pieza p1"><rect x="-58" y="-18" width="92" height="22" rx="7" fill="#8b84c9" stroke="${LINEA}" stroke-width="4"/>
        ${[-48, -34, -20, -6, 8, 22].map((x) => `<rect x="${x}" y="-12" width="9" height="7" rx="2" fill="#e6e1ff"/>`).join('')}</g>
      <g class="pieza p2"><rect x="-50" y="-100" width="76" height="76" rx="12" fill="#e6e1ff" stroke="${LINEA}" stroke-width="4"/></g>
      <g class="pieza p3"><rect x="-41" y="-91" width="58" height="50" rx="8" fill="#0e0b26" stroke="${LINEA}" stroke-width="3"/>
        <g class="pantalla-luz"><text x="-30" y="-60" font-family="monospace" font-weight="700" font-size="17" fill="#5ff2a8">&gt;</text><rect class="cursor-par" x="-16" y="-66" width="11" height="4" fill="#5ff2a8"/></g></g>
      <g transform="translate(70 4)"><g class="bicho-salta">${bicho.svg}</g></g>
    </svg><p></p><small>labd prepara tu máquina</small>`;
  dentro.append(capa);
  const p = capa.querySelector('p')!;
  let n = 0;
  p.textContent = FRASES[0];
  const reloj = setInterval(() => { n = Math.min(n + 1, FRASES.length - 1); p.textContent = FRASES[n]; }, 650);
  let ido = false;
  return {
    // rapido: el lab ya estaba abierto (se ha recuperado), basta con un vistazo.
    async fin(rapido = false) {
      if (ido) return;
      ido = true;
      const minimo = !ajustes.movimiento ? 0 : rapido ? 450 : 1300;
      const falta = minimo - (performance.now() - t0);
      if (falta > 0) await new Promise((r) => setTimeout(r, falta));
      clearInterval(reloj);
      capa.classList.add('fuera');
      setTimeout(() => capa.remove(), 320);
    },
  };
}
