import './estilo.css';
import './iconos';
import { aplicar, celebrar, confeti, fanfarria } from './recompensa';

const $ = (id: string) => document.getElementById(id)!;
const TEMAS = [
  { id: 'pizarra', nombre: 'Pizarra', desc: 'Oscuro y tranquilo. El de por defecto.', c: ['#0f1117', '#7cc4ff', '#4ade80', '#c084fc'] },
  { id: 'fosforo', nombre: 'Fósforo', desc: 'Terminal verde clásica, todo en monoespaciada.', c: ['#050805', '#39ff14', '#e6ff4d', '#7dffb0'] },
  { id: 'neon', nombre: 'Neón', desc: 'Modo juego: para los bosses y los exámenes.', c: ['#0d0221', '#ff2fd6', '#2dffc4', '#00e5ff'] },
  { id: 'papel', nombre: 'Papel', desc: 'Claro y cálido, para leer teoría mucho rato.', c: ['#f6f3ec', '#1f5fbf', '#1d8a4c', '#7a3fbf'] },
];
const leer = () => { try { return JSON.parse(localStorage.getItem('relavops.colores') ?? '{}'); } catch { return {}; } };
const guardar = (o: Record<string, string>) => { try { localStorage.setItem('relavops.colores', JSON.stringify(o)); } catch {} aplicar(); pintarControles(); };

function aHex(c: string) {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.fillStyle = c.trim();
  return ctx.fillStyle as string;
}

function pintarTemas() {
  const actual = document.documentElement.dataset.tema;
  $('temas').innerHTML = TEMAS.map((t) => `<button class="tema" data-t="${t.id}" aria-pressed="${t.id === actual}" style="background:${t.c[0]};color:${t.id === 'papel' ? '#23201a' : '#eee'}">
    <b>${t.nombre}</b><span>${t.desc}</span><div class="muestras">${t.c.slice(1).map((c) => `<i style="background:${c}"></i>`).join('')}</div></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('.tema').forEach((b) => b.addEventListener('click', () => {
    try { localStorage.setItem('relavops.tema', b.dataset.t!); localStorage.removeItem('relavops.colores'); } catch {}
    aplicar(); pintarTemas(); pintarControles();
  }));
}

function pintarControles() {
  const css = getComputedStyle(document.documentElement);
  document.querySelectorAll<HTMLInputElement>('input[type=color]').forEach((i) => { i.value = aHex(css.getPropertyValue(`--${i.dataset.var}`)); });
  const r = parseInt(css.getPropertyValue('--radio')) || 6;
  ($('radio') as HTMLInputElement).value = String(r);
  $('radio-v').textContent = `${r} px`;
  $('tokens').textContent = `:root {\n${['fondo', 'panel', 'panel-2', 'borde', 'texto', 'suave', 'acento', 'sobre-acento', 'ok', 'aviso', 'mal', 'xp', 'term-fondo', 'term-texto', 'radio', 'radio-s']
    .map((v) => `  --${v}: ${css.getPropertyValue(`--${v}`).trim()};`).join('\n')}\n}`;
}

document.querySelectorAll<HTMLInputElement>('input[type=color]').forEach((i) => i.addEventListener('input', () => {
  const o = leer(); o[i.dataset.var!] = i.value; guardar(o);
}));
$('radio').addEventListener('input', (e) => {
  const r = Number((e.target as HTMLInputElement).value);
  const o = leer(); o.radio = `${r}px`; o['radio-s'] = `${Math.max(0, Math.round(r * 0.66))}px`; guardar(o);
});
$('restablecer').addEventListener('click', () => { try { localStorage.removeItem('relavops.colores'); } catch {} aplicar(); pintarControles(); });
$('copiar').addEventListener('click', async () => { await navigator.clipboard.writeText($('tokens').textContent ?? ''); $('copiar').textContent = '«ic:circle-check» Copiado'; });
$('probar-xp').addEventListener('click', (e) => celebrar(e.currentTarget as Element, 10));
$('probar-boss').addEventListener('click', () => { fanfarria(); confeti(); });
pintarTemas();
pintarControles();
