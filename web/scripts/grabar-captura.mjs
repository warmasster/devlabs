// Graba una captura real del ping de M2 (h1 -> h2) para el modo "captura grabada".
// Uso: node scripts/grabar-captura.mjs   (con labd corriendo en localhost:8080, en Windows con WSL)
import { execFileSync } from 'node:child_process';
import { distro } from '../../pruebas/distro.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const B = 'http://localhost:8080';
const info = await (await fetch(`${B}/api/labs/m2-ping/sesion`, { method: 'POST' })).json();
const paquetes = [];
const ws = new WebSocket(`ws://localhost:8080/ws/eventos?s=${info.sesion}`);
ws.onmessage = (m) => { const e = JSON.parse(m.data); if (e.t === 'paquete' && (e.arp || e.icmp)) paquetes.push(e); };
await new Promise((r) => (ws.onopen = r));
await fetch(`${B}/api/sesion/${info.sesion}/accion/olvidar-arp`, { method: 'POST' });
await fetch(`${B}/api/sesion/${info.sesion}/captura`, { method: 'POST' });
await new Promise((r) => setTimeout(r, 1500));
execFileSync('wsl.exe', ['-d', distro('relavops', 'devlabs'), '-u', 'root', '--', 'docker', 'exec', `dl-${info.instancia}-h1`, 'ping', '-c1', '-W1', '10.0.2.10']);
await new Promise((r) => setTimeout(r, 800));
paquetes.sort((a, b) => a.ts - b.ts);
mkdirSync('public/capturas', { recursive: true });
writeFileSync('public/capturas/ping.json', JSON.stringify({ grabada: new Date().toISOString(), interfaces: info.interfaces, paquetes }, null, 1));
console.log(`${paquetes.length} paquetes:`, paquetes.map((p) => `${p.nodo}/${p.if} ${p.arp?.op ?? p.icmp} ttl=${p.ttl ?? '-'}`).join(' | '));
await fetch(`${B}/api/sesion/${info.sesion}`, { method: 'DELETE' });
process.exit(0);
