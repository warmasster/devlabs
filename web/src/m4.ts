import './estilo.css';
import './iconos';
import { panelAjustes } from './recompensa';

interface Clip {
  id: string; modelo: string; base: string; version: 'tal_cual' | 'guion'; licencia: string; archivo: string; kb: number;
  inteligibilidad: number; palabras: { w: string; t0: number; t1: number }[]; duracion_s?: number; sintesis_s?: number; rtf?: number;
}
interface Nota { natural?: number; energia?: number; reseteo?: boolean; favorita?: boolean }

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());
const LS = 'relavops.m4';
const guardado = (() => { try { return JSON.parse(localStorage.getItem(LS) ?? '{}'); } catch { return {}; } })();
const semilla: number = guardado.semilla ?? Math.floor(Math.random() * 1e9);
const notas: Record<string, Nota> = guardado.notas ?? {};
let revelado: boolean = guardado.revelado ?? false;
const guardar = () => { try { localStorage.setItem(LS, JSON.stringify({ semilla, notas, revelado })); } catch {} };

// Barajado estable por visitante: la letra de cada muestra no cambia al recargar.
function barajar<T>(xs: T[], s: number) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let clips: Clip[] = [];
const audios = new Map<string, HTMLAudioElement>();
const LETRAS = 'ABCDEFGHIJKL';

function estrellas(id: string, campo: 'natural' | 'energia') {
  const v = notas[id]?.[campo] ?? 0;
  return `<span class="estrellas" data-id="${id}" data-campo="${campo}">${[1, 2, 3, 4, 5].map((k) => `<button class="${k <= v ? 'on' : ''}" data-v="${k}" aria-label="${k}">«ic:star»</button>`).join('')}</span>`;
}

function pintar() {
  const cont = $('clips');
  cont.innerHTML = '';
  clips.forEach((c, i) => {
    const n = notas[c.id] ?? {};
    const d = document.createElement('div');
    d.className = 'panel clip';
    d.id = `clip-${c.id}`;
    d.innerHTML = `
      <div class="fila">
        <span class="letra">${LETRAS[i]}</span>
        <button class="btn play" aria-label="Reproducir">«ic:play»</button>
        <div class="barra-audio"><div></div></div>
        <span class="pildora tiempo">0:00 / ${(c.duracion_s ?? 0).toFixed(0)} s</span>
        ${($('mostrar-version') as HTMLInputElement).checked ? `<span class="pildora">${c.version === 'guion' ? 'guion hablado' : 'texto tal cual'}</span>` : ''}
      </div>
      <div class="texto">${c.palabras.map((p, k) => `<span data-k="${k}">${p.w}</span>`).join(' ')}</div>
      <div class="notas">
        <span>¿Natural? ${estrellas(c.id, 'natural')}</span>
        <span>¿Energía? ${estrellas(c.id, 'energia')}</span>
        <label><input type="checkbox" class="reseteo" ${n.reseteo ? 'checked' : ''}/> se nota que "resetea" en cada punto</label>
        <label><input type="radio" name="favorita" class="favorita" ${n.favorita ? 'checked' : ''}/> mi favorita</label>
      </div>
      ${revelado ? `<div class="revelado"><b>${c.modelo}</b> · ${c.licencia} · inteligibilidad (Whisper) ${(c.inteligibilidad * 100).toFixed(0)} % · ${c.kb} KB · generado a ${c.rtf ?? '?'}× tiempo real en una RTX 4060${c.base === 'pocket' ? ' (en CPU)' : ''}</div>` : ''}`;
    cont.append(d);
    montarAudio(c, d);
    d.querySelectorAll<HTMLElement>('.estrellas').forEach((e) => e.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b) return;
      (notas[c.id] ??= {})[e.dataset.campo as 'natural' | 'energia'] = Number(b.dataset.v);
      guardar(); pintar();
    }));
    d.querySelector<HTMLInputElement>('.reseteo')!.onchange = (ev) => { (notas[c.id] ??= {}).reseteo = (ev.target as HTMLInputElement).checked; guardar(); };
    d.querySelector<HTMLInputElement>('.favorita')!.onchange = () => {
      for (const k of Object.keys(notas)) notas[k].favorita = false;
      (notas[c.id] ??= {}).favorita = true; guardar();
    };
  });
  if (revelado) resumen();
}

function montarAudio(c: Clip, d: HTMLElement) {
  let a = audios.get(c.id);
  if (!a) {
    a = new Audio(`/${c.archivo}`);
    a.preload = 'metadata';
    (a as any).preservesPitch = true; // velocidad sin voz de ardilla
    audios.set(c.id, a);
  }
  const audio = a;
  const btn = d.querySelector<HTMLButtonElement>('.play')!;
  const barra = d.querySelector<HTMLElement>('.barra-audio div')!;
  const tiempo = d.querySelector<HTMLElement>('.tiempo')!;
  const spans = [...d.querySelectorAll<HTMLElement>('.texto span')];
  let raf = 0;
  const pintarTiempo = () => {
    const t = audio.currentTime;
    barra.style.width = `${(100 * t) / (audio.duration || c.duracion_s || 1)}%`;
    tiempo.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} / ${(c.duracion_s ?? audio.duration).toFixed(0)} s`;
    c.palabras.forEach((p, k) => {
      spans[k].classList.toggle('ahora', t > 0 && t >= p.t0 && t < p.t1 + 0.05);
      spans[k].classList.toggle('ya', t >= p.t1 + 0.05);
    });
    if (!audio.paused) raf = requestAnimationFrame(pintarTiempo);
  };
  btn.onclick = () => {
    if (audio.paused) {
      for (const [id, o] of audios) if (id !== c.id) o.pause();
      audio.playbackRate = Number(($('velocidad') as HTMLSelectElement).value);
      audio.play();
    } else audio.pause();
  };
  audio.onplay = () => { btn.textContent = '«ic:pause»'; d.classList.add('sonando'); raf = requestAnimationFrame(pintarTiempo); };
  audio.onpause = audio.onended = () => { btn.textContent = '«ic:play»'; d.classList.remove('sonando'); cancelAnimationFrame(raf); pintarTiempo(); };
  d.querySelector<HTMLElement>('.barra-audio')!.onclick = (ev) => {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    audio.currentTime = ((ev.clientX - r.left) / r.width) * (audio.duration || 0);
    pintarTiempo();
  };
  // clic en una palabra = saltar a ella
  spans.forEach((s, k) => s.addEventListener('click', () => { audio.currentTime = c.palabras[k].t0; if (audio.paused) btn.click(); }));
  pintarTiempo();
}

function resumen() {
  const r = $('resumen');
  r.hidden = false;
  const filas = clips.map((c, i) => ({ c, l: LETRAS[i], n: notas[c.id] ?? {} }))
    .sort((a, b) => ((b.n.natural ?? 0) + (b.n.energia ?? 0)) - ((a.n.natural ?? 0) + (a.n.energia ?? 0)));
  r.innerHTML = `<h2>Tu ranking</h2><table class="res"><tr><th></th><th>Muestra</th><th>Modelo</th><th>Texto</th><th>Natural</th><th>Energía</th><th>Resetea</th><th>Inteligib.</th><th>Velocidad de síntesis</th></tr>
    ${filas.map(({ c, l, n }) => `<tr><td>${n.favorita ? '«ic:star»' : ''}</td><td><b>${l}</b></td><td>${c.modelo}</td><td>${c.version === 'guion' ? 'guion' : 'tal cual'}</td>
      <td>${'«ic:star»'.repeat(n.natural ?? 0) || '–'}</td><td>${'«ic:star»'.repeat(n.energia ?? 0) || '–'}</td><td>${n.reseteo ? 'sí' : ''}</td>
      <td>${(c.inteligibilidad * 100).toFixed(0)} %</td><td>${c.rtf ?? '?'}×</td></tr>`).join('')}</table>
    <p style="color:var(--suave);font-size:13px">Inteligibilidad = cuánto del texto reconoce Whisper al transcribir el audio. Velocidad = segundos de audio por segundo de cálculo. Todo el audio es Opus a 24 kbit/s.</p>`;
}

$('revelar').addEventListener('click', () => { revelado = !revelado; guardar(); ($('revelar') as HTMLElement).textContent = revelado ? '«ic:eye-off» Ocultar modelos' : '«ic:eye» Revelar modelos'; pintar(); if (revelado) $('resumen').scrollIntoView({ behavior: 'smooth' }); else $('resumen').hidden = true; });
$('mostrar-version').addEventListener('change', pintar);
$('velocidad').addEventListener('change', () => { for (const a of audios.values()) a.playbackRate = Number(($('velocidad') as HTMLSelectElement).value); });
$('copiar').addEventListener('click', async () => {
  const txt = clips.map((c, i) => `${LETRAS[i]} (${c.modelo}, ${c.version}): natural ${notas[c.id]?.natural ?? '-'}, energía ${notas[c.id]?.energia ?? '-'}${notas[c.id]?.reseteo ? ', resetea' : ''}${notas[c.id]?.favorita ? ', FAVORITA' : ''}`).join('\n');
  await navigator.clipboard.writeText(txt);
  ($('copiar') as HTMLElement).textContent = '«ic:circle-check» Copiado';
});

fetch('/voces/voces.json').then((r) => r.json()).then((d) => {
  clips = barajar(d.clips as Clip[], semilla);
  guardar();
  const total = clips.reduce((s, c) => s + c.kb, 0);
  $('intro').innerHTML = `${clips.length} muestras del mismo párrafo de la lección M2, en dos versiones: el <b>texto tal cual</b> de la web y un <b>guion hablado</b> reescrito para el oído. Escúchalas sin mirar quién es quién, puntúa y luego revela. Las ${clips.length} juntas pesan ${total.toFixed(0)} KB.`;
  ($('revelar') as HTMLElement).textContent = revelado ? '«ic:eye-off» Ocultar modelos' : '«ic:eye» Revelar modelos';
  pintar();
}).catch(() => { $('intro').textContent = 'Aún no hay muestras: ejecuta voces/generar.sh.'; });
