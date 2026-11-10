// Uso: node pruebas/labs-leccion.mjs [lab]   (labd en marcha en la distro relavops-m6, puerto 8080)
// Labs de lección: cada paso de la misión se resuelve dentro del lab y se comprueba que labd lo valida,
// y que las sondas llegan (y cambian cuando deben).
import { spawnSync } from 'node:child_process';
import { distro } from './distro.mjs';
const API = process.env.LABD ?? 'http://localhost:8080'; // LABD=http://localhost:8090 para otro puerto
const sh = (c, cmd) => { const r = spawnSync('wsl.exe', ['-d', distro(), '-u', 'root', '--', 'docker', 'exec', '-i', c, 'bash'], { encoding: 'utf8', input: cmd }); return (r.stdout + r.stderr).trim(); };
const post = async (u) => { const r = await fetch(API + u, { method: 'POST' }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const H = (cmds) => `printf '%s\\n' ${cmds.map((c) => `'${c.replace(/'/g, `'\\''`)}'`).join(' ')} >> /root/.bash_history`;

// Cada etapa: [nodo, comando] o [nodo, comando, 'accion:nombre']
const S = {
  'n0-0-tutorial': {
    etapas: [[['mi-servidor', `cd /root; ${H(['echo hola', 'cat bienvenida.txt', 'ls', 'adios', 'echo Lucía', 'clear'])}; responde nombre Lucía`]]],
    boss: { cadena: `responde codigo $(grep -o 'es .*' /root/tesoro/cofre.txt | cut -d' ' -f2)`, oculto: `responde codigo $(grep -o 'es .*' /root/tesoro/.escondido.txt | cut -d' ' -f2)` },
    sondas: ['ultimo@mi-servidor', 'rc@mi-servidor', 'cat@mi-servidor'],
  },
  'n0-1a-cuerpo': {
    etapas: [
      [['servidor', 'setsid nohup ocupado >/dev/null 2>&1 & setsid nohup tragon >/dev/null 2>&1 & sleep 1']],
      [['servidor', `${H(['nproc', 'free -m', 'ps aux', 'ps -p 1', 'df -h', 'uname -r', 'cat /etc/os-release', 'hostname', 'uname', 'cat /etc/hostname', 'ls -lh /srv/web'])}; sleep 2; pkill -x ocupado; pkill -x tragon`]],
    ],
    sondas: ['ram@servidor', 'cpu@servidor', 'procesos@servidor', 'nproc@servidor', 'disco@servidor'],
  },
  'n0-1b-red': {
    etapas: [
      [['tu-pc', `${H(['ip addr', 'ping -c 2 10.0.0.99', 'hostname', 'hostname -I', 'ss -tln'])}; ping -c 2 -W1 10.0.0.20; ping -c 2 -W1 10.0.0.30; ping -c 1 -W1 10.0.0.99`], ['web', 'setsid nohup nc -lk 8080 >/dev/null 2>&1 &']],
      [['tu-pc', 'nc -zv -w2 10.0.0.20 8080']],
    ],
    sondas: ['icmp@tu-pc', 'icmp@web', 'icmp@db', 'puertos@web', 'puertos@tu-pc'],
  },
  'n0-2a-teclas': {
    etapas: [
      [['lab', `${H(['ls --help', 'cat /srv/una-carpeta-con-un-nombre-larguisimo-de-verdad/fichero-escondido.txt', 'sleep 100', 'echo $SHELL', 'cd /tmp', 'cd', 'sleep 5', 'less /etc/services'])}; setsid nohup sleep 200 >/dev/null 2>&1 & sleep 0.3; pkill -STOP -f 'sleep 200'; PYTHONSTARTUP=/etc/pystart.py python3 -i </dev/null`]],
      [['lab', `${H(['bg'])}; pkill -CONT -f 'sleep 200'`]],
      [['lab', `${H(['kill %1'])}; pkill -f 'sleep 200'`]],
    ],
    sondas: ['procesos@lab', 'ultimo@lab'],
  },
  'n0-3a-arbol': {
    etapas: [
      [['lab', `${H(['pwd', 'cd casa', 'ls', 'ls -F', 'ls /', 'ls /root/casa/documentos/*.log', 'ls -i /root/enlaces', 'ls -l /proc/1/fd'])}`]],
    ],
    // cd depende del cwd de la bash del alumno: se simula con una bash interactiva viva.
    cwd: true,
    sondas: ['arbol@lab', 'inodos@lab'],
  },
  'n0-4a-rwx': {
    etapas: [[['lab', `${H(['whoami', 'id ana', 'ls -l /srv/club', 'ls -ld /root', 'stat -c %a /srv/club/diario.txt', 'ls -ld /tmp'])}; chmod o+r /srv/club/diario.txt; chown ana /srv/club/diario.txt; chmod +x /srv/club/saluda.sh; chmod 755 /srv/secreto; chgrp club /srv/club/socios.txt; chmod 664 /srv/club/socios.txt`]]],
    sondas: ['ana-lee', 'ana-escribe', 'ana-ejecuta', 'ana-secreto', 'luis-socios', 'perm-diario'],
  },
  'n0-5a-canales': {
    etapas: [
      [['lab', 'cd /root; ls /etc > salida.txt']],
      [['lab', `cd /root; echo fin >> salida.txt; copia 2> errores.txt >/dev/null; ${H(['cat datos/ciudades.txt | wc -l', 'grep Madrid datos/ciudades.txt', 'sort datos/ciudades.txt | uniq -c | sort -rn', 'cut -d, -f2 datos/ventas.csv', 'ls /noexiste', 'ls /etc/ssl /noexiste > lista.txt', 'zcat datos/viejo.log.gz', "jq '[.[] | select(.activo)] | length' datos/usuarios.json"])}`]],
    ],
    sondas: ['salida', 'errores'],
  },
  'n0-6a-patrones': {
    etapas: [[['lab', `cd /root; grep '^ERROR' textos/log.txt > encontrado.txt; grep -oE '[a-z.]+@[a-z.]+' textos/contactos.txt > correos.txt; ${H(["grep -c '^ERROR' textos/log.txt", "grep 'segundos$' textos/log.txt", "grep '[0-9]' textos/log.txt", "grep -oE '[0-9]+' textos/log.txt", "grep -E '^(ERROR|WARN)' textos/log.txt", 'grep ERROR textos/log.txt', 'cat textos/web.txt', "echo 'Ana Pérez' | sed -E 's/(.*) (.*)/\\2, \\1/'"])}; sed -i 's#http://#https://#' textos/web.txt`]]],
    sondas: ['encontrado', 'correos', 'web'],
  },
  'n0-7a-editor': {
    etapas: [[['lab', `cd /root; echo 'hola desde nano' >> nota.txt; ${H(['vim compra.txt'])}; sed -i '/BORRAME/d' compra.txt; sed -i 's/localhost/db/g' config.ini; ${H(['jq . app.json', 'which nano vim', 'cat nota.txt', 'cat compra.txt', 'cat config.ini', 'vim compra.txt'])}`]]],
    sondas: ['nota', 'compra', 'config', 'editor'],
  },
  'n0-8a-guion': {
    etapas: [
      [['lab', `cd /root; printf '#!/bin/bash\\necho "Hola, \${1:-mundo}"\\n' > hola.sh`]],
      [['lab', `cd /root; chmod +x hola.sh; ${H(['./hola.sh', 'ls /nada', 'echo $?', 'for f in fotos/*; do echo $f; done', 'if [ -f hola.sh ]; then echo existe; fi', 'head -1 /usr/bin/zcat', 'ls -l hola.sh', 'saluda Ana', 'bash -x hola.sh Ana'])}`]],
    ],
    sondas: ['script', 'ejecutable', 'rc@lab'],
  },
  'n0-9a-historia': {
    etapas: [
      [['lab', 'cd /root/proyecto && git init -q']],
      [['lab', 'cd /root/proyecto && git add .']],
      [['lab', 'cd /root/proyecto && git commit -qm "Primera versión" && echo "<p>9</p>" >> index.html && git commit -qam Horario && git switch -qc ofertas && echo "<p>Ofertas</p>" >> index.html && git commit -qam Ofertas && git switch -q main && git merge -q ofertas && git remote add origin /srv/git/tienda.git && git push -q -u origin main && echo roto >> index.html && git restore index.html && git clone -q /srv/git/tienda.git /root/copia']],
      [['lab', `${H(['git restore index.html', 'git --version', 'git status', 'git diff'])}`]],
    ],
    sondas: ['zonas', 'grafo'],
  },
};

function escuchar(sesion) {
  const ev = [];
  const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/ws/eventos?s=${sesion}`);
  ws.onmessage = (m) => ev.push(JSON.parse(m.data));
  return { ev, cerrar: () => ws.close(), listo: new Promise((r) => (ws.onopen = r)) };
}
// Una terminal de verdad. Tras cada etapa se pulsa Enter en ella, como haría el alumno:
// vuelve el prompt, la shell avisa a labd y la comprobación sale en el acto.
function terminal(sesion, nodo) {
  const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/ws/term?s=${sesion}&n=${nodo}&c=100&r=30`);
  return { enter: () => ws.send(new TextEncoder().encode(String.fromCharCode(13))), cerrar: () => ws.close(), listo: new Promise((r) => (ws.onopen = r)) };
}
async function hasta(cond, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { if (cond()) return true; await espera(250); } return false; }

let problemas = 0;
for (const [lab, sol] of Object.entries(S)) {
  if (process.argv[2] && lab !== process.argv[2]) continue;
  const info = await post(`/api/labs/${lab}/sesion`);
  const c = (n) => `dl-${info.instancia}-${n}`;
  const e = escuchar(info.sesion); await e.listo;
  const t = terminal(info.sesion, info.lab.terminales[0]); await t.listo;
  await espera(1000); // que su bash arranque antes que la del alumno simulado
  if (sol.cwd) {
    // Una bash "del alumno" que cambia de carpeta de verdad, para las comprobaciones de cwd.
    sh(c('lab'), `cat > /tmp/alumno.sh <<'EOF'
cd /root/casa; sleep 4; cd /root/casa/documentos; sleep 4; cd /root/casa; sleep 1
mkdir /root/casa/proyectos; touch /root/casa/proyectos/idea.txt; cp documentos/nota.txt proyectos/; mv musica/cancion.mp3 musica/favorita.mp3; rm basura.tmp
cd /root/enlaces; ln original.txt duro.txt; ln -s original.txt atajo.txt; sleep 3; rm original.txt
printf '%s\\n' 'cat nota.txt' 'cd ..' "find /root/casa -name '*.log'" 'du -sh /root/casa/*' >> /root/.bash_history
sleep 30
EOF
setsid nohup bash -i /tmp/alumno.sh >/dev/null 2>&1 &`);
  }
  for (const etapa of sol.etapas) {
    for (const [n, cmd] of etapa) {
      if (cmd.startsWith('accion:')) await post(`/api/sesion/${info.sesion}/accion/${cmd.slice(7)}`);
      else sh(c(n), cmd);
    }
    t.enter();
    await espera(3500);
  }
  const ids = info.lab.mision.map((p) => p.id);
  await hasta(() => ids.every((id) => e.ev.some((x) => x.t === 'paso' && x.id === id)), sol.cwd ? 20000 : 10000);
  const faltan = ids.filter((id) => !e.ev.some((x) => x.t === 'paso' && x.id === id));
  const sondasVistas = new Set([...Object.keys(info.sondas ?? {}), ...e.ev.filter((x) => x.t === 'sonda').map((x) => x.id)]);
  const sinSonda = sol.sondas.filter((s) => !sondasVistas.has(s));
  const ult = (id) => [...e.ev].reverse().find((x) => x.t === 'sonda' && x.id === id)?.v?.trim().slice(0, 70).replace(/\n/g, ' ⏎ ');
  let boss = '';
  for (const [f, cmd] of Object.entries(sol.boss ?? {})) {
    const s2 = await post(`/api/labs/${lab}/sesion`);
    const e2 = escuchar(s2.sesion); await e2.listo;
    await post(`/api/sesion/${s2.sesion}/boss?fallo=${f}`);
    await espera(2500);
    const pre = e2.ev.some((x) => x.t === 'boss' && x.hecho);
    sh(`dl-${s2.instancia}-${info.lab.terminales[0]}`, cmd);
    const ok = await hasta(() => e2.ev.some((x) => x.t === 'boss' && x.hecho));
    boss += ` ${f}:${pre ? 'PREMATURO' : ok ? 'ok' : 'NO'}`;
    if (pre || !ok) problemas++;
    e2.cerrar(); fetch(`${API}/api/sesion/${s2.sesion}`, { method: 'DELETE' });
  }
  if (faltan.length || sinSonda.length) problemas++;
  console.log(`${lab}: misión ${ids.length - faltan.length}/${ids.length}${faltan.length ? ' FALTAN ' + faltan : ''} · sondas ${sol.sondas.length - sinSonda.length}/${sol.sondas.length}${sinSonda.length ? ' SIN ' + sinSonda : ''}${boss ? ' · boss' + boss : ''}`);
  for (const s of sol.sondas.slice(0, 3)) console.log(`     ${s} = ${ult(s) ?? JSON.stringify((info.sondas ?? {})[s] ?? '').slice(0, 70)}`);
  e.cerrar(); t.cerrar();
  fetch(`${API}/api/sesion/${info.sesion}`, { method: 'DELETE' });
}
console.log(problemas ? `${problemas} problemas` : 'TODO OK');
