// Recorre la misión de M3 tecleando por la terminal (WebSocket, igual que el navegador) y mide
// cuánto tarda cada ✓ desde que el comando terminó (la última salida del PTY antes del ✓).
// Uso: node scripts/probar-m3.mjs
const B = 'http://localhost:8080';
const t0 = Date.now();
const info = await (await fetch(`${B}/api/labs/m3-routing/sesion`, { method: 'POST' })).json();
console.log(`lab asignado en ${Date.now() - t0} ms (desde el pool: ${info.de_pool}; crearlo en frío costó ${info.creada_ms} ms)`);

const eventos = [];
const ev = new WebSocket(`ws://localhost:8080/ws/eventos?s=${info.sesion}`);
ev.onmessage = (m) => { const e = JSON.parse(m.data); if (e.t === 'paso' || e.t === 'boss') eventos.push({ ...e, en: Date.now() }); };
await new Promise((r) => (ev.onopen = r));

const terms = {};
async function term(nodo) {
  if (terms[nodo]) return terms[nodo];
  const ws = new WebSocket(`ws://localhost:8080/ws/term?s=${info.sesion}&n=${nodo}&c=120&r=30`);
  ws.binaryType = 'arraybuffer';
  const t = { ws, ultima: 0, texto: '' };
  ws.onmessage = (m) => { if (typeof m.data !== 'string') { t.ultima = Date.now(); t.texto += Buffer.from(m.data).toString(); } };
  await new Promise((r) => (ws.onopen = r));
  await new Promise((r) => setTimeout(r, 600));
  return (terms[nodo] = t);
}
const teclear = async (nodo, linea) => {
  const t = await term(nodo);
  t.ws.send(Buffer.from(linea + '\r'));
  await new Promise((r) => setTimeout(r, 250));
};
const resultados = [];
async function paso(id, nodo, lineas, max = 20000) {
  const t = await term(nodo);
  const desde = Date.now();
  for (const l of lineas) await teclear(nodo, l);
  while (Date.now() - desde < max) {
    const e = eventos.find((x) => x.id === id);
    if (e) {
      const ms = e.en - Math.max(t.ultima, desde);
      resultados.push({ id, ms, total: e.en - desde, check: e.ms });
      console.log(`${id.padEnd(8)} ✓ ${String(ms).padStart(4)} ms tras acabar el comando (comprobación ${e.ms} ms, total desde el primer Enter ${e.en - desde} ms)`);
      return;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  console.log(`${id} NO se validó`);
}
await paso('ip', 'h1', ['ip addr add 10.0.1.10/24 dev eth1']);
await paso('gw', 'h1', ['ip route add default via 10.0.1.1']);
await paso('ping-r1', 'h1', ['ping -c1 10.0.1.1']);
await paso('ospf', 'r1', ['vtysh', 'conf t', 'router ospf', 'network 10.0.1.0/24 area 0', 'network 10.0.12.0/30 area 0', 'end']);
await paso('ping-h2', 'h1', ['ping -c1 10.0.2.10']);

// Boss: cada fallo rompe el lab; se arregla y se mide cuánto tarda en reconocerlo.
const arreglos = {
  mtu: ['r2', ['ip link set eth1 mtu 1500']],
  'ruta-h2': ['h2', ['ip route add default via 10.0.2.1']],
  interfaz: ['r2', ['ip link set eth2 up']],
  area: ['r2', ['vtysh -c "conf t" -c "router ospf" -c "no network 10.0.12.0/30 area 0.0.0.1" -c "network 10.0.12.0/30 area 0"']],
};
const fallo = process.argv[2] ?? 'mtu';
await fetch(`${B}/api/sesion/${info.sesion}/boss?fallo=${fallo}`, { method: 'POST' });
await new Promise((r) => setTimeout(r, 3000));
const roto = await (await fetch(`${B}/api/sesion/${info.sesion}`)).json();
const [n, ls] = arreglos[fallo];
const desde = Date.now();
for (const l of ls) await teclear(n, l);
await teclear('h1', 'ping -c1 -W1 10.0.2.10');
while (Date.now() - desde < 30000 && !eventos.some((e) => e.t === 'boss' && e.hecho)) await new Promise((r) => setTimeout(r, 20));
const b = eventos.find((e) => e.t === 'boss' && e.hecho);
console.log(`boss "${fallo}": ${roto.progreso.boss?.activo ? 'roto ✔' : '¿no se rompió?'} → ${b ? `vencido, ✓ ${b.en - desde} ms tras arreglarlo` : 'NO se reconoció el arreglo'}`);
await fetch(`${B}/api/sesion/${info.sesion}`, { method: 'DELETE' });
process.exit(0);
