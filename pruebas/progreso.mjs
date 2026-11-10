// Uso: node pruebas/progreso.mjs   (no necesita labd)
// El progreso guardado con la numeración de antes pasa bien a la nueva, una sola vez, y las notas
// de la chuleta se guardan y se borran como deben. Usa un localStorage de mentira.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ts = createRequire(raiz + 'web/package.json')('typescript');
const src = fs.readFileSync(raiz + 'web/src/curso/progreso.ts', 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const almacen = new Map();
globalThis.localStorage = { getItem: (k) => almacen.get(k) ?? null, setItem: (k, v) => almacen.set(k, v), removeItem: (k) => almacen.delete(k), key: () => null, get length() { return almacen.size; } };
Object.defineProperty(Object, 'keys', { value: Object.keys });
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const P = mod.exports;
let mal = 0;
const ver = (n, ok, extra) => { if (!ok) mal++; console.log(ok ? '  ok ' : '  MAL', n, ok ? '' : JSON.stringify(extra)); };
// Un alumno de antes: tutorial y ordenador hechos, a medias en la shell (paso 7) y en permisos.
almacen.set('relavops.curso', JSON.stringify({ modulos: { '0.0': { teoria: 1, lab: 1, boss: 1 }, '0.1': { teoria: 2, lab: 2, boss: 2 }, '0.4': { teoria: 9 } }, xp: 300, dias: ['2026-11-01'], records: { octal: 5 }, pasos: { '0.0': 12, '0.1': 27, '0.2': 7 }, ultimo: { mod: '0.2', fase: '7', resumen: '0.2 La shell · paso 8', cuando: 5 } }));
almacen.set('relavops.leccion.0.2', '{"max":7}');
const e = P.leer();
ver('versión 2', e.v === 2, e);
ver('la 0.1 de antes cuenta para máquina y red', e.modulos['0.3']?.boss === 2 && e.modulos['0.4']?.boss === 2 && e.modulos['0.4']?.teoria === 2, e.modulos);
ver('permisos pasa de 0.4 a 0.5 sin pisar la red', e.modulos['0.5']?.teoria === 9, e.modulos);
ver('la shell pasa de 0.2 a 0.1', e.pasos['0.1'] === 7 && e.ultimo.mod === '0.1' && e.ultimo.resumen.startsWith('0.1 '), e);
ver('el tutorial no se toca', e.modulos['0.0']?.boss === 1 && e.pasos['0.0'] === 12, e);
ver('xp, días y récords se quedan', e.xp === 300 && e.dias.length === 1 && e.records.octal === 5, e);
ver('no queda nada con el número viejo', !e.modulos['0.1'] && !e.modulos['0.2'], e.modulos);
const otra = P.leer();
ver('migrar dos veces no cambia nada', JSON.stringify(otra) === JSON.stringify(e), otra);
P.ponerNota('ls', '  lista ficheros  ');
ver('las notas se guardan recortadas', P.nota('ls') === 'lista ficheros' && P.leer().notas.ls.c > 0, P.leer().notas);
P.ponerNota('ls', '');
ver('borrar una nota deja la marca para los demás dispositivos', P.nota('ls') === '' && P.leer().notas.ls.t === '', P.leer().notas);
console.log(mal ? `${mal} fallos` : 'migración y notas bien');
process.exit(mal ? 1 : 0);
