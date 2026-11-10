// Uso: node pruebas/comandos.mjs [--todo]
// La regla de oro del curso: no se pide un comando, una opción ni un símbolo de la shell que no se
// haya enseñado antes con su ficha (widget `comando`).
// Recorre las lecciones en orden. Cada ficha enseña su comando y sus opciones. Cada tarea (`haz`),
// cada misión de práctica y cada boss (con sus pistas y su solución) solo puede usar lo ya enseñado.
// Sale con 1 si encuentra algo. Con --todo enseña además el catálogo que va saliendo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const todo = process.argv.includes('--todo');
const ts = createRequire(path.join(raiz, 'web/package.json'))('typescript');

function cargar(f) {
  const src = fs.readFileSync(path.join(raiz, 'web/src/curso/lecciones', f), 'utf8').replace(/^import .*$/gm, '');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', js)(mod, mod.exports);
  return mod.exports.leccion;
}

// Programas de Linux de siempre. Si una tarea usa uno y ninguna lección lo enseña, es un fallo.
// No están `w` ni `dd`, que en las lecciones son teclas de vim.
const BINARIOS = new Set(`awk sed grep egrep zgrep find xargs sort uniq cut tr head tail wc cat tac less more man top htop ps pgrep pkill
kill killall jobs bg fg nohup ls cd pwd mkdir rmdir rm cp mv ln touch stat du df free uname hostname nproc ip ifconfig ping
traceroute ss netstat nc curl wget dig ssh scp chmod chown chgrp umask id whoami su sudo passwd useradd echo printf export env
alias history clear which tar gzip gunzip zcat nano vim vi jq python3 python bash sh git tee sleep watch crontab systemctl
journalctl mount lsblk namei lsof strace diff seq basename dirname readlink shuf yes exit set local if for while`.split(/\s+/));
// En estos, lo que va detrás no son opciones del programa (o son de otro, o es texto del alumno).
const SIN_OPCIONES = new Set(['echo', 'if', 'for', 'while', 'printf', 'responde', 'entrega', 'local']);
const OPERADORES = ['2>', '>>', '&&', '||', '|', '>', '&', ';'];

// Parte una línea de comandos en trozos. Respeta las comillas y saca los símbolos de la shell.
function trocear(linea) {
  const out = [];
  let i = 0;
  let act = null;
  const cierra = () => { if (act) { out.push(act); act = null; } };
  while (i < linea.length) {
    const c = linea[i];
    if (c === "'" || c === '"') {
      const fin = linea.indexOf(c, i + 1);
      const hasta = fin < 0 ? linea.length : fin;
      act ??= { t: '', comillas: true };
      act.comillas = true;
      act.t += linea.slice(i + 1, hasta);
      i = hasta + 1;
      continue;
    }
    if (/\s/.test(c)) { cierra(); i++; continue; }
    // $( … ) y ${ … } son parte de la palabra. Lo de dentro no se parte aquí.
    if (c === '$' && (linea[i + 1] === '(' || linea[i + 1] === '{')) {
      const abre = linea[i + 1];
      const cer = abre === '(' ? ')' : '}';
      let n = 0;
      let j = i + 1;
      for (; j < linea.length; j++) { if (linea[j] === abre) n++; if (linea[j] === cer && --n === 0) break; }
      act ??= { t: '' };
      act.t += linea.slice(i, j + 1);
      act.comillas = true;
      i = j + 1;
      continue;
    }
    const op = OPERADORES.find((o) => linea.startsWith(o, i) && !(o === '2>' && act));
    if (op) { cierra(); out.push({ op }); i += op.length; continue; }
    act ??= { t: '' };
    act.t += c;
    i++;
  }
  cierra();
  return out;
}

// Lectura mínima del lab.yaml: los textos que ve el alumno en la misión y en el boss.
function textosDelLab(lab) {
  const f = path.join(raiz, 'labs', lab, 'lab.yaml');
  if (!fs.existsSync(f)) return { mision: [], boss: [] };
  const y = fs.readFileSync(f, 'utf8');
  const [antes, boss = ''] = y.split(/^boss:/m);
  const mision = antes.split(/^mision:/m)[1] ?? '';
  const sacar = (trozo) => {
    const out = [];
    for (const m of trozo.matchAll(/\b(texto|pista|solucion): *("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\n]*)/g)) {
      let v = m[2].trim();
      if (v.startsWith('"')) v = v.slice(1, -1).replace(/\\(["\\])/g, '$1');
      else if (v.startsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
      else v = v.replace(/\s+}\s*$/, '');
      if (v) out.push({ clase: m[1], v });
    }
    return out;
  };
  return { mision: sacar(mision), boss: sacar(boss) };
}

// De un texto con `código` salen sus líneas de comandos. Una pista sin comillas es una línea tal cual.
function lineasDe(texto, cruda = false) {
  if (cruda && !texto.includes('`')) return texto.split(/\s{2,}o\s{2,}|→|\s{3,}\(/).map((s) => s.trim()).filter(Boolean);
  return [...texto.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

const files = fs.readdirSync(path.join(raiz, 'web/src/curso/lecciones')).filter((f) => /^0-\d+\.ts$/.test(f))
  .sort((a, b) => Number(a.match(/-(\d+)/)[1]) - Number(b.match(/-(\d+)/)[1]));
const lecciones = files.map(cargar);

// El catálogo entero: qué comandos y opciones enseña el curso, y dónde.
const donde = new Map(); // comando -> "0.2 paso 3"
for (const lec of lecciones) lec.pasos.forEach((p, i) => p.w.forEach((w) => { if (w.t === 'comando' && !donde.has(w.cmd)) donde.set(w.cmd, `${lec.id} paso ${i + 1}`); }));
const conSub = new Set([...donde.keys()].filter((k) => k.includes(' ')).map((k) => k.split(' ')[0]));

const sabe = new Map(); // comando enseñado hasta ahora -> Set de opciones
const usados = new Set();
let fallos = 0;

function revisar(linea, sitio) {
  const partes = trocear(linea);
  let seg = [];
  const fallo = (t) => { fallos++; console.log(`  ${sitio}: ${t}   «${linea}»`); };
  const cerrar = () => {
    // Saltar asignaciones del tipo X=1 delante del comando.
    while (seg.length && !seg[0].comillas && /^[A-Za-z_]\w*=/.test(seg[0].t)) seg.shift();
    if (!seg.length) return;
    let cab = seg[0].t;
    let resto = seg.slice(1);
    if (seg[0].comillas) return;
    if (conSub.has(cab) && resto[0] && !resto[0].t.startsWith('-')) {
      cab = `${cab} ${resto[0].t}`;
      resto = resto.slice(1);
      if (!donde.has(cab)) { fallo(`\`${cab}\` no se enseña en ninguna lección`); return; }
    }
    if (!donde.has(cab)) {
      if (BINARIOS.has(cab)) fallo(`\`${cab}\` no se enseña en ninguna lección`);
      return; // no es un comando del catálogo (un programa del lab, un nombre de fichero…)
    }
    if (!sabe.has(cab)) { fallo(`\`${cab}\` se usa antes de enseñarlo (su ficha está en ${donde.get(cab)})`); return; }
    usados.add(cab);
    if (SIN_OPCIONES.has(cab)) return;
    const ops = sabe.get(cab);
    for (const r of resto) {
      if (r.comillas || !/^--?[A-Za-z0-9]/.test(r.t)) continue;
      const t = r.t.split('=')[0];
      if (ops.has(t)) continue;
      if (t === '--help' && sabe.has('--help')) continue;
      if (/^-\d+$/.test(t) && ops.has('-N')) continue;
      if (!t.startsWith('--')) {
        if ([...ops].some((o) => o.length >= 2 && !o.startsWith('--') && t.startsWith(o) && /^[^A-Za-z]/.test(t.slice(o.length)))) continue; // -f2, -d,
        if ([...t.slice(1)].every((ch) => ops.has(`-${ch}`))) continue; // -lh
      }
      fallo(`la opción \`${t}\` de \`${cab}\` no se ha explicado`);
    }
  };
  for (const p of partes) {
    if (p.op) {
      cerrar();
      seg = [];
      if (!donde.has(p.op)) fallo(`el símbolo \`${p.op}\` no se enseña en ninguna lección`);
      else if (!sabe.has(p.op)) fallo(`el símbolo \`${p.op}\` se usa antes de enseñarlo (su ficha está en ${donde.get(p.op)})`);
      else usados.add(p.op);
    } else seg.push(p);
  }
  cerrar();
}

for (const lec of lecciones) {
  let lab;
  const antes = fallos;
  lec.pasos.forEach((p, i) => {
    lab = p.lab ?? lab;
    const sitio = `${lec.id} paso ${i + 1} «${p.titulo}»`;
    // Las fichas del paso cuentan para todo el paso, aunque vayan debajo de la tarea.
    for (const w of p.w) {
      if (w.t !== 'comando') continue;
      const ops = sabe.get(w.cmd) ?? new Set();
      for (const [o] of w.ops ?? []) ops.add(o.split(/[ =]/)[0]);
      sabe.set(w.cmd, ops);
    }
    for (const w of p.w) {
      if (w.t === 'comando' && !w.hace && donde.get(w.cmd) === `${lec.id} paso ${i + 1}`) { fallos++; console.log(`  ${sitio}: la ficha de \`${w.cmd}\` no dice qué hace`); }
      if (w.t === 'haz') {
        lineasDe(w.md).forEach((l) => revisar(l, `${sitio} tarea`));
        if (w.pista) lineasDe(w.pista, true).forEach((l) => revisar(l, `${sitio} pista`));
      }
      if (w.t === 'mision' || w.t === 'boss') {
        const t = textosDelLab(lab);
        for (const x of w.t === 'mision' ? t.mision : t.boss) lineasDe(x.v, x.clase === 'pista').forEach((l) => revisar(l, `${lec.id} ${w.t === 'mision' ? 'práctica' : 'boss'} (${lab}) ${x.clase}`));
      }
    }
  });
  console.log(`${lec.id} ${lec.titulo}: ${fallos === antes ? 'bien' : `${fallos - antes} por arreglar`}`);
}

if (todo) {
  console.log('\nCatálogo');
  for (const [c, d] of donde) console.log(`  ${c.padEnd(18)} ${d}${sabe.get(c)?.size ? `   ${[...sabe.get(c)].join(' ')}` : ''}${usados.has(c) ? '' : '   (ninguna tarea lo usa)'}`);
}
console.log(fallos ? `\n${fallos} cosas se piden sin haberlas enseñado` : `\nTodo lo que se pide está enseñado antes. ${donde.size} comandos y símbolos en el catálogo.`);
process.exit(fallos ? 1 : 0);
