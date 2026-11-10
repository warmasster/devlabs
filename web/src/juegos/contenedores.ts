// Nivel 4 · Contenedores rebeldes: Docker dentro de un contenedor de sistema (Sysbox).
// El boss lanza contenedores que se portan mal; que no se derrita el host.
import type { Juego } from './motor';

const H = 'host';
const REBELDES = [
  { nombre: 'minero', aviso: 'un contenedor <b>minero</b> se come la CPU.', run: "docker run -d --name minero alpine sh -c 'while :; do :; done'", pista: '<code>docker stats</code> te dice quién gasta. <code>docker rm -f</code> o <code>docker update --cpus 0.2</code>.' },
  { nombre: 'tragón', aviso: 'un contenedor <b>tragón</b> no para de pedir memoria.', run: "docker run -d --name tragon alpine sh -c 'head -c 450m /dev/zero | tail'", pista: 'Mira la columna MEM de <code>docker stats</code>. <code>docker update --memory 64m --memory-swap 64m tragon</code> o fuera.' },
  { nombre: 'zombi', aviso: 'un <b>zombi</b> se reinicia una y otra vez (restart: always).', run: "docker run -d --name zombi --restart always alpine sh -c 'sleep 1; exit 1'", pista: '<code>docker ps</code>: «Restarting». <code>docker update --restart no zombi</code> y luego <code>docker rm -f zombi</code>.' },
];
let siguiente = 0, hechos = 0, sano = 0;

const juego: Juego = {
  id: 'contenedores',
  lab: 'j-contenedores',
  titulo: 'Contenedores rebeldes',
  nivel: 'Examen final · Nivel 4 · Contenedores',
  resumen: 'Docker dentro de Sysbox. Mineros, tragones y zombis: que no se derrita el host.',
  reglas: `<p>Eres el admin de <b>host</b>, una máquina con Docker. El boss va a lanzar contenedores que se portan fatal.</p>
    <ul><li>«ic:thermometer» La <b>temperatura</b> del host sale de la CPU y la RAM que gastan los contenedores. Si pasa de 80, pierdes vida.</li>
    <li>«ic:biohazard» Cada rebelde se neutraliza de una forma (o a la fuerza).</li>
    <li>«ic:trophy» Neutraliza a los 3 y aguanta 20 s fresquito.</li></ul>
    <p>Herramientas: <code>docker ps -a</code>, <code>docker stats</code>, <code>docker rm -f</code>, <code>docker update</code>.</p>`,
  mapa: { nodos: { host: { x: 450, y: 160, sub: 'docker' } }, enlaces: [], alto: 300 },
  terminales: [H],
  tickMs: 2000,

  async iniciar(api) {
    // Docker dentro de Sysbox tarda un par de segundos en estar listo.
    // El lab no tiene Internet: alpine viene guardada en la imagen (imagenes/dind) y se carga aquí.
    await api.ex(H, 'for i in $(seq 40); do docker info >/dev/null 2>&1 && break; sleep 0.5; done; docker load -q -i /opt/relavops/alpine.tar >/dev/null; true');
    await api.ex(H, "printf 'host · Docker dentro de un contenedor de sistema (Sysbox)\\n' > /etc/motd");
    api.icono('yo', '«ic:user-round»', H);
    siguiente = 6;
  },

  async tick(api) {
    const r = await api.ex(H, "docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' 2>/dev/null; echo '|'; docker ps -a --format '{{.Names}} {{.Status}}'");
    const [stats, ps] = r.out.split('|');
    let cpu = 0, mem = 0;
    for (const l of stats.trim().split('\n').filter(Boolean)) {
      const [, c, m] = l.split(/\s+/);
      cpu += parseFloat(c) || 0;
      const mm = /([\d.]+)(GiB|MiB|KiB|B)/.exec(m ?? '');
      if (mm) mem += parseFloat(mm[1]) * ({ GiB: 1024, MiB: 1, KiB: 1 / 1024, B: 1 / 1048576 } as any)[mm[2]];
    }
    const temp = Math.min(100, cpu * 0.6 + mem / 6); // el tragón (450 MiB) solo ya la pone en 75
    api.medidor('temp', '«ic:thermometer» Temperatura', temp, temp > 80 ? 'var(--mal)' : temp > 50 ? 'var(--aviso)' : 'var(--ok)', `${Math.round(temp)}°`);
    api.medidor('cpu', '«ic:cog» CPU', Math.min(100, cpu), 'var(--acento)', `${Math.round(cpu)} %`);
    api.medidor('ram', '«ic:brain» RAM', Math.min(100, mem / 5), 'var(--xp)', `${Math.round(mem)} MiB`);
    api.etiquetaNodo(H, `${Math.round(temp)}°`);
    api.claseNodo(H, 'mal', temp > 80);
    if (temp > 80) { api.danio(api.dificultad === 'facil' ? 3 : 6); sano = 0; } else sano++;

    // Estado de cada rebelde: vivo y dando guerra, o neutralizado.
    const lineas = ps.trim().split('\n');
    for (const [i, rb] of REBELDES.entries()) {
      if (i >= hechos) continue;
      const l = lineas.find((x) => x.startsWith(rb.nombre === 'tragón' ? 'tragon ' : `${rb.nombre} `));
      const malo = !!l && (rb.nombre === 'zombi' ? /Restarting|Up/.test(l) : /^\S+ Up/.test(l)) && !(rb.nombre === 'tragón' && temp < 50 && /Up/.test(l ?? ''));
      api.chip(`r${i}`, malo ? `«ic:biohazard» ${rb.nombre}` : `«ic:circle-check» ${rb.nombre}`, malo ? 'debuff' : 'buff');
    }
    if (hechos < REBELDES.length && api.t >= siguiente && temp < 50) {
      const rb = REBELDES[hechos++];
      await api.ex(H, `${rb.run} >/dev/null`);
      siguiente = api.t + ({ facil: 45, normal: 30, pesadilla: 18 } as any)[api.dificultad];
      api.log(`«ic:ghost» Rebelde ${hechos}: ${rb.aviso}`, 'boss');
      setTimeout(() => api.log(`«ic:lightbulb» Pista: ${rb.pista}`), 25000);
    }
    if (hechos === REBELDES.length && sano >= 10 && temp < 50 && !/zombi .*Restarting/.test(ps)) {
      api.puntos(api.vida * 5);
      api.fin(true, '<p>Host a salvo: minero, tragón y zombi neutralizados.</p>');
    }
  },
};
export default juego;
