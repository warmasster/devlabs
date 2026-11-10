import './estilo.css';
import './iconos';
import { panelAjustes } from './recompensa';

const $ = (id: string) => document.getElementById(id)!;
$('ajustes').append(panelAjustes());
const pil = (t: string, c = '') => `<span class="pildora ${c}">${t}</span>`;
const json = (u: string) => fetch(u, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

(async () => {
  const est = await json('/api/estado');
  $('servidor').textContent = est ? `labd activo · ${est.labd_mb} MB · ${est.sesiones} sesiones` : 'sin servidor de labs';
  $('servidor').className = `pildora ${est ? 'ok' : 'mal'}`;
  const cal = est?.calientes ?? {};
  const caliente = (id: string) => pil(cal[id] > 0 ? `«ic:flame» ${cal[id]} lab caliente` : 'lab en frío', cal[id] > 0 ? 'ok' : 'aviso');

  const [x, g] = await Promise.all([json('/resultados/m1-xterm.json'), json('/resultados/m1-ghostty.json')]);
  const bat = (r: any, n: string) => {
    if (!r) return '';
    const it = Object.values(r.items) as any[];
    const ok = it.filter((i) => i.ok).length;
    return pil(`${n}: ${ok}/${it.length} · ${r.latencia.tecla_p50.toFixed(1)} ms`, ok === it.length ? 'ok' : 'aviso');
  };
  $('e-m1').innerHTML = caliente('m1-terminal') + bat(x, 'xterm.js') + bat(g, 'ghostty-web');
  $('e-m2').innerHTML = caliente('m2-ping') + ((await json('/capturas/ping.json')) ? pil('captura grabada lista', 'ok') : '');
  $('e-m3').innerHTML = caliente('m3-routing');
  const v = await json('/voces/voces.json');
  $('e-m4').innerHTML = v ? pil(`${v.clips.length} muestras`, 'ok') : pil('sin muestras', 'aviso');
  const d = await json('/densidad/resultados.json');
  $('e-m5').innerHTML = d ? pil(`medido ${new Date(d.fecha).toLocaleDateString('es-ES')}`, 'ok') : pil('sin medir', 'aviso');
  const i = await json('/instalacion/resultado.json');
  $('e-m6').innerHTML = i ? pil(`instalado en ${Math.floor(i.total_s / 60)} min ${i.total_s % 60} s`, i.total_s < 600 ? 'ok' : 'aviso') : pil('sin probar', 'aviso');
})();
