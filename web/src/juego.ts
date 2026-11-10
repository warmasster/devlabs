import './estilo.css';
import './recompensa';
import './iconos';
import { arrancar, type Juego } from './juegos/motor';

// Los juegos usan el tema Neón salvo que se pida otro (?tema=pizarra, fosforo, papel).
const params = new URLSearchParams(location.search);
document.documentElement.dataset.tema = params.get('tema') ?? 'neon';
const modulos = import.meta.glob<{ default: Juego }>('./juegos/*.ts');
const id = params.get('id') ?? 'persecucion';
const cargar = modulos[`./juegos/${id}.ts`];
if (!cargar || id === 'motor') {
  document.body.innerHTML = '<p style="padding:20px">Juego desconocido. <a href="/juegos">Volver</a></p>';
} else {
  cargar().then((m) => arrancar(m.default));
}
