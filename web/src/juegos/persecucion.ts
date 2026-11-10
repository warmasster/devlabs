// Nivel 2 · La persecución: huye del boss saltando de servidor en servidor con ssh.
import { bfs, type Juego } from './motor';
import red from './persecucion-red.json';

type Ifz = { if: string; ip: string; vecino: string; ip_vecino: string };
const IPS = red.ips as Record<string, Ifz[]>;
const ENL = red.enlaces as [string, string][];
const NODOS = Object.keys(IPS);
const ipANodo = new Map<string, string>();
for (const [n, l] of Object.entries(IPS)) for (const i of l) ipANodo.set(i.ip, n);
const vecinos = (n: string) => IPS[n].map((i) => i.vecino);

const COFRES: Record<string, { premio: 'escudo' | 'niebla' | 'radar'; texto: string }> = {
  alfa: { premio: 'escudo', texto: 'Comando nuevo: «escudo». Úsalo cuando el boss te alcance: quita el lag y te protege 20 s.' },
  delta: { premio: 'niebla', texto: 'Niebla: el boss te pierde la pista durante 15 s.' },
  eco: { premio: 'radar', texto: 'Comando nuevo: «radar». Te dice en qué servidor está el boss.' },
};
// Trampas: al entrar se borra la IP del enlace que lleva a charlie. Hay que volver a ponerla.
const TRAMPAS: Record<string, { vecino: string }> = { bravo: { vecino: 'charlie' }, eco: { vecino: 'charlie' } };
const AJUSTE = {
  facil: { gracia: 40, paso: 14, lag: 0.6, atrapa: 7 },
  normal: { gracia: 25, paso: 9, lag: 1, atrapa: 5 },
  pesadilla: { gracia: 12, paso: 5, lag: 1.5, atrapa: 3 },
};

let jugador = 'base', boss: string | null = null, ultimoPaso = 0, juntos = 0, capturas = 0;
let escudoHasta = 0, nieblaHasta = 0, radar = false, tocadoPor = new Map<string, number>();
const visitados = new Set<string>(['base']);
const cofresAbiertos = new Set<string>();
const trampasActivas = new Map<string, { f: Ifz; desde: number }>(); // nodo -> interfaz sin IP
const trampasHechas = new Set<string>();
let lagAplicado = new Map<string, string>();

function trampaIf(n: string) { return IPS[n].find((i) => i.vecino === TRAMPAS[n].vecino)!; }

const juego: Juego = {
  id: 'persecucion',
  lab: 'j-persecucion',
  titulo: 'La persecución',
  nivel: 'Examen final · Nivel 2 · Redes',
  resumen: 'Huye de un boss que te persigue por la red saltando con ssh. Lag real, trampas y cofres.',
  reglas: `<p>Estás en <b>base</b>. La única salida está en el servidor <b>salida</b>. Para moverte, salta con <code>ssh &lt;servidor&gt;</code> (cada máquina solo ve a sus vecinos: mira <code>cat /etc/hosts</code>).</p>
    <ul><li>«ic:ghost» Un boss entra en la red y te sigue. Donde está mete <b>lag y jitter reales</b> en la red: si está en tu camino o cerca, escribir se vuelve lento.</li>
    <li>«ic:skull» Si se queda contigo unos segundos, <b>te corta la sesión ssh</b> y pierdes vida.</li>
    <li>«ic:triangle-alert» Algunos servidores <b>te borran una IP</b> al entrar: tendrás que volver a ponerla con <code>ip addr add</code> (hay una <code>nota.txt</code>).</li>
    <li>«ic:gift» Hay cofres: <code>abrir-cofre</code>. Dan comandos nuevos (<code>escudo</code>, <code>radar</code>) o niebla para despistarlo.</li>
    <li>«ic:flag» En <b>salida</b>, escribe <code>escapar</code>.</li></ul>`,
  mapa: {
    nodos: {
      base: { x: 80, y: 180, sub: 'inicio' }, alfa: { x: 260, y: 80 }, delta: { x: 260, y: 280 },
      bravo: { x: 470, y: 80 }, eco: { x: 470, y: 280 }, charlie: { x: 660, y: 180 }, salida: { x: 830, y: 180, sub: '«ic:flag»' },
    },
    enlaces: ENL,
  },
  terminales: ['base'],

  async iniciar(api) {
    const ordenes: [string, string][] = [];
    for (const n of NODOS) {
      const motd = [`Estás en ${n} · vecinos: ${vecinos(n).join(', ')}`];
      if (COFRES[n]) motd.push('Aquí hay un cofre: abrir-cofre');
      if (n === 'salida') motd.push('¡Es la salida! Escribe: escapar');
      // El MOTD ya lo enseña PAM: que sshd no lo repita (la imagen nueva ya viene así).
      let sh = `sed -i 's/^PrintMotd yes/PrintMotd no/' /etc/ssh/sshd_config.d/juego.conf; printf '%s\\n' ${motd.map((m) => `'${m}'`).join(' ')} > /etc/motd; rm -f /run/escudo /run/escapado /run/cofre-abierto /etc/relavops/*-ok; `;
      sh += IPS[n].map((i) => `tc qdisc del dev ${i.if} root 2>/dev/null;`).join(' ');
      if (COFRES[n]) sh += ` printf '%s' '${COFRES[n].texto}' > /etc/relavops/cofre;`;
      if (TRAMPAS[n]) { const f = trampaIf(n); sh += ` printf 'Mi IP hacia ${f.vecino} era ${f.ip}/30 en ${f.if}. Si ssh ${f.vecino} falla, vuelve a ponerla.\\n' > /root/nota.txt;`; }
      ordenes.push([n, sh]);
    }
    await api.exs(ordenes);
    api.icono('yo', '«ic:user-round»', 'base');
    api.claseNodo('base', 'visitado', true);
    for (const n of Object.keys(COFRES)) api.etiquetaNodo(n, '«ic:gift»');
    for (const n of Object.keys(TRAMPAS)) api.etiquetaNodo(n, '«ic:triangle-alert»');
    api.log('Estás en <b>base</b>. Corre hacia <b>salida</b>: <code>ssh alfa</code> o <code>ssh delta</code>.');
  },

  async tick(api) {
    const aj = AJUSTE[api.dificultad];
    // 1 · Sentir: conexiones ssh salientes y "banderas" de cada servidor (todo real).
    const r = await api.exs(NODOS.map((n) => [n,
      `ss -Htn state established '( dport = :22 )' | awk '{print $4}' | cut -d: -f1 | tr '\\n' ' '; echo '|'; ` +
      `for f in cofre-abierto escudo escapado; do [ -e /run/$f ] && printf '%s ' $f; done; echo '|'; ` +
      (TRAMPAS[n] ? `ip -4 -o addr show dev ${trampaIf(n).if} | grep -c '${trampaIf(n).ip}/'` : 'echo')]));
    const estado = new Map(NODOS.map((n, i) => {
      const [salientes, banderas, trampa] = r[i].out.split('|');
      return [n, { salientes: salientes.trim().split(/\s+/).filter(Boolean), banderas: banderas.trim().split(/\s+/), trampaOk: trampa?.trim() !== '0' }];
    }));

    // 2 · ¿Dónde está el jugador? Se sigue la cadena de ssh desde base.
    let donde = 'base';
    for (let k = 0; k < 10; k++) {
      const sig = estado.get(donde)!.salientes.map((ip) => ipANodo.get(ip)).find((v) => v && vecinos(donde).includes(v));
      if (!sig) break;
      donde = sig;
    }
    if (donde !== jugador) {
      jugador = donde;
      api.icono('yo', '«ic:user-round»', jugador);
      if (!visitados.has(jugador)) {
        visitados.add(jugador);
        api.claseNodo(jugador, 'visitado', true);
        api.puntos(50);
        api.log(`Has llegado a <b>${jugador}</b>.`, 'bien');
        if (TRAMPAS[jugador] && !trampasHechas.has(jugador)) {
          const f = trampaIf(jugador);
          trampasHechas.add(jugador);
          await api.ex(jugador, `ip addr del ${f.ip}/30 dev ${f.if}`);
          trampasActivas.set(jugador, { f, desde: api.t });
          api.chip(`trampa-${jugador}`, `«ic:ban» ${jugador} sin IP hacia ${f.vecino}`, 'debuff');
          api.log(`«ic:triangle-alert» ¡Trampa! Al entrar en <b>${jugador}</b> se ha borrado su IP hacia ${f.vecino}. Pista: <code>cat nota.txt</code>.`, 'mal');
        }
      } else api.log(`Vuelves a <b>${jugador}</b>.`);
    }
    for (const [n, { f, desde }] of trampasActivas) {
      if (api.t - desde > 1.5 && estado.get(n)!.trampaOk) { // lo leído en este tick es de antes de borrarla
        trampasActivas.delete(n);
        api.quitar(`trampa-${n}`);
        api.puntos(100);
        api.log(`«ic:wrench» IP de <b>${n}</b> reparada (${f.ip}/30). ¡Bien!`, 'bien');
      }
    }

    // 3 · Cofres, escudo y salida.
    for (const [n, e] of estado) {
      if (e.banderas.includes('cofre-abierto') && COFRES[n] && !cofresAbiertos.has(n)) {
        cofresAbiertos.add(n);
        api.etiquetaNodo(n, '');
        api.puntos(100);
        const p = COFRES[n].premio;
        if (p === 'escudo') { await api.exs(NODOS.map((x) => [x, 'touch /etc/relavops/escudo-ok'])); api.chip('cmd-escudo', '+ escudo', 'comando'); }
        if (p === 'radar') { radar = true; await api.exs(NODOS.map((x) => [x, 'touch /etc/relavops/radar-ok'])); api.chip('cmd-radar', '+ radar', 'comando'); }
        if (p === 'niebla') { nieblaHasta = api.t + 15; api.chip('niebla', '«ic:cloud-fog» Niebla 15 s', 'buff', 15); }
        api.log(`«ic:gift» Cofre de <b>${n}</b>: ${COFRES[n].texto}`, 'bien');
      }
      if (e.banderas.includes('escudo')) {
        await api.ex(n, 'rm -f /run/escudo');
        escudoHasta = api.t + 20;
        api.chip('escudo', '«ic:shield» Escudo 20 s', 'buff', 20);
        api.log('«ic:shield» Escudo activado: fuera lag y el boss no puede tocarte.', 'bien');
      }
      if (n === 'salida' && e.banderas.includes('escapado')) {
        api.puntos(Math.max(0, 1000 - Math.round(api.t) * 3) + (api.vida * 5));
        api.fin(true, `<p>Has escapado por <b>salida</b> tras pasar por ${visitados.size} servidores, con ${capturas} capturas.</p>`);
        return;
      }
    }

    // 4 · El boss.
    if (!boss && api.t >= aj.gracia) {
      boss = 'base';
      ultimoPaso = api.t;
      api.icono('boss', '«ic:ghost»', boss);
      api.log('«ic:ghost» ¡El boss ha entrado en la red por <b>base</b>! Te está buscando.', 'boss');
    }
    if (boss) {
      const enNiebla = api.t < nieblaHasta;
      if (api.t - ultimoPaso >= (enNiebla ? aj.paso * 3 : aj.paso) && boss !== jugador) {
        const camino = bfs(ENL, boss, jugador);
        const sig = enNiebla ? vecinos(boss)[Math.floor(Math.random() * vecinos(boss).length)] : camino[1];
        if (sig) { boss = sig; ultimoPaso = api.t; tocadoPor.set(boss, api.t); api.icono('boss', '«ic:ghost»', boss); }
      }
      if (radar) api.exs(NODOS.map((x) => [x, `echo ${boss} > /run/boss`]));
      const dist = bfs(ENL, boss, jugador).length - 1;
      api.medidor('dist', '«ic:ghost» Boss', Math.max(0, 100 - dist * 25), 'var(--mal)', dist === 0 ? '¡AQUÍ!' : `${dist} saltos`);
      for (const n of NODOS) api.claseNodo(n, 'boss', n === boss);

      // 5 · Debuffs reales: lag/jitter (tc netem) donde está el boss, en su rastro y a tu alrededor.
      const protegido = api.t < escudoHasta;
      const deseado = new Map<string, string>();
      const lag = (ms: number, jit: number, perdida = 0) => `delay ${Math.round(ms * aj.lag)}ms ${Math.round(jit * aj.lag)}ms${perdida ? ` loss ${perdida}%` : ''}`;
      for (const [n, t] of tocadoPor) if (api.t - t < 25) deseado.set(n, lag(120, 60)); // rastro
      deseado.set(boss, lag(300, 150));
      if (!protegido) {
        if (dist === 1) deseado.set(jugador, lag(250, 120));
        if (dist === 0) deseado.set(jugador, lag(600, 300, 3));
      } else deseado.delete(jugador);
      const cambios: [string, string][] = [];
      for (const n of NODOS) {
        const q = deseado.get(n) ?? '';
        if ((lagAplicado.get(n) ?? '') === q) continue;
        cambios.push([n, IPS[n].map((i) => q ? `tc qdisc replace dev ${i.if} root netem ${q}` : `tc qdisc del dev ${i.if} root 2>/dev/null`).join('; ') + '; true']);
        lagAplicado.set(n, q);
        api.etiquetaNodo(n, q ? `«ic:snail»${q.match(/delay (\d+)/)![1]}ms` : COFRES[n] && !cofresAbiertos.has(n) ? '«ic:gift»' : TRAMPAS[n] && !trampasHechas.has(n) ? '«ic:triangle-alert»' : '');
        for (const [a, b] of ENL) if (a === n || b === n) api.enlace(a, b, 'lento', !!(deseado.get(a) || deseado.get(b)));
      }
      if (cambios.length) await api.exs(cambios);
      const enMi = deseado.get(jugador);
      if (enMi) api.chip('lag', `«ic:snail» Lag ${enMi.replace('delay ', '').replace(' loss', ' · pérdida')}`, 'debuff'); else api.quitar('lag');

      // 6 · Captura: si se queda contigo, te corta el ssh.
      if (dist === 0 && !protegido) {
        juntos++;
        if (juntos === 1) api.log(`«ic:ghost» ¡El boss te ha alcanzado en <b>${jugador}</b>! Huye o usa <code>escudo</code>.`, 'boss');
        if (juntos >= aj.atrapa) {
          juntos = 0;
          capturas++;
          api.danio(34);
          api.log(`«ic:skull» El boss te ha atrapado en <b>${jugador}</b> y te ha cortado la conexión.`, 'boss');
          if (jugador !== 'base') await api.ex(jugador, "pkill -KILL -f '[s]shd: root@' ; true");
          // Respiro: el boss vuelve a un servidor lejano y tarda en volver a moverse.
          const lejos = NODOS.filter((n) => bfs(ENL, n, jugador).length - 1 >= 2);
          boss = lejos[Math.floor(Math.random() * lejos.length)] ?? boss;
          api.icono('boss', '«ic:ghost»', boss);
          ultimoPaso = api.t + 6;
          api.log(`«ic:ghost» El boss se repliega a <b>${boss}</b>. ¡Aprovecha para correr!`);
        }
      } else juntos = 0;
    }
    api.medidor('mapa', '«ic:map» Explorado', (visitados.size / NODOS.length) * 100, 'var(--acento)', `${visitados.size}/${NODOS.length}`);
  },
};
export default juego;
