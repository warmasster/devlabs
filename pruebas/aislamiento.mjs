// Uso: node pruebas/aislamiento.mjs [lab]   (labd en marcha en la distro relavops-m6, puerto 8080)
// Comprueba que cada tipo de lab está aislado. Abre un lab de cada tipo, intenta escaparse desde dentro
// como haría un alumno con malas ideas (root en su lab) y lo cierra. Cada intento tiene que fallar.
//
// Para las pruebas de tope de fichero y de disco, labd tiene que ir con topes pequeños:
//   labd ... -cgroup-labs relavops-labs.slice -tope-fichero 200M -disco-lab 400M
// Sin ellos esas dos pruebas se saltan.
import { spawnSync } from 'node:child_process';
import { distro } from './distro.mjs';

const API = process.env.LABD ?? 'http://localhost:8080'; // LABD=http://localhost:8090 para otro puerto
const D = distro();
const wsl = (args, input) => {
  const r = spawnSync('wsl.exe', ['-d', D, '-u', 'root', '--', ...args], { encoding: 'utf8', input, maxBuffer: 1 << 26 });
  return { out: (r.stdout + r.stderr).trim(), code: r.status };
};
// Ejecuta un script de bash dentro de un nodo. Devuelve la salida y el código.
const en = (ctr, script) => wsl(['docker', 'exec', '-i', ctr, 'bash'], script);
const inspect = (ctr) => JSON.parse(wsl(['docker', 'inspect', ctr]).out)[0];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const abrir = async (lab) => {
  const r = await fetch(`${API}/api/labs/${lab}/sesion`, { method: 'POST' });
  const j = await r.json();
  if (!r.ok) throw new Error(`${lab}: ${j.error}`);
  return j;
};
const cerrar = (sid) => fetch(`${API}/api/sesion/${sid}`, { method: 'DELETE' }).catch(() => {});

let fallos = 0;
let pasan = 0;
const ok = (lab, que, bien, detalle = '') => {
  if (bien) pasan++;
  else fallos++;
  console.log(`${bien ? '  ✓' : '  ✗'} ${que}${!bien && detalle ? `\n      ${String(detalle).split('\n').slice(0, 4).join('\n      ')}` : ''}`);
};

// Capacidades que nunca debe tener un nodo (fuera de Sysbox, donde van en su propio espacio de usuarios).
const PELIGROSAS = { 1: 'DAC_READ_SEARCH', 16: 'SYS_MODULE', 17: 'SYS_RAWIO', 19: 'SYS_PTRACE', 21: 'SYS_ADMIN', 25: 'SYS_TIME', 34: 'SYSLOG', 37: 'BPF', 38: 'PERFMON' };
// Las IP del servidor (WSL o VPS): ningún lab debe llegar a ellas.
const IPS_SERVIDOR = wsl(['hostname', '-I']).out.split(/\s+/).filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
const flags = wsl(['sh', '-c', 'tr "\\0" " " < /proc/$(pgrep -xo labd)/cmdline']).out;
const conTopes = /-tope-fichero/.test(flags) && /-disco-lab/.test(flags);
const conSlice = /-cgroup-labs/.test(flags);

// Lo que se mira desde fuera, con docker inspect.
function desdeFuera(lab, ctr, sistema) {
  const i = inspect(ctr);
  const h = i.HostConfig;
  ok(lab, `${ctr}: sin --privileged`, h.Privileged === false);
  ok(lab, `${ctr}: tope de memoria sin swap`, h.Memory > 0 && h.MemorySwap === h.Memory, `memoria ${h.Memory} swap ${h.MemorySwap}`);
  ok(lab, `${ctr}: tope de procesos`, h.PidsLimit > 0 && h.PidsLimit <= 4096, `pids ${h.PidsLimit}`);
  ok(lab, `${ctr}: tope de CPU`, h.NanoCpus > 0, `cpus ${h.NanoCpus}`);
  ok(lab, `${ctr}: sin logs en el disco del servidor`, h.LogConfig?.Type === 'none', h.LogConfig?.Type);
  ok(lab, `${ctr}: sin dispositivos del servidor`, !(h.Devices ?? []).length, JSON.stringify(h.Devices));
  const peligrosas = (h.CapAdd ?? []).filter((c) => /SYS_ADMIN|SYS_MODULE|SYS_PTRACE|SYS_RAWIO|DAC_READ_SEARCH|ALL/.test(c));
  ok(lab, `${ctr}: sin capacidades peligrosas añadidas`, !peligrosas.length, peligrosas.join(','));
  const montajes = (i.Mounts ?? []).filter((m) => m.Type === 'bind' && !m.Source.startsWith('/var/lib/relavops/inst/'));
  ok(lab, `${ctr}: no monta nada del servidor`, !montajes.length, montajes.map((m) => m.Source).join(', '));
  // Ninguno va en una red de Docker. Los que tienen red propia van a un switch suyo (ver redPropia en pool.go).
  ok(lab, `${ctr}: sin red de Docker (${h.NetworkMode})`, h.NetworkMode === 'none');
  if (conSlice) ok(lab, `${ctr}: dentro del cgroup común de los labs`, h.CgroupParent === 'relavops-labs.slice', h.CgroupParent);
  if (conTopes) ok(lab, `${ctr}: tope de tamaño de fichero`, (h.Ulimits ?? []).some((u) => u.Name === 'fsize'), JSON.stringify(h.Ulimits));
  if (sistema) ok(lab, `${ctr}: Sysbox (espacio de usuarios propio)`, h.Runtime === 'sysbox-runc', h.Runtime);
}

// Lo que se intenta desde dentro, como root del lab.
function desdeDentro(lab, ctr, { sistema = false, memoria = 256, redPropia = false } = {}) {
  let r;
  if (sistema) {
    r = en(ctr, 'head -1 /proc/self/uid_map');
    const [dentro, fuera] = r.out.trim().split(/\s+/).map(Number);
    ok(lab, 'root de dentro no es root del servidor', dentro === 0 && fuera > 0, r.out);
  } else {
    r = en(ctr, 'grep CapEff /proc/self/status');
    const caps = BigInt('0x' + (r.out.split(/\s+/)[1] ?? '0'));
    const tiene = Object.entries(PELIGROSAS).filter(([b]) => (caps >> BigInt(b)) & 1n).map(([, n]) => n);
    ok(lab, 'sin capacidades peligrosas dentro', !tiene.length, `tiene ${tiene.join(', ')} (${r.out})`);
    r = en(ctr, 'mount -t tmpfs prueba /mnt 2>&1; echo "codigo=$?"');
    ok(lab, 'no puede montar', !/codigo=0/.test(r.out), r.out);
    r = en(ctr, 'unshare -Ur true 2>&1; echo "codigo=$?"');
    ok(lab, 'no puede crear espacios de nombres', !/codigo=0/.test(r.out), r.out);
    r = en(ctr, 'modprobe dummy 2>&1; echo "codigo=$?"');
    ok(lab, 'no puede cargar módulos del kernel', !/codigo=0/.test(r.out), r.out);
  }
  r = en(ctr, 'ls /dev/sd? /dev/vd? /dev/nvme?n? /dev/xvd? /dev/mapper/* 2>/dev/null | grep -v control | wc -l');
  ok(lab, 'no ve los discos del servidor', r.out.trim() === '0', r.out);
  r = en(ctr, 'mknod /tmp/disco b 8 0 2>/dev/null; head -c1 /tmp/disco >/dev/null 2>&1 && echo LEE || echo NO; rm -f /tmp/disco');
  ok(lab, 'no puede leer un disco creando su dispositivo', /NO/.test(r.out), r.out);
  r = en(ctr, 'test -S /var/run/docker.sock && docker -H unix:///var/run/docker.sock ps -a --format "{{.Names}}" 2>/dev/null | grep -c "^dl-" || echo 0');
  ok(lab, 'no llega al Docker del servidor', r.out.trim().split('\n').pop() === '0', r.out);
  r = en(ctr, 'echo 1 > /proc/sys/kernel/sysrq 2>&1; echo c > /proc/sysrq-trigger 2>&1; echo "codigo=$?"');
  ok(lab, 'no puede tocar el kernel por /proc', !/codigo=0/.test(r.out), r.out);
  r = en(ctr, 'cat /proc/1/root/etc/hostname 2>/dev/null; ls /var/lib/relavops /etc/relavops 2>&1 | head -2');
  ok(lab, 'no ve ficheros del servidor', !/labd\.env|inst|publico/.test(r.out), r.out);

  // Red: ni Internet ni el servidor.
  r = en(ctr, 'for d in 1.1.1.1:443 8.8.8.8:53 140.82.112.3:443; do timeout 3 bash -c "</dev/tcp/${d%:*}/${d#*:}" 2>/dev/null && echo "SALE $d"; done; ping -c1 -W2 1.1.1.1 >/dev/null 2>&1 && echo "SALE ping"; echo fin');
  ok(lab, 'sin salida a Internet', !/SALE/.test(r.out), r.out);
  r = en(ctr, 'getent hosts github.com example.com 2>/dev/null; echo fin');
  ok(lab, 'sin DNS de fuera', r.out.trim() === 'fin', r.out);
  const puertas = ['22', '80', '443', '8080', '2375'];
  // Con red propia, la .1 de su subred es el bridge del servidor. En las topologías, la .1 es otro nodo del lab.
  const gw = !redPropia ? [] : en(ctr,"ip -4 -o addr show 2>/dev/null | awk '$2!=\"lo\"{print $4}' | sed 's#\\.[0-9]*/.*#.1#'").out.split('\n').filter(Boolean);
  const destinos = [...new Set([...IPS_SERVIDOR, ...gw])];
  r = en(ctr, `for ip in ${destinos.join(' ')}; do for p in ${puertas.join(' ')}; do timeout 2 bash -c "</dev/tcp/$ip/$p" 2>/dev/null && echo "LLEGA $ip:$p"; done; ping -c1 -W1 $ip >/dev/null 2>&1 && echo "PING $ip"; done; echo fin`);
  ok(lab, `no llega al servidor (${destinos.join(', ')})`, !/LLEGA|PING/.test(r.out), r.out);

  // Topes: procesos y memoria.
  // Con sh (dash): si fork falla, para en el acto. bash reintenta cada fork fallido durante medio minuto.
  r = en(ctr, `sh -c 'i=0; while [ $i -lt 5000 ]; do sleep 20 & i=$((i+1)); done' 2>/dev/null; n=$(ls /proc | grep -c "^[0-9]"); pkill -x sleep; echo "procesos=$n"`);
  const n = Number(/procesos=(\d+)/.exec(r.out)?.[1] ?? 9999);
  ok(lab, `una bomba de procesos se queda en el tope (${n})`, n <= 4096, r.out.slice(-200));
  en(ctr, 'pkill -x sleep; true');
  r = en(ctr, `head -c ${memoria * 2}m /dev/zero | tail > /dev/null; echo "codigo=$?"`);
  ok(lab, `comerse ${memoria * 2} MB de RAM lo mata el tope`, /codigo=137/.test(r.out), r.out);
  if (conTopes) {
    r = en(ctr, 'fallocate -l 300M /root/enorme 2>&1; echo "codigo=$?"; rm -f /root/enorme');
    ok(lab, 'un fichero de 300 MB pasa del tope de fichero', !/codigo=0/.test(r.out), r.out);
  }
}

const SISTEMA = new Set(['j-contenedores']);
const MEMORIA = { 'j-contenedores': 1024, 'n0-4a-red': 192, 'j-disco': 512, 'n0-3a-cuerpo': 512, 'n0-2-ficheros': 320 };
// Uno de cada tipo: contenedor sin red, red propia, topologías (base, FRR, juego) y Sysbox.
const LABS = ['n0-0-tutorial', 'n0-4a-red', 'm2-ping', 'm3-routing', 'j-asedio', 'j-disco', 'j-contenedores'];
const solo = process.argv[2];

for (const lab of LABS.filter((l) => !solo || l === solo)) {
  console.log(`\n# ${lab}`);
  let s;
  try {
    s = await abrir(lab);
  } catch (e) {
    ok(lab, 'se abre', false, e.message);
    continue;
  }
  const nodos = s.lab.motor === 'topologia' ? Object.keys(s.interfaces ?? {}) : (s.lab.nodos ?? []).map((n) => n.nombre);
  const ctrs = nodos.map((n) => `dl-${s.instancia}-${n}`);
  for (const c of ctrs) desdeFuera(lab, c, SISTEMA.has(lab));
  if (SISTEMA.has(lab)) {
    // Docker dentro de Sysbox: funciona, con alpine cargada sin Internet, y no ve los del servidor.
    const c = ctrs[0];
    let r = en(c, 'for i in $(seq 60); do docker info >/dev/null 2>&1 && break; sleep 0.5; done; docker load -q -i /opt/relavops/alpine.tar >/dev/null && docker run --rm alpine echo funciona 2>&1');
    ok(lab, 'Docker de dentro funciona sin Internet', /funciona/.test(r.out), r.out);
    r = en(c, 'docker pull -q busybox 2>&1; echo "codigo=$?"');
    ok(lab, 'Docker de dentro no baja nada de Internet', !/codigo=0/.test(r.out), r.out.slice(-200));
    r = en(c, 'docker ps -a --format "{{.Names}}" | grep -c "^dl-" || true');
    ok(lab, 'Docker de dentro no ve los labs del servidor', r.out.trim() === '0', r.out);
  }
  desdeDentro(lab, ctrs[0], { sistema: SISTEMA.has(lab), memoria: MEMORIA[lab] ?? 256, redPropia: !!s.lab.red });

  // Que el lab sigue funcionando con estos permisos.
  if (lab === 'm2-ping') {
    const r = en(ctrs.find((c) => c.endsWith('-h1')), 'ping -c1 -W2 10.0.2.10 >/dev/null && echo PING; timeout 3 tcpdump -c1 -nn -i eth1 icmp >/dev/null 2>&1 & sleep 0.5; ping -c1 -W1 10.0.2.10 >/dev/null; wait && echo TCPDUMP');
    ok(lab, 'h1 llega a h2 por r1 y tcpdump captura', /PING/.test(r.out) && /TCPDUMP/.test(r.out), r.out);
  }
  if (lab === 'm3-routing') {
    const r = en(ctrs.find((c) => c.endsWith('-r1')), 'vtysh -c "show version" >/dev/null && echo FRR; pgrep -x ospfd >/dev/null && echo OSPF; ip -br link show eth1 eth2');
    ok(lab, 'FRR y OSPF arrancan sin --privileged', /FRR/.test(r.out) && /OSPF/.test(r.out) && /eth2/.test(r.out), r.out);
  }
  if (lab === 'j-asedio') {
    const r = en(ctrs.find((c) => c.endsWith('-servidor')), 'iptables -A INPUT -s 10.8.1.2 -j DROP && iptables -S | grep -c DROP && tc qdisc replace dev eth1 root netem delay 10ms && echo TC && ping -c1 -W2 10.8.1.2 >/dev/null; iptables -F; ping -c1 -W2 10.8.1.2 >/dev/null && echo RED');
    ok(lab, 'iptables, tc netem y su red funcionan', /TC/.test(r.out) && /RED/.test(r.out), r.out);
  }
  if (lab === 'n0-4a-red') {
    // Dos instancias del mismo lab, con la misma subred: cada una ve solo sus máquinas.
    let otra;
    try {
      otra = await abrir(lab);
      const macWeb = en(`dl-${s.instancia}-web`, 'cat /sys/class/net/eth0/address').out.trim();
      const macOtra = en(`dl-${otra.instancia}-web`, 'cat /sys/class/net/eth0/address').out.trim();
      const r = en(`dl-${s.instancia}-tu-pc`, 'ping -c1 -W2 10.0.0.20 >/dev/null; ip neigh show 10.0.0.20');
      ok(lab, 'dos alumnos con el mismo lab no se ven entre ellos', r.out.includes(macWeb) && !r.out.includes(macOtra), `${r.out} · suya ${macWeb} · la otra ${macOtra}`);
    } catch (e) {
      ok(lab, 'se abren dos a la vez (misma subred)', false, e.message);
    }
    if (otra) await cerrar(otra.sesion);
  }

  // El disco: tres ficheros de 150 MB (cada uno cabe en el tope de fichero) pasan del tope del lab.
  if (conTopes && lab === 'n0-0-tutorial') {
    en(ctrs[0], 'for i in 1 2 3; do fallocate -l 150M /root/relleno$i; done; true');
    let cerrada = false;
    for (let t = 0; t < 45 && !cerrada; t++) {
      await espera(1000);
      cerrada = (await fetch(`${API}/api/sesion/${s.sesion}`)).status === 404;
    }
    ok(lab, 'un lab que llena 450 MB de disco se cierra solo', cerrada);
    if (cerrada) await espera(3000);
    const sigue = wsl(['docker', 'ps', '-a', '--format', '{{.Names}}']).out.split('\n').some((n) => n === ctrs[0]);
    ok(lab, 'y su disco se libera', !sigue);
    continue;
  }
  await cerrar(s.sesion);
}

await espera(4000);
const restos = wsl(['sh', '-c', "ip -o link show | grep -c ' v[0-9a-f]\\{8\\}[0-9]*[abns]' || true"]).out.trim();
console.log('\n# servidor');
ok('servidor', 'no quedan cables veth de los labs en el servidor', restos === '0', restos);
// Los switches de las instancias vivas (el pool) no tienen IP: no son una puerta al servidor.
const conIP = wsl(['sh', '-c', 'for n in $(ip netns list | cut -d" " -f1 | grep ^dlsw); do ip -n $n -4 -o addr show | grep -v " lo "; done; true']).out.trim();
ok('servidor', 'los switches de los labs no tienen IP', conIP === '', conIP);
console.log(`\n${pasan} bien, ${fallos} mal`);
process.exit(fallos ? 1 : 0);
