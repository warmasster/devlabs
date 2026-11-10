// La página de la chuleta (/chuleta). La misma chuleta que se abre dentro de la lección, a toda página.
import '../estilo.css';
import '../iconos';
import { panelAjustes } from '../recompensa';
import { pintarChuleta } from './chuleta';
import { navMovil } from './nav';
import { leer } from './progreso';

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());
navMovil('chuleta');
// La lección por la que va el alumno sale la primera.
const pintar = () => pintarChuleta($('chuleta'), leer().ultimo?.mod);
pintar();
// Con cuenta, al entrar llega el progreso guardado (quizá de otro dispositivo). Se vuelve a pintar.
addEventListener('relavops:progreso', pintar);
$('imprimir').onclick = () => print();
