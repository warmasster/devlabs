// Registro de widgets. La lección los pide por nombre: { t: 'red', origen: 'tu-pc' }.
// Para añadir uno: escríbelo en su familia y añádelo aquí. Ver widgets/LEEME.md.
import type { Widget } from '../nucleo/tipos';
import * as b from './basicos';
import * as d from './diagramas';
import * as v from './vivos';
import * as j from './juegos';
import './widgets.css';

export const WIDGETS: Record<string, Widget> = {
  // Básicos (no necesitan lab)
  texto: b.texto, analogia: b.analogia, cifra: b.cifra, comparar: b.comparar, capas: b.capas, anatomia: b.anatomia,
  tabla: b.tabla, chuleta: b.chuleta, codigo: b.codigo, linea: b.linea, escala: b.escala, teclas: b.teclas,
  senala: b.senala, aviso: b.aviso,
  // Diagramas
  escena: d.escena, estados: d.estados, tuberia: d.tuberia, canales: d.canales, arbol: d.arbol, inodos: d.inodos,
  red: d.red, ip: d.ip, binario: d.binario, rwx: d.rwx, 'git-zonas': d.gitZonas, 'git-grafo': d.gitGrafo,
  deslizador: d.deslizador,
  // Conectados al lab
  maquina: v.maquina, puertos: v.puertos, fichero: v.fichero, ultimo: v.ultimo, procesos: v.procesos,
  medidor: v.medidor, contador: v.contador, estado: v.estado, 'codigo-salida': v.codigoSalida, haz: v.haz,
  mision: v.mision, boss: v.boss, 'boton-lab': v.botonLab, 'terminal-demo': v.terminalDemo,
  // Juegos y comprobaciones
  quiz: j.quiz, verdad: j.verdad, ordena: j.ordena, empareja: j.empareja, huecos: j.huecos, clasifica: j.clasifica,
  rapido: j.rapido, atajo: j.atajo, ruta: j.ruta, memoria: j.memoria, regex: j.regex, vim: j.vim,
};

export { tarjetaMaquina } from './vivos';
