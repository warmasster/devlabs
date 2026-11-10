// Nivel 0 · Disco en llamas: algo llena /var/log (un tmpfs de 256 MB real). Páralo antes del 100 %.
import type { Juego } from './motor';

const N = 'servidor';
// Cada ola se esconde mejor. "patron" es lo que el director busca con pgrep para saber si sigue vivo.
const OLAS = [
  { nombre: 'logger-loco', patron: 'logger-loco',
    lanzar: `nohup bash -c 'exec -a logger-loco bash -c "mkdir -p /var/log/app; while :; do head -c 1M /dev/urandom | base64 >> /var/log/app/debug.log; sleep @S; done"' >/dev/null 2>&1 &`,
    pista: 'Mira qué ocupa: <code>du -sh /var/log/*</code> y qué proceso escribe: <code>ps aux --sort=-%cpu | head</code>.' },
  { nombre: 'proceso camuflado', patron: 'kworker/u8:3',
    lanzar: `nohup bash -c 'exec -a "[kworker/u8:3]" bash -c "mkdir -p /var/log/.cache/.x; while :; do head -c 1M /dev/urandom | base64 >> /var/log/.cache/.x/.sys; sleep @S; done"' >/dev/null 2>&1 &`,
    pista: 'Se esconde: <code>du -sh /var/log/.[!.]*</code> enseña las carpetas ocultas, y el proceso finge ser del kernel. <code>ls -l /proc/*/cwd</code> o <code>lsof /var/log</code>.' },
  { nombre: 'fichero fantasma', patron: 'rsyslogd -n',
    lanzar: `nohup bash -c 'exec -a "rsyslogd -n" bash -c "exec 3>>/var/log/.tmp; rm -f /var/log/.tmp; while :; do head -c 1M /dev/urandom | base64 >&3; sleep @S; done"' >/dev/null 2>&1 &`,
    pista: '<code>df</code> dice que está lleno pero <code>du</code> no encuentra nada: el fichero está borrado pero un proceso lo tiene abierto. <code>lsof +L1</code>.' },
];
const RITMO = { facil: 0.5, normal: 0.25, pesadilla: 0.12 };

let ola = -1, desdeOla = 0, lleno = 0, esperando = 0, pistaDada = false;

const juego: Juego = {
  id: 'disco',
  lab: 'j-disco',
  titulo: 'Disco en llamas',
  nivel: 'Examen final · Nivel 0 · Linux',
  resumen: 'Algo llena el disco. Encuéntralo y páralo antes del 100 %.',
  reglas: `<p>El servidor tiene <code>/var/log</code> en un disco de <b>256 MB</b> de verdad, y algo lo está llenando a toda velocidad.</p>
    <ul><li>«ic:flame» Encuentra qué proceso escribe, <b>páralo</b> y libera espacio (por debajo del 40 %).</li>
    <li>«ic:waves» Son <b>3 olas</b>, y en cada una el culpable se esconde mejor.</li>
    <li>«ic:skull» Si el disco llega al 100 %, el servidor empieza a romperse y pierdes vida.</li></ul>
    <p>Herramientas: <code>df -h</code>, <code>du -sh</code>, <code>ps</code>, <code>kill</code>, <code>lsof</code>.</p>`,
  mapa: { nodos: { servidor: { x: 450, y: 150, sub: '/var/log · 256 MB' } }, enlaces: [], alto: 300 },
  terminales: [N],

  async iniciar(api) {
    await api.ex(N, "printf 'Servidor de producción · /var/log se está llenando\\n' > /etc/motd; mkdir -p /var/log/app; true");
    api.icono('yo', '«ic:user-round»', N);
    esperando = 3;
  },

  async tick(api) {
    const r = await api.ex(N, `df -m --output=used,size /var/log | tail -1; ${OLAS.map((o) => `pgrep -fc '[${o.patron[0]}]${o.patron.slice(1)}' || true`).join('; ')}`); // [x]yz: que pgrep no se encuentre a sí mismo
    const [uso, ...vivos] = r.out.trim().split('\n');
    const [usado, total] = uso.trim().split(/\s+/).map(Number);
    const pct = (100 * usado) / total;
    api.medidor('disco', '«ic:hard-drive» Disco', pct, pct > 85 ? 'var(--mal)' : pct > 60 ? 'var(--aviso)' : 'var(--ok)', `${usado}/${total} MB`);
    api.medidor('ola', '«ic:waves» Ola', ((ola + 1) / OLAS.length) * 100, 'var(--acento)', `${Math.max(0, ola + 1)}/${OLAS.length}`);
    api.etiquetaNodo(N, `${Math.round(pct)} %`);
    api.claseNodo(N, 'mal', pct > 85);

    if (pct >= 99) {
      lleno++;
      api.chip('lleno', '«ic:zap» Disco lleno', 'debuff');
      if (lleno % 2 === 0) { api.danio(8); api.log('«ic:zap» Disco al 100 %: los servicios fallan al escribir.', 'mal'); }
    } else { lleno = 0; api.quitar('lleno'); }

    // ¿Siguiente ola?
    if (esperando > 0) {
      esperando--;
      if (esperando === 0) {
        ola++;
        if (ola >= OLAS.length) { api.fin(true, '<p>Has parado las 3 olas: el disco está a salvo.</p>'); return; }
        const o = OLAS[ola];
        await api.ex(N, o.lanzar.replaceAll('@S', String(RITMO[api.dificultad])));
        desdeOla = api.t;
        pistaDada = false;
        api.log(`«ic:flame» Ola ${ola + 1}: «${o.nombre}» está llenando el disco.`, 'boss');
      }
      return;
    }
    const o = OLAS[ola];
    const vivo = Number(vivos[ola] ?? '0') > 0;
    api.chip('culpable', vivo ? `«ic:flame» ${o.nombre} activo` : '«ic:circle-check» culpable parado', vivo ? 'debuff' : 'buff');
    if (!pistaDada && api.t - desdeOla > 25) { pistaDada = true; api.log(`«ic:lightbulb» Pista: ${o.pista}`); }
    if (!vivo && pct < 40) {
      api.puntos(Math.max(100, 400 - Math.round(api.t - desdeOla) * 4));
      api.log(`«ic:circle-check» Ola ${ola + 1} superada en ${Math.round(api.t - desdeOla)} s.`, 'bien');
      esperando = 5;
    }
  },
};
export default juego;
