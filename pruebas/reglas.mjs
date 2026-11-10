// Uso: node pruebas/reglas.mjs [--todo]
// Revisa las lecciones contra las reglas de web/src/curso/lecciones/LEEME.md. Sin --todo solo enseña los avisos.
//  1. Cada paso tiene un lab a la derecha.
//  2. Nada de boton-lab: el alumno teclea.
//  3. Un widget en vivo que enseña datos de la máquina no puede verse antes de que el alumno escriba
//     el comando. O lleva `tras` (sale tapado hasta ese paso), o lleva `efecto: true` porque solo
//     enseña lo que el alumno provoca (la CPU que sube, la puerta que se abre, el fichero que crea),
//     o es de los que reflejan lo que ya hizo (último comando, código de salida, lo que leyó con cat).
//  4. Cada `haz` y cada `tras` apunta a un paso que existe en la misión de su lab.
//  5. Avisa de los pasos sin ninguna tarea en la terminal, para revisarlos a mano.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const todo = process.argv.includes('--todo');

// Las lecciones son TypeScript: se transpilan con el TypeScript de web/ y se evalúan.
const ts = createRequire(path.join(raiz, 'web/package.json'))('typescript');
async function cargar(f) {
  const src = fs.readFileSync(path.join(raiz, 'web/src/curso/lecciones', f), 'utf8').replace(/^import .*$/gm, '');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', js)(mod, mod.exports);
  return mod.exports.leccion;
}

// Misiones de los labs (lectura mínima del YAML: ids de la misión).
function mision(lab) {
  const y = fs.readFileSync(path.join(raiz, 'labs', lab, 'lab.yaml'), 'utf8');
  const parte = y.split(/^mision:/m)[1]?.split(/^boss:/m)[0] ?? '';
  return new Set([...parte.matchAll(/^ {2}- (?:\{ )?id: ([\w-]+)/gm)].map((m) => m[1]));
}

// Widgets que solo reflejan lo que el alumno ya hizo o que no dan datos de la máquina.
const REFLEJO = new Set(['ultimo', 'codigo-salida']);
const VIVOS = new Set(['cifra', 'medidor', 'contador', 'procesos', 'arbol', 'inodos', 'rwx', 'git-zonas', 'git-grafo', 'maquina', 'puertos', 'red', 'fichero', 'estado']);
const esVivo = (w) => VIVOS.has(w.t) && (w.sonda || ['maquina', 'puertos', 'red'].includes(w.t)) && !(w.t === 'fichero' && /^cat@/.test(w.sonda ?? ''));

let avisos = 0;
const files = fs.readdirSync(path.join(raiz, 'web/src/curso/lecciones')).filter((f) => /^0-\d\.ts$/.test(f)).sort();
for (const f of files) {
  const lec = await cargar(f);
  let lab;
  const sinTerminal = [];
  lec.pasos.forEach((p, i) => {
    lab = p.lab ?? lab;
    const n = `${lec.id} paso ${i + 1} «${p.titulo}»`;
    const ids = lab ? mision(lab) : new Set();
    const aviso = (t) => { avisos++; console.log(`  ${n}: ${t}`); };
    if (!lab) aviso('no tiene lab');
    for (const w of p.w) {
      if (w.t === 'boton-lab') aviso('usa boton-lab; que lo teclee el alumno');
      if (w.t === 'haz') { if (!ids.has(w.paso)) aviso(`haz «${w.paso}» no existe en la misión de ${lab}`); }
      if (w.tras && !ids.has(w.tras)) aviso(`tras «${w.tras}» no existe en la misión de ${lab}`);
      if (w.t === 'escena' && w.escena) {
        // Un nodo o una flecha que ningún paso pide en "ver" no se ve nunca.
        const vistos = new Set(w.escena.pasos.flatMap((q) => q.ver ?? []));
        const nunca = [...w.escena.nodos, ...(w.escena.flechas ?? [])].map((x) => x.id).filter((id) => !vistos.has(id));
        if (nunca.length) aviso(`el dibujo nunca enseña ${nunca.join(', ')}; añádelos a "ver" en algún paso`);
        const sinLuz = w.escena.pasos.findIndex((q) => (q.ver ?? []).length && !(q.luz ?? []).length);
        if (sinLuz >= 0 && todo) console.log(`    (el paso ${sinLuz + 1} del dibujo no resalta nada)`);
      }
      if (esVivo(w) && !w.tras && !w.efecto && !REFLEJO.has(w.t)) aviso(`${w.t}${w.sonda ? ` (${w.sonda})` : ''} se ve antes de que el alumno escriba nada. Ponle tras, o efecto: true si solo enseña lo que el alumno provoca.`);
    }
    const tieneTerminal = p.w.some((w) => ['haz', 'mision', 'boss', 'teclas'].includes(w.t) && (w.t !== 'teclas' || w.obliga || w.combos?.some((c) => c.seq)));
    if (!tieneTerminal) sinTerminal.push(i + 1);
  });
  console.log(`${lec.id} ${lec.titulo}: ${lec.pasos.length} pasos${sinTerminal.length ? ` · sin tarea en la terminal: ${sinTerminal.join(', ')}` : ''}`);
  if (todo) lec.pasos.forEach((p, i) => console.log(`    ${i + 1}. ${p.titulo} [${p.w.map((w) => w.t + (w.tras ? `(tras ${w.tras})` : '') + (w.paso ? `(${w.paso})` : '')).join(', ')}]`));
}
console.log(avisos ? `${avisos} avisos` : 'Sin avisos');
