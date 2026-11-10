import './estilo.css';
import './iconos';
import { abrirSesion, eventos, post, type Info } from './api';
import { Diagrama, type NodoId, type NodoInfo } from './diagrama';
import { LabTerminal } from './terminal';
import { celebrar, ding, panelAjustes, confeti } from './recompensa';

interface Paquete {
  nodo: NodoId; if: string; ts: number; mac_src: string; mac_dst: string; tipo: 'arp' | 'ipv4';
  arp?: { op: 'request' | 'reply'; busca?: string; de?: string; ip?: string; mac?: string };
  ttl?: number; src?: string; dst?: string; icmp?: string; seq?: number; texto: string;
}
type Escena =
  | { tipo: 'texto'; html: string }
  | { tipo: 'pregunta'; html: string; opciones: string[]; correcta: number; explica: string }
  | { tipo: 'hazlo'; html: string }
  | { tipo: 'paquete'; i: number };

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());

// Quién está al otro lado de cada cable
const DESTINO: Record<string, NodoId> = { 'h1/eth1': 'r1', 'r1/eth1': 'h1', 'r1/eth2': 'h2', 'h2/eth1': 'r1' };
const BCAST = 'ff:ff:ff:ff:ff:ff';

let info: Info | undefined;
let nodos: Record<NodoId, NodoInfo>;
let diag: Diagrama;
let paquetes: Paquete[] = [];
let capturando = false;
let capturaLista = false;
let escenas: Escena[] = [];
let actual = 0;
const respuestas = new Map<number, number>();
let term: LabTerminal | undefined;

function nombreMac(mac: string) {
  if (mac === BCAST) return 'todos (broadcast)';
  for (const id of Object.keys(nodos) as NodoId[]) for (const [ifn, m] of Object.entries(nodos[id].macs)) if (m === mac) return `${id}·${ifn}`;
  return mac;
}

function nodosDesde(interfaces: Info['interfaces']): Record<NodoId, NodoInfo> {
  const r = {} as Record<NodoId, NodoInfo>;
  for (const id of ['h1', 'r1', 'h2'] as NodoId[]) {
    const ifs = (interfaces[id] ?? []).filter((i) => i.nombre.startsWith('eth'));
    r[id] = { nombre: id, ips: ifs.flatMap((i) => i.ips ?? []), macs: Object.fromEntries(ifs.map((i) => [i.nombre.replace(/@.*/, ''), i.mac])) };
  }
  return r;
}

const INICIO: Escena[] = [
  { tipo: 'texto', html: '<b>Tu ping no llega y el servidor está encendido.</b> Antes de depurar nada, hay que saber qué viaja de verdad por el cable. Vamos a mirarlo en tu propio lab: <b>h1</b> y <b>h2</b> están en redes distintas, unidas por el router <b>r1</b>.' },
  {
    tipo: 'pregunta',
    html: 'h1 (<code>10.0.1.10</code>) quiere hacer ping a h2 (<code>10.0.2.10</code>). <b>¿Qué es lo primero que sale por el cable de h1?</b>',
    opciones: ['Un ping dirigido a la MAC de h2', 'Una pregunta ARP: «¿quién tiene 10.0.1.1?» (su gateway)', 'Una pregunta ARP: «¿quién tiene 10.0.2.10?»'],
    correcta: 1,
    explica: 'h1 compara con su máscara /24: 10.0.2.10 no es de su red, así que el paquete va al gateway. Para meterlo en una trama necesita la MAC del gateway, y aún no la sabe: ARP.',
  },
  { tipo: 'hazlo', html: '<b>Hazlo tú.</b> En la terminal de h1 escribe <code>ping -c1 10.0.2.10</code> y pulsa Enter. Estamos escuchando con tcpdump en cada cable.' },
];

function construirEscenas() {
  escenas = [...INICIO];
  let mac = false, ttl = false, vuelta = false;
  paquetes.forEach((p, i) => {
    if (!mac && p.icmp?.startsWith('echo request') && p.nodo === 'h1') {
      mac = true;
      escenas.push({ tipo: 'pregunta', html: 'h1 ya sabe la MAC de r1. Ahora sale el ping. <b>¿Qué MAC de destino lleva la trama?</b>', opciones: ['La MAC de h2', 'La MAC de r1 (eth1)', 'ff:ff:ff:ff:ff:ff'], correcta: 1, explica: 'La IP de destino es la de h2, pero la trama solo viaja un salto: va a la MAC de r1. Las IP no cambian en todo el camino; las MAC cambian en cada salto.' });
    }
    if (!ttl && p.icmp?.startsWith('echo request') && p.nodo === 'r1') {
      ttl = true;
      escenas.push({ tipo: 'pregunta', html: `El ping salió de h1 con TTL <b>${paquetes.find((q) => q.icmp?.startsWith('echo request'))?.ttl ?? 64}</b>. <b>¿Con qué TTL llegará a h2?</b>`, opciones: ['64, el TTL no cambia', '63', '0'], correcta: 1, explica: 'Cada router que reenvía un paquete le resta 1 al TTL. Si llegara a 0, el router lo tiraría y avisaría con un ICMP «time exceeded»: así funciona traceroute.' });
    }
    if (!vuelta && p.icmp?.startsWith('echo reply') && p.nodo === 'h2') {
      vuelta = true;
      const h2PreguntaArp = paquetes.slice(0, i).some((q) => q.nodo === 'h2' && q.arp?.op === 'request');
      if (!h2PreguntaArp) escenas.push({ tipo: 'pregunta', html: 'h2 va a contestar al ping. <b>¿Tiene que preguntar antes por ARP la MAC de r1?</b>', opciones: ['Sí, su tabla ARP está vacía', 'No: la aprendió cuando r1 le preguntó a él'], correcta: 1, explica: 'Cuando r1 preguntó «¿quién tiene 10.0.2.10?», en la pregunta iba su propia IP y MAC. Linux aprovecha y la apunta: no hace falta otra pregunta.' });
    }
    escenas.push({ tipo: 'paquete', i });
  });
  if (capturaLista) {
    const req = paquetes.find((p) => p.icmp?.startsWith('echo request') && p.nodo === 'h1');
    const rep = [...paquetes].reverse().find((p) => p.icmp?.startsWith('echo reply') && p.nodo === 'r1');
    const rtt = req && rep ? ((rep.ts - req.ts) * 1000).toFixed(3) : '?';
    escenas.push({ tipo: 'texto', html: `<b>Cierre.</b> En ${rtt} ms han pasado ${paquetes.length} tramas: <br>1. Para salir de tu red hablas con el <b>gateway</b>, y ARP traduce su IP en MAC.<br>2. Las <b>IP</b> no cambian en el viaje; las <b>MAC</b> cambian en cada salto.<br>3. Cada router resta 1 al <b>TTL</b>.<br><br>«ic:lock-open» Se desbloquea: <a href="/m3">M3 · conecta dos redes con OSPF</a>.` });
  }
}

function explicar(p: Paquete): string {
  const dest = DESTINO[`${p.nodo}/${p.if}`];
  if (p.arp?.op === 'request') return `<b>${p.nodo}</b> grita a todo su cable (MAC destino <code>ff:ff:ff:ff:ff:ff</code>): «¿Quién tiene <b>${p.arp.busca}</b>? Que me lo diga ${p.arp.de}».`;
  if (p.arp?.op === 'reply') return `<b>${p.nodo}</b> contesta solo a quien preguntó: «${p.arp.ip} soy yo, mi MAC es <code>${p.arp.mac}</code>». ${dest} lo apunta en su tabla ARP.`;
  if (p.icmp?.startsWith('echo request') && p.nodo === 'h1') return `h1 mete el ping (IP destino <code>${p.dst}</code>) en una trama para la MAC de <b>r1</b>. TTL <b>${p.ttl}</b>.`;
  if (p.icmp?.startsWith('echo request')) return `r1 mira su tabla de rutas: <code>${p.dst}</code> encaja en <code>10.0.2.0/24</code>, sale por <b>eth2</b>. Pone MACs nuevas y resta 1 al TTL: <b>${p.ttl}</b>.`;
  if (p.icmp?.startsWith('echo reply') && p.nodo === 'h2') return `h2 contesta con un <b>echo reply</b>, de <code>${p.src}</code> a <code>${p.dst}</code>, hacia la MAC de su gateway r1. TTL <b>${p.ttl}</b>.`;
  if (p.icmp?.startsWith('echo reply')) return `r1 reenvía la respuesta por <b>eth1</b> hacia h1. TTL <b>${p.ttl}</b>. ¡Ping completado!`;
  return `Trama de ${p.nodo} por ${p.if}.`;
}

// Estado de las tablas ARP tras los paquetes 0..i (para poder ir hacia atrás)
function aplicarHasta(i: number) {
  diag.arp = { h1: new Map(), r1: new Map(), h2: new Map() };
  let ultimo: { nodo: NodoId; ip: string } | undefined;
  for (let k = 0; k <= i; k++) {
    const p = paquetes[k];
    const dest = DESTINO[`${p.nodo}/${p.if}`];
    if (p.arp?.op === 'reply' && p.arp.ip && p.arp.mac) { diag.arp[dest].set(p.arp.ip, p.arp.mac); ultimo = { nodo: dest, ip: p.arp.ip }; }
    if (p.arp?.op === 'request' && p.arp.de && nodos[dest].ips.some((ip) => ip.startsWith(p.arp!.busca + '/'))) {
      diag.arp[dest].set(p.arp.de, p.mac_src);
      ultimo = { nodo: dest, ip: p.arp.de };
    }
  }
  diag.pintarTablas(ultimo);
}

function tarjeta(p?: Paquete) {
  const t = $('tarjeta');
  if (!p) { t.innerHTML = '<tr><td colspan="2" style="color:var(--suave)">Aún no ha pasado nada por el cable.</td></tr>'; $('crudo').textContent = ''; return; }
  const filas: [string, string, boolean?][] = [
    ['Tipo', p.arp ? `ARP ${p.arp.op === 'request' ? 'pregunta' : 'respuesta'}` : `ICMP ${p.icmp}`],
    ['Sale de', `${p.nodo} · ${p.if}`],
    ['MAC origen', nombreMac(p.mac_src), true],
    ['MAC destino', nombreMac(p.mac_dst), true],
  ];
  if (p.tipo === 'ipv4') {
    filas.push(['IP origen', p.src ?? '?'], ['IP destino', p.dst ?? '?']);
    filas.push(['TTL', String(p.ttl), p.nodo === 'r1']);
  }
  t.innerHTML = filas.map(([k, v, c]) => `<tr><td>${k}</td><td class="${c ? 'cambio' : ''}">${v}</td></tr>`).join('');
  $('crudo').textContent = p.texto;
}

async function mostrar(animar = true) {
  const e = escenas[actual];
  const guion = $('guion'), ops = $('opciones');
  ops.innerHTML = '';
  $('caja-term').classList.toggle('visible', e.tipo === 'hazlo' || (e.tipo === 'paquete' && !capturaLista));
  ($('atras') as HTMLButtonElement).disabled = actual === 0;
  const sig = $('siguiente') as HTMLButtonElement;
  sig.textContent = actual === 0 ? 'Empezar «ic:play»' : actual === escenas.length - 1 ? 'Repetir «ic:rotate-ccw»' : 'Siguiente «ic:play»';
  sig.disabled = false;
  $('progreso').innerHTML = escenas.map((_, k) => `<span class="${k <= actual ? 'ya' : ''}"></span>`).join('');

  if (e.tipo === 'texto') { guion.innerHTML = e.html; diag.limpiar(); }
  if (e.tipo === 'pregunta') {
    guion.innerHTML = e.html;
    const r = respuestas.get(actual);
    sig.disabled = r === undefined;
    e.opciones.forEach((o, k) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = o;
      if (r !== undefined) { b.disabled = true; if (k === e.correcta) b.classList.add('correcta'); else if (k === r) b.classList.add('incorrecta'); }
      b.onclick = () => {
        respuestas.set(actual, k);
        if (k === e.correcta) { ding(); celebrar(b, 5); }
        pintarAciertos();
        mostrar(false);
      };
      ops.append(b);
    });
    if (r !== undefined) {
      guion.innerHTML += `<p style="margin:10px 0 0;color:var(--suave)">${r === e.correcta ? '«ic:circle-check» ¡Eso es!' : '«ic:circle-help» Casi.'} ${e.explica}</p>`;
      // Reintentar: se borra la respuesta y se vuelve a preguntar (sin castigo).
      const otra = document.createElement('button');
      otra.className = 'btn';
      otra.textContent = '«ic:rotate-ccw» Reintentar';
      otra.onclick = () => { respuestas.delete(actual); pintarAciertos(); mostrar(false); };
      ops.append(otra);
    }
  }
  if (e.tipo === 'hazlo') {
    guion.innerHTML = e.html + (capturaLista ? '<p style="color:var(--ok)">«ic:circle-check» Capturado. Pulsa Siguiente para verlo a cámara lenta.</p>' : `<p style="color:var(--suave)">Paquetes vistos: ${paquetes.length}</p>`);
    sig.disabled = !capturaLista;
    if (!capturando && !capturaLista) empezarCaptura();
    term?.focus();
  }
  if (e.tipo === 'paquete') {
    const p = paquetes[e.i];
    guion.innerHTML = explicar(p);
    tarjeta(p);
    aplicarHasta(e.i - 1);
    const dest = DESTINO[`${p.nodo}/${p.if}`];
    diag.pintarRutas(p.nodo === 'r1' && p.tipo === 'ipv4' ? (p.dst?.startsWith('10.0.2.') ? 1 : 0) : -1);
    const color = p.arp ? '#fbbf24' : p.icmp?.startsWith('echo reply') ? '#4ade80' : '#7cc4ff';
    const etiqueta = p.arp ? (p.arp.op === 'request' ? `ARP ¿${p.arp.busca}?` : 'ARP: ¡soy yo!') : `${p.icmp?.includes('reply') ? 'pong' : 'ping'} · TTL ${p.ttl}`;
    await diag.paquete(p.nodo, dest, etiqueta, color, p.mac_dst === BCAST, animar ? 1000 : 1);
    if (escenas[actual] === e) aplicarHasta(e.i);
  }
}

function pintarAciertos() {
  let ok = 0;
  for (const [k, r] of respuestas) if ((escenas[k] as any).correcta === r) ok++;
  $('aciertos').textContent = `${ok} / ${respuestas.size}`;
}

async function empezarCaptura() {
  if (!info) return;
  capturando = true;
  paquetes = [];
  await post(`/api/sesion/${info.sesion}/accion/olvidar-arp`).catch(() => {});
  await post(`/api/sesion/${info.sesion}/captura`).catch(() => {});
}

function alPaquete(p: Paquete) {
  if (!capturando || capturaLista) return;
  if (!p.arp && !p.icmp) return;
  paquetes.push(p);
  paquetes.sort((a, b) => a.ts - b.ts);
  diag.paquete(p.nodo, DESTINO[`${p.nodo}/${p.if}`], p.arp ? 'ARP' : 'ICMP', '#7cc4ff', p.mac_dst === BCAST, 250);
  // Cada tcpdump es un flujo aparte: lo que llega no viene en orden. Tras la respuesta
  // final se espera un poco a los rezagados y se ordena por la marca de tiempo del kernel.
  if (p.icmp?.startsWith('echo reply') && p.nodo === 'r1') setTimeout(terminarCaptura, 400);
  else if (escenas[actual]?.tipo === 'hazlo') mostrar(false);
}

function terminarCaptura() {
  if (capturaLista) return;
  capturando = false;
  capturaLista = true;
  const req = paquetes.findIndex((p) => p.nodo === 'h1' && (p.arp?.op === 'request' || p.icmp?.startsWith('echo request')));
  if (req > 0) paquetes = paquetes.slice(req); // ruido previo al ping
  try { localStorage.setItem('relavops.m2.captura', JSON.stringify({ interfaces: info?.interfaces, paquetes })); } catch {}
  (window as any).__captura = { interfaces: info?.interfaces, paquetes };
  ding();
  construirEscenas();
  mostrar(false);
}

async function usarGrabada() {
  const r = await fetch('/capturas/ping.json');
  const g = await r.json();
  nodos = nodosDesde(g.interfaces);
  diag = new Diagrama($('lienzo') as unknown as SVGSVGElement, nodos);
  paquetes = g.paquetes;
  capturando = false;
  capturaLista = true;
  $('estado-lab').textContent = 'captura grabada (real, de un lab anterior)';
  construirEscenas();
  actual = INICIO.length;
  mostrar();
}

$('siguiente').addEventListener('click', () => {
  if (actual === escenas.length - 1) { actual = 0; respuestas.clear(); pintarAciertos(); }
  else actual++;
  if (actual === escenas.length - 1 && capturaLista) confeti();
  mostrar();
});
$('atras').addEventListener('click', () => { if (actual > 0) { actual--; mostrar(false); } });
$('grabada').addEventListener('click', usarGrabada);
addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('.terminal-caja')) return;
  if (e.key === 'ArrowRight' && !($('siguiente') as HTMLButtonElement).disabled) $('siguiente').click();
  if (e.key === 'ArrowLeft') $('atras').click();
});

async function iniciar() {
  // Mientras llega el lab, el dibujo ya se ve con datos de ejemplo.
  nodos = nodosDesde({ h1: [{ nombre: 'eth1', mac: '', ips: ['10.0.1.10/24'] }], r1: [{ nombre: 'eth1', mac: '', ips: ['10.0.1.1/24'] }, { nombre: 'eth2', mac: '', ips: ['10.0.2.1/24'] }], h2: [{ nombre: 'eth1', mac: '', ips: ['10.0.2.10/24'] }] });
  diag = new Diagrama($('lienzo') as unknown as SVGSVGElement, nodos);
  escenas = [...INICIO];
  mostrar(false);
  try {
    info = await abrirSesion('m2-ping');
    nodos = nodosDesde(info.interfaces);
    diag = new Diagrama($('lienzo') as unknown as SVGSVGElement, nodos);
    $('estado-lab').textContent = `tu lab: listo en ${info.ms_total} ms`;
    $('estado-lab').className = 'pildora ok';
    eventos(info.sesion, (ev) => {
      if (ev.t === 'paquete') alPaquete(ev);
      if (ev.t === 'paso') celebrar($('guion'), ev.xp);
    });
    term = await LabTerminal.crear($('term'), 'xterm', info.sesion, 'h1');
  } catch (e: any) {
    $('estado-lab').textContent = `sin lab (${e.message}): usa la captura grabada`;
    $('estado-lab').className = 'pildora aviso';
  }
}
iniciar();

// Peso real de la lección (sin voz): lo que ha descargado el navegador.
addEventListener('load', () => setTimeout(() => {
  const recursos = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceResourceTiming;
  const bytes = recursos.reduce((s, r) => s + (r.encodedBodySize || 0), nav?.encodedBodySize ?? 0);
  $('pie').textContent = `Peso de la lección: ${(bytes / 1024).toFixed(0)} KB transferidos (incluye la terminal xterm.js). Sin vídeo: todo es SVG dibujado en tu navegador.`;
}, 1500));
