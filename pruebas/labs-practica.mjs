// Uso: node pruebas/labs-practica.mjs [lab]   (labd en marcha en la distro relavops-m6, puerto 8080)
// Prueba de punta a punta: resuelve cada misión y cada fallo de boss dentro del lab real.
import { spawnSync } from 'node:child_process';
import { distro } from './distro.mjs';
const API = process.env.LABD ?? 'http://localhost:8080'; // LABD=http://localhost:8090 para otro puerto
const sh = (c, cmd) => {
  const r = spawnSync('wsl.exe', ['-d', distro(), '-u', 'root', '--', 'docker', 'exec', '-i', c, 'bash'], { encoding: 'utf8', input: cmd });
  return (r.stdout + r.stderr).trim();
};
const post = async (u) => { const r = await fetch(API + u, { method: 'POST' }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const S = {
  'n0-3-maquina': {
    mision: [[`responde kernel $(uname -r); . /etc/os-release; responde distro $ID; responde cpus $(nproc); responde ram $(free -m | awk '/Mem:/{print $2}'); responde pid1 $(ps -p 1 -o comm=); responde trabajadores $(pgrep -xc trabajador)`]],
    boss: { cpu: 'pkill -f kworker-u8', ram: 'pkill -f systemd-cache', hijos: 'pkill -f dbus-monitor-d; sleep 0.2; pkill -x yes' },
  },
  // Con varias máquinas, un comando puede ir como [nodo, comando]. Si no, va a la primera terminal.
  'n0-4-red': {
    mision: [['responde ip 10.0.5.10; responde muda 10.0.5.77', ['tienda', 'responde puerta $(cat /run/.puerto)'], ['datos', 'setsid nohup nc -lk 7000 >/dev/null 2>&1 & sleep 0.5'], 'sleep 1; nc -zv -w2 10.0.5.34 7000']],
    boss: {
      caida: ['tienda', 'setsid nohup tienda-web 80 >/dev/null 2>&1 &'],
      puerto: ['tienda', `kill $(ps -eo pid=,args= | awk '$2 == "tienda-web" {print $1}'); sleep 0.3; setsid nohup tienda-web 80 >/dev/null 2>&1 &`],
    },
  },
  'n0-1-shell': {
    mision: [[`desbloquea --codigo $(cat /run/.codigo); responde clave $(grep -o 'es: .*' /srv/proyectos/cliente-acme/informes-trimestrales-2026/*/clave.txt | cut -d' ' -f2); timeout -s INT 2 cuenta-atras; setsid nohup compilar >/dev/null 2>&1 & echo bg >> /root/.bash_history; PYTHONSTARTUP=/etc/pystart.py python3 -i </dev/null`], ['echo "kill %1" >> /root/.bash_history; pkill -f /usr/local/bin/compilar']],
    boss: {
      less: `responde palabra $(grep -o 'palabra=.*' /var/log/servicio.log | cut -d= -f2)`,
      vim: `responde palabra $(grep -o 'palabra=.*' /etc/heredada.conf | cut -d= -f2)`,
      follow: `sleep 5; responde palabra $(grep -m1 -o 'palabra=.*' /var/log/vivo.log | cut -d= -f2)`,
    },
  },
  'n0-2-ficheros': {
    mision: [[`mkdir -p ~/web/{css,js,img}; mv ~/descargas/*.jpg ~/web/img/; ln -s /root/web /root/sitio; ln /srv/config/app.conf /root/app.conf; responde inodo $(stat -c %i /srv/config/app.conf); responde grande $(find /srv/archivo -size +5M -printf %f)`]],
    boss: { oculto: 'rm -rf /datos/informes/.cache', muchos: 'rm -rf /datos/sesiones', borrado: 'pkill -f exportador' },
  },
  'n0-5-permisos': {
    mision: [[`chmod 755 /opt/app/arranca.sh; chmod 600 /root/nominas.csv; chown ana:equipo /srv/web/index.html; chgrp equipo /srv/equipo && chmod 2770 /srv/equipo; chmod 1777 /srv/compartido; responde shadow $(stat -c %a /etc/shadow)`]],
    boss: { directorio: 'chmod 755 /opt/backup', script: 'chgrp copias /opt/backup/backup.sh && chmod 750 /opt/backup/backup.sh', destino: 'chown copias /var/backups/app' },
  },
  'n0-6-tuberias': {
    mision: [[`L=/var/log/nginx/access.log; responde 404 $(awk '$9==404' $L | wc -l); responde ip $(cut -d' ' -f1 $L|sort|uniq -c|sort -rn|head -1|awk '{print $2}'); cut -d' ' -f1 $L|sort|uniq -c|sort -rn|head -10 > ~/top10.txt; sincroniza 2> ~/errores.log >/dev/null; responde admins $(jq '[.[]|select(.rol=="admin" and .activo)]|length' /srv/usuarios.json)`]],
    boss: {
      combined: `responde atacante $(awk '$7=="/login" && $9==401 {print $1}' /var/log/nginx/auth.log | sort|uniq -c|sort -rn|head -1|awk '{print $2}')`,
      json: `responde atacante $(jq -r 'select(.ruta=="/login" and .estado==401)|.ip' /var/log/app/eventos.jsonl | sort|uniq -c|sort -rn|head -1|awk '{print $2}')`,
      rotado: `responde atacante $(zcat /var/log/nginx/access.log.2.gz | awk '$7=="/login" && $9==401 {print $1}' | sort|uniq -c|sort -rn|head -1|awk '{print $2}')`,
    },
  },
  'n0-7-regex': {
    mision: [[`cd /srv; responde errores $(grep -c '^ERROR' logs/app.log); grep -oE '[a-z0-9._]+@[a-z]+\\.[a-z]+' logs/app.log | sort -u > ~/emails.txt; responde ips $(grep -oE '([0-9]{1,3}\\.){3}[0-9]{1,3}' logs/app.log | sort -u | wc -l); sed -i 's#http://#https://#g' web/enlaces.txt; sed -E -i 's#([0-9]{2})/([0-9]{2})/([0-9]{4})#\\3-\\2-\\1#' fechas.txt`]],
    boss: {
      emails: `sed -E -i 's/[a-z0-9._]+@[a-z]+\\.[a-z]+/[email]/g' /srv/logs/soporte.log`,
      dni: `sed -E -i -e 's/\\b[0-9]{8}[A-Z]\\b/[dni]/g' -e 's/\\b[67][0-9]{2} [0-9]{3} [0-9]{3}\\b/[tel]/g' /srv/logs/soporte.log`,
      tarjetas: `sed -E -i 's/[0-9]{4} [0-9]{4} [0-9]{4} ([0-9]{4})/**** **** **** \\1/g' /srv/logs/soporte.log`,
    },
  },
  'n0-8-vim': {
    mision: [[`cd ~/vim; printf 'Hola mundo, esto es vim.\\n' > saludo.txt; sed -i '/BORRAR/d' lista.txt; sed -i 's/localhost/db.interna/g' config.ini; echo '10.0.0.50 cache' >> hosts.txt; cat servidores.ini servidores.ini > t && mv t servidores.ini`]],
    boss: Object.fromEntries(['json-coma', 'json-tipos', 'ini'].map((f) => [f, `printf '{"nombre":"tienda","puerto":8080,"debug":false,"backends":["a","b","c"]}' > /etc/app/config.json; printf '[servidor]\\nworkers = 4\\n[log]\\nnivel = info\\n' > /etc/app/app.ini`])),
  },
  'n0-9-scripts': {
    mision: [[`cd /root
printf '#!/bin/bash\\necho "Hola, \${1:-mundo}"\\n' > saluda.sh
printf '#!/bin/bash\\n(( $1 %% 2 == 0 ))\\n' > par.sh
printf '#!/bin/bash\\nn=0; for f in "$1"/*.log; do [ -e "$f" ] && n=$((n+1)); done; echo $n\\n' > cuenta.sh
printf '#!/bin/bash\\ntr a-z A-Z\\n' > mayusculas.sh
printf '#!/bin/bash\\nsuma() { local t=0; for n in "$@"; do t=$((t+n)); done; echo $t; }\\nsuma "$@"\\n' > suma.sh
chmod +x *.sh; prueba`]],
    boss: Object.fromEntries(['comillas', 'rotacion', 'silencio'].map((f) => [f, `cat > /root/backup.sh <<'EOF'
#!/bin/bash
set -euo pipefail
ORIGEN="/srv/mis datos"; DESTINO=/backups; MAX=5
[[ -d "$ORIGEN" ]] || { echo "no existe $ORIGEN" >&2; exit 1; }
mkdir -p "$DESTINO"
tar czf "$DESTINO/backup-$(date +%Y%m%d-%H%M%S-%N).tar.gz" -C "$ORIGEN" .
ls "$DESTINO"/backup-*.tar.gz | sort | head -n -"$MAX" | xargs -r rm -f
EOF
prueba-backup`])),
  },
  'n0-10-git': {
    mision: [[`git clone -q /srv/git/web.git ~/web && cd ~/web && echo '<p>Tel: 900 100 200</p>' >> index.html && git commit -qam "Añade el teléfono" && git switch -qc contacto && echo '<h1>Contacto</h1>' > contacto.html && git add . && git commit -qm "Página de contacto" && git switch -q main && git merge -q contacto && git push -q origin main`]],
    boss: {
      conflicto: `cd ~/web; git pull -q 2>&1; printf '<h1>Tienda</h1>\\n<p>Horario: lunes a viernes, 9:00-18:00</p>\\n<p>Tel: 900 100 200</p>\\n' > index.html; git add index.html; git commit -qm "Junta horario"; git push -q origin main`,
      secreto: `cd ~/web; git rm -q --cached .env; echo .env >> .gitignore; git add .gitignore; git commit -q --amend --no-edit`,
      'rama-equivocada': `cd ~/web; git branch hotfix; git reset -q --hard origin/main`,
    },
  },
};

function escuchar(sesion) {
  const ev = [];
  const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/ws/eventos?s=${sesion}`);
  ws.onmessage = (m) => ev.push(JSON.parse(m.data));
  return { ev, cerrar: () => ws.close(), listo: new Promise((r) => (ws.onopen = r)) };
}
async function hasta(cond, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { if (cond()) return true; await espera(200); } return false; }

const solo = process.argv[2];
let fallosTotal = 0;
for (const [lab, sol] of Object.entries(S)) {
  if (solo && lab !== solo) continue;
  // Misión
  const info = await post(`/api/labs/${lab}/sesion`);
  const c = (n) => `dl-${info.instancia}-${n}`;
  const nodo = info.lab.terminales[0];
  const e = escuchar(info.sesion); await e.listo;
  const en = (cont, cmd) => (Array.isArray(cmd) ? sh(cont(cmd[0]), cmd[1]) : sh(cont(nodo), cmd));
  for (const etapa of sol.mision) { for (const cmd of etapa) en(c, cmd); await espera(5000); }
  const ids = info.lab.mision.map((p) => p.id);
  await hasta(() => ids.every((id) => e.ev.some((x) => x.t === 'paso' && x.id === id)));
  if (process.env.DBG) console.log(e.ev.map((x) => x.t + ":" + x.id).join(" "), sh(c(nodo), "tail -3 /root/.bash_history; pgrep -af compilar"));
  const faltan = ids.filter((id) => !e.ev.some((x) => x.t === 'paso' && x.id === id));
  // Antes de resolver, ningún boss debe darse por vencido solo.
  const res = [];
  for (const [f, cmd] of Object.entries(sol.boss)) {
    const s2 = await post(`/api/labs/${lab}/sesion`);
    const c2 = (n) => `dl-${s2.instancia}-${n}`;
    const e2 = escuchar(s2.sesion); await e2.listo;
    for (const etapa of sol.mision) { for (const k of etapa) en(c2, k); }
    await post(`/api/sesion/${s2.sesion}/boss?fallo=${f}`);
    await espera(3000);
    const prematuro = e2.ev.some((x) => x.t === 'boss' && x.hecho);
    const out = en(c2, cmd);
    const ok = await hasta(() => e2.ev.some((x) => x.t === 'boss' && x.hecho), 15000);
    res.push(`${f}:${prematuro ? 'PREMATURO' : ok ? 'ok' : 'NO'}`);
    if (!ok || prematuro) { fallosTotal++; console.log(`   [${lab}/${f}] salida: ${out.slice(-400)}`); }
    e2.cerrar();
    fetch(`${API}/api/sesion/${s2.sesion}`, { method: 'DELETE' });
  }
  if (faltan.length) fallosTotal++;
  console.log(`${lab}: misión ${ids.length - faltan.length}/${ids.length}${faltan.length ? ' FALTAN ' + faltan : ''} · boss ${res.join(' ')}`);
  e.cerrar();
  fetch(`${API}/api/sesion/${info.sesion}`, { method: 'DELETE' });
}
console.log(fallosTotal ? `${fallosTotal} problemas` : 'TODO OK');
