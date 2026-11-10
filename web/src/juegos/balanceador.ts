// Nivel 3 · Balanceador bajo fuego: nginx + 3 backends con tráfico real. Mantén el SLO.
import type { Juego } from './motor';
import { Asedio } from './ataques';

const LB = 'lb', WEBS = ['web1', 'web2', 'web3'], CL = 'cliente';
const IP = { web1: '10.7.1.2', web2: '10.7.2.2', web3: '10.7.3.2', lb: '10.7.4.1' };
let asedio: Asedio;

const juego: Juego = {
  id: 'balanceador',
  lab: 'j-balanceador',
  titulo: 'Balanceador bajo fuego',
  nivel: 'Examen final · Nivel 3 · Proxies y balanceo',
  resumen: 'Nginx con tres backends bajo ataque. Que el SLO no baje del 95 %.',
  reglas: `<p>Estás en <b>lb</b>, un nginx que reparte el tráfico entre <b>web1</b>, <b>web2</b> y <b>web3</b>. Un cliente hace peticiones sin parar y mide cuántas salen bien en menos de 0,8 s.</p>
    <ul><li>«ic:ghost» El boss irá rompiendo cosas: apaga un backend, mete latencia en otro, rompe el contenido, tumba nginx.</li>
    <li>«ic:trending-down» Si el SLO baja del 95 %, gastas presupuesto de errores (vida).</li>
    <li>«ic:trophy» Aguanta 4 ataques. Desde lb llegas a cada web con <code>ssh web1</code>, etc.</li></ul>
    <p>Herramientas: <code>curl -v</code>, <code>/etc/nginx/conf.d/lb.conf</code>, <code>nginx -t &amp;&amp; nginx -s reload</code>, <code>tc qdisc</code>.</p>`,
  mapa: { nodos: { lb: { x: 450, y: 180, sub: 'nginx' }, web1: { x: 160, y: 70, sub: IP.web1 }, web2: { x: 160, y: 290, sub: IP.web2 }, web3: { x: 740, y: 70, sub: IP.web3 }, cliente: { x: 740, y: 290, sub: 'tráfico' } },
    enlaces: [['lb', 'web1'], ['lb', 'web2'], ['lb', 'web3'], ['lb', 'cliente']], alto: 360 },
  terminales: [LB],

  async iniciar(api) {
    const servir = (w: string) => `mkdir -p /srv/www && echo 'Hola desde ${w}' > /srv/www/index.html; pkill -x python3; nohup python3 -m http.server 80 --directory /srv/www >/dev/null 2>&1 &`;
    await api.exs([
      ...WEBS.map((w) => [w, servir(w)] as [string, string]),
      [LB, `rm -f /etc/nginx/sites-enabled/default; cat > /etc/nginx/conf.d/lb.conf <<'EOF'
upstream webs {
    server ${IP.web1};
    server ${IP.web2};
    server ${IP.web3};
}
server {
    listen 80;
    location / { proxy_pass http://webs; }
}
EOF
        nginx -t 2>/dev/null && (nginx -s reload 2>/dev/null || nginx); printf 'lb · nginx en /etc/nginx/conf.d/lb.conf\\n' > /etc/motd; true`],
    ]);
    api.icono('yo', '«ic:user-round»', LB);
    asedio = new Asedio([
      { nombre: 'web2 caído', aviso: 'han apagado el servidor web de <b>web2</b>.', hacer: [['web2', "pkill -x python3"]], pista: 'nginx reintenta en otro backend si la conexión falla… pero ¿y si web2 vuelve? <code>ssh web2</code>.' },
      { nombre: 'web3 lento', aviso: '<b>web3</b> tiene 1,5 s de latencia en la red (tc netem).', hacer: [['web3', 'tc qdisc replace dev eth1 root netem delay 1500ms']], pista: 'Las peticiones que van a web3 tardan 1,5 s. Quita el retardo (<code>tc qdisc del dev eth1 root</code> en web3) o sácalo del upstream / baja <code>proxy_read_timeout</code>.' },
      { nombre: 'web1 vacío', aviso: 'en <b>web1</b> han borrado la página: devuelve 404.', hacer: [['web1', 'rm -f /srv/www/index.html']], pista: '<code>curl -v http://10.7.1.2/</code> desde lb: mira el código de estado.' },
      { nombre: 'nginx caído', aviso: '¡han matado <b>nginx</b>!', hacer: [[LB, 'nginx -s stop 2>/dev/null; pkill nginx; true']], pista: '<code>nginx</code> lo arranca otra vez.' },
    ], { facil: 40, normal: 25, pesadilla: 15 });
  },

  async tick(api) {
    const r = await api.ex(CL, `for i in 1 2 3 4 5 6; do curl -s -o /dev/null -m 0.8 -w '%{http_code}\\n' http://${IP.lb}/ & done; wait`);
    const codigos = r.out.trim().split('\n');
    const ok = codigos.filter((c) => c === '200').length / 6;
    // Salud de cada backend vista desde lb (para pintar el mapa)
    const sal = await api.ex(LB, WEBS.map((w) => `curl -s -o /dev/null -m 0.5 -w '%{http_code} ' http://${IP[w as keyof typeof IP]}/`).join('; '));
    sal.out.trim().split(/\s+/).forEach((c, i) => { api.claseNodo(WEBS[i], 'mal', c !== '200'); api.claseNodo(WEBS[i], 'ok', c === '200'); api.etiquetaNodo(WEBS[i], c === '200' ? '' : c === '000' ? '«ic:timer» timeout' : `«ic:circle-x» ${c}`); });
    api.claseNodo(LB, 'mal', ok < 0.5);
    await asedio.paso(api, ok, '«ic:trending-up» SLO (200 en <0,8 s)');
  },
};
export default juego;
