// Registro de lecciones. Para añadir una: crea su fichero en esta carpeta y súmala aquí, en orden.
import type { Leccion } from './tipos';
import { leccion as l00 } from './0-0';
import { leccion as l01 } from './0-1';
import { leccion as l02 } from './0-2';
import { leccion as l03 } from './0-3';
import { leccion as l04 } from './0-4';
import { leccion as l05 } from './0-5';
import { leccion as l06 } from './0-6';
import { leccion as l07 } from './0-7';
import { leccion as l08 } from './0-8';
import { leccion as l09 } from './0-9';

const TODAS = [l00, l01, l02, l03, l04, l05, l06, l07, l08, l09];

export const LECCIONES: Record<string, Leccion> = Object.fromEntries(TODAS.map((l) => [l.id, l]));
export const ORDEN = TODAS.map((l) => l.id);
