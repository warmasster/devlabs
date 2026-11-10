// Portada pública. La demo de arriba enseña la idea de relavops sin servidor: una lección pide un
// comando, la terminal lo escribe y el paso se marca hecho. El temario, los artículos y el pie ya
// vienen escritos en el HTML (los pone web/seo al compilar), así que aquí no se cargan las lecciones.
import './portada.css';
import { Red } from '../cuenta/red';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const espera = (ms: number) => new Promise((r) => setTimeout(r, quieto ? Math.min(ms, 60) : ms));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const red = new Red($('.en-red') as HTMLCanvasElement);

// ---------- Con sesión abierta, la cabecera lleva al curso.
fetch('/api/cuenta/yo', { credentials: 'same-origin' }).then(async (r) => {
  if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return;
  const j = await r.json();
  $('#acceso').innerHTML = `<a class="pt-boton" href="/curso">Ir al curso, ${esc(j.usuario.nombre)}</a>`;
}).catch(() => {});

// ---------- Código de clase
const codigo = $('#codigo') as HTMLInputElement;
codigo.addEventListener('input', () => {
  const l = codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  codigo.value = l.length > 4 ? `${l.slice(0, 4)}-${l.slice(4)}` : l;
});
$('#f-clase').addEventListener('submit', (e) => {
  e.preventDefault();
  location.href = codigo.value.length >= 9 ? `/entrar?clase=${encodeURIComponent(codigo.value)}` : '/entrar?registro=1&tipo=clase';
});

// ---------- La demo
const PASOS = [
  { titulo: 'Qué es una IP', texto: 'Escribe <code>ip addr</code> y busca la IP de tu máquina.', cmd: 'ip addr', salida: ['2: eth0: <BROADCAST,UP> mtu 1500', '    inet 10.0.0.10/24 scope global eth0'], xp: 10 },
  { titulo: 'Hablar con otra máquina', texto: 'Haz ping a la máquina <code>web</code>. Una vez basta.', cmd: 'ping -c 1 web', salida: ['64 bytes from web (10.0.0.20): icmp_seq=1 time=0.07 ms'], xp: 15 },
  { titulo: 'Quién escucha', texto: 'Mira qué puertos tiene abiertos tu máquina con <code>ss -tln</code>.', cmd: 'ss -tln', salida: ['State   Local Address:Port', 'LISTEN  0.0.0.0:80'], xp: 10 },
];
const term = $('#d-term');
const tarjeta = $('.pt-leccion');
const estado = $('#d-estado');
let xp = 0;

function linea(clase = '') {
  const d = document.createElement('div');
  if (clase) d.className = clase;
  term.append(d);
  while (term.children.length > 8) term.firstElementChild!.remove();
  return d;
}

async function demo() {
  for (let i = 0; ; i = (i + 1) % PASOS.length) {
    const p = PASOS[i];
    if (i === 0) { xp = 0; $('#d-xp').textContent = '0 XP'; }
    $('#d-paso').textContent = `Paso ${i + 1} de ${PASOS.length}`;
    $('#d-titulo').textContent = p.titulo;
    $('#d-texto').innerHTML = p.texto;
    tarjeta.classList.remove('hecho');
    estado.classList.remove('hecho');
    estado.querySelector('span')!.textContent = 'Esperando a que lo escribas';
    await espera(1300);
    const d = linea('c');
    d.innerHTML = '<span class="p">root@tu-pc:~# </span>';
    const txt = document.createTextNode('');
    d.append(txt);
    for (const ch of p.cmd) {
      txt.data += ch;
      red.poner('tecleo', 700);
      await espera(70 + Math.random() * 90);
    }
    await espera(350);
    d.classList.remove('c');
    for (const s of p.salida) { linea('s').textContent = s; await espera(90); }
    await espera(250);
    // La lección lo ha visto en la máquina.
    xp += p.xp;
    tarjeta.classList.add('hecho');
    estado.classList.add('hecho');
    estado.querySelector('span')!.textContent = `Hecho · +${p.xp} XP`;
    const x = $('#d-xp');
    x.textContent = `${xp} XP`;
    x.classList.add('sube');
    setTimeout(() => x.classList.remove('sube'), 400);
    red.poner('bien', 900);
    await espera(2200);
  }
}
demo();

// ---------- La clase de ejemplo del bloque de profes. Datos inventados para enseñar cómo se ve.
const EJEMPLO = [
  { n: 'ana', c: '#5ff2a8', p: [3, 3, 3, 2, 1], xp: 340, vivo: true },
  { n: 'luis', c: '#c29bff', p: [3, 3, 2, 0, 0], xp: 210, vivo: false },
  { n: 'marta', c: '#ffd166', p: [3, 3, 3, 3, 2], xp: 455, vivo: true },
  { n: 'iker', c: '#ff6f91', p: [3, 1, 0, 0, 0], xp: 95, vivo: false },
  { n: 'sara', c: '#7cc4ff', p: [3, 3, 3, 1, 0], xp: 280, vivo: false },
];
$('#profe-filas').innerHTML = EJEMPLO.map((a) => `<div class="pt-fila" style="--c:${a.c}"><span class="av">${a.n[0].toUpperCase()}</span>
  <span>${a.n}${a.vivo ? '<span class="vivo" title="en un lab ahora"></span>' : ''}</span>
  <span class="pt-mods">${a.p.map((k) => `<span><i class="${k > 0 ? 'si' : ''}"></i><i class="${k > 1 ? 'si' : ''}"></i><i class="${k > 2 ? 'si b' : ''}"></i></span>`).join('')}</span>
  <span class="x">${a.xp} XP</span></div>`).join('');
