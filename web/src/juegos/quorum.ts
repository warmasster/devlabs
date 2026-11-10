// Nivel 7 · Quórum: clúster etcd de 3 nodos y un boss que parte la red con iptables.
import type { Juego } from './motor';
import { Asedio } from './ataques';

const NS = ['etcd1', 'etcd2', 'etcd3'];
const LO: Record<string, string> = { etcd1: '10.5.0.1', etcd2: '10.5.0.2', etcd3: '10.5.0.3' };
const corta = (n: string, otros: string[]) => otros.map((o) => `iptables -A INPUT -s ${LO[o]} -j DROP; iptables -A OUTPUT -d ${LO[o]} -j DROP`).join('; ');
let asedio: Asedio;

const juego: Juego = {
  id: 'quorum',
  lab: 'j-quorum',
  titulo: 'Quórum',
  nivel: 'Examen final · Nivel 7 · Sistemas distribuidos',
  resumen: 'Tres etcd y un boss que corta la red entre ellos. Sin mayoría no hay escrituras.',
  reglas: `<p>Un clúster <b>etcd</b> de 3 nodos (Raft). Para escribir hace falta <b>mayoría</b>: 2 de 3.</p>
    <ul><li>«ic:ghost» El boss irá cortando la red entre nodos con <code>iptables</code> y tumbando miembros.</li>
    <li>«ic:trending-down» Cada segundo sin poder escribir cuesta vida.</li>
    <li>«ic:trophy» Aguanta 4 ataques. Desde etcd1 saltas con <code>ssh etcd2</code>, <code>ssh etcd3</code>.</li></ul>
    <p>Herramientas: <code>etcdctl endpoint status --cluster -w table</code>, <code>etcdctl member list</code>, <code>iptables -L -n</code>, <code>iptables -F</code>, <code>arrancar-etcd</code>.</p>`,
  mapa: { nodos: { etcd1: { x: 450, y: 70, sub: LO.etcd1 }, etcd2: { x: 220, y: 270, sub: LO.etcd2 }, etcd3: { x: 680, y: 270, sub: LO.etcd3 } },
    enlaces: [['etcd1', 'etcd2'], ['etcd1', 'etcd3'], ['etcd2', 'etcd3']], alto: 340 },
  terminales: ['etcd1'],

  async iniciar(api) {
    const cluster = NS.map((n) => `${n}=http://${LO[n]}:2380`).join(',');
    await api.exs(NS.map((n) => [n, `cat > /usr/local/bin/arrancar-etcd <<'EOF'
#!/bin/sh
# Arranca el miembro etcd de este nodo (los datos se conservan en /var/lib/etcd-juego).
pgrep -x etcd >/dev/null && { echo "etcd ya está en marcha"; exit 0; }
nohup etcd --name ${n} --data-dir /var/lib/etcd-juego --listen-peer-urls http://0.0.0.0:2380 --listen-client-urls http://0.0.0.0:2379 \\
  --advertise-client-urls http://${LO[n]}:2379 --initial-advertise-peer-urls http://${LO[n]}:2380 \\
  --initial-cluster ${cluster} --initial-cluster-state new --heartbeat-interval 100 --election-timeout 1000 >/var/log/etcd.log 2>&1 &
echo "etcd ${n} arrancado"
EOF
      chmod +x /usr/local/bin/arrancar-etcd; iptables -F; rm -rf /var/lib/etcd-juego; arrancar-etcd >/dev/null;
      echo 'export ETCDCTL_ENDPOINTS=${NS.map((x) => `http://${LO[x]}:2379`).join(',')}' >> /root/.bashrc;
      printf '${n} · clúster etcd de 3. Para escribir hace falta mayoría.\\n' > /etc/motd`]));
    await api.ex('etcd1', `for i in $(seq 30); do etcdctl --endpoints=http://127.0.0.1:2379 --command-timeout=1s put juego/ping 1 >/dev/null 2>&1 && break; sleep 0.5; done`);
    api.icono('yo', '«ic:user-round»', 'etcd1');
    asedio = new Asedio([
      { nombre: 'etcd3 aislado', aviso: 'han aislado <b>etcd3</b> del resto. (¿Sigue habiendo mayoría?)', hacer: [['etcd3', corta('etcd3', ['etcd1', 'etcd2'])]], pista: 'Con 2 de 3 aún se puede escribir. Aun así, arréglalo: <code>ssh etcd3</code> → <code>iptables -F</code>.' },
      { nombre: 'red partida', aviso: '¡la red está partida en tres! Nadie habla con nadie.', hacer: NS.map((n) => [n, corta(n, NS.filter((o) => o !== n))] as [string, string]), pista: 'Sin mayoría no hay líder. Quita las reglas en al menos dos nodos: <code>iptables -L -n</code>, <code>iptables -F</code>.' },
      { nombre: 'etcd2 tumbado', aviso: 'han matado el proceso de <b>etcd2</b> y aislado etcd3.', hacer: [['etcd2', 'pkill -x etcd'], ['etcd3', corta('etcd3', ['etcd1', 'etcd2'])]], pista: 'Hacen falta 2 vivos y conectados: <code>ssh etcd2</code> → <code>arrancar-etcd</code>, o arregla etcd3.' },
      { nombre: 'líder aislado', aviso: 'han aislado al <b>líder</b> actual.', hacer: [], pista: 'El resto elige otro líder solo, si tiene mayoría. Si no, revisa iptables.' },
    ], { facil: 40, normal: 25, pesadilla: 15 });
  },

  async tick(api) {
    const r = await api.exs(NS.map((n) => [n,
      `pgrep -x etcd >/dev/null && echo VIVO; etcdctl --endpoints=http://127.0.0.1:2379 --command-timeout=700ms put juego/t "$(date +%s)" >/dev/null 2>&1 && echo ESCRIBE;
       etcdctl --endpoints=http://127.0.0.1:2379 --command-timeout=500ms endpoint status -w json 2>/dev/null | grep -o '"leader":[0-9]*,"raftIndex"' | head -1; etcdctl --endpoints=http://127.0.0.1:2379 --command-timeout=500ms endpoint status -w json 2>/dev/null | grep -o '"member_id":[0-9]*' | head -1; iptables -S | grep -c DROP`]));
    let escriben = 0, lider = '';
    r.forEach((x, i) => {
      const n = NS[i];
      const vivo = x.out.includes('VIVO'), esc = x.out.includes('ESCRIBE');
      const drops = Number(x.out.trim().split('\n').pop() ?? '0');
      const l = /"leader":(\d+)/.exec(x.out)?.[1], yo = /"member_id":(\d+)/.exec(x.out)?.[1];
      if (l && yo && l === yo) lider = n;
      if (esc) escriben++;
      api.claseNodo(n, 'ok', esc);
      api.claseNodo(n, 'mal', !esc);
      api.claseNodo(n, 'caido', !vivo);
      api.etiquetaNodo(n, !vivo ? '«ic:skull» parado' : drops ? `«ic:brick-wall» ${drops} reglas` : '');
    });
    for (const [a, b] of [['etcd1', 'etcd2'], ['etcd1', 'etcd3'], ['etcd2', 'etcd3']]) api.enlace(a, b, 'cortado', false);
    api.icono('corona', '«ic:crown»', lider || null);
    api.medidor('quorum', '«ic:vote» Escriben', (escriben / 3) * 100, escriben >= 2 ? 'var(--ok)' : 'var(--mal)', `${escriben}/3`);
    // Ataque 4: aislar al líder del momento (se decide en vivo).
    const a = (asedio as any).ataques[3];
    if (lider) a.hacer = [[lider, corta(lider, NS.filter((o) => o !== lider))]];
    await asedio.paso(api, escriben > 0 ? 1 : 0, '«ic:pen-line» Escrituras');
  },
};
export default juego;
